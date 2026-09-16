# R3 — Fiche contrat, collaboration et pagination serveur

Guide d'exploitation du chantier **R3** (fiche contrat pleine page `/contrats/:id`,
commentaires, versions de documents, liste paginée côté serveur).

Migration concernée : `supabase/migrations/20260916150000-contract-collaboration.sql`

---

## 1. Ce que le chantier change

### 1.1 Côté base

| Objet | Avant | Après |
|---|---|---|
| `contract_comments` | lecture + insertion seulement : impossible de corriger ou de retirer un commentaire ; `user_id` fourni par le client | lecture/insertion **par banque** ; modification et suppression réservées à **l'auteur** ou à un administrateur de la banque, toujours dans le périmètre de la banque ; `user_id` imposé par défaut + trigger |
| `contract_versions` | `version_number` à la charge du client (doublons possibles) ; politiques de lecture/insertion | numéro **attribué par trigger** (`max + 1` par contrat) + index unique `(contract_id, version_number)` ; `UPDATE`/`DELETE` révoqués (piste d'audit documentaire) |
| `contract_reminders` | politique `FOR ALL` : l'interface pouvait créer/modifier des rappels | **lecture seule** pour l'application (`REVOKE INSERT, UPDATE, DELETE`) ; les rappels restent produits par le trigger `create_contract_reminders` (`SECURITY DEFINER`, idempotent depuis R2) puis par le moteur d'échéances (R8/R9) |
| Index | aucun index de lecture sur ces tables | `(contract_id, created_at DESC)` sur commentaires et versions, `(contract_id, remind_at)` sur rappels |

Dépendances : `public.get_my_bank_id()` et `public.get_my_role()` créées par
`20260915120000-harden-security.sql` (R1).

### 1.2 Côté application

| Écran | Avant | Après |
|---|---|---|
| Liste des contrats | `select('*')` intégral, filtres et pagination **côté client** (plafond PostgREST 1 000 lignes), recherche sur 3 champs après téléchargement | `.range()` + `count=exact`, recherche `ilike` **débouncée 300 ms** sur client / référence / type / agence / description, filtre statut ou phase, tri serveur sur 5 colonnes (`aria-sort`), tailles de page 25/50/100, `keepPreviousData` (pas de clignotement) |
| Consultation d'un contrat | bouton « œil » sans effet (`TODO`) | route `/contrats/:id` : **Aperçu · Garanties · Documents · Timeline · Commentaires · Rappels** |
| Changement de statut | uniquement via le Kanban ou le panneau d'édition | carte « Changer de statut » sur la fiche : seules les transitions autorisées pour le rôle sont proposées, motif obligatoire pour les sorties de cycle (`alert`, `cancelled`, `client_refused`, `expired`) |
| Document | remplacement sans historique | remplacement = **archivage de la version précédente** (fichier conservé et téléchargeable) + motif ; chaque téléchargement passe par une URL signée 60 s et est journalisé |
| Commentaires | table jamais câblée | onglet dédié : publication, suppression par l'auteur/administrateur, auteur affiché (jointure `profiles`) |
| Timeline | aucune | chronologie unique : création, changements de statut (avec motif et auteur), versions de documents, commentaires — fusionnée côté client, du plus récent au plus ancien |
| Barre de recherche de l'en-tête | `onSubmit` vide + panneau « priorité / période » **absents du modèle de données** | recherche réelle, partagée avec la liste (un seul état), bascule automatique sur la vue Contrats |
| Requêtes du tableau de bord | 4 requêtes `select('*')` distinctes (Kanban, stats, financier, échéances) avec 3 clés de cache | **1 requête** partagée (`['contracts','all']`) ; la liste paginée utilise `['contracts','list', …]` ; invalidation commune par préfixe `['contracts']` |
| Erreur réseau / RLS | « Aucun contrat disponible » (faux vide) | état d'erreur explicite avec bouton **Réessayer** (`QueryErrorState`) |

---

## 2. Ordre d'application

```bash
# 1. R1 (fonctions get_my_bank_id / get_my_role, RLS, storage privé)
supabase db push        # ou appliquer 20260915120000-harden-security.sql
# 2. R2 (énuméré contract_status, transitions, historique, rappels idempotents)
                        # 20260916090000-contract-lifecycle-integrity.sql
# 3. R3 (présent)       # 20260916150000-contract-collaboration.sql
```

La migration est **additive et rejouable** (`CREATE OR REPLACE`, `DROP … IF EXISTS`,
`CREATE INDEX IF NOT EXISTS`). Elle ne convertit aucune donnée existante :
aucun temps d'arrêt n'est nécessaire.

> Les commentaires et versions existants (s'il y en a) restent valides : la
> contrainte d'unicité `(contract_id, version_number)` est créée avec
> `IF NOT EXISTS` — en cas de doublons hérités, l'index échoue sans bloquer le
> reste de la migration. Vérifier avant déploiement :
>
> ```sql
> SELECT contract_id, version_number, count(*)
>   FROM public.contract_versions
>  GROUP BY 1, 2 HAVING count(*) > 1;
> ```
> Si des lignes ressortent, les renuméroter avant d'appliquer la migration.

---

## 3. Vérifications après déploiement

À exécuter en tant qu'utilisateur authentifié (SQL Editor « Run as user » ou
session applicative), jamais en `service_role`.

```sql
-- 3.1 Périmètre : aucun commentaire d'une autre banque n'est visible
SELECT count(*)
  FROM public.contract_comments cc
  JOIN public.contracts c ON c.id = cc.contract_id
 WHERE c.bank_id <> public.get_my_bank_id();          -- doit renvoyer 0

-- 3.2 Un commentaire d'un autre utilisateur ne peut pas être modifié
UPDATE public.contract_comments SET comment = 'x'
 WHERE user_id <> auth.uid();                          -- 0 ligne affectée

-- 3.3 L'auteur d'un commentaire ne peut pas être réattribué
--     (depuis l'API) : PATCH contract_comments {"user_id": "<autre>"} → 42501

-- 3.4 Numéro de version attribué par le serveur
INSERT INTO public.contract_versions (contract_id, file_path, uploaded_by)
VALUES ('<contract_id>', 'bank/contract/ancien.pdf', auth.uid());
SELECT version_number FROM public.contract_versions
 WHERE contract_id = '<contract_id>' ORDER BY created_at DESC LIMIT 1;
-- → 1, puis 2, puis 3… (jamais de doublon, jamais de trou)

-- 3.5 Écriture directe dans contract_reminders refusée
INSERT INTO public.contract_reminders (contract_id, reminder_type, remind_at)
VALUES ('<contract_id>', 'review', now());             -- erreur 42501

-- 3.6 contract_versions non modifiable / non supprimable par l'app
UPDATE public.contract_versions SET changes_description = 'x';  -- erreur 42501
DELETE FROM public.contract_versions;                           -- erreur 42501
```

Contrôles côté interface :

1. Ouvrir un contrat → l'URL devient `/contrats/<uuid>` et le rechargement de la
   page affiche la même fiche (route protégée).
2. Onglet Documents → déposer un fichier, puis le remplacer : l'ancien apparaît
   dans « Versions antérieures » et reste téléchargeable.
3. Onglet Commentaires → publier, puis supprimer un commentaire d'un **autre**
   compte : le bouton de suppression n'est pas affiché (et l'API renvoie 42501).
4. Liste → couper le réseau, changer de page : un état d'erreur avec « Réessayer »
   s'affiche, jamais « Aucun contrat ».
5. Liste → saisir un terme de recherche : une seule requête part après ~300 ms
   d'inactivité (onglet Réseau), et le compteur total reflète le résultat filtré.

---

## 4. Retrait (rollback)

```sql
DROP TRIGGER IF EXISTS trigger_comment_author ON public.contract_comments;
DROP FUNCTION IF EXISTS public.comment_author_is_current_user();
DROP TRIGGER IF EXISTS trigger_contract_version_number ON public.contract_versions;
DROP FUNCTION IF EXISTS public.set_contract_version_number();

DROP POLICY IF EXISTS contract_comments_select_bank ON public.contract_comments;
DROP POLICY IF EXISTS contract_comments_insert_bank ON public.contract_comments;
DROP POLICY IF EXISTS contract_comments_update_own  ON public.contract_comments;
DROP POLICY IF EXISTS contract_comments_delete_own  ON public.contract_comments;
DROP POLICY IF EXISTS contract_versions_select_bank ON public.contract_versions;
DROP POLICY IF EXISTS contract_versions_insert_bank ON public.contract_versions;
DROP POLICY IF EXISTS contract_reminders_select_bank ON public.contract_reminders;

-- Rétablir les droits d'écriture de l'application (état antérieur à R3) :
GRANT INSERT, UPDATE, DELETE ON public.contract_reminders TO authenticated;
GRANT UPDATE, DELETE ON public.contract_versions TO authenticated;
```

Les index et les données ne sont pas touchés par le retrait.

---

## 5. Limites assumées (chantiers suivants)

| Limite | Suite prévue |
|---|---|
| `select('*')` conservé sur la liste : toutes les colonnes sont transférées | R7.2 — projection de colonnes et colonnes configurables |
| Recherche `ilike '%…%'` non indexée : séquentielle au-delà de ~50 000 lignes | R7.1 — index `gin_trgm_ops` ou RPC `search_contracts` avec facettes |
| Timeline fusionnée côté client (4 requêtes par fiche) | R8 — vue matérialisée ou RPC dédiée (à créer en `security_invoker = on`) |
| Commentaires sans mentions, sans présence, sans fil de discussion | R16.1 |
| Rappels affichés mais non envoyés | R8.4 — notifications in-app temps réel + e-mail |
| Pas d'édition en ligne dans le tableau (panneau latéral uniquement) | R7.2 |
| Filtres non persistés dans l'URL | R7.3 — vues sauvegardées et filtres partageables |
