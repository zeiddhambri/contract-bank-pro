# R2 — Cycle de vie unique des contrats : migration, effets et vérifications

**Fichier** : `supabase/migrations/20260916090000-contract-lifecycle-integrity.sql`
**Prérequis** : `20260915120000-harden-security.sql` appliquée (voir `VERIFICATIONS-SECURITE.md`).
**Rapport d'origine** : `AUDIT-JURIX.md` §R2 (constats C1→C8, C12 ; défauts B20→B25).

---

## 1. Le problème résolu

| # | Avant | Après |
|---|---|---|
| **B20** | `contracts_statut_check` n'autorisait que des valeurs anglaises (`draft`, `review`, `approval`, `active`…) alors que le défaut de colonne était `'en_cours'` et que l'app proposait dix statuts français. **Toute création de contrat échouait** (`23514 check_violation`). | Type énuméré `public.contract_status` (14 états), défaut `'draft'`, contrainte texte supprimée. La création sans statut explicite fonctionne. |
| Trois vocabulaires | Français métier (`en_cours`, `valide`, `alerte`…), anglais générique (Kanban, tableaux de bord), français approximatif (`actif`, `en_attente`, `expire`, `resilie` dans `ContractTable`) → Kanban vide, compteurs à zéro, filtres inopérants. | **Un seul** vocabulaire, défini dans `src/lib/contract-status.ts` et en base. Tous les composants le consomment. |
| **B21** | `currency` choisi dans le formulaire mais jamais écrit (toujours `EUR`) ; `formatCurrency()` affichait « MAD » en dur (devise absente de la contrainte SQL) ; montants additionnés toutes devises confondues. | Devise écrite à la création, modifiable dans la fiche, formatée par `Intl.NumberFormat`, et **totalisée par devise** (jamais de somme EUR + TND). |
| **B22** | `contract_value` doublonnait `montant`, jamais lu. | Colonne supprimée. |
| **B23** | Trigger de rappels `AFTER INSERT OR UPDATE` + `INSERT` simple : chaque modification de contrat recréait des rappels (doublons garantis). | Trigger idempotent : upsert sur `(contract_id, reminder_type)`, purge des rappels non envoyés obsolètes, déclenchement uniquement si la date change. |
| **B24** | Aucun historique des changements de statut ; transitions non contrôlées. | Table `contract_status_history` + matrice `contract_status_transitions` + trigger de contrôle (transition autorisée **et** rôle autorisé), motif métier conservé. |
| **B25** | `profiles` sans `created_at`, `banks` sans devise par défaut, `updated_at` non maintenu. | Colonnes ajoutées ; `set_updated_at()` (déjà posé par la migration de sécurité) couvre `contracts`. |
| Référence modifiable | `reference_decision` éditable dans la fiche → rupture de traçabilité. | Immuable (trigger), champ en lecture seule côté app ; correction réservée à `super_admin`. |

## 2. Le cycle de vie retenu

Quatre phases, quatorze états — libellés français, valeurs stables en base :

| Phase | États |
|---|---|
| **Instruction** | `draft` (Brouillon), `pending_documents` (Documents manquants), `in_review` (En révision) |
| **Mise en place** | `approved` (Approuvé), `pending_signature_b` (Signature banque), `pending_signature_c` (Signature client), `pending_mortgage_registration` (Inscription hypothèque), `pending_insurance` (Assurance manquante) |
| **Exécution** | `active` (Mis en place), `alert` (Alerte) |
| **Clôture** | `expired` (Expiré), `renewed` (Renouvelé), `client_refused` (Refus client), `cancelled` (Résilié) |

### Mapping des données existantes (exécuté par la migration)

| Ancienne valeur | Nouvelle valeur |
|---|---|
| `en_cours` | `draft` |
| `attente_signature`, `en_cours_de_signature_b` | `pending_signature_b` |
| `en_cours_de_signature_c` | `pending_signature_c` |
| `valide`, `actif`, `signed` | `active` |
| `alerte` | `alert` |
| `documents_manquants` | `pending_documents` |
| `assurance_manquante` | `pending_insurance` |
| `en_attente_inscription_hypotheque` | `pending_mortgage_registration` |
| `refus_client` | `client_refused` |
| `en_attente`, `review` | `in_review` |
| `approval` | `approved` |
| `expire` | `expired` |
| `resilie` | `cancelled` |
| toute autre valeur | `draft` (aucune ligne n'est perdue) |

> 📌 **À valider en staging avant la production** : ce mapping est une décision métier.
> Vérifiez en particulier `en_cours → draft` (un contrat « en cours » au sens de votre
> exploitation est peut-être déjà `active`). La requête de contrôle est en §4.3.

### Transitions

La matrice est **en base** (`contract_status_transitions`) : elle peut être ajustée sans
redéploiement. Principes appliqués :

- un `user` peut faire avancer la saisie et l'instruction ;
- l'approbation, la mise en place et le passage en `active` exigent `validator`, `bank_admin` ou `super_admin` ;
- les sorties de cycle (`cancelled`, `expired`, `renewed`, `client_refused`) sont réservées aux administrateurs ;
- `cancelled → draft` (réouverture) est réservé à `super_admin` ;
- `super_admin` peut tout (support et correction).

L'interface ne propose que les transitions autorisées pour le rôle connecté, et la base
refuse les autres avec un message en français — le garde-fou reste serveur.

## 3. Déploiement

```bash
# 1. Sauvegarde (la migration convertit des données : retour arrière = restauration)
supabase db dump --db-url "$DATABASE_URL" -f backup-avant-r2.sql

# 2. Essai en staging d'abord
supabase db push            # ou : psql "$DATABASE_URL" -f supabase/migrations/20260916090000-contract-lifecycle-integrity.sql

# 3. Redéployer le front (les nouveaux statuts sont requis par l'interface)
npm run build && <déploiement>

# 4. Régénérer les types si vous utilisez le générateur (facultatif : types mis à jour à la main)
npm run db:types
```

Ordre **imposé** : sécurité (R1) → intégrité (R2) → front. Appliquer R2 avant R1 échoue
(`get_my_role()` et `write_audit()` n'existeraient pas encore).

## 4. Vérifications après application

### 4.1 Le type et le défaut sont en place
```sql
SELECT a.attname, format_type(a.atttypid, a.atttypmod) AS type,
       pg_get_expr(d.adbin, d.adrelid) AS defaut
  FROM pg_attribute a
  LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
 WHERE a.attrelid = 'public.contracts'::regclass AND a.attname = 'statut';
-- attendu : statut | public.contract_status | 'draft'::public.contract_status
```

### 4.2 La contrainte bloquante a disparu
```sql
SELECT conname FROM pg_constraint
 WHERE conrelid = 'public.contracts'::regclass AND contype = 'c';
-- attendu : plus de « contracts_statut_check »
```

### 4.3 Répartition des statuts convertis (à relire métier)
```sql
SELECT statut, count(*) FROM public.contracts GROUP BY statut ORDER BY count(*) DESC;
```

### 4.4 Créer un contrat sans statut **doit réussir** (était : erreur 23514)
```sql
INSERT INTO public.contracts (reference_decision, client, type, montant, garantie, agence, bank_id)
VALUES ('', 'Client de test', 'credit_immo', 150000, 'hypotheque', 'agence_centre',
        (SELECT id FROM public.banks LIMIT 1))
RETURNING reference_decision, statut, currency;
-- attendu : CT-<année>-000N | draft | EUR
```

### 4.5 Transitions contrôlées et tracées
```sql
UPDATE public.contracts SET statut = 'active'    WHERE id = '<id>';  -- refusé si draft → active
UPDATE public.contracts SET statut = 'in_review' WHERE id = '<id>';  -- autorisé (draft → in_review)
SELECT from_status, to_status, changed_by_email, reason, changed_at
  FROM public.contract_status_history WHERE contract_id = '<id>' ORDER BY changed_at;
SELECT action, details FROM public.audit_logs
 WHERE action = 'contract.status_change' ORDER BY created_at DESC LIMIT 5;
```

### 4.6 Rappels sans doublon
```sql
UPDATE public.contracts SET description = 'x' WHERE id = '<id>';
UPDATE public.contracts SET description = 'y' WHERE id = '<id>';
SELECT reminder_type, count(*) FROM public.contract_reminders
 WHERE contract_id = '<id>' GROUP BY reminder_type;   -- au plus 1 ligne par type
```

### 4.7 Référence immuable
```sql
UPDATE public.contracts SET reference_decision = 'BIDON' WHERE id = '<id>';
-- attendu : erreur 42501 « La référence de décision … est immuable » (sauf super_admin)
```

### 4.8 Lignes historiques hors contraintes
Les nouvelles contraintes sont ajoutées en `NOT VALID` : elles protègent les écritures
futures sans bloquer la migration sur l'existant. Contrôle puis verrouillage :
```sql
SELECT id, reference_decision, montant FROM public.contracts WHERE montant <= 0;
SELECT id, reference_decision, client  FROM public.contracts WHERE length(btrim(client)) < 2;
SELECT id, date_decision, date_signature FROM public.contracts
 WHERE date_signature IS NOT NULL AND date_signature < date_decision;

-- une fois les lignes corrigées :
ALTER TABLE public.contracts VALIDATE CONSTRAINT contracts_montant_positif;
ALTER TABLE public.contracts VALIDATE CONSTRAINT contracts_client_renseigne;
ALTER TABLE public.contracts VALIDATE CONSTRAINT contracts_dates_coherentes;
ALTER TABLE public.contracts VALIDATE CONSTRAINT contracts_echeance_apres_decision;
ALTER TABLE public.contracts VALIDATE CONSTRAINT contracts_renewal_apres_decision;
```

## 5. Effets visibles dans l'application

- **Création de contrat** : fonctionne (statut `draft` par défaut), la devise choisie est
  enregistrée et relue.
- **Liste des contrats** : colonne Référence, montant dans sa devise, badge de statut
  cohérent, filtres par **phase** et par **statut**, recherche étendue (client, type,
  référence, agence), états vides explicites, actions accessibles au clavier.
- **Fiche contrat** (ouverte depuis la liste) : référence en lecture seule, montant + devise,
  dates de décision / signature / échéance, sélecteur de statut limité aux transitions
  autorisées, **motif** du changement (obligatoire pour alerte, résiliation, refus, expiration),
  document en URL signée, **historique des statuts** affiché.
- **Kanban** : quatre phases réelles, sous-sections par statut, déplacement **persistant**
  (mise à jour optimiste + retour arrière en cas d'échec + toast), menu « Déplacer vers… »
  comme alternative au glisser-déposer (WCAG 2.5.7).
- **Tableaux de bord** : plus aucun chiffre inventé (ni « +12 % ce mois », ni séries codées en
  dur, ni « Contrat ABC Corp ») ; KPI issus des contrats réels, encours totalisés **par devise**,
  alertes et échéances à 90 jours lues en base ; badge de notifications = non lus réels ;
  bouton « Nouveau contrat » branché ; onglet « Analytiques » et bouton de réglages inactifs
  retirés (ils reviendront branchés, en R15/R16).
- **Archivage** : la suppression est logique (`deleted_at`) avec confirmation explicite —
  le document, l'historique et la piste d'audit sont conservés.

## 6. Retour arrière

La conversion `statut` TEXT → énuméré est destructrice pour les valeurs d'origine. En cas de
retrait :

```sql
ALTER TABLE public.contracts ALTER COLUMN statut TYPE TEXT USING statut::text;
ALTER TABLE public.contracts ALTER COLUMN statut SET DEFAULT 'en_cours';
DROP TRIGGER IF EXISTS trigger_contract_status_transition ON public.contracts;
DROP TRIGGER IF EXISTS trigger_protect_contract_reference  ON public.contracts;
DROP TABLE IF EXISTS public.contract_status_history;
DROP TABLE IF EXISTS public.contract_status_transitions;
DROP TYPE  IF EXISTS public.contract_status;
```

…puis restaurer l'interface précédente (`git revert` du commit R2). D'où la sauvegarde §3.1.

## 7. Reste à faire (hors R2)

| Réf | Sujet |
|---|---|
| R3 | Fiche contrat pleine page `/contrats/:id` (onglets Aperçu · Garanties · Documents · Timeline · Commentaires), pagination serveur |
| R7 | Recherche globale du header (aujourd'hui non branchée) et vues sauvegardées |
| R9 | Moteur d'échéances planifié (`pg_cron`) : passage automatique en `expired`, rappels J-90/60/30/7, notifications |
| R10 | Échéancier et obligations extraites par contrat (owner + alertes), timeline complète |
| R15/R16 | Onglet Analytiques (rapports réels) et préférences de banque (dont devise par défaut) |
