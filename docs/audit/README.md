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

## Reproduction des mesures

```bash
npm install
npm run build                              # 1 309 kB (382 kB gzip) en un seul chunk
npx tsc --noEmit -p tsconfig.app.json      # 21 erreurs
npx eslint .                               # 53 erreurs, 8 warnings
grep -rn "console.log" src | wc -l         # 16
```
