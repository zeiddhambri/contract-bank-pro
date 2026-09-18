# R1 · Durcissement sécurité — déploiement et vérifications

> Runbook associé à la migration `supabase/migrations/20260915120000-harden-security.sql`
> et à la réécriture des Edge Functions (garde d'authentification, CORS restreint, quota IA,
> suppression de `service_role`).
> Défauts corrigés : **B01→B09, B11, B12 (en-têtes)** du registre d'audit.

---

## 1. Ordre de déploiement (à suivre strictement)

| Étape | Action | Commande / endroit |
|---|---|---|
| 1 | **Sauvegarder la base** (snapshot / `pg_dump`) — obligatoire avant toute migration de politiques | Dashboard → Database → Backups, ou `pg_dump "$DB_URL" > backup_pre_r1.sql` |
| 2 | **Appliquer la migration en staging** et dérouler la section 3 | `supabase db push` (ou coller le SQL dans l'éditeur SQL du projet staging) |
| 3 | **Poser les secrets des Edge Functions** | `OPENAI_API_KEY`, `ALLOWED_ORIGINS`, `AI_DAILY_LIMIT` (Dashboard → Edge Functions → Secrets) |
| 4 | **Déployer les Functions** (le dossier `_shared/` est partagé, non déployé comme fonction) | `supabase functions deploy ai-assistant-chat && supabase functions deploy ai-contract-generator && supabase functions deploy ai-contract-extraction` |
| 5 | **Créer le `.env`** du front (copier `.env.example`) et redéployer le front | `cp .env.example .env` puis renseigner |
| 6 | **Faire tourner la clé `anon`** (elle est dans l'historique Git) | Dashboard → API → *Rotate anon key* → mettre à jour `.env` + redéployer |
| 7 | **Vérifier en production** (section 3) puis surveiller 48 h (section 5) | — |

> ⚠️ **Ne pas inverser les étapes 4 et 6** : tant que le front n'est pas redéployé avec
> `functions.invoke`, les appels IA en `fetch` brut recevront `401`.

### 1.1 Injection des variables d'environnement selon l'hébergeur (point de rupture possible)

Le client ne contient plus aucune URL ni clé en dur : il lit `VITE_SUPABASE_URL` et
`VITE_SUPABASE_ANON_KEY` **au moment du build**. Sans ces variables, l'application échoue au
démarrage avec le message explicite *« Configuration Supabase absente »* (volontaire : mieux vaut
un échec net qu'une application qui requête dans le vide).

| Hébergeur | Où définir les variables |
|---|---|
| **Lovable** (hébergement d'origine du projet) | Project → Settings → **Environment variables** (préfixe `VITE_`), puis redéployer. À défaut, l'assistant Lovable régénère `src/integrations/supabase/client.ts` avec les constantes en dur : à éviter, et si c'est fait, **tourner la clé** et ne jamais y mettre de clé `service_role`. |
| Vercel / Netlify / Cloudflare Pages | Variables d'environnement du projet (build) — `VITE_` requis pour être exposé au navigateur |
| Self-host (nginx / Docker) | Fournir un `.env` au build (`docker build --build-arg` ou volume au moment du build) |
| Développement local | `cp .env.example .env` puis renseigner (`.env` est gitignoré) |

> 📌 Les variables **serveur** (`OPENAI_API_KEY`, `ALLOWED_ORIGINS`, `AI_DAILY_LIMIT`) ne sont
> jamais exposées au front : elles vivent dans les secrets des Edge Functions.

---

## 2. Ce qui change pour le code applicatif

| Avant | Après | Fichier |
|---|---|---|
| URL + clé anon en dur | `import.meta.env.VITE_SUPABASE_*` (erreur explicite si absent) | `src/integrations/supabase/client.ts` |
| `fetch('https://…functions.supabase.co/…')` sans auth | `supabase.functions.invoke('…')` (JWT transmis) | `AiAssistantSheet.tsx`, `AiContractGenerator.tsx` |
| `audit_logs.insert({…})` depuis le client | `supabase.rpc('write_audit', …)` (attribution serveur) | `src/lib/audit-log.ts` |
| `storage.getPublicUrl(path)` | `createSignedUrl(path, 60 s)` + journalisation du téléchargement | `src/lib/storage.ts` |
| Téléversement `{timestamp}_{nom}.zip` à la racine du bucket | `{bank_id}/{contract_id}/{timestamp}_{nom}` + validation type/taille | `src/lib/storage.ts`, `CreateContractDialog.tsx`, `ContractDetailDialog.tsx` |
| Admin reconnu par e-mail personnel codé en dur | Rôle lu dans `profiles.role` uniquement | `src/contexts/AuthContext.tsx` |
| Connexion/déconnexion non tracées | `auth.sign_in` / `auth.sign_out` dans la piste d'audit | `src/contexts/AuthContext.tsx` |

**Nouvel objet en base** : `public.ai_usage` (quota IA par utilisateur et par jour).
**Nouvelles fonctions SQL** : `write_audit`, `create_notification`, `record_ai_extraction`,
`ai_consume_quota`, `generate_reference_decision(p_bank_id)`, `set_updated_at`,
`protect_profile_sensitive_fields`.

---

## 3. Vérifications à exécuter après déploiement

### 3.1 Accès anonymes (B01, B02, B05) — doivent tous échouer

```bash
ANON="<nouvelle_clé_anon>"
URL="https://<projet>.supabase.co"

# Contrats en lecture anonyme → attendu : 401/403 ou tableau vide
curl -s -o /dev/null -w "%{http_code}\n" -H "apikey: $ANON" "$URL/rest/v1/contracts?select=id&limit=1"

# Profils, journaux d'audit, notifications → attendu : 401/403
for t in profiles audit_logs notifications contract_ai_extractions ai_usage; do
  printf "%-26s %s\n" "$t" "$(curl -s -o /dev/null -w '%{http_code}' -H "apikey: $ANON" "$URL/rest/v1/$t?select=*&limit=1")"
done

# Document contractuel en accès public → attendu : 400/403/404
curl -s -o /dev/null -w "%{http_code}\n" "$URL/storage/v1/object/public/contract_files/<chemin_connu>"
```

### 3.2 Cloisonnement multi-tenant (avec 2 comptes de banques différentes)

```bash
JWT_A="<JWT utilisateur banque A>"
# Un utilisateur de la banque A ne doit voir QUE les contrats de la banque A
curl -s -H "apikey: $ANON" -H "Authorization: Bearer $JWT_A" \
  "$URL/rest/v1/contracts?select=id,bank_id&limit=50" | jq -r '.[].bank_id' | sort -u
# → attendu : une seule valeur (celle de la banque A)
```

### 3.3 Escalade de privilèges (B03) — doit échouer

```bash
# Un utilisateur simple tente de se promouvoir super_admin → attendu : 403/42501
curl -s -X PATCH "$URL/rest/v1/profiles?id=eq.<uuid_du_compte_test>" \
  -H "apikey: $ANON" -H "Authorization: Bearer $JWT_TEST" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"role":"super_admin"}'

# Un bank_admin tente de promouvoir un membre de sa banque en super_admin → attendu : refus
# Un bank_admin change un rôle « user » → « manager » dans sa banque → attendu : accepté
```

### 3.4 Piste d'audit (B04) — insertion directe interdite

```bash
# INSERT direct depuis le client → attendu : 42501 (permission denied)
curl -s -X POST "$URL/rest/v1/audit_logs" \
  -H "apikey: $ANON" -H "Authorization: Bearer $JWT_TEST" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"user_id":"<uuid_d_un_autre>","action":"contract.delete","details":{}}'

# Via la fonction légitime → attendu : succès, auteur = l'appelant
curl -s -X POST "$URL/rest/v1/rpc/write_audit" \
  -H "apikey: $ANON" -H "Authorization: Bearer $JWT_TEST" \
  -H "Content-Type: application/json" \
  -d '{"p_action":"test.manual","p_details":{"source":"runbook"}}'
```

### 3.5 Edge Functions (B06, B07) — auth + CORS + quota

```bash
FN="$URL/functions/v1"

# Sans JWT → attendu : 401
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$FN/ai-assistant-chat" \
  -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"bonjour"}]}'

# Avec JWT valide → attendu : 200 et {"answer":"…"}
curl -s -X POST "$FN/ai-assistant-chat" \
  -H "Authorization: Bearer $JWT_TEST" -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Comment créer un contrat ?"}]}'

# Origine non autorisée → attendu : pas d'en-tête Access-Control-Allow-Origin
curl -s -D- -o /dev/null -X OPTIONS "$FN/ai-assistant-chat" \
  -H "Origin: https://evil.example" -H "Access-Control-Request-Method: POST" | grep -i "access-control-allow-origin" || echo "CORS refusé (attendu)"

# Quota : au-delà de AI_DAILY_LIMIT appels → attendu : 429
# Contrôle SQL :
#   SELECT * FROM public.ai_usage WHERE day = CURRENT_DATE ORDER BY calls DESC LIMIT 5;
```

### 3.6 Contrôle SQL de l'état des politiques

```sql
-- Politiques sur contracts : plus aucune ne doit référencer le rôle public/anon
SELECT polname, polcmd, polroles::regrole[] AS roles,
       pg_get_expr(polqual, polrelid)    AS using_expr,
       pg_get_expr(polwithcheck, polrelid) AS check_expr
FROM pg_policy WHERE polrelid = 'public.contracts'::regclass;

-- Privilèges : anon ne doit plus rien avoir sur le schéma public
SELECT has_schema_privilege('anon', 'public', 'USAGE')          AS anon_schema_usage,   -- false
       has_table_privilege('anon', 'public.contracts', 'SELECT') AS anon_select_contracts, -- false
       has_table_privilege('authenticated', 'public.audit_logs', 'INSERT') AS auth_insert_audit; -- false

-- Bucket privé
SELECT id, public FROM storage.buckets;                          -- contract_files | false

-- Politique de stockage : le premier segment du chemin doit être la banque
SELECT policyname, cmd, qual, with_check
FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- Index de performance ajoutés
SELECT indexname FROM pg_indexes WHERE tablename = 'contracts';
```

### 3.7 Parcours fonctionnels de non-régression

- [ ] Connexion / déconnexion fonctionnent (et apparaissent dans `audit_logs`).
- [ ] Création d'un contrat **avec** document : le contrat est créé, le document est téléchargeable depuis la fiche, l'action est journalisée.
- [ ] Création d'un contrat **sans** document : OK.
- [ ] Un fichier > 25 Mo ou d'un type non accepté est refusé **avec un message lisible** (pas d'erreur brute).
- [ ] Assistant IA : réponse obtenue ; après épuisement du quota, message explicite (429).
- [ ] Agent IA (génération) : contenu produit, historique dans `ai_contract_generations`, action dans `audit_logs`.
- [ ] Un utilisateur de la banque B ne voit ni les contrats, ni les documents, ni les utilisateurs de la banque A.
- [ ] En-têtes présents : `curl -I https://<hôte-du-front>` → CSP, `X-Content-Type-Options`, `X-Frame-Options`, HSTS.

---

## 4. Notes d'exploitation

- **Référence de contrat** : désormais unique **par banque** (`CT-AAAA-NNNN`), générée sous verrou
  transactionnel — deux créations simultanées ne peuvent plus produire le même numéro.
  Les références existantes restent valides (l'unicité globale étant plus stricte que l'unicité par banque).
- **Suppression** : la suppression physique d'un contrat est réservée à `bank_admin` / `super_admin`.
  Les autres rôles utilisent la suppression logique (`contracts.deleted_at`) — le filtrage côté
  application arrive avec **R3**.
- **Quota IA** : `AI_DAILY_LIMIT` (défaut 50 appels/utilisateur/jour). Le comptage est dans
  `public.ai_usage` ; une requête malformée ne consomme pas de quota (validation avant comptage).
- **CORS** : `ALLOWED_ORIGINS` (virgules) + liste par défaut (localhost 8080/4173 et le domaine
  Lovable du projet). À restreindre au domaine de production dès que celui-ci est fixé.
- **Documents existants** : les objets déjà présents à la racine du bucket ne respectent pas la
  convention `{bank_id}/{contract_id}/…` et deviennent donc illisibles via les nouvelles politiques.
  Migration à prévoir (script de reclassement basé sur `contracts.file_path` → nouveau chemin + mise
  à jour de la colonne) **avant** de couper l'accès, ou politique de transition temporaire limitée
  aux administrateurs.

---

## 5. Surveillance post-déploiement (48 h)

| Signal | Où regarder | Seuil d'alerte |
|---|---|---|
| Erreurs RLS (`42501`) sur des parcours légitimes | Logs Postgres / Supabase → Database logs | toute occurrence répétée sur `contracts`, `profiles`, `storage.objects` |
| 401 sur les Functions | Supabase → Edge Functions → Logs | si le front renvoie des 401 en boucle : étape 5/6 non appliquée |
| 429 (quota) | idem | > 5 utilisateurs/jour → ajuster `AI_DAILY_LIMIT` |
| Échecs de téléversement | Console navigateur + `audit_logs` | tout échec sur un format accepté |
| Coût OpenAI | Tableau de bord OpenAI | comparaison avant/après (doit baisser, l'accès public étant fermé) |

## 6. Retour arrière (rollback)

1. Restaurer le snapshot d'avant migration (étape 1 de déploiement).
2. Redéployer la version précédente des Functions (`supabase functions deploy …` depuis le commit antérieur).
3. Rétablir le `.env` précédent côté front.

> La migration est **additive et idempotente** (`DROP … IF EXISTS`, `CREATE … IF NOT EXISTS`,
> `CREATE OR REPLACE`) : la rejouer ne duplique rien. En revanche, les `REVOKE` et la bascule du
> bucket en privé ne sont pas annulés par une simple re-exécution — d'où l'obligation de snapshot.

---

## 7. Reste à faire (hors périmètre R1)

| Réf | Sujet | Pourquoi ce n'est pas ici |
|---|---|---|
| **R2.1** | Unifier les statuts et corriger `contracts_statut_check` | **Bloquant fonctionnel** : la contrainte CHECK actuelle peut rejeter le statut par défaut (`en_cours`) et donc empêcher la création d'un contrat. À traiter en priorité juste après R1. |
| R2.3 | Persister `currency`, supprimer `contract_value`, trigger de rappels idempotent | Intégrité des données, pas sécurité |
| R2.4 | Régénérer les types Supabase (`npm run db:types`) | Nécessite un accès réseau au projet ; ajouts manuels faits en attendant |
| R3 | Fiche contrat, édition/suppression accessibles, pagination | UX/fonctionnel |
| R10 | Signature électronique, hash de document, rôles effectifs, audit exhaustif | Chantier conformité complet |
| R17 | SSO/MFA, gestion des sessions | Authentification avancée |
