# Audit JURIX / Contract Bank Pro — septembre 2026

Ce dossier contient l'audit produit complet et le plan d'amélioration qui en découle.

| Fichier | Contenu | Pour qui |
|---|---|---|
| [`AUDIT-JURIX.md`](./AUDIT-JURIX.md) | Audit complet : synthèse exécutive et scoring, forces, 8 familles de faiblesses avec preuves (fichier:ligne), benchmark de 6 références du marché (Ironclad, Juro, LinkSquares, Evisort, ContractSafe, DocuSign CLM), matrice fonctionnelle, 10 patterns à importer, plan priorisé R1→R20 avec spécifications et critères d'acceptation, feuille de route 90 jours, KPI, annexes (registre de 52 défauts, snippets, définition de « terminé ») | Direction produit, tech lead, décideurs |
| [`backlog-priorise.csv`](./backlog-priorise.csv) | 69 tickets prêts à importer (séparateur `;`) : `id, priorité, sprint, titre, thème, problème, preuve, référence benchmark, action concrète, effort (j), impact, critère d'acceptation, dépendances` | Linear / Jira / GitHub Issues |

## Lecture en 60 secondes

- **Le produit est coupé en deux** *(résolu par R2 + R4 + R6.1)* : l'application qui fonctionne (`/legacy`) n'est liée nulle part ; après connexion on arrive sur une maquette (`/dashboard`) dont les chiffres sont codés en dur.
- **Le cœur métier n'est pas atteignable** *(résolu par R2 + R3)* : consulter, éditer, supprimer, télécharger un contrat ne fonctionne pas ; le Kanban ne persiste rien ; la recherche globale n'est pas branchée.
- **La sécurité bloque toute vente à une banque** : politiques RLS `TO public` sur les contrats, bucket de documents public, escalade de rôle possible, piste d'audit falsifiable, Edge Functions IA sans authentification (dont une avec `service_role`).
- **L'écart au marché est surtout un écart de câblage** : 7 tables et 5 écrans d'administration existent déjà pour les fonctionnalités manquantes (rappels, versions, commentaires, extractions IA avec score de confiance, workflow, intégrations).

## Ordre d'exécution recommandé

1. **S1 (semaines 1-2)** — R1 sécurité + R5 qualité (CI, type-check, ErrorBoundary)
2. **S2 (semaines 2-3)** — R2 intégrité des données + R3 CRUD complet + R4 suppression des données fantômes
3. **S3 (semaines 4-5)** — R6 une seule app (routes + ⌘K) + R11 design system + R12 accessibilité AA
4. **S4-S6** — R7 référentiel, R8 échéances/inbox, R9 IA vérifiable, R10 workflow & signature, puis P2

> Règle de pilotage : aucune fonctionnalité nouvelle (P2) ne démarre tant que le P0 n'est pas vert.

## Suivi d'implémentation

| Réf | Chantier | Statut | Où regarder |
|---|---|---|---|
| **R1** | Durcissement sécurité (RLS, storage privé, Functions authentifiées + quota, secrets, en-têtes) | ✅ **Implémenté** le 2026-09-16 — à déployer puis vérifier | `supabase/migrations/20260915120000-harden-security.sql`, `supabase/functions/_shared/guard.ts`, `src/lib/storage.ts`, `src/lib/audit-log.ts`, `public/_headers`, `.env.example` + runbook [`VERIFICATIONS-SECURITE.md`](./VERIFICATIONS-SECURITE.md) |
| **R2** | Cycle de vie unique des contrats + intégrité des données (énuméré SQL, matrice de transitions, historique, devise, référence immuable, rappels idempotents) | ✅ **Implémenté** le 2026-09-16 — à déployer **après** R1 (conversion de données : staging d'abord) | `supabase/migrations/20260916090000-contract-lifecycle-integrity.sql`, `src/lib/contract-status.ts`, `src/lib/contract-metrics.ts` + guide [`MIGRATION-R2-CYCLE-DE-VIE.md`](./MIGRATION-R2-CYCLE-DE-VIE.md) |
| **R5.1 / R5.2** | Filet de qualité : `strict` activé dans TypeScript + CI (type-check et build bloquants ; ESLint alors informatif, devenu bloquant au chantier R4) | ✅ **Implémenté** le 2026-09-16 | `tsconfig.app.json`, `tsconfig.json`, `.github/workflows/quality.yml` |
| **R3** | Fiche contrat pleine page `/contrats/:id` (6 onglets), commentaires par banque, versions de documents, liste **paginée/recherchée/triée côté serveur**, états d'erreur explicites, requêtes du tableau de bord mutualisées | ✅ **Implémenté** le 2026-09-16 — à déployer **après** R1 et R2 | `supabase/migrations/20260916150000-contract-collaboration.sql`, `src/pages/ContractDetail.tsx`, `src/hooks/useContracts.ts`, `src/hooks/useContractDetail.ts`, `src/hooks/useContractMutations.ts`, `src/components/ContractTable.tsx`, `src/components/ContractList.tsx`, `src/components/QueryErrorState.tsx` + guide [`MIGRATION-R3-FICHE-CONTRAT.md`](./MIGRATION-R3-FICHE-CONTRAT.md) |
| **R4** | Zéro donnée fantôme : bibliothèque de clauses **persistée** (table `clauses`, RLS par banque, version et auteur imposés), fausse « amélioration IA » supprimée, panneau d'alertes fictif retiré, `ClauseManager` de démonstration remplacé | ✅ **Implémenté** le 2026-09-17 — à déployer après R1 | `supabase/migrations/20260917090000-clause-library.sql`, `src/lib/clause-library.ts`, `src/hooks/useClauses.ts`, `src/components/ClauseLibrary.tsx` + guide [`MIGRATION-R4-CLAUSES-ET-COQUILLE-UNIQUE.md`](./MIGRATION-R4-CLAUSES-ET-COQUILLE-UNIQUE.md) |
| **R6.1 (partiel)** | Une seule coquille applicative : `/legacy` supprimé et redirigé, les écrans d'administration (utilisateurs, modèles, piste d'audit, marque) et l'IA deviennent des vues du tableau de bord avec droits par rôle | ✅ **Implémenté** le 2026-09-17 — routes `/app/*` et `/admin/*` restantes | `src/App.tsx`, `src/pages/Dashboard.tsx` (9 vues, navigation par sections) |
| **R5.1 / R5.4** | CI : ESLint devenu **bloquant** (dette purgée : 0 erreur) ; code mort et composants orphelins supprimés (Index, AlertsPanel, ClauseManager/Editor/Sidebar, UserNav, AppLogo, `types/clause.ts`, `lib/ai-utils.ts`) | ✅ **Implémenté** le 2026-09-17 | `.github/workflows/quality.yml` |
| R6.2 → R20 | Routes dédiées, palette ⌘K, référentiel, échéances, IA vérifiable, workflow, signature, design system, accessibilité, i18n, landing… | ⏳ À faire | `backlog-priorise.csv` |

Effets mesurés des chantiers R1 → R4 (avant → après) :

| Indicateur | Avant | Après |
|---|---|---:|
| Erreurs TypeScript (`npm run typecheck`) | 21 (en mode non strict) | **0**, avec `"strict": true` activé (`ui/chart.tsx`, composant vendu jamais importé, est exclu du contrôle) |
| Vérification automatique à chaque push | aucune (0 CI) | GitHub Actions `quality.yml` : type-check strict + build bloquants, ESLint informatif |
| Erreurs ESLint | 53 | **24** |
| Bundle JS (gzip) | 382 kB | **364 kB** (JSZip et l'appel OpenAI sortis du graphe ; la fiche contrat et le Kanban y sont désormais branchés) |
| URLs / clés en dur dans `src` | 3 | **0** |
| Endpoints IA sans authentification | 3 | **0** |
| Usages de `service_role` dans les Functions | 2 | **0** |
| Accès publics à un document (`getPublicUrl`) | 1 | **0** (URLs signées 60 s) |
| Actions tracées dans la piste d'audit | piste en écriture libre, non consultable | **16 actions** côté client (création, modification, consultation, statut, téléversement, téléchargement, remplacement, IA, connexion, déconnexion, réinitialisation MDP, archivage) + 4 côté serveur — écriture via `public.write_audit()` `SECURITY DEFINER`, auteur/horodatage/banque imposés par le serveur |
| Création d'un contrat | **impossible** (`23514 check_violation` : contrainte anglaise vs défaut `'en_cours'`) | fonctionnelle (énuméré `contract_status`, défaut `draft`) |
| Vocabulaires de statuts en concurrence | 3 (français métier, anglais générique, « actif/en_attente/expire/resilie ») | **1**, défini dans `src/lib/contract-status.ts` et en base |
| Contrôle des changements de statut | aucun (n'importe qui vers n'importe quoi) | matrice SQL `contract_status_transitions` + trigger par rôle + historique `contract_status_history` + motif métier |
| Devise d'un contrat | choisie puis **perdue** (toujours EUR), affichée « MAD » en dur, montants additionnés toutes devises confondues | écrite et modifiable, formatée par `Intl.NumberFormat`, totaux **par devise** |
| Données inventées dans les tableaux de bord | séries mensuelles codées en dur, « +12 % ce mois », « Contrat ABC Corp », « Payé/En attente/En retard », badge de notifications figé à 3 | **0** : tous les indicateurs proviennent des contrats réels |
| Kanban | colonnes vides (statuts inexistants), glisser-déposer = `console.log` | 4 phases réelles, déplacement persistant (optimiste + rollback), alternative clavier « Déplacer vers… » |
| Rappels de contrat | doublonnés à chaque UPDATE | idempotents (upsert + purge des rappels non envoyés) |
| Suppression d'un contrat | physique, sans confirmation, non tracée | logique (`deleted_at`) avec confirmation et audit |
| Fiche contrat depuis la liste | inaccessible (composant orphelin) | ouverte en un clic : édition, document signé, historique des statuts |
| Fiche contrat | aucune route dédiée, consultation = `TODO` | `/contrats/:id` : Aperçu, Garanties, Documents, Timeline, Commentaires, Rappels — rechargeable et partageable |
| Chargement de la liste | `select('*')` intégral, plafonné à 1 000 lignes par PostgREST, filtres et pagination recalculés dans le navigateur | `.range()` + `count=exact` : seule la page affichée est transférée (25/50/100), recherche `ilike` débouncée 300 ms, tri serveur sur 5 colonnes |
| Requêtes du tableau de bord | 4 `select('*')` distincts (Kanban, synthèse, financier, échéances), 3 clés de cache | **1 requête** partagée (`['contracts','all']`), invalidation unique par préfixe `['contracts']` |
| Barre de recherche de l'en-tête | `onSubmit` vide, filtres « priorité » et « période » inexistants en base | branchée sur la liste (même état, même requête serveur) |
| Erreur réseau ou refus RLS | « Aucun contrat disponible » (faux vide) | état d'erreur explicite avec bouton « Réessayer » |
| Commentaires de contrat | table jamais câblée, aucune interface | onglet dédié : publication et suppression par l'auteur ou un administrateur, périmètre banque vérifié en base |
| Versions de documents | remplacement sans historique, numéro de version saisi par le client | l'ancien fichier est archivé et reste téléchargeable ; numéro attribué par trigger + unicité `(contract_id, version_number)` ; écriture directe dans `contract_reminders` révoquée |
| Bibliothèque de clauses | 3 clauses de démonstration codées en dur, faux chargement d'une seconde, créations perdues au rafraîchissement | table `public.clauses` : périmètre par banque, auteur et version imposés par trigger, unicité du titre, exports JSON/Markdown journalisés |
| « Amélioration IA » d'une clause | simulation (attente de 2 s puis ajout de « fonctionnalité en développement » dans le texte) | supprimée : aucun bouton ne promet une capacité absente (l'assistant réel est le chantier R9) |
| Panneau d'alertes | 4 alertes inventées (`CT-2024-004`, certificats et délais fictifs) | supprimé ; le tableau de bord affiche les contrats réellement en `alert` et les échéances/renouvellements/signatures à 90 jours |
| Coquilles applicatives | 2 (`/dashboard` et `/legacy`, ce dernier seul accès aux écrans d'administration) | **1** : 9 vues dans le tableau de bord, `/legacy` et `/clauses` redirigent |
| Écrans d'administration | atteignables uniquement par une route orpheline, sans contrôle d'accès à l'écran | vues « Utilisateurs », « Piste d'audit », « Marque & thème » réservées à `bank_admin`/`super_admin` (section masquée + rendu refusé) |
| Identité produit | « JURIX », « CONTRACT MANAGER » et « Jurix.app » cohabitaient | JURIX dans toute l'app (en-tête, assistant IA, écran de marque) ; la landing reste à reprendre (R20.1) |
| White-label | logo de banque jamais affiché | `banks.logo_url` rendu dans l'en-tête (`BankLogo`), repli neutre accessible |
| Erreurs ESLint | 53 à l'audit, 24 après R1/R2, 17 en cours de R4 | **0** (8 avertissements `react-refresh` documentés) — l'étape lint de la CI est redevenue bloquante |
| Code mort | 16 `console.log`, 6 composants orphelins, maquette `/legacy` de 215 lignes | 0 `console.log`, 0 composant orphelin, maquette supprimée |
| Bundle JS (gzip) après R3/R4 | 372 kB | **371 kB** (bibliothèque de clauses ajoutée, ~1 500 lignes de maquette retirées) |
## Reproduction des mesures

```bash
npm install
npm run build                              # 1 275 kB (371 kB gzip) en un seul chunk
npx tsc --noEmit -p tsconfig.app.json      # 21 erreurs
npx eslint .                               # 0 erreur, 8 warnings (react-refresh)
grep -rn "console.log" src | wc -l         # 16
```
