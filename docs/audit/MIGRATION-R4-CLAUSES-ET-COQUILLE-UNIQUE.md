# R4 — Bibliothèque de clauses réelle, coquille unique, zéro donnée fantôme

Guide d'exploitation du chantier **R4** (données fantômes) et du premier pan de
**R6.1** (une seule application).

Migration concernée : `supabase/migrations/20260917090000-clause-library.sql`

---

## 1. Ce qui a disparu

| Élément | Pourquoi | Remplacé par |
|---|---|---|
| `src/pages/Index.tsx` (route `/legacy`) | Coquille parallèle : en-tête « CONTRACT MANAGER », onglets en doublon avec `/dashboard`, seul point d'entrée de panneaux d'administration réels | Les mêmes panneaux deviennent des **vues du tableau de bord**, avec leurs droits |
| `src/components/AlertsPanel.tsx` | 4 alertes inventées (`CT-2024-004`, « Certificat hypothécaire non fourni », délais fictifs) | Cartes « Contrats en alerte » (statut réel `alert`) et « Prochaines échéances » (échéance, renouvellement, signature à 90 jours) déjà branchées sur les contrats |
| `src/pages/ClauseManager.tsx` | 3 clauses de démonstration codées en dur, faux chargement d'une seconde (`setTimeout`), créations en `useState` donc perdues au rafraîchissement, en-tête « Jurix.app », thème sombre étranger au reste de l'app | `src/components/ClauseLibrary.tsx` sur la table `public.clauses` |
| `src/components/ClauseEditor.tsx` | Bouton « Améliorer avec l'IA » **simulé** : attente de 2 s puis ajout de la mention « [Clause améliorée par IA - fonctionnalité en développement] » dans le texte | Rien : un assistant réel, ancré sur les données du tenant et identifié comme brouillon à valider, est le chantier R9 |
| `src/components/ClauseSidebar.tsx` | Doublon de navigation, lié à l'écran précédent | Liste intégrée à `ClauseLibrary` |
| `src/components/UserNav.tsx` | Menu utilisateur en doublon avec l'en-tête du tableau de bord | Bloc utilisateur existant (nom + déconnexion) |
| `src/types/clause.ts`, `src/lib/ai-utils.ts` | Types d'un autre produit (catégories « SaaS », « Travail »), exports liés aux clauses de démonstration, `any` non typés | `src/lib/clause-library.ts` (nomenclature bancaire, validation alignée sur les contraintes SQL, exports JSON/Markdown) |

`/legacy` et `/clauses` **redirigent** vers `/dashboard` au lieu de renvoyer un 404 :
les favoris et liens existants continuent d'aboutir.

---

## 2. Ce qui a été ajouté

### 2.1 Table `public.clauses` (migration)

| Aspect | Règle |
|---|---|
| Cloisonnement | `bank_id NOT NULL DEFAULT public.get_my_bank_id()` + RLS + trigger : impossible de créer, lire, modifier ou supprimer une clause d'une autre banque (sauf `super_admin` en support) |
| Attribution | `created_by` et `updated_by` imposés à `auth.uid()` par le trigger — jamais par le navigateur |
| Banque immuable | `UPDATE` de `bank_id` refusé (`42501`) : on ne déplace pas une clause d'un tenant à l'autre |
| Versionnement | `version` incrémentée **uniquement** si le titre ou la rédaction change ; un changement d'étiquettes ou d'activation ne consomme pas de version |
| Unicité | Index unique partiel `(bank_id, lower(btrim(title))) WHERE is_active` : pas de doublon visible, sans bloquer une clause désactivée homonyme |
| Contenu exploitable | `CHECK` : titre ≥ 3 caractères, rédaction ≥ 20 caractères, catégorie non vide, langue `fr`/`en`/`ar`, `version ≥ 1` |
| Suppression | Réservée à l'auteur ou à un administrateur (`bank_admin`, `super_admin`) : une bibliothèque partagée ne se vide pas au gré de chacun |
| Lecture | Index `(bank_id, category)`, `(bank_id, updated_at DESC)` et GIN sur `tags` |

Dépendance : `public.get_my_bank_id()` / `public.get_my_role()` créées par
`20260915120000-harden-security.sql` (R1).

### 2.2 Écran « Bibliothèque de clauses »

- Recherche plein texte locale (titre, rédaction, étiquettes), filtre par
  catégorie, option « inclure les clauses désactivées » ;
- nomenclature bancaire : garanties & sûretés, conditions financières,
  remboursement, défaut & exigibilité, assurances, conformité, confidentialité,
  résiliation, litiges & loi applicable ;
- édition avec validation **alignée sur les contraintes SQL** (le message
  affiché correspond au refus de la base), garde « modifications non
  enregistrées » avant de changer de clause, confirmation avant suppression ;
- « Copier le texte » pour réutiliser une clause dans un contrat, exports
  **JSON** et **Markdown** de la sélection filtrée — les deux sont journalisés
  (`data.export`) ;
- états distingués : squelette de chargement, erreur avec « Réessayer »
  (et l'indice de la migration à appliquer), bibliothèque vide, aucun résultat.

### 2.3 Tableau de bord : une seule coquille

Navigation par sections, 9 vues :

| Section | Vues | Accès |
|---|---|---|
| Pilotage | Vue d'ensemble, Contrats, Cycle de vie, Finances | tous les rôles |
| Référentiels | Bibliothèque de clauses, Modèles de contrat | tous les rôles |
| Administration | Utilisateurs, Piste d'audit, Marque & thème | `bank_admin` et `super_admin` (section masquée sinon, rendu refusé si l'état change en session) |

En-tête : marque `Logo` + « JURIX » + banque, recherche globale branchée sur la
liste, **Assistant IA** et **Générer** (Edge Functions authentifiées depuis R1),
sélecteur de langue (i18next est réellement initialisé : `src/i18n.ts` +
`public/locales/{fr,en,ar}`) remis aux couleurs de l'app, notifications avec
compte non lu réel.

---

## 3. Ordre d'application

```bash
# R1 → R2 → R3 → R4
supabase db push     # applique 20260917090000-clause-library.sql
```

Migration **additive et rejouable** (`CREATE TABLE IF NOT EXISTS`,
`CREATE OR REPLACE FUNCTION`, `DROP … IF EXISTS`, `CREATE INDEX IF NOT EXISTS`).
Aucune donnée existante n'est convertie, aucun arrêt n'est nécessaire.

> Effet d'une migration non appliquée : seul l'écran « Bibliothèque de clauses »
> affiche un état d'erreur avec « Réessayer » et l'indice du fichier à jouer.
> Le tableau de bord, la liste, la fiche contrat et le Kanban ne dépendent pas
> de cette table.

---

## 4. Vérifications après déploiement

```sql
-- 4.1 Cloisonnement : aucune clause d'une autre banque
SELECT count(*) FROM public.clauses
 WHERE bank_id <> public.get_my_bank_id()
   AND public.get_my_role() <> 'super_admin';              -- doit renvoyer 0

-- 4.2 Création pour une autre banque refusée
INSERT INTO public.clauses (bank_id, title, content, category)
VALUES ('<autre_bank_id>', 'Test', 'Contenu de test suffisamment long', 'garanties');
-- → erreur 42501

-- 4.3 Auteur imposé (la valeur fournie est ignorée ou refusée)
INSERT INTO public.clauses (title, content, category, created_by)
VALUES ('Test', 'Contenu de test suffisamment long', 'garanties', '<autre_user_id>');
SELECT created_by = auth.uid() FROM public.clauses WHERE title = 'Test';  -- true

-- 4.4 Versionnement : éditorial seulement
UPDATE public.clauses SET content = content || ' (précision)' WHERE id = '<id>';
SELECT version FROM public.clauses WHERE id = '<id>';      -- 1 → 2
UPDATE public.clauses SET tags = ARRAY['revu'] WHERE id = '<id>';
SELECT version FROM public.clauses WHERE id = '<id>';      -- reste 2

-- 4.5 Banque immuable
UPDATE public.clauses SET bank_id = '<autre_bank_id>' WHERE id = '<id>';   -- 42501

-- 4.6 Doublon de titre actif refusé
INSERT INTO public.clauses (title, content, category)
VALUES ('Test', 'Contenu de test suffisamment long', 'garanties');
-- → violation d'unicité clauses_bank_title_uniq

-- 4.7 Contraintes de contenu
INSERT INTO public.clauses (title, content, category) VALUES ('ab', 'x', 'garanties');
-- → clause_title_not_blank / clause_content_not_blank

-- 4.8 Suppression par un non-auteur non administrateur
DELETE FROM public.clauses WHERE created_by <> auth.uid();  -- 0 ligne
```

Contrôles côté interface :

1. Créer une clause, recharger la page : elle est toujours là (avant : perdue).
2. Modifier la rédaction et enregistrer : la version passe de 1 à 2 ; modifier
   seulement les étiquettes : la version ne bouge pas.
3. Changer de clause avec une rédaction non enregistrée : la boîte de dialogue
   « Modifications non enregistrées » propose Enregistrer / Abandonner / Annuler.
4. Se connecter avec un rôle non administrateur : la section « Administration »
   n'apparaît pas dans la navigation.
5. Ouvrir `/legacy` ou `/clauses` : redirection vers `/dashboard`, pas de 404.
6. Exporter en Markdown : le fichier contient les clauses filtrées, leur
   catégorie, leur version et leur rédaction.

---

## 5. Retrait (rollback)

```sql
DROP TRIGGER IF EXISTS trigger_clause_audit_fields ON public.clauses;
DROP FUNCTION IF EXISTS public.set_clause_audit_fields();
DROP TABLE IF EXISTS public.clauses;   -- ⚠ supprime la bibliothèque
```

Le retrait du code (écrans de clauses, coquille unique) se fait par retour au
commit précédent ; aucune autre table n'est concernée.

---

## 6. Limites assumées (chantiers suivants)

| Limite | Suite prévue |
|---|---|
| Les KPI du tableau de bord sont calculés dans le navigateur à partir du portefeuille complet (une requête partagée) | R4.1 — RPC `contract_kpis(p_bank_id)` : agrégats en SQL, charge utile minimale |
| Recherche de clauses en mémoire (volume attendu : centaines de lignes) | R7.1 — index trigramme `gin_trgm_ops` et RPC de recherche à facettes |
| Une seule coquille, mais pas encore d'URL par écran : l'état de vue n'est pas partageable | R6.1 — routes `/app/*` et `/admin/*` avec gardes par rôle, filtres dans l'URL (R7.3) |
| Clauses non liées aux contrats ni aux modèles | R14.1 — bibliothèque versionnée, insertion dans les modèles, détection d'écart au playbook |
| La landing porte encore « Contract Manager », des témoignages invérifiables et un formulaire non branché | R20.1 — identité JURIX, preuves réelles, pages légales |
| Assistant IA et générateur de contrat restent des fonctions séparées (quota et journalisation posés en R1) | R9 — extraction au dépôt, ancrage sur les données du tenant, mention « brouillon à valider » |
