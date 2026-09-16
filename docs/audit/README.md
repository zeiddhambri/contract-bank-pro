# Audit JURIX / Contract Bank Pro — septembre 2026

Ce dossier contient l'audit produit complet et le plan d'amélioration qui en découle.

| Fichier | Contenu | Pour qui |
|---|---|---|
| [`AUDIT-JURIX.md`](./AUDIT-JURIX.md) | Audit complet : synthèse exécutive et scoring, forces, 8 familles de faiblesses avec preuves (fichier:ligne), benchmark de 6 références du marché (Ironclad, Juro, LinkSquares, Evisort, ContractSafe, DocuSign CLM), matrice fonctionnelle, 10 patterns à importer, plan priorisé R1→R20 avec spécifications et critères d'acceptation, feuille de route 90 jours, KPI, annexes (registre de 52 défauts, snippets, définition de « terminé ») | Direction produit, tech lead, décideurs |
| [`backlog-priorise.csv`](./backlog-priorise.csv) | 69 tickets prêts à importer (séparateur `;`) : `id, priorité, sprint, titre, thème, problème, preuve, référence benchmark, action concrète, effort (j), impact, critère d'acceptation, dépendances` | Linear / Jira / GitHub Issues |

## Lecture en 60 secondes

- **Le produit est coupé en deux** : l'application qui fonctionne (`/legacy`) n'est liée nulle part ; après connexion on arrive sur une maquette (`/dashboard`) dont les chiffres sont codés en dur.
- **Le cœur métier n'est pas atteignable** : consulter, éditer, supprimer, télécharger un contrat ne fonctionne pas ; le Kanban ne persiste rien ; la recherche globale n'est pas branchée.
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
| R3 → R20 | CRUD complet, référentiel, échéances, IA, workflow, design system, accessibilité, i18n… | ⏳ À faire | `backlog-priorise.csv` |

Effets mesurés des chantiers R1 + R2 (avant → après) :

| Indicateur | Avant | Après |
|---|---|---:|
| Erreurs TypeScript (`npm run typecheck`) | 21 | **5** (toutes dans le composant vendu `ui/chart.tsx`) |
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
## Reproduction des mesures

```bash
npm install
npm run build                              # 1 309 kB (382 kB gzip) en un seul chunk
npx tsc --noEmit -p tsconfig.app.json      # 21 erreurs
npx eslint .                               # 53 erreurs, 8 warnings
grep -rn "console.log" src | wc -l         # 16
```
