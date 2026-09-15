# Audit produit & plan d'amélioration — JURIX / Contract Bank Pro

**Date de l'audit** : 15 septembre 2026
**Périmètre** : dépôt `zeiddhambri/contract-bank-pro`, branche `arena/01a0a52a-contract-bank-pro`, commit `28f1377`
**Méthode** : lecture intégrale du code (150 fichiers, ~15 500 lignes), build de production réel, `tsc --noEmit`, ESLint, analyse des migrations SQL / politiques RLS / Edge Functions, benchmark marché CLM
**Livrables associés** : `docs/audit/backlog-priorise.csv` (backlog prêt à importer dans Linear/Jira/GitHub Issues)

---

## 0. Fiche d'identité du produit audité

| | |
|---|---|
| **Type** | Application web B2B (SPA React) + backend Supabase, packaging mobile Capacitor prévu |
| **Objectif** | Gestion du cycle de vie des contrats de financement bancaire (CLM sectoriel) : saisie des contrats de crédit, garanties, références de décision, documents, alertes, piste d'audit |
| **Utilisateurs cibles** | Banques / établissements de crédit multi-agences : agents de back-office, managers, valideurs, auditeurs, administrateurs de banque, super admin éditeur |
| **Promesse affichée** | « La plateforme de gestion de contrats la plus avancée pour les institutions financières » (`src/pages/Landing.tsx:165`) |
| **Stack** | Vite 5 · React 18 · TypeScript · shadcn/ui + Radix · Tailwind · TanStack Query · React Hook Form + Zod · Supabase (Postgres, RLS, Storage, Edge Functions) · i18next · Recharts · Capacitor |
| **Modèle de données** | 10 tables typées (`contracts`, `banks`, `profiles`, `audit_logs`, `contract_templates`, `template_fields`, `template_workflow_steps`, `organization_branding`, `ai_contract_templates`, `ai_contract_generations`) + 7 tables créées par migration mais **absentes des types générés** (`notifications`, `contract_comments`, `contract_versions`, `contract_reminders`, `integrations`, `dashboard_widgets`, `contract_ai_extractions`) |
| **Rôles prévus** | `super_admin`, `bank_admin`, `manager`, `validator`, `auditor`, `user` |
| **Marques présentes dans le code** | JURIX, Contract Manager, CONTRACT MANAGER, « Contract Bank Pro » — 4 identités pour 1 produit |

### Ce qui a été mesuré (pas estimé)

| Indicateur | Valeur mesurée | Commande |
|---|---|---|
| Build de production | ✅ passe en 11,4 s | `npm run build` |
| **Taille du bundle JS** | **1 309 kB (382 kB gzip) — un seul chunk** | `dist/assets/index-*.js` |
| CSS | 87,7 kB (14,3 kB gzip) | idem |
| **Erreurs TypeScript** | **21** (le build ne type-check pas) | `npx tsc --noEmit -p tsconfig.app.json` |
| **Erreurs ESLint** | **53 erreurs + 8 avertissements** | `npx eslint .` |
| Tests automatisés | **0** (aucun framework de test installé, aucun script `test`) | `package.json` |
| CI / CD | **0** (pas de `.github/`) | `ls -a` |
| Clés de traduction i18n | **5 clés** × 3 langues ; **0 appel à `t()`** dans l'UI | `public/locales/*/translation.json` |
| Composants métier orphelins (jamais importés) | **6** (`ContractDetailDialog`, `AppLogo`, `BankLogo`, `useContractExtraction`, `useNotifications`, `use-platform`) | script de détection d'imports |
| Composants `ui/` shadcn installés mais jamais utilisés | **28** (dont `command`, `pagination`, `alert-dialog` hors templates, `sidebar`, `drawer`, `skeleton`, `progress`) | idem |
| Dépendances lourdes jamais importées | `jspdf`, `jspdf-autotable`, `xlsx` | `grep -rn "jspdf\|xlsx" src` |
| `console.log` de debug laissés | 16 | `grep -rn "console\." src` |

---

## 1. Synthèse exécutive

### 1.1 Verdict

JURIX est aujourd'hui **un prototype de démonstration riche en intentions, pas un produit livrable à une banque**. Le socle technique est bon et le modèle de données anticipe les bonnes fonctionnalités (multi-tenant, templates à champs dynamiques, workflow d'approbation, extractions IA avec score de confiance, rappels, versions, commentaires, audit). Mais trois ruptures empêchent la mise en production :

1. **Le produit est coupé en deux.** L'application qui fonctionne (`/legacy`, thème sombre, 8 onglets, création de contrat, IA, templates, branding, admin) est **orpheline : aucun lien n'y mène**. Après connexion, l'utilisateur arrive sur `/dashboard` (`src/App.tsx:76`), une maquette claire dont les données sont **codées en dur** (« Contrat ABC Corp — Expire dans 5 jours », `src/pages/Dashboard.tsx:46`), avec un bouton « Nouveau Contrat » **sans handler** (`Dashboard.tsx:186-191`), un réglage `onClick={() => {}}` (`:146`) et un badge de notifications figé à « 3 » (`:139`).
2. **Le cœur métier (lire / modifier / supprimer un contrat) n'est pas atteignable.** Le bouton œil de la table n'affiche rien (`// TODO: Implement contract detail view`, `src/components/ContractTable.tsx:92`), le bouton de téléchargement n'a aucun `onClick` (`:209-215`), et le composant qui sait éditer/supprimer (`ContractDetailDialog`) n'est importé nulle part. Le glisser-déposer du Kanban **ne persiste rien** (`ContractKanban.tsx:78` : un `console.log`).
3. **La sécurité n'est pas au niveau d'un contexte bancaire.** Des politiques RLS `TO public` autorisent **n'importe qui, sans compte**, à lire/modifier/supprimer les contrats (`supabase/migrations/20250615114558…sql:5-27`) ; le bucket de documents est en **lecture publique** (`…20250615191823…sql:8-12`) ; un utilisateur peut **s'auto-promouvoir `super_admin`** (`…20250615194949…sql:94`, politique `FOR ALL` sur son propre profil) ; les Edge Functions IA sont en **`Access-Control-Allow-Origin: *` sans contrôle d'authentification** et l'une d'elles utilise la **clé `service_role`** (contournement total de la RLS).

### 1.2 Grille de notation

| Dimension | Note /10 | Justification synthétique |
|---|---:|---|
| Valeur métier & complétude | **3,5** | Le domaine bancaire est bien modélisé (garanties, hypothèques, références de décision, agences), mais CRUD incomplet, alertes/analyses fictives, templates et branding déconnectés |
| Fiabilité & intégrité des données | **2** | 3 vocabulaires de statuts incompatibles, contrainte CHECK qui rejette les statuts de l'app, devise saisie mais jamais enregistrée, `profiles.created_at` inexistant, types générés désynchronisés |
| Sécurité & conformité | **1,5** | RLS publiques, bucket public, escalade de rôle, audit falsifiable, Functions sans auth, clé en dur, pas de MFA/SSO, pas de mentions légales |
| UX & parcours | **3** | Boutons morts, données fantômes, recherche non branchée, pas de pagination, pas d'états d'erreur, pas de confirmation de suppression |
| Cohérence UI & design | **3** | Deux design systems (sombre/orange-rouge vs clair/bleu), 4 noms de produit, EUR et MAD mélangés, tokens sémantiques + classes en dur |
| Performance | **4** | 382 kB gzip en un seul chunk, `select('*')` sans pagination, 2 polices Google render-blocking, 180 divs aléatoires sur la landing |
| Accessibilité (WCAG 2.2 AA) | **2,5** | Boutons icône sans libellé, `<select>` sans label, drag & drop sans alternative clavier (2.5.7), statuts portés par la couleur seule, RTL cassé |
| Internationalisation | **1,5** | Infra installée, 5 clés, 0 `t()` ; l'arabe bascule `dir=rtl` sans aucun style RTL |
| Qualité logicielle / DX | **3** | 21 erreurs TS, 53 erreurs lint, 0 test, 0 CI, build sans type-check, README Lovable par défaut |
| **Score global pondéré** | **2,7 / 10** | Prototype → produit : le chemin est connu et court si l'on séquence bien |

### 1.3 Les 10 constats qui changent tout

| # | Constat | Preuve | Impact utilisateur |
|---|---|---|---|
| 1 | L'app fonctionnelle est inaccessible (route `/legacy` sans lien) | `src/App.tsx:93`, aucun `to="/legacy"` dans le code | 100 % des fonctionnalités réelles invisibles |
| 2 | Le tableau de bord post-login est une maquette aux données codées en dur | `Dashboard.tsx:44-88`, `:104`, `:139`, `:146` | Perte de confiance immédiate, décisions sur du faux |
| 3 | Lire / éditer / supprimer / télécharger un contrat est impossible | `ContractTable.tsx:92`, `:209` ; `ContractDetailDialog.tsx` orphelin | Le produit ne fait pas son métier |
| 4 | RLS `TO public` sur `contracts` (lecture + écriture anonymes) | `migrations/20250615114558…sql:5-27` | Fuite et altération de données bancaires |
| 5 | Auto-escalade de rôle possible (`profiles FOR ALL USING (id = auth.uid())`) | `migrations/20250615194949…sql:94` | N'importe quel utilisateur devient super admin |
| 6 | 3 vocabulaires de statuts incompatibles + contrainte CHECK qui rejette ceux de l'app | `lib/contract-helpers.ts:19-31` vs `ContractTable.tsx:38-56` vs `migrations/20250705115709…sql:102-104` | Création de contrat potentiellement bloquée, KPI à 0 |
| 7 | Documents contractuels en bucket **public** | `migrations/20250615191823…sql:8-12` | Violation du secret bancaire / RGPD |
| 8 | Edge Functions IA : CORS `*`, aucune vérification d'auth, appel client sans header `Authorization` | `functions/ai-assistant-chat/index.ts:5-7`, `AiAssistantSheet.tsx:62-68` | Soit la fonction renvoie 401 (feature morte), soit elle est ouverte à tous (coût OpenAI illimité) |
| 9 | i18n factice : le sélecteur de langue ne traduit rien et casse la mise en page en arabe | `public/locales/*` (5 clés), 0 `t()`, `LanguageSwitcher.tsx:28-31` | Promesse FR/EN/AR non tenue |
| 10 | Aucune garantie qualité : 0 test, 0 CI, build sans type-check, 21 erreurs TS | `package.json:8`, `npx tsc --noEmit` | Régressions invisibles jusqu'en production |

---

## 2. État des lieux détaillé

### 2.1 Forces réelles (à préserver absolument)

Ce ne sont pas des détails : ce sont des actifs qui réduisent fortement le coût du plan d'amélioration.

| Force | Preuve | Pourquoi c'est précieux |
|---|---|---|
| **Stack moderne et adaptée au B2B** | `package.json` : Vite + React 18 + TS strict + TanStack Query + RHF/Zod + shadcn/Radix + Supabase | Aucune dette de framework ; les 9 `useQuery`/`useMutation` montrent déjà les bons réflexes (cache, invalidation, états de mutation) |
| **Multi-tenancy pensée au niveau base** | `banks`, `profiles.bank_id`, `get_my_role()`, `get_my_bank_id()` (SECURITY DEFINER + `search_path` figé), politiques par banque | Le modèle SaaS multi-banques est le bon ; il « suffit » de le verrouiller (cf. R1) |
| **Modèle de données qui anticipe les bonnes features** | `migrations/20250705115709…sql` : `notifications`, `contract_comments`, `contract_versions`, `contract_reminders`, `contract_ai_extractions` (avec `confidence_score`, `reviewed_by`, `is_verified`), `dashboard_widgets`, `integrations` | Ce sont exactement les objets des leaders du marché (obligations, rappels, versions, extraction avec revue humaine). Le schéma existe déjà : il manque le câblage UI |
| **Templates à champs dynamiques + workflow** | `contract_templates`, `template_fields` (`field_type`, `field_options`, `is_required`, `display_order`), `template_workflow_steps` + 5 composants d'administration dédiés | Base d'un vrai moteur de génération de contrats et d'approbation conditionnelle (pattern Ironclad/Agiloft) |
| **Validation de formulaire conditionnelle** | `lib/contractFormSchema.ts:19-38` (Zod `superRefine` : type + détails obligatoires si hypothèque) | Logique métier bancaire déjà exprimée ; réutilisable telle quelle |
| **Piste d'audit immuable par conception** | `migrations/20250615210615…sql` : SELECT admin uniquement, **aucune** politique UPDATE/DELETE | Bonne intention de non-répudiation ; à compléter (R1.5, R10) |
| **Automatisation côté serveur** | triggers `set_reference_decision` (référence auto `CT-AAAA-NNN`) et `create_contract_reminders` (rappels J-30 / J-60) | L'automatisation est au bon endroit (base), pas dans le client |
| **Kit UI complet déjà installé** | 28 composants shadcn non utilisés, dont `command` (cmdk), `pagination`, `alert-dialog`, `drawer`, `sidebar`, `skeleton`, `progress`, `tooltip` | Les briques des recommandations R3, R6, R7 sont **déjà dans `node_modules`** : coût d'implémentation faible |
| **Infra i18n en place** | `i18next` + `LanguageDetector` + `HttpApi`, 3 fichiers de locales, `document.documentElement.dir` géré | Il ne manque que les clés et la discipline `t()` (R13) |
| **IA côté serveur, clé hors du client** | `functions/*/index.ts` : `Deno.env.get('OPENAI_API_KEY')` | Bon réflexe de sécurité (à compléter par l'auth, R9) |
| **Identité visuelle marquante** | Thème sombre « JURIX » + accent orange/rouge, `Logo`, `AppLogo`, `BankLogo`, `OrganizationBrandingManager` | Différenciation visuelle réelle face aux CLM génériques ; à transformer en design system unique (R11) |

### 2.2 Faiblesses — A. Parcours utilisateur et fonctionnalités inachevées

> **Le problème n°1 n'est pas l'esthétique, c'est que le produit ne tient pas ses promesses de bout en bout.**

| # | Friction | Preuve (fichier:ligne) | Conséquence |
|---|---|---|---|
| A1 | Deux applications parallèles ; la riche est orpheline | `App.tsx:76` (`/dashboard`) vs `App.tsx:93` (`/legacy`) ; aucun lien vers `/legacy` | L'utilisateur connecté ne voit jamais la création de contrat, l'IA, les templates, l'admin, l'audit |
| A2 | Bouton « Nouveau Contrat » du dashboard sans action | `Dashboard.tsx:186-191` (pas d'`onClick`) | Action primaire morte sur l'écran d'accueil |
| A3 | Icône réglages morte | `Dashboard.tsx:144-147` (`onClick={() => {}}`) | Aucun accès aux préférences (langue, thème, notifications, mot de passe) |
| A4 | Badge notifications figé à « 3 » | `Dashboard.tsx:139` | Faux signal d'activité |
| A5 | « Contrats en Alerte » / « Prochaines Échéances » codés en dur, datés de mars 2024 | `Dashboard.tsx:44-88` | Décisions prises sur des données inventées |
| A6 | Onglet « Analytiques » = texte « en cours de développement » | `Dashboard.tsx:100-107` | Promesse non tenue dans la navigation principale |
| A7 | Consultation d'un contrat : `TODO` + `console.log` | `ContractTable.tsx:90-93`, `:202` | Clic sans effet = produit perçu comme cassé |
| A8 | Téléchargement du document : aucun handler | `ContractTable.tsx:207-215` | Le fichier uploadé est irrécupérable depuis l'UI |
| A9 | Édition / suppression inexistantes dans l'UI (mutations écrites, jamais appelées) | `ContractList.tsx:29-84` (mutations) ; `ContractDetailDialog.tsx` orphelin | Code mort + fonctionnalité manquante |
| A10 | Kanban : le drag & drop ne persiste pas | `ContractKanban.tsx:74-81` (`console.log` seul) | L'utilisateur croit changer un statut ; rien n'est écrit |
| A11 | Kanban : `priority` et `tags` inventés côté client | `ContractKanban.tsx:33-37` (`priority: 'medium'`, `tags: []`) | Filtres/facettes illusoires |
| A12 | Recherche globale du header : `console.log` uniquement, filtres non branchés, panneau qui ne se ferme ni au clic extérieur ni à Échap | `SearchBar.tsx:19-22`, `:66+` | Fonction la plus attendue d'un CLM absente |
| A13 | Recherche de la table : 3 champs seulement (client, type, référence), pas de montant/garantie/agence/description, pas de pagination, pas de tri, filtrage 100 % client sur un `select('*')` | `ContractTable.tsx:76-88`, `ContractList.tsx:10-17` | Inutilisable au-delà de quelques centaines de contrats |
| A14 | Panneau « Alertes » 100 % statique (4 alertes de juin 2024), bouton « Traiter » sans action, compteurs codés en dur | `AlertsPanel.tsx:8-49`, `:76-80`, `:126-128` | La promesse « ne ratez plus une échéance » n'existe pas |
| A15 | `ContractAlertCreator` et la table `contract_reminders` jamais exploités par le panneau d'alertes | `AlertsPanel.tsx` (aucun import Supabase) | Deux systèmes d'alertes disjoints |
| A16 | Bibliothèque de clauses : données de démo en `useState`, aucune persistance | `ClauseManager.tsx:28-77` | Tout est perdu au rafraîchissement |
| A17 | « Amélioration IA » d'une clause simulée par un `setTimeout` + texte ajouté | `ClauseEditor.tsx:77-86` | **Dark pattern** : l'UI annonce un succès IA qui n'a pas eu lieu |
| A18 | `AIService` lit `process.env` dans le navigateur | `lib/ai-utils.ts:10` (`NEXT_PUBLIC_OPENAI_API_KEY`) | Variable Vite inexistante (`import.meta.env`) ; service IA de clauses inutilisable, et conceptuellement dangereux (appel OpenAI direct depuis le client) |
| A19 | Branding white-label écrit en base mais jamais lu par l'app | `OrganizationBrandingManager.tsx` vs `grep logo_url\|primary_color` (0 lecture hors manager) | L'admin configure un logo/couleurs qui ne s'appliquent nulle part |
| A20 | Modèles de contrats gérés mais jamais proposés à la création | `CreateContractDialog.tsx` (aucune référence à `contract_templates`) | 5 composants d'administration de templates sans débouché |
| A21 | Pas d'état d'erreur sur la liste principale : une erreur réseau affiche « Aucun contrat disponible » | `ContractTable.tsx:96-101` + `ContractList.tsx` (pas de `isError`) | L'utilisateur croit sa base vide |
| A22 | Aucune confirmation avant action destructive, aucun `AlertDialog` sur les contrats | `grep window.confirm` = 0 ; `alert-dialog` utilisé uniquement dans `ContractTemplateManager` | Risque de suppression irréversible |
| A23 | Administration des utilisateurs : requête triée sur une colonne inexistante | `UserManagementPanel.tsx:33` (`.order('created_at')` alors que `profiles` n'a que `updated_at`, cf. `types.ts:363-372`) | Le panneau admin échoue systématiquement |
| A24 | Inscription : mot de passe différent → `return` silencieux, aucun message | `Auth.tsx:35-38` | Utilisateur bloqué sans comprendre |
| A25 | Pas d'état de chargement sur les soumissions (double-submit possible), pas d'autocomplétion, pas de force de mot de passe, pas de MFA/SSO | `Auth.tsx:127-135`, `:200-208` | Friction + non-conformité aux attentes d'une banque |
| A26 | Landing : formulaire de contact sans état, sans handler, sans validation, inputs sans `<label>` | `Landing.tsx:175-195` | Prospect perdu, et non-conforme RGPD/accessibilité |
| A27 | Landing : liens « Produit / Tarifs / Ressources » et footer entier non cliquables | `Landing.tsx:141-152`, `:340-375` | Vitrine sans chemin de conversion |
| A28 | `usePlatform` (Capacitor) et `mobile.css` : code mort | `use-platform.tsx` jamais importé ; 0 occurrence de `safe-area-*`, `mobile-touch-button` dans `src` | Le récit « mobile » n'existe pas dans le produit |

### 2.3 Faiblesses — B. Cohérence (design, navigation, flux)

| Rupture | Détail | Preuve |
|---|---|---|
| **Deux design systems** | `/legacy` = fond dégradé slate-900 + accents orange→rouge + tabs ; `/dashboard` = `bg-gray-50`, cartes blanches, accents bleus, sidebar ; `:root` de `index.css` défend un thème **sombre** par défaut | `index.css:11-40` vs `Dashboard.tsx:110` |
| **Quatre noms de produit** | « JURIX » (landing, auth, dashboard), « Contract Manager » (index.html, landing footer), « CONTRACT MANAGER » (legacy), « contract-bank-pro » (repo/Capacitor) | `Landing.tsx:139`, `index.html:6`, `Index.tsx:66`, `capacitor.config.ts:5` |
| **Trois vocabulaires de statuts** | App : `en_cours`, `attente_signature`, `valide`, `alerte`, `documents_manquants`, `en_cours_de_signature_b/c`, `en_attente_inscription_hypotheque`, `assurance_manquante`, `refus_client` · Table : `actif`, `en_attente`, `expire`, `resilie` · DB : `draft`, `review`, `approval`, `active`, `expired`, `renewed`, `cancelled`, `pending_signature`, `signed` | `contract-helpers.ts:19-31` · `ContractTable.tsx:38-70` · `migrations/20250705115709…sql:102-104` |
| **Deux devises par défaut** | `formatCurrency()` suffixe **MAD** en dur ; `DashboardStats`/`FinancialDashboard`/`ContractKanban` formatent en **EUR** ; le champ `currency` saisi n'est jamais écrit en base | `contract-helpers.ts:57-60` · `DashboardStats.tsx:48-53` · `CreateContractDialog.tsx:104-117` |
| **Vocabulaire métier inadapté à une banque** | « Chiffre d'Affaires Total », « Revenus Actifs » pour des encours de crédit ; `Euro` icon alors que le marché visé est MAD/TND | `FinancialDashboard.tsx:93-115`, `DashboardStats.tsx:6` |
| **Langue incohérente** | `AuditLogPanel` entièrement en anglais (« Loading audit trail… », « No audit logs found ») dans une app en français | `AuditLogPanel.tsx:34-36`, `:56` |
| **Navigation non router-based** | Onglets et vues en `useState` : aucune URL partageable, aucun retour arrière, aucun deep link, état perdu au rafraîchissement | `Index.tsx:105-160`, `Dashboard.tsx:16` |
| **Hiérarchie d'information plate** | 8 onglets au même niveau (Contrats, Clauses, Statistiques, Alertes, Audit, Modèles, Branding, Administration) : le quotidien (contrats, à traiter) est noyé dans l'administration | `Index.tsx:107-158` |
| **Densité non maîtrisée** | Table 7 colonnes sans densité configurable, sans colonnes masquables, sans total/encours en pied de tableau | `ContractTable.tsx:130-220` |
| **KPI incohérents entre écrans** | `DashboardStats` et `FinancialDashboard` recalculent chacun leurs totaux avec des filtres de statuts différents (et faux) | `DashboardStats.tsx:23-27` vs `FinancialDashboard.tsx:23-26` |

### 2.4 Faiblesses — C. Données & intégrité

| # | Défaut | Preuve | Risque |
|---|---|---|---|
| C1 | **Contrainte CHECK incompatible avec l'app** : le défaut DB est `'en_cours'` et l'app n'envoie aucun `statut` ; la migration de juillet interdit cette valeur | `migrations/20250611…sql:13` vs `migrations/20250705…sql:102-104` vs `CreateContractDialog.tsx:104-117` | INSERT rejeté (`23514 check violation`) → **création de contrat cassée** ; et si des lignes existaient, la migration elle-même échoue |
| C2 | **Migration probablement jamais appliquée** : les 7 tables et 9 colonnes ajoutées en juillet sont absentes des types générés | `types.ts` (0 occurrence de `notifications`, `contract_value`, `renewal_date`, `tags`…) | `NotificationCenter`, `useNotifications`, `ContractKanban` ciblent un schéma qui n'existe peut-être pas → 21 erreurs TS |
| C3 | `reference_decision` **UNIQUE global**, générateur `MAX()+1` sans verrou ni périmètre banque | `migrations/20250611…sql:5`, `:51-68` | Collision inter-banques + doublons en concurrence (deux agents créent `CT-2026-014` en même temps) |
| C4 | **Devise perdue** : `currency` collecté et validé par Zod, jamais inséré | `contractFormSchema.ts:13`, `CreateContractDialog.tsx:104-117` | Montants ambigus dans un produit multi-devises (EUR/USD/TND) |
| C5 | **Double source de vérité sur le montant** : `montant DECIMAL(15,2)` + `contract_value DECIMAL(15,2)` | `migrations/20250611…sql:8`, `migrations/20250705…sql:90` | Divergences inévitables, reporting faux |
| C6 | **Colonne inexistante requêtée** : `profiles.created_at` | `UserManagementPanel.tsx:33` | Erreur runtime `42703` → panneau admin HS |
| C7 | **Trigger de rappels dupliqueur** : `AFTER INSERT OR UPDATE` insère de nouveaux rappels à chaque mise à jour, sans dédupuplication ni suppression des anciens | `migrations/20250705…sql:196-220` | Spam de rappels/notifications, données inutilisables |
| C8 | `updated_at` jamais maintenu (pas de trigger) malgré la colonne | `migrations/20250611…sql:17`, aucun trigger `set_updated_at` | Tri/filtrage « récemment modifiés » faux |
| C9 | **Aucune pagination serveur** : 3 requêtes `select('*')` sans `.limit()`/`.range()` | `ContractList.tsx:10-17`, `DashboardStats.tsx:14-18`, `FinancialDashboard.tsx:14-19`, `ContractKanban.tsx:26-30` | Plafond PostgREST (1 000 lignes) → données silencieusement tronquées ; latence croissante |
| C10 | Agrégations faites **côté client** sur le jeu complet (3 composants recalculent les mêmes totaux) | `DashboardStats.tsx:23-27`, `FinancialDashboard.tsx:23-26` | Coût réseau × 3, KPI divergents |
| C11 | Pas de suppression logique (`deleted_at`), suppression physique autorisée pour tout membre de la banque | `migrations/20250615194949…sql:102` | Perte définitive d'un contrat signé = non-conforme aux exigences de conservation bancaire |
| C12 | Division par zéro non protégée → `NaN%` affiché | `DashboardStats.tsx:117`, `FinancialDashboard.tsx:110` | KPI affichant « NaN % du total » sur base vide |
| C13 | Pas d'unicité métier (client + type + date), pas d'index sur `bank_id`, `client`, `agence`, `type` | `migrations/*` (index uniquement sur `statut`, `date_signature`, `assigned_to`) | Recherche et filtres lents dès le premier millier de contrats |

### 2.5 Faiblesses — D. Sécurité & conformité (le bloquant n°1 pour une banque)

| # | Vulnérabilité | Preuve | Sévérité | Correction (réf.) |
|---|---|---|---|---|
| D1 | **RLS `TO public` en lecture/écriture sur `contracts`** : 4 politiques créées « puisqu'il n'y a pas d'authentification », **jamais supprimées** par la suite (les politiques RLS se combinent par OU) | `migrations/20250615114558…sql:5-27` | 🔴 Critique | R1.1 |
| D2 | **Bucket `contract_files` public en lecture** : tout document de crédit est accessible par URL, sans session | `migrations/20250615191823…sql:8-12` (`public = true` + `Public read access`) | 🔴 Critique | R1.2 |
| D3 | **Escalade de privilèges** : `profiles FOR ALL USING (id = auth.uid())` permet à chacun de modifier **son propre `role`** et son `bank_id` | `migrations/20250615194949…sql:94` | 🔴 Critique | R1.3 |
| D4 | **Piste d'audit falsifiable** : `audit_logs` INSERT `TO authenticated WITH CHECK (true)` sans contrainte sur `user_id`/`bank_id`/`user_email` → n'importe qui écrit un log au nom d'un autre | `migrations/20250615210615…sql:29-34` | 🔴 Critique | R1.4 |
| D5 | **Edge Functions sans authentification** : `Access-Control-Allow-Origin: *`, aucun `supabase.auth.getUser()`, aucune limite de débit | `functions/ai-assistant-chat/index.ts:5-7,12-16` ; `ai-contract-generator/index.ts:10-12,17` | 🔴 Critique | R1.6 |
| D6 | **`service_role` dans une fonction non authentifiée** : `ai-contract-generator` crée un client `service_role` (contourne toute RLS) accessible à qui sait appeler l'URL | `functions/ai-contract-generator/index.ts:7-8,18` | 🔴 Critique | R1.6 |
| D7 | **Client appelle les Functions en `fetch` brut sans header `Authorization`** → soit 401 (feature morte, `verify_jwt` par défaut à `true` et aucune section `[functions.*]` dans `supabase/config.toml`), soit l'endpoint a été ouvert et **la facture OpenAI est à la merci d'internet** | `AiAssistantSheet.tsx:62-68`, `AiContractGenerator.tsx:88-95` vs `useContractExtraction.ts:22` (qui, lui, utilise `functions.invoke`) | 🔴 Critique | R1.6, R9 |
| D8 | **URL et clé Supabase en dur dans le dépôt** (aucun `.env`, aucune variable Vite) | `integrations/supabase/client.ts:5-6`, URLs dupliquées dans 2 composants | 🟠 Élevé | R1.7 |
| D9 | **Identification d'admin codée en dur sur un e-mail personnel** | `contexts/AuthContext.tsx:119` (`zeid.dhambri@gmail.com`) | 🟠 Élevé | R1.8 |
| D10 | **Pas de MFA, pas de SSO/SAML, pas de politique de mot de passe, pas de verrouillage** — attendu pour un SI bancaire | `Auth.tsx` (aucune logique TOTP/OTP), `input-otp` installé mais inutilisé | 🟠 Élevé | R10 |
| D11 | **Champ `custom_css` libre en base** (injection CSS → exfiltration/UI redressing) s'il est un jour injecté | `OrganizationBrandingManager.tsx:38`, `:393` | 🟠 Élevé (latent) | R11 |
| D12 | **Aucune politique de sécurité HTTP** : pas de CSP, pas de `X-Frame-Options`/`frame-ancestors`, pas de HSTS, pas de `_headers`/`vercel.json` | `index.html`, absence de fichier de config d'hébergement | 🟠 Élevé | R5 |
| D13 | **Polices chargées depuis Google Fonts** : requêtes tierces avec IP des utilisateurs (sujet RGPD bien documenté pour les banques européennes) | `index.css:2-3` | 🟡 Moyen | R18 |
| D14 | **Conservation / suppression non conformes** : pas de durée de rétention, pas d'archivage, pas d'export réglementaire, suppression physique | D11 + `migrations/20250615194949…sql:102` | 🟠 Élevé | R10 |
| D15 | **Pages légales absentes** : pas de mentions légales, CGU, politique de confidentialité, registre de traitement, DPA | `Landing.tsx:340-378` (footer non cliquable) | 🟠 Élevé | R20 |
| D16 | **Affirmations marketing non étayées** dans un contexte réglementé : « Réduction du temps de traitement de 75 % », « Conformité réglementaire garantie », « centaines d'institutions financières », témoignages invérifiables | `Landing.tsx:33-38`, `:241`, `:41-56` | 🟡 Moyen (risque de publicité trompeuse) | R20 |
| D17 | **Piste d'audit quasi vide** : seuls `contract.update` et `contract.delete` sont journalisés — et ces chemins UI sont inaccessibles ; `contract.create`, connexions, exports, lectures ne le sont pas | `grep logAction(` → `ContractList.tsx:45`, `:73` uniquement | 🟠 Élevé | R10 |
| D18 | **Pas de journalisation des accès aux documents** (qui a consulté quel contrat ?) alors que c'est une exigence courante en audit bancaire | aucune table/log de lecture | 🟡 Moyen | R10 |
| D19 | **Signatures électroniques absentes** : aucun sceau, aucun hash de document, aucune capture IP/horodatage/agent, aucune conformité eIDAS (SES/AES/QES) | `grep -rn "hash\|signature électronique"` → néant | 🟠 Élevé (écart marché) | R10 |

> **Vérification à faire côté production** (le sandbox n'a pas de sortie réseau vers `*.supabase.co`, DNS non résolu — tests à lancer depuis votre poste) :
> ```bash
> # 1) Fuite de contrats en anonyme ? (D1) — ne pas publier la sortie, seulement le code et le compte
> curl -s -D- -o /dev/null -H "apikey: $ANON_KEY" -H "Prefer: count=exact" \
>   "$SUPABASE_URL/rest/v1/contracts?select=id" | grep -i "HTTP/\|content-range"
> # 2) Document public ? (D2)
> curl -s -o /dev/null -w "%{http_code}\n" "$SUPABASE_URL/storage/v1/object/public/contract_files/<un_chemin_connu>"
> # 3) Escalade de rôle ? (D3) — avec un JWT d'utilisateur simple
> curl -s -X PATCH "$SUPABASE_URL/rest/v1/profiles?id=eq.<mon_uuid>" \
>   -H "apikey: $ANON_KEY" -H "Authorization: Bearer $USER_JWT" \
>   -H "Content-Type: application/json" -H "Prefer: return=representation" -d '{"role":"super_admin"}'
> # 4) Function IA ouverte ? (D5/D7)
> curl -s -o /dev/null -w "%{http_code}\n" -X POST "$FUNCTIONS_URL/ai-assistant-chat" -H "Content-Type: application/json" -d '{"messages":[]}'
> # 5) État réel du schéma vs migrations (C1/C2)
> psql "$DB_URL" -c "\d public.contracts" -c "\dt public.*" -c "select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid='public.contracts'::regclass;"
> psql "$DB_URL" -c "select polname, polroles::regrole[], pg_get_expr(polqual, polrelid) from pg_policy where polrelid='public.contracts'::regclass;"
> ```

### 2.6 Faiblesses — E. Performance

| # | Sujet | Mesure / preuve | Cible |
|---|---|---|---|
| E1 | **Aucun découpage de code** : un chunk unique de 1 309 kB (382 kB gzip) contenant Recharts, JSZip, i18next, toute la landing et toute l'admin | `npm run build` ; `vite.config.ts` (pas de `manualChunks`) ; `App.tsx` (aucun `lazy`) | ≤ 200 kB gzip pour le shell, ≤ 100 kB par route |
| E2 | **Routes chargées d'emblée** : Landing (396 lignes), Auth, Dashboard, ClauseManager, Index, NotFound importés statiquement | `App.tsx:7-13` | `React.lazy` + `Suspense` par route |
| E3 | **Deux `@import` Google Fonts render-blocking** en tête de CSS (Poppins **et** Inter, 5 graisses chacune) | `index.css:2-3` | 1 famille self-hosted, `font-display: swap`, subset latin, ≤ 100 kB |
| E4 | **180 éléments positionnés avec `Math.random()` à chaque rendu** sur la landing (50 + 30 + 100 divs) | `Landing.tsx:63-105` | Fond statique (SVG/CSS) ou `useMemo` + nombre réduit ; respect `prefers-reduced-motion` |
| E5 | **`select('*')` sans pagination ni projection** sur 4 requêtes, agrégations refaites côté client | `ContractList.tsx:10`, `DashboardStats.tsx:14`, `FinancialDashboard.tsx:14`, `ContractKanban.tsx:26` | `.range()` + colonnes explicites + agrégats SQL/RPC |
| E6 | **Pas de virtualisation** de la table ni du Kanban | `ContractTable.tsx:130+` | Virtualisation au-delà de ~200 lignes |
| E7 | **`QueryClient` par défaut** : `staleTime` 0 → refetch à chaque montage d'onglet, aucun `refetchOnWindowFocus` maîtrisé, aucune persistance hors-ligne | `App.tsx:15` | `staleTime: 30-60 s`, `gcTime`, retry borné, placeholders |
| E8 | **Dépendances lourdes inutilisées** (`jspdf`, `jspdf-autotable`, `xlsx`) + 28 composants `ui/` non consommés | `package.json` ; détection d'orphelins | Purger ou exploiter (R7 export) |
| E9 | **Pas de préchargement/CDN/headers de cache**, `caniuse-lite` vieux de 23 mois | build output ; `capacitor.config.ts` (app native qui charge un site distant) | Headers `Cache-Control`, `preload`, build mobile local |
| E10 | **Aucune mesure terrain** : pas de RUM, pas de Core Web Vitals, pas de Lighthouse en CI, pas de Sentry | absence totale d'instrumentation | Sentry + web-vitals + budget Lighthouse CI |

### 2.7 Faiblesses — F. Accessibilité (WCAG 2.2 AA)

| # | Critère WCAG | Constat | Preuve | Correction |
|---|---|---|---|---|
| F1 | **4.1.2 Nom, rôle, valeur** | Boutons icône sans nom accessible (œil, téléchargement, réglages, notifications, langue partiellement) | `ContractTable.tsx:198-216`, `Dashboard.tsx:132-148` | `aria-label` + `<span className="sr-only">` |
| F2 | **1.3.1 Info et relations** | `<select>` natif sans `label`/`aria-label` ; panneaux d'alertes en `div` sans sémantique de liste | `ContractTable.tsx:124-138`, `AlertsPanel.tsx:110-140` | `Select` Radix + `FormLabel`, `role="list"`/`<ul>` |
| F3 | **3.3.2 Étiquettes ou instructions** | Champs de la landing uniquement par placeholder (nom, e-mail, message) | `Landing.tsx:175-190` | Vrais `<label>` visibles ou `sr-only` |
| F4 | **2.5.7 Dragging Movements (AA, nouveau 2.2)** | Le Kanban exige un glisser-déposer sans alternative au pointeur simple | `ContractKanban.tsx:70-81` | Menu « Déplacer vers… » + boutons par carte |
| F5 | **2.5.8 Target Size (AA, nouveau 2.2)** | Actions de table en `size="sm"` icône seule (~24 px avec padding réduit), espacement `gap-2` | `ContractTable.tsx:198-216` | Cibles ≥ 24×24 CSS px (44 px recommandé en tactile) |
| F6 | **1.4.1 Utilisation de la couleur** | Statuts distingués uniquement par la couleur du badge | `ContractTable.tsx:38-70` | Icône + libellé textuel systématiques |
| F7 | **1.4.3 Contraste (AA)** | `text-slate-300/400` sur `slate-900`/`black-30`, `text-slate-400` sur fond clair, `orange-400` sur sombre | `Index.tsx:60-100`, `ContractTable.tsx:96-101` | Audit contrastimètre, tokens ≥ 4,5:1 (texte) / 3:1 (UI) |
| F8 | **2.4.7 Focus Visible / 2.4.11 Focus Not Obscured** | Classes `focus:border-orange-500` sans anneau ; en-têtes collants potentiels | `ContractTable.tsx:120`, `Auth.tsx` | `focus-visible:ring-2 ring-offset-2` global |
| F9 | **2.4.1 Contourner les blocs** | Pas de lien d'évitement, pas de landmarks (`<main>`, `<nav>`, `aria-current`) dans `/legacy` | `Index.tsx:55-165` | Skip link + landmarks + `aria-current="page"` |
| F10 | **4.1.3 Messages d'état** | Toasts Radix/sonner OK, mais erreurs de requête non annoncées, statuts de chargement en texte simple | `ContractTable.tsx:96-101` | `aria-live="polite"`, `role="status"`/`"alert"` |
| F11 | **3.3.8 Accessible Authentication (AA, nouveau 2.2)** | Pas d'`autoComplete`, collage/mots de passe managers non facilités, pas de passkey | `Auth.tsx:107-135` | `autoComplete="email"/"current-password"`, passkeys |
| F12 | **3.1.1/3.1.2 Langue + RTL** | `dir` basculé en `rtl` sans aucune règle RTL (marges/paddings/alignements en dur `mr-*`, `ml-*`, `left-*`) | `LanguageSwitcher.tsx:28-31` ; 0 occurrence de `rtl` dans les CSS | Logiques `ms-*/me-*`, `dir` géré par Tailwind `rtl:` |
| F13 | **2.2.2 Pause, arrêt, masquer** | 180 animations `animate-pulse`/`twinkle` permanentes sur la landing | `Landing.tsx:63-105` | `prefers-reduced-motion: reduce` |
| F14 | **Clavier globalement** | Aucun raccourci, aucune navigation dans la table, dialogues Radix OK mais pas de commande globale | 0 usage de `command`/`cmdk` | Palette de commandes ⌘K (R6) |

### 2.8 Faiblesses — G. Qualité logicielle & exploitation

| # | Sujet | Preuve | Conséquence |
|---|---|---|---|
| G1 | Build sans type-check | `package.json:8` (`vite build` seul) ; 21 erreurs TS | Le code livré ne compile pas proprement |
| G2 | Lint en échec | 53 erreurs ESLint (`no-explicit-any`, échappements, `require()` dans `tailwind.config.ts:131`) | Aucun filet de qualité |
| G3 | 0 test (unitaire, intégration, e2e) | pas de framework, pas de script | Régression silencieuse garantie à chaque changement |
| G4 | 0 CI/CD | pas de `.github/` | Rien ne bloque une régression |
| G5 | Types générés désynchronisés du schéma | `types.ts` vs `migrations/20250705115709…sql` | 15 des 21 erreurs TS viennent de là |
| G6 | Aucun ErrorBoundary | `grep ErrorBoundary` = 0 | Une erreur de rendu → écran blanc |
| G7 | 16 `console.log`/`console.error` de debug (dont données de contrat complètes) | `CreateContractDialog.tsx:60`, `:119`, `:132` | Fuite d'informations bancaires dans la console navigateur |
| G8 | Documentation inexistante : README Lovable par défaut, aucun document d'architecture, aucun runbook | `README.md` | Onboarding impossible, dépendance au fondateur |
| G9 | Pas de gestion d'environnement (dev/staging/prod), URLs codées en dur en 3 endroits | `client.ts:5`, `AiAssistantSheet.tsx:62`, `AiContractGenerator.tsx:88` | Déploiement risqué, pas de staging |
| G10 | Code mort : 6 composants/hooks orphelins, 28 composants UI inutilisés, 3 dépendances lourdes inutilisées, `mobile.css` entier inemployé | détection d'imports | Surface d'attaque et de maintenance inutile |
| G11 | Pas de monitoring, pas de journalisation applicative, pas d'alerting | aucune instrumentation | Incident en production = invisible |
| G12 | Pas de gestion des versions de données / migrations réversibles, migrations aux noms UUID illisibles, `supabase/config.toml` réduit à une ligne | `supabase/migrations/*`, `config.toml` | Exploitation fragile |

---

## 3. Benchmark : comment les meilleurs résolvent ces problèmes

### 3.1 Panel retenu et pourquoi

| Référence | Position | Pourquoi c'est pertinent pour JURIX |
|---|---|---|
| **Ironclad** | Leader Gartner MQ, CLM d'entreprise (30-200 k$/an) | Référence sur le **moteur de workflow**, le **Dynamic Repository** (extraction post-signature des obligations, échéances, risques de renouvellement) et **Jurist** (détection de clauses/risques, comparaison au playbook, redline). Son tableau d'obligations avec **vues sauvegardées** et **propriétaire nommé** est exactement ce qui manque à JURIX. Contre-exemple utile aussi : sa configuration est si lourde qu'elle exige des services d'implémentation |
| **Juro** | Mid-market européen, UX de référence (Capterra 4,8) | Preuve que **l'adoption vient du self-service** : éditeur navigateur sans aller-retour Word, ~60 % des utilisateurs quotidiens ne sont pas juristes, mise en route en 1-2 semaines, prix publié dès 25 $/utilisateur/mois. Cible de JURIX : les agents d'agence, pas seulement la direction juridique |
| **LinkSquares** | Repository & analytics (G2 4,7 / 438 avis) | Référence **recherche d'abord** : AI search rapide, champs extraits automatiquement (« Smart Values »), dashboards de portefeuille (ce qui est actif, ce qui expire, où est le risque). Le modèle à copier pour la table de contrats JURIX |
| **Workday Evisort** | AI-first, ingestion de masse | Référence sur **l'ingestion du stock existant** : OCR, import en masse de contrats scannés/tiers, extraction de clauses et d'obligations avec **vérification humaine**. Une banque arrive avec des milliers de PDF scannés : c'est le vrai point d'entrée |
| **ContractSafe / ContractWorks** | Adoption-first, prix plats, utilisateurs illimités | Référence sur le **time-to-value** : implémentation en jours, import + tag + recherche opérationnels dès le premier jour, utilisateurs illimités. Leçon : ne pas monétiser/frictionner l'usage, ne pas sur-configurer |
| **DocuSign CLM + pratiques e-signature (eIDAS/ESIGN)** | Exécution et preuve | Référence sur la **preuve** : piste d'audit par signataire (e-mail, IP, horodatage ISO 8601, méthode d'authentification, user-agent), **hash SHA-256 du document**, certificat de completion embarqué, rétention longue. JURIX parle de « conformité réglementaire garantie » sans aucun de ces éléments |

### 3.2 Matrice de comparaison fonctionnelle

Légende : ✅ couvert · 🟡 partiel / non branché · ❌ absent

| Capacité | **JURIX aujourd'hui** | Ironclad | Juro | LinkSquares | Evisort | ContractSafe |
|---|---|---|---|---|---|---|
| Référentiel central + recherche plein texte | ❌ (3 champs, client-side, pas de pagination) | ✅ | ✅ | ✅ (search-first) | ✅ | ✅ |
| Métadonnées extraites automatiquement | ❌ (table `contract_ai_extractions` jamais câblée) | ✅ (194+ propriétés) | ✅ | ✅ (Smart Values) | ✅ (Document X-Ray) | 🟡 |
| OCR / import en masse du stock existant | ❌ (1 fichier à la fois, zippé) | 🟡 (Smart Import) | 🟡 | ✅ | ✅ | 🟡 |
| Extraction IA **avec score de confiance + revue humaine** | ❌ (schéma prêt : `confidence_score`, `is_verified`, `reviewed_by`) | ✅ | 🟡 | ✅ | ✅ | 🟡 |
| Obligations / échéances comme objets de premier rang | ❌ | ✅ (Obligations Dashboard, vues sauvegardées, propriétaire nommé) | 🟡 | ✅ | ✅ | 🟡 |
| Alertes de renouvellement et d'expiration pilotées par les données | ❌ (panneau statique) ; trigger dupliqueur en base | ✅ | ✅ | ✅ | ✅ | ✅ |
| Workflow d'approbation conditionnel | 🟡 (tables `template_workflow_steps` + UI d'admin, jamais exécutées) | ✅ (no-code, routage conditionnel) | 🟡 | 🟡 | 🟡 | 🟡 |
| Signature électronique + preuve (hash, IP, certificat) | ❌ | ✅ (native + audit trail) | ✅ (native) | 🟡 | 🟡 | 🟡 |
| Bibliothèque de clauses + détection d'écart au playbook | ❌ (démo en mémoire, « IA » simulée) | ✅ (Jurist) | ✅ (clauses dynamiques) | 🟡 | ✅ | 🟡 |
| Modèles à champs dynamiques | 🟡 (admin complet, jamais utilisé à la création) | ✅ | ✅ | 🟡 | ✅ | 🟡 |
| Vues sauvegardées / facettes / actions en masse | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Analytics de portefeuille (cycle, encours, risque) | ❌ (données codées en dur) | ✅ | ✅ | ✅ (force principale) | ✅ | 🟡 |
| Collaboration (commentaires, mentions, temps réel) | ❌ (table `contract_comments` jamais câblée, aucun canal Realtime) | ✅ | ✅ (édition collaborative navigateur) | 🟡 | 🟡 | 🟡 |
| Historique de versions documentaires | ❌ (table `contract_versions` jamais câblée) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Piste d'audit exploitable (qui, quoi, quand, export) | 🟡 (table + UI en anglais, 2 actions journalisées, INSERT falsifiable) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Multi-tenant + rôles fins + RBAC réel | 🟡 (6 rôles déclarés, 3 utilisés, RLS publiques, escalade possible) | ✅ | ✅ | ✅ | ✅ | ✅ |
| SSO/MFA, chiffrement, résidence des données | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| White-label réel | ❌ (branding écrit, jamais appliqué) | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 |
| i18n / RTL | ❌ (5 clés, 0 `t()`, arabe non rendu) | ✅ | ✅ | ✅ | ✅ (100+ langues côté Sirion/Evisort) | ✅ |
| API / intégrations (CRM, ERP, e-sign) | ❌ (table `integrations` jamais câblée) | ✅ (Salesforce, Rivet SDK) | ✅ (Workday, Drive, DocuSign) | ✅ | ✅ | 🟡 |
| Mobile / hors-ligne | ❌ (Capacitor configuré mais `usePlatform` mort, app native pointant vers un site distant) | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 |

**Lecture** : sur 21 capacités, JURIX en couvre **0 fully**, **6 partiellement** (et toutes « partiel » sont en réalité du schéma ou de l'UI d'administration sans débouché), **15 pas du tout**. Le point clé : **l'écart n'est pas conceptuel, il est de câblage** — 7 tables et 5 composants admin existent déjà pour combler 6 des 15 absences.

### 3.3 Patterns de conception et mécaniques d'engagement à importer

| Pattern | Qui l'illustre | Mécanique | Traduction concrète dans JURIX |
|---|---|---|---|
| **1. « Work to do » inbox** (le tableau de bord est une file de travail, pas des compteurs) | Ironclad (Obligations Dashboard), Gatekeeper | On ouvre l'app et la première question est répondue : *qu'est-ce qui m'attend, qui m'attend, pour quand ?* | Vue « À traiter » par défaut : échéances J-30/60/90, signatures en attente, documents manquants, extractions IA à vérifier — avec **propriétaire nommé** et action en un clic |
| **2. Extraction IA + revue humaine** (human-in-the-loop) | Evisort, LinkSquares, Sirion | L'IA propose, l'humain valide ; le **score de confiance** pilote l'UI (vert = auto, ambre = à relire, rouge = à saisir) | Câbler `contract_ai_extractions` (`confidence_score`, `is_verified`, `reviewed_by`) : file de validation, champ à champ, avec surlignage de la phrase source dans le PDF |
| **3. Vues sauvegardées + URLs partageables** | LinkSquares, Ironclad, Airtable/Notion (pattern transverse) | Chaque filtre devient un actif réutilisable et partageable ; l'état vit dans l'URL | Filtres/tri/pagination dans les query params (`/contrats?statut=valide&agence=nord&q=…`), bouton « Enregistrer cette vue », vues par rôle |
| **4. Recherche d'abord** | LinkSquares, ContractSafe | La recherche plein texte + facettes est l'écran principal, pas un accessoire | Recherche Postgres (`tsvector`/`pg_trgm`) sur client, référence, description, montant, garantie, agence + palette ⌘K (cmdk déjà installé) |
| **5. Self-service pour non-spécialistes** | Juro (~60 % d'utilisateurs non juristes), ContractSafe (utilisateurs illimités) | Réduire le nombre de décisions par écran ; modèles + questions métier simples | Formulaire de demande en 3 étapes guidé par le modèle (`contract_templates` + `template_fields`), avec pré-remplissage et validation en ligne |
| **6. Preuve et non-répudiation comme fonctionnalité visible** | DocuSign CLM, pratiques eIDAS | L'audit n'est pas un log technique : c'est un **certificat** exportable (horodatage, IP, hash, méthode) | Timeline par contrat (événements + acteurs + hash du document), export PDF « certificat de vie du contrat », journal d'accès aux documents |
| **7. Actions en masse + édition en ligne** | Ironclad, LinkSquares (patterns tables B2B) | Traiter 50 contrats sans 50 allers-retours | Sélection multiple → changer statut/réaffecter/taguer/exporter ; édition en ligne du statut avec UI optimiste et rollback |
| **8. Zéro donnée fantôme** | Tous les produits crédibles (pattern transverse) | Un écran qui affiche un chiffre doit pouvoir le justifier | Règle d'équipe : tout KPI vient d'une requête ; sinon composant `<EmptyState/>` ou `<DataMissing/>` explicite. Interdire les constantes métier dans les composants |
| **9. Progressive disclosure de l'admin** | Agiloft/Ironclad (leçon inverse : la config noie l'usage) | L'administration est séparée de l'exploitation quotidienne | Espace « Administration » distinct (route `/admin`) avec ses propres onglets ; l'écran agent ne montre que Contrats / À traiter / Modèles |
| **10. Time-to-value mesuré** | ContractSafe/Juro (mise en route en jours) | L'import du stock existant est la première expérience, pas la dernière | Assistant d'import en masse (CSV + ZIP de PDF) avec correspondance de colonnes, détection de doublons et rapport d'erreurs téléchargeable |

### 3.4 Ce que le benchmark dit du positionnement de JURIX

- **Angle de différenciation réel** : le modèle de données est **spécifique au crédit bancaire** (référence de décision, agence, garanties multiples avec type d'hypothèque, statuts « en attente d'inscription de l'hypothèque », « assurance manquante », « refus client »). Les CLM génériques ne savent pas faire ça nativement. **C'est la niche à défendre** : le crédit bancaire multi-agences, francophone/arabophone, avec conformité locale.
- **Écart le plus coûteux** : l'absence de référentiel fiable + de file de travail. Les acheteurs de CLM paient pour *ne pas rater une échéance* et *retrouver un contrat en 5 secondes*. JURIX ne fait ni l'un ni l'autre aujourd'hui.
- **Écart le plus disqualifiant en appel d'offres bancaire** : sécurité/piste d'audit/signature. Un RSSI bloquera dès la première question sur l'hébergement, le chiffrement, le SSO/MFA, la rétention et l'intégrité des documents.
- **À ne pas copier** : la lourdeur de configuration d'Ironclad/Agiloft. JURIX doit viser la trajectoire Juro/ContractSafe : utile en 1 jour, configurable sans ingénieur.

---

## 4. Plan d'amélioration priorisé

**Lecture** : P0 = bloquants (sécurité + produit cassé), P1 = valeur marché (le produit devient vendable), P2 = différenciation et échelle. Effort en jours-homme (1 dev senior full-stack). Impact = effet sur la capacité à signer un client banque.

| Réf | Priorité | Recommandation | Impact | Effort |
|---|---|---|---|---|
| R1 | **P0** | Verrouiller la sécurité (RLS, storage, Functions, secrets) | 🔥🔥🔥 | 5 j |
| R2 | **P0** | Unifier le modèle de statuts et réparer l'intégrité des données | 🔥🔥🔥 | 3 j |
| R3 | **P0** | Rendre le CRUD contrat complet et atteignable | 🔥🔥🔥 | 4 j |
| R4 | **P0** | Supprimer toutes les données fantômes | 🔥🔥🔥 | 3 j |
| R5 | **P0** | Filet de qualité : type-check, lint, tests smoke, CI, ErrorBoundary | 🔥🔥 | 3 j |
| R6 | **P1** | Une seule application : navigation par routes + palette ⌘K + raccourcis | 🔥🔥🔥 | 5 j |
| R7 | **P1** | Référentiel de contrats de niveau marché (table pro, vues, export) | 🔥🔥🔥 | 8 j |
| R8 | **P1** | Alertes et échéances réelles (moteur + inbox + notifications) | 🔥🔥🔥 | 7 j |
| R9 | **P1** | IA utile, sécurisée et vérifiable (extraction + revue humaine) | 🔥🔥 | 8 j |
| R10 | **P1** | Workflow d'approbation, signature, piste d'audit conforme | 🔥🔥🔥 | 12 j |
| R11 | **P1** | Design system unique + white-label réel | 🔥🔥 | 6 j |
| R12 | **P1** | Accessibilité WCAG 2.2 AA | 🔥🔥 | 5 j |
| R13 | **P2** | i18n réel FR/EN/AR + RTL | 🔥🔥 | 8 j |
| R14 | **P2** | Bibliothèque de clauses persistée + playbook | 🔥🔥 | 6 j |
| R15 | **P2** | Analytics bancaires crédibles (encours, cycle, risque) | 🔥🔥 | 6 j |
| R16 | **P2** | Collaboration temps réel (commentaires, versions) | 🔥 | 6 j |
| R17 | **P2** | Administration multi-tenant (onboarding, invitations, SSO/MFA) | 🔥🔥 | 8 j |
| R18 | **P2** | Performance & observabilité (budget 200 kB, Sentry, RUM) | 🔥🔥 | 5 j |
| R19 | **P2** | Mobile assumé (PWA ou Capacitor local, hors-ligne) | 🔥 | 6 j |
| R20 | **P2** | Landing & conformité marketing/légale | 🔥 | 4 j |

---

### P0 — Semaine 1-2 : rendre le produit sûr et fonctionnel

#### R1. Verrouiller la sécurité (🔥🔥🔥 · 5 j)

**Constat** : D1 à D9, D12. RLS publiques, bucket public, escalade de rôle, audit falsifiable, Functions ouvertes avec `service_role`, secrets en dur.
**Ce que font les meilleurs** : RBAC par ligne côté base, documents privés servis en URLs signées à durée limitée, functions authentifiées et débitées, secrets hors du dépôt, audit immuable et attribué par le serveur. DocuSign/Zignt/Signbee font de la **preuve** (hash, IP, horodatage) une exigence de base, pas une option.

**Spécification** :

1. **Migration `2026xxxx_harden_rls.sql`**
   ```sql
   -- 1) Supprimer TOUTES les politiques héritées non multi-tenant
   DROP POLICY IF EXISTS "Allow public insert on contracts" ON public.contracts;
   DROP POLICY IF EXISTS "Allow public select on contracts" ON public.contracts;
   DROP POLICY IF EXISTS "Allow public update on contracts" ON public.contracts;
   DROP POLICY IF EXISTS "Allow public delete on contracts" ON public.contracts;
   DROP POLICY IF EXISTS "Authenticated users can view contracts"    ON public.contracts;
   DROP POLICY IF EXISTS "Authenticated users can create contracts"  ON public.contracts;
   DROP POLICY IF EXISTS "Authenticated users can update contracts"  ON public.contracts;
   DROP POLICY IF EXISTS "Authenticated users can delete contracts"  ON public.contracts;
   DROP POLICY IF EXISTS "Les utilisateurs peuvent gérer leur propre profil" ON public.profiles;

   -- 2) Profil : lecture de soi + nom seulement ; le rôle et la banque sont réservés aux admins
   CREATE POLICY "profiles_self_select" ON public.profiles FOR SELECT
     USING (id = auth.uid() OR get_my_role() = 'super_admin'
            OR (get_my_role() = 'bank_admin' AND bank_id = get_my_bank_id()));
   CREATE POLICY "profiles_self_update_non_sensitive" ON public.profiles FOR UPDATE
     USING (id = auth.uid())
     WITH CHECK (id = auth.uid()
                 AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
                 AND bank_id IS NOT DISTINCT FROM (SELECT p.bank_id FROM public.profiles p WHERE p.id = auth.uid()));
   CREATE POLICY "profiles_admin_update" ON public.profiles FOR UPDATE
     USING (get_my_role() = 'super_admin' OR (get_my_role() = 'bank_admin' AND bank_id = get_my_bank_id()))
     WITH CHECK (get_my_role() = 'super_admin' OR (get_my_role() = 'bank_admin' AND bank_id = get_my_bank_id()));

   -- 3) Audit : attribué par le serveur, jamais par le client
   REVOKE INSERT ON public.audit_logs FROM authenticated, anon;
   CREATE OR REPLACE FUNCTION public.write_audit(p_action text, p_details jsonb)
   RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
   BEGIN
     INSERT INTO public.audit_logs (user_id, user_email, action, details, bank_id)
     SELECT auth.uid(), u.email, p_action, p_details, p.bank_id
     FROM public.profiles p LEFT JOIN auth.users u ON u.id = p.id
     WHERE p.id = auth.uid();
   END; $$;
   GRANT EXECUTE ON FUNCTION public.write_audit(text, jsonb) TO authenticated;

   -- 4) Notifications / extractions : plus d'INSERT anonyme
   DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
   DROP POLICY IF EXISTS "System can create AI extractions" ON public.contract_ai_extractions;
   REVOKE INSERT ON public.notifications, public.contract_ai_extractions FROM anon, authenticated;
   -- (les écritures passent par des triggers / functions SECURITY DEFINER)

   -- 5) Contrats : suppression logique, suppression physique réservée
   ALTER TABLE public.contracts ADD COLUMN deleted_at timestamptz;
   DROP POLICY IF EXISTS "Les membres d'une banque peuvent supprimer les contrats" ON public.contracts;
   CREATE POLICY "contracts_soft_delete" ON public.contracts FOR UPDATE
     USING (bank_id = get_my_bank_id()) WITH CHECK (bank_id = get_my_bank_id());
   CREATE POLICY "contracts_hard_delete_admin" ON public.contracts FOR DELETE
     USING (get_my_role() IN ('super_admin','bank_admin') AND bank_id = get_my_bank_id());

   -- 6) Référence de décision par banque, sans course critique
   ALTER TABLE public.contracts DROP CONSTRAINT contracts_reference_decision_key;
   CREATE UNIQUE INDEX contracts_bank_ref_uniq ON public.contracts (bank_id, reference_decision);
   CREATE INDEX contracts_bank_idx ON public.contracts (bank_id);
   CREATE INDEX contracts_client_trgm ON public.contracts USING gin (client gin_trgm_ops);
   ```
2. **Storage privé** : bucket `contract_files` en `public = false`, politiques par banque, et **URLs signées** côté app.
   ```sql
   UPDATE storage.buckets SET public = false WHERE id = 'contract_files';
   DROP POLICY IF EXISTS "Public read access for contract files" ON storage.objects;
   CREATE POLICY "contract_files_read_bank" ON storage.objects FOR SELECT TO authenticated
     USING (bucket_id = 'contract_files' AND (storage.foldername(name))[1] = get_my_bank_id()::text);
   ```
   ```ts
   const { data } = await supabase.storage.from('contract_files')
     .createSignedUrl(path, 60, { download: true });   // 60 s, jamais d'URL publique
   ```
   Chemin de stockage normalisé : `{bank_id}/{contract_id}/{version}/{filename}`.
3. **Edge Functions** : `verify_jwt = true` explicite dans `supabase/config.toml`, CORS restreint à l'origine de l'app, garde d'auth + limite de débit, **suppression du client `service_role`** au profit d'un client admin créé *après* résolution du `bank_id` de l'utilisateur.
   ```ts
   const authHeader = req.headers.get('Authorization') ?? '';
   const { data: { user }, error } = await supabaseAnon.auth.getUser(authHeader.replace('Bearer ', ''));
   if (error || !user) return new Response('Unauthorized', { status: 401 });
   // débit : 20 appels / heure / utilisateur, table `ai_usage(user_id, day, calls)`
   ```
   Côté client : remplacer les 2 `fetch` bruts par `supabase.functions.invoke('…', { body })` (comme le fait déjà `useContractExtraction.ts:22`).
4. **Secrets** : `.env` (non commité) + `.env.example`, `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, URLs de functions dérivées de la config (une seule source). **Rotation de la clé anon** exposée dans l'historique Git.
5. **Headers de sécurité** à l'hébergement : `Content-Security-Policy` (default-src 'self'; img-src 'self' data: blob:; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` minimal, HSTS.
6. **Admin par e-mail codé en dur** (`AuthContext.tsx:119`) → supprimer ; le rôle vient de `profiles.role`.

**Critères d'acceptation**
- [ ] Un appel anonyme à `GET /rest/v1/contracts` renvoie `401/403` ou `[]` ; idem pour `profiles`, `audit_logs`, `storage`.
- [ ] Un utilisateur `user` qui tente `PATCH /profiles {"role":"super_admin"}` reçoit `403`/`new row violates…`.
- [ ] Aucune URL publique de document ne répond ; `createSignedUrl` expire après 60 s.
- [ ] Chaque Function renvoie `401` sans JWT valide, `429` au-delà du quota ; `service_role` absent de `ai-contract-generator`.
- [ ] `git grep -n "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"` = 0 résultat dans le code source ; clé tournée.
- [ ] Test d'intrusion minimal rejouable (`docs/audit/VERIFICATIONS-SECURITE.md`).

---

#### R2. Unifier le modèle de statuts et réparer l'intégrité des données (🔥🔥🔥 · 3 j)

**Constat** : C1, C2, C3, C4, C5, C6, C7, C8, C12 ; §2.3 (trois vocabulaires, deux devises).
**Ce que font les meilleurs** : un cycle de vie **unique et explicite** (Ironclad : étapes de workflow + états post-signature ; LinkSquares : métadonnées normalisées et reportables). Les statuts sont des données de référence, pas des chaînes libres dispersées dans les composants.

**Spécification**
1. **Choisir UN cycle de vie** et l'exprimer en base comme type énuméré + table de référence :
   ```sql
   CREATE TYPE public.contract_status AS ENUM (
     'draft','pending_documents','pending_signature_b','pending_signature_c',
     'pending_mortgage_registration','pending_insurance','in_review','approved',
     'active','alert','client_refused','cancelled','expired','renewed'
   );
   ```
   Mapping depuis l'existant (migration de données, exécutée en staging d'abord) : `en_cours → draft`, `attente_signature → pending_signature_b`, `valide → active`, `alerte → alert`, `documents_manquants → pending_documents`, `assurance_manquante → pending_insurance`, `en_attente_inscription_hypotheque → pending_mortgage_registration`, `refus_client → client_refused`, `actif → active`, `en_attente → in_review`, `expire → expired`, `resilie → cancelled`.
2. **Une seule source de vérité côté app** : `src/lib/contract-status.ts` exporte `CONTRACT_STATUSES` (valeur, libellé i18n, icône, couleur, colonne Kanban, transitions autorisées) ; `contract-helpers.ts` et `ContractTable.tsx` la consomment (suppression des `switch` locaux). Les transitions sont validées côté serveur :
   ```sql
   CREATE TABLE public.contract_status_transitions (
     from_status contract_status, to_status contract_status,
     allowed_roles app_role[], PRIMARY KEY (from_status, to_status));
   ```
3. **Nettoyer le schéma** : supprimer `contract_value` (garder `montant`), rendre `currency` non nul et **l'écrire à la création**, ajouter `expiry_date`/`renewal_date` distincts de `date_signature`, ajouter `deleted_at`, `created_at` sur `profiles`, trigger `set_updated_at`, et **réécrire le trigger de rappels** en mode idempotent (`ON CONFLICT DO NOTHING` + suppression des rappels non envoyés devenus obsolètes).
4. **Régénérer les types** : `supabase gen types typescript --project-id … > src/integrations/supabase/types.ts` et ajouter la commande au script `db:types` ; vérifier que les 7 tables manquantes apparaissent (corrige ~15 des 21 erreurs TS).
5. **Devise** : `formatCurrency(amount, currency)` via `Intl.NumberFormat` avec la devise de la ligne (défaut = devise de la banque dans `banks`), plus aucun « MAD »/« EUR » codé en dur.
6. **Anti-NaN** : utilitaire `safePct(part, total)` → `total === 0 ? null : …` et affichage « — » quand `null`.

**Critères d'acceptation**
- [ ] `grep -rn "'actif'\|'en_attente'\|'expire'\|'resilie'" src` = 0 ; un seul fichier définit les statuts.
- [ ] Créer un contrat avec le statut par défaut réussit en base (plus de `23514`).
- [ ] La devise choisie dans le formulaire est relue correctement après rechargement.
- [ ] Deux créations simultanées dans deux banques différentes produisent deux références distinctes et valides ; test de concurrence (20 inserts parallèles) sans doublon.
- [ ] `npx tsc --noEmit` = 0 erreur sur les fichiers liés aux nouvelles tables.

---

#### R3. Rendre le CRUD contrat complet et atteignable (🔥🔥🔥 · 4 j)

**Constat** : A2, A7, A8, A9, A10, A21, A22, C9.
**Ce que font les meilleurs** : chez LinkSquares/Ironclad, cliquer une ligne ouvre une **fiche contrat** (métadonnées, documents, timeline, obligations, commentaires) ; le changement d'état se fait en ligne avec UI optimiste ; toute action destructive demande une confirmation explicite.

**Spécification**
1. **Route de fiche** : `/contrats/:id` (pleine page, pas un dialog) avec onglets `Aperçu · Garanties · Documents · Timeline · Alertes · Commentaires`. Réutiliser `ContractDetailForm`, `GuaranteesFormSection`, `ContractFileUpload`, `ContractAlertCreator` (aujourd'hui orphelins) à l'intérieur.
2. **Câbler `ContractDetailDialog`** en mode édition rapide (drawer) **et** la fiche complète ; brancher `onContractUpdate` de `ContractList` (déjà écrit) sur le dialog.
3. **Téléchargement** : bouton → `createSignedUrl` → téléchargement ; journaliser `contract.document.download` via `write_audit`.
4. **Suppression** : `AlertDialog` (« Supprimer définitivement ce contrat ? Cette action est tracée et irréversible. ») → suppression logique (`deleted_at`) pour les rôles non admin, physique pour `bank_admin`/`super_admin`.
5. **Kanban qui persiste** : `useMutation` sur `statut` avec **mise à jour optimiste** + rollback + toast, garde-fou de transitions (R2.2), et **alternative au drag** (menu « Déplacer vers… » sur chaque carte → WCAG 2.5.7).
6. **États de la liste** : `isLoading` → `<Skeleton/>` (composant déjà installé) ; `isError` → carte d'erreur avec `Retry` ; vide **sans filtre** → empty state pédagogique (« Créez votre premier contrat » + bouton) ; vide **avec filtre** → « Aucun résultat » + bouton « Réinitialiser les filtres ».
7. **Pagination serveur** dès maintenant : `.range(from, to)` + `Prefer: count=exact` + composant `pagination` (déjà installé), 25/50/100 par page.

**Critères d'acceptation**
- [ ] Depuis la liste : consulter, éditer, changer de statut, télécharger, supprimer — les 5 actions fonctionnent et sont tracées.
- [ ] Le drag & drop modifie réellement le statut (vérifiable après rechargement) et un bouton alternatif existe.
- [ ] Une coupure réseau affiche un état d'erreur avec `Retry`, jamais « Aucun contrat disponible ».
- [ ] 10 000 lignes en base : la liste s'affiche en < 1 s et pagine correctement.

---

#### R4. Supprimer toutes les données fantômes (🔥🔥🔥 · 3 j)

**Constat** : A4, A5, A6, A11, A14, A15, A16, A17, §2.3, C12 ; `DashboardStats.tsx:39-46,99,153,218,244` ; `FinancialDashboard.tsx:29-52,93` ; `AlertsPanel.tsx:8-49,76-80`.
**Ce que font les meilleurs** : aucun CLM crédible n'affiche de fausses métriques — LinkSquares vend précisément la **visibilité fiable** du portefeuille. Une donnée non disponible s'affiche comme indisponible.

**Spécification**
1. **Règle d'équipe (à inscrire dans le README + ESLint)** : aucune constante métier dans un composant de données. Ajouter une règle maison ou une revue : tout nombre affiché provient d'une requête, d'un `select` agrégé ou d'une RPC.
2. **Remplacer les maquettes** :
   - `DashboardStats` : KPI issus d'une RPC `contract_kpis(p_bank_id)` (total, par statut, encours par devise, échéances 30/60/90, documents manquants). Supprimer `+12 %`, `+8 %`, `monthlyData`, « 3 contrats expirent », « objectifs 85 % » — ou les calculer réellement (variation vs période précédente en SQL).
   - `FinancialDashboard` : encours par type de crédit / agence / garantie, à partir des données ; vocabulaire bancaire (**encours**, **engagement moyen**, **taux de garantie**) au lieu de « chiffre d'affaires ».
   - `AlertsPanel` : lire `contract_reminders` + `contract_alerts` réels, avec actions « Traiter » branchées (marquer traitée, reporter, ouvrir le contrat).
   - `NotificationCenter` : lire `notifications` (après régénération des types) + abonnement Realtime ; badge = compte réel non lu.
3. **Assumer l'inachevé** : l'onglet « Analytiques » devient soit une vraie vue (R15), soit il disparaît de la navigation. Jamais « en cours de développement » dans un produit facturé.
4. **Clauses** : `ClauseManager` persiste en base (table `clauses` à créer : `bank_id`, `title`, `content`, `category`, `tags[]`, `version`, `updated_by`) ou l'onglet est retiré jusqu'à R14. Supprimer la fausse amélioration IA (`ClauseEditor.tsx:77-86`) ou la brancher sur R9 avec la mention explicite « brouillon généré par IA, à valider ».
5. **Kanban** : ne plus inventer `priority`/`tags` ; lire les vraies colonnes (après R2.3) ou masquer ces facettes.

**Critères d'acceptation**
- [ ] `grep -rn "Jan', contracts: 12\|Contrat ABC Corp\|+15.3%\|85 %\|+12% ce mois" src` = 0.
- [ ] Chaque KPI affiché est reproductible par une requête SQL documentée dans le composant (commentaire `-- source:`).
- [ ] Base vide → l'app affiche des empty states explicites, aucun `NaN`, aucun chiffre inventé.
- [ ] Démo de 5 minutes sans qu'un écran n'affiche de donnée fausse.

---

#### R5. Filet de qualité : type-check, lint, tests, CI, ErrorBoundary (🔥🔥 · 3 j)

**Constat** : G1-G6, G11 ; 21 erreurs TS, 53 erreurs lint, 0 test, 0 CI.
**Ce que font les meilleurs** : dans toute équipe produit sérieuse, le pipeline bloque une régression avant la production ; les CLM vendus à des banques doivent pouvoir produire des preuves de qualité (SOC 2, audits clients).

**Spécification**
1. `package.json` : `"build": "tsc -b && vite build"`, `"lint": "eslint . --max-warnings=0"`, `"test": "vitest run"`, `"test:e2e": "playwright test"`, `"db:types": "supabase gen types …"`.
2. **Vitest + Testing Library** : 12 premiers tests à forte valeur — `contractFormSchema` (cas hypothèque), `contract-status` (transitions), `safePct`, `formatCurrency`, rendu de `ContractTable` (vide/erreur/succès), mutation de statut du Kanban (optimiste + rollback), garde d'auth de `ProtectedRoute`.
3. **Playwright** : 3 scénarios e2e — connexion → liste → fiche → édition ; création de contrat de bout en bout ; filtrage + pagination + URL partageable.
4. **GitHub Actions** : `lint` + `typecheck` + `test` + `build` à chaque PR, avec garde de taille de bundle (`size-limit` : échec si le shell dépasse 220 kB gzip), et Lighthouse CI sur la landing (perf ≥ 85, a11y ≥ 95).
5. **ErrorBoundary** global + par route (message humain, bouton « Recharger », remontée Sentry quand R18 est fait).
6. **Nettoyage** : supprimer les 16 `console.log` (dont ceux qui affichent des données de contrat : `CreateContractDialog.tsx:60,119,132`), purger les 6 composants orphelins ou les câbler (R3), retirer `jspdf`/`xlsx` tant que non utilisés (réintroduits en R7).

**Critères d'acceptation**
- [ ] `npm run build` échoue si une erreur TS apparaît ; `npm run lint` = 0 erreur 0 warning.
- [ ] CI verte sur la PR, avec couverture des 12 tests unitaires et 3 e2e.
- [ ] Une erreur de rendu volontaire affiche l'ErrorBoundary, pas un écran blanc.
- [ ] `git grep "console.log" src` = 0.

---

### P1 — Semaines 3-10 : faire de JURIX un produit vendable

#### R6. Une seule application : navigation par routes + palette ⌘K (🔥🔥🔥 · 5 j)

**Constat** : A1, A3, §2.3 (navigation non router-based, 8 onglets plats).
**Ce que font les meilleurs** : Juro/Ironclad séparent nettement l'**espace de travail quotidien** de l'**administration** ; les outils B2B modernes (Linear, Notion, Airtable) ont imposé la **palette de commandes** et les **URLs comme état**.

**Spécification**
1. **Architecture de routes** (suppression de `/legacy` et de la maquette `/dashboard`) :
   ```
   /                    landing (public)
   /auth, /auth/reset   authentification
   /app                 → redirect /app/a-traiter
   /app/a-traiter       inbox : échéances, signatures, documents manquants, IA à valider   ← défaut
   /app/contrats        référentiel (liste/table)
   /app/contrats/:id    fiche contrat
   /app/kanban          workflow
   /app/rapports        analytiques
   /app/clauses         bibliothèque (R14)
   /admin/utilisateurs · /admin/modeles · /admin/marque · /admin/journal · /admin/parametres
   ```
   Chaque vue = URL partageable ; filtres/tri/recherche en query params ; `NavLink` avec `aria-current="page"`.
2. **Layout applicatif unique** : `SidebarProvider` + composant `ui/sidebar` (761 lignes **déjà écrites**, jamais utilisées) avec sections « Espace de travail » / « Administration » (visible selon `userRole`), collapsible, responsive (drawer mobile via `useIsMobile` déjà fourni), footer avec `LanguageSwitcher` + `UserNav` + thème.
3. **Palette de commandes ⌘K/Ctrl+K** avec `ui/command` (cmdk installé, inutilisé) : navigation, recherche de contrats (débouncing + résultats récents), actions (« Nouveau contrat », « Importer », « Changer de langue »), aide. Raccourcis : `n` nouveau contrat, `/` focus recherche, `g` puis `c` aller aux contrats, `?` aide.
4. **Préférences réelles** (le bouton réglages mort de `Dashboard.tsx:146`) : `/app/parametres` — langue, thème, densité de table, notifications, changement de mot de passe, sessions actives.
5. **Fil d'Ariane** (`ui/breadcrumb` installé) sur la fiche contrat : `Contrats › CT-2026-014 › Aperçu`.

**Critères d'acceptation**
- [ ] Un utilisateur connecté n'a **qu'une** application ; `/legacy` n'existe plus.
- [ ] Toute vue est atteignable par URL, partageable, et survit au rafraîchissement (filtres inclus).
- [ ] ⌘K ouvre la palette en < 100 ms, permet de naviguer et de créer un contrat sans souris.
- [ ] Un rôle `user` ne voit aucun item d'administration ; un `bank_admin` voit son périmètre.
- [ ] Test Playwright de navigation clavier complète (tab → entrée → échappement).

---

#### R7. Référentiel de contrats de niveau marché (🔥🔥🔥 · 8 j)

**Constat** : A12, A13, C9, C10, §3.3 patterns 3, 4, 7.
**Ce que font les meilleurs** : LinkSquares (« search-first repository », champs extraits reportables, dashboards), Ironclad (vues sauvegardées, filtres par dates/termes, tri), ContractSafe (recherche simple + tagging rapide). Pattern transverse des tables B2B : sélection multiple, actions en masse, édition en ligne, densité.

**Spécification**
1. **Recherche serveur** : index `gin_trgm` sur `client`, `tsvector` sur `client || description || reference_decision`, RPC `search_contracts(p_q, p_filters, p_sort, p_page)` renvoyant lignes + `count` + facettes (par statut, agence, type, garantie, tranche de montant).
2. **Table pro** : tri serveur sur toutes les colonnes, colonnes affichables/réordonnables (persistées par utilisateur dans `dashboard_widgets`/`user_preferences`), densité compacte/confortable, ligne cliquable → fiche, édition en ligne du statut (menu de transitions R2), montant aligné à droite avec devise, dates relatives (« expire dans 12 j ») + absolues au survol.
3. **Vues sauvegardées** : table `saved_views(user_id, bank_id, name, filters jsonb, sort jsonb, is_shared)` ; chips de filtres actifs avec suppression unitaire et « Tout effacer » ; partage d'URL.
4. **Actions en masse** : sélection multiple → changer statut, réaffecter (`assigned_to`), taguer, exporter, créer un rappel ; barre d'actions flottante avec compteur.
5. **Export** : CSV (natif) + XLSX (`xlsx`, déjà en dépendance) + PDF liste (`jspdf-autotable`, déjà en dépendance) — les 3 dépendances inutilisées trouvent leur usage ; export tracé dans l'audit.
6. **Virtualisation** (`@tanstack/react-virtual`) au-delà de 200 lignes ; `staleTime: 60 s` et `placeholderData: keepPreviousData` pour une navigation sans clignotement.
7. **Import en masse** (le time-to-value de ContractSafe/Evisort) : assistant CSV/ZIP avec correspondance de colonnes, prévisualisation des 20 premières lignes, détection de doublons (client + montant + date), rapport d'erreurs téléchargeable.

**Critères d'acceptation**
- [ ] Retrouver un contrat par fragment de nom, référence ou montant en < 500 ms sur 50 000 lignes.
- [ ] Une vue « Hypothèques à inscrire — Agence Nord » est enregistrée, partagée par URL, et rejouée à l'identique.
- [ ] Sélection de 50 contrats → changement de statut + export XLSX en une opération, avec trace d'audit.
- [ ] Import de 1 000 contrats CSV : rapport d'erreurs exploitable, 0 doublon créé.

---

#### R8. Alertes et échéances réelles — la file « À traiter » (🔥🔥🔥 · 7 j)

**Constat** : A14, A15, C7 ; `contract_reminders` et `ContractAlertCreator` inexploités.
**Ce que font les meilleurs** : Ironclad — **chaque obligation a un propriétaire nommé** (« unowned obligations are the ones that get missed »), dashboards filtrables 30/60/90 jours, alertes d'exception, piste d'audit ; Gatekeeper/ContractWorks — rappels automatiques anti-renouvellement tacite.

**Spécification**
1. **Moteur d'échéances serveur** : `pg_cron` (ou fonction planifiée) quotidien qui (a) crée/met à jour les rappels à J-90/J-60/J-30/J-7 sur `expiry_date`, `renewal_date`, `date_signature`, échéances de garanties et d'assurances ; (b) marque `expired` les contrats dont la date est passée ; (c) génère `notifications`. Trigger réécrit en mode idempotent (R2.3).
2. **Modèle d'obligation** : table `contract_obligations(id, contract_id, type, description, due_date, frequency, owner_id, status, escalation_contact, source_clause, extraction_id)` — reprise fidèle des champs recommandés par Ironclad. Alimentée par saisie manuelle **et** par extraction IA (R9).
3. **Écran « À traiter » par défaut** : 4 files (Échéances à venir · Signatures en attente · Documents manquants · Validations IA), chacune triable par urgence, avec **propriétaire** (avatar + `assigned_to`), action en un clic (traiter / reporter / ouvrir le contrat) et compteur dans la sidebar.
4. **Notifications** : in-app (Realtime sur `notifications`, badge réel) + e-mail (digest quotidien et alerte immédiate pour J-7) + option webhook/Slack/Teams. Préférences par utilisateur (R6.4).
5. **Règles par banque** : délais configurables (30/60/90), seuils de montant déclenchant une validation, escalade si aucune action après X jours.
6. **Zéro alerte orpheline** : toute alerte pointe vers un contrat et une action ; les alertes traitées restent consultables (historique) — exigence d'audit.

**Critères d'acceptation**
- [ ] Un contrat dont l'échéance est à J-29 apparaît automatiquement dans « À traiter » et déclenche une notification.
- [ ] Chaque alerte a un propriétaire nommé ; filtre « les miennes » disponible.
- [ ] Aucune duplication de rappels après 10 mises à jour du même contrat (test SQL).
- [ ] Le taux de contrats avec échéance suivie est mesurable (`contrats_avec_echeance / total`).

---

#### R9. IA utile, sécurisée et vérifiable (🔥🔥 · 8 j)

**Constat** : A17, A18, D5-D7 ; `contract_ai_extractions` (avec `confidence_score`, `reviewed_by`, `is_verified`) jamais câblé ; assistant sans accès aux données du tenant.
**Ce que font les meilleurs** : Evisort « Document X-Ray » (OCR + extraction sur papier scanné/tiers), LinkSquares (Smart Values), Ironclad Jurist (détection de risque, comparaison playbook, redline), Juro Operator (Q&A en langage naturel **ancrée sur le référentiel**) ; tous appliquent le **human-in-the-loop**.

**Spécification**
1. **Extraction au dépôt de document** : pipeline `upload → OCR (si scanné) → extraction (parties, dates, montant, échéances, garanties, clauses sensibles) → contract_ai_extractions(confidence_score) → file de validation`. UI : pré-remplissage du formulaire avec **badge de confiance par champ** (≥ 0,9 auto-validé ; 0,6-0,9 à relire, surligné ; < 0,6 à saisir) + clic sur le champ → surlignage de la phrase source dans le document.
2. **Assistant ancré sur les données** : remplacer le chat générique par un assistant outillé (RPC Supabase en outils : `search_contracts`, `contract_kpis`, `upcoming_deadlines`, `open_contract`) capable de répondre à « quels contrats hypothécaires expirent ce trimestre à l'agence Nord ? » **dans le périmètre `bank_id` de l'utilisateur** (client Supabase construit avec le JWT utilisateur, jamais `service_role`).
3. **Streaming + états** : réponse en streaming (SSE) avec indicateur de génération, interruption possible, historique persisté, suggestions contextuelles (pas de questions génériques codées en dur comme `AiAssistantSheet.tsx:18-23`).
4. **Garde-fous** : auth obligatoire (R1.3), quota par utilisateur/banque, coût plafond mensuel, journalisation des appels (modèle, tokens, latence, contrat concerné), **mention systématique** « Contenu généré par IA — à valider par un humain » + interdiction d'écrire en base sans validation explicite.
5. **Anti-injection de prompt** : contenu documentaire encapsulé (délimiteurs + instruction système de non-exécution), filtrage des instructions sortantes, pas de secret dans le prompt.
6. **Supprimer le faux** : `ClauseEditor.tsx:77-86` (simulation) branché sur le vrai service ou retiré ; `lib/ai-utils.ts` (appel OpenAI direct depuis le navigateur) supprimé — tout passe par les Functions.

**Critères d'acceptation**
- [ ] Déposer un PDF de crédit pré-remplit ≥ 8 champs avec score de confiance affiché ; l'utilisateur valide/corrige en < 2 min.
- [ ] L'assistant répond correctement à 5 questions métier sur les données réelles du tenant et refuse poliment hors périmètre.
- [ ] Un appel sans JWT renvoie 401 ; le quota déclenche 429 ; chaque appel est journalisé avec son coût.
- [ ] Aucun contenu IA n'atteint la base sans action humaine de validation (test e2e).

---

#### R10. Workflow d'approbation, signature et piste d'audit conforme (🔥🔥🔥 · 12 j)

**Constat** : D10, D14, D17, D18, D19 ; `template_workflow_steps` et les 6 rôles déclarés mais non exploités ; `ContractTemplateManager`/`TemplateWorkflowManager` sans débouché.
**Ce que font les meilleurs** : Ironclad (routage conditionnel no-code, escalade/délégation, e-signature native avec **signature audit trail**), DocuSign CLM (workflows avancés), et les exigences eIDAS/ESIGN : consentement, identification du signataire, horodatage, IP/user-agent, **hash SHA-256 du document**, certificat de complétion, rétention longue.

**Spécification**
1. **Exécution du workflow** : moteur `contract_workflows(contract_id, template_id, current_step, status, started_at, completed_at)` + `contract_workflow_events(step, actor, action, comment, at)` ; transitions conditionnelles sur montant/type/garantie (ex. montant > 500 000 → étape « comité crédit ») ; délégation et escalade automatique après X jours.
2. **Rôles effectifs** : matrice rôle × action (`user` saisit, `manager` valide, `validator` conforme, `auditor` lit + exporte, `bank_admin` administre, `super_admin` multi-banques) appliquée **en base** (policies) **et** dans l'UI (items masqués/désactivés) — aujourd'hui seul `isAdmin` à 2 valeurs est utilisé (`Index.tsx:30`).
3. **Signature** : intégration e-sign (DocuSign/YouSign/Signbee selon marché) ou signature interne avec preuve : capture e-mail, IP, user-agent, horodatage ISO 8601, **hash SHA-256 du fichier signé**, statut scellé (interdiction de modification après scellement), certificat PDF de complétion.
4. **Conservation** : `retention_years` par banque, archivage à froid des contrats scellés, suppression logique uniquement, export réglementaire (liste + documents + journaux) en un clic.
5. **Piste d'audit complète** : journalisation serveur via `write_audit()` (R1.4) sur **création, lecture de fiche, téléchargement, modification (avec diff champ par champ), changement de statut, validation, signature, export, connexion échouée, modification de rôle**. UI : journal filtrable (acteur, action, période, contrat), diff lisible (avant/après) au lieu du `<pre>{JSON.stringify(...)}` actuel (`AuditLogPanel.tsx:66-70`), export CSV, **interface en français**.
6. **Timeline par contrat** : fusion des événements d'audit, des versions de documents (`contract_versions`) et des commentaires — vue « vie du contrat » exportable.

**Critères d'acceptation**
- [ ] Un contrat de 600 k€ suit automatiquement un circuit à 3 valideurs ; un `user` ne peut pas valider (bloqué en base, test à l'appui).
- [ ] Chaque document signé a un hash vérifiable ; toute modification post-scellement est refusée.
- [ ] Le journal d'audit permet de répondre en < 1 min à « qui a consulté/modifié le contrat X entre telle et telle date ? », avec export.
- [ ] Un auditeur (`auditor`) peut tout lire et exporter sans rien modifier (test RLS).

---

#### R11. Design system unique + white-label réel (🔥🔥 · 6 j)

**Constat** : §2.3 (deux design systems, quatre noms, tokens sombres vs classes claires en dur), A19, D11.
**Ce que font les meilleurs** : Juro est cité pour son interface « construite par d'anciens juristes » — une identité cohérente sur tous les écrans ; les plateformes multi-tenant appliquent la marque du client par **variables de thème**, jamais par CSS libre injecté.

**Spécification**
1. **Choisir UNE identité** : recommandation — garder l'ADN « JURIX » (sombre, accent orange/rouge, typographie marquée) pour la **landing et l'auth**, et décliner une variante **claire à forte densité** pour l'espace de travail (les agents y passent 6 h/jour). Un seul nom de produit partout (titre, meta, footer, `capacitor.config.ts`, e-mails).
2. **Tokens** : étendre `index.css` avec les deux thèmes (`:root[data-theme="light"]`, `[data-theme="dark"]`) via `next-themes` (déjà installé, utilisé uniquement par `sonner.tsx`) ; **interdire** les couleurs en dur (`slate-*`, `gray-*`, `orange-*`) dans les composants métier — règle ESLint `no-restricted-syntax` sur `className` contenant une couleur de la palette brute.
3. **Composants métier** : `<StatusBadge/>` (icône + texte + couleur token), `<Money/>` (devise + format locale), `<DateCell/>` (relatif + absolu), `<KpiCard/>`, `<EmptyState/>`, `<ErrorState/>`, `<PageHeader/>`, `<DataTable/>`, `<ConfirmDialog/>` — un seul endroit pour chaque décision visuelle.
4. **White-label réel** : au chargement, lire `organization_branding` (par `bank_id`, pas `.single()` global comme `OrganizationBrandingManager.tsx:62-69`) et appliquer `logo_primary_url`, `primary_color`, `accent_color` en **variables CSS** (`--primary`, `--ring`, …) + logo dans la sidebar/les PDF/e-mails. **Supprimer le champ `custom_css`** (ou le restreindre à un jeu de tokens validés côté serveur) — risque d'injection.
5. **Densité et hiérarchie** : grille de densité (compact/confortable), titres de page avec contexte (banque, agence, période), états vides illustrés, microcopy homogène en français (terminologie bancaire validée).

**Critères d'acceptation**
- [ ] Aucun écran ne mélange deux systèmes visuels ; le thème clair/sombre bascule sans classe en dur.
- [ ] Une banque qui configure logo + couleurs les voit appliqués dans l'app, les exports PDF et les e-mails.
- [ ] `grep -rn "bg-slate-\|text-gray-\|from-orange-" src/components src/pages` ≤ 5 occurrences (landing uniquement).
- [ ] Un designer peut ajouter un écran sans inventer de nouvelles couleurs (revue des tokens).

---

#### R12. Accessibilité WCAG 2.2 AA (🔥🔥 · 5 j)

**Constat** : F1 à F14.
**Ce que font les meilleurs** : l'accessibilité est un critère d'achat public/bancaire (European Accessibility Act, RGAA en France) ; les composants Radix/shadcn déjà installés fournissent l'essentiel du clavier/ARIA — le manque est dans le code métier.

**Spécification** (par lots, du plus rentable au plus fin)
1. **Noms accessibles** : `aria-label` + `sr-only` sur tous les boutons icône (table, header, Kanban) ; `<label>` réel sur tous les champs (landing comprise) ; `htmlFor`/`id` appariés.
2. **Clavier** : ordre de tabulation logique, `focus-visible:ring-2 ring-offset-2` global (anneau ≥ 2 px, contraste 3:1), pas de piège à focus, Échap ferme tout panneau (dont le filtre de `SearchBar`), **alternative au drag** dans le Kanban (2.5.7), navigation dans la table (flèches + entrée), raccourcis documentés (R6.3).
3. **Cibles** : ≥ 24×24 px partout, ≥ 44×44 px en tactile (2.5.8) ; espacement ≥ 8 px entre actions de ligne.
4. **Couleur & contraste** : statuts = icône + texte (1.4.1) ; contraste texte ≥ 4,5:1, UI ≥ 3:1 (1.4.3/1.4.11) — corriger `text-slate-400` sur fonds clairs et `orange-400` sur sombre ; tableau de tokens validés au contrastimètre.
5. **Structure** : landmarks (`<header> <nav> <main>`), skip link, `aria-current`, tables avec `<caption>` et `scope="col"`, listes sémantiques pour les alertes, `aria-live="polite"` sur les mises à jour de résultats, `role="status"`/`"alert"` sur les toast/erreurs.
6. **Authentification accessible** (3.3.8) : `autoComplete`, collage autorisé, pas de test cognitif, passkeys en option (R17).
7. **Mouvement** (2.2.2/2.3.3) : `@media (prefers-reduced-motion: reduce)` coupe les 180 animations de la landing.
8. **RTL** (R13) : propriétés logiques (`ms-*`/`me-*`, `ps-*`/`pe-*`), `dir` appliqué sur `<html>`, tests visuels AR.
9. **Outillage** : `eslint-plugin-jsx-a11y` activé en erreur, axe-core dans les tests Playwright (0 violation critique), audit manuel clavier + lecteur d'écran (NVDA/VoiceOver) sur 3 parcours.

**Critères d'acceptation**
- [ ] Parcours « créer un contrat » réalisable à 100 % au clavier et annoncé correctement au lecteur d'écran.
- [ ] 0 violation axe-core critique/sérieuse sur les 6 écrans principaux en CI.
- [ ] Contrastes ≥ 4,5:1 vérifiés sur les tokens (rapport joint).
- [ ] Le Kanban est utilisable sans souris (menu « Déplacer vers… »).

---

### P2 — Mois 3-4 : différenciation, échelle et internationalisation

#### R13. i18n réel FR / EN / AR + RTL (🔥🔥 · 8 j)
**Constat** : 5 clés, 0 `t()`, arabe non rendu, dates/devises `fr-FR` codées en dur, `AuditLogPanel` en anglais.
**Benchmark** : les CLM visés par les banques multinationales couvrent 100+ langues (Sirion/Evisort) ; sur le marché MENA/Francophone, **AR + RTL est un différenciateur décisif** — et aucun des leaders occidentaux ne le traite bien.
**Spécification** : extraire **toutes** les chaînes (script `i18next-parser`) en 3 namespaces (`common`, `contracts`, `admin`) ; clés de statut/devise/garantie centralisées ; `Intl` pour dates, nombres, devises ; bascule `dir` + propriétés logiques (R12.8) ; polices arabes (Noto Sans Arabic / IBM Plex Sans Arabic) self-hosted ; tests de non-régression visuelle FR/EN/AR ; validation juridique des termes bancaires arabes.
**Acceptation** : bascule FR→EN→AR traduit 100 % de l'UI sans débordement ni mise en page cassée ; aucune chaîne en dur (`grep` des littéraux français dans les composants = 0).

#### R14. Bibliothèque de clauses persistée + playbook (🔥🔥 · 6 j)
**Constat** : A16, A17 (démo en mémoire, IA simulée).
**Benchmark** : Ironclad Jurist (clause library + détection d'écart au playbook), Juro (clauses dynamiques à logique conditionnelle).
**Spécification** : table `clauses` (banque, catégorie, versions, statut d'approbation, owner juridique) + `clause_versions` ; recherche plein texte ; insertion dans les modèles via `template_fields` ; **détection d'écart** : comparaison d'une clause de contrat tiers à la clause de référence, score de déviation, proposition de redline ; workflow d'approbation juridique des nouvelles clauses.
**Acceptation** : une clause modifiée conserve son historique ; un contrat tiers importé signale ≥ 3 écarts au playbook avec justification textuelle.

#### R15. Analytics bancaires crédibles (🔥🔥 · 6 j)
**Constat** : A5, A6, §2.3 vocabulaire, C10.
**Benchmark** : LinkSquares (dashboards de portefeuille : actif, expirant, risque), Ironclad (KPIs, renewals, obligations).
**Spécification** : RPC d'agrégation (`encours_par_agence`, `encours_par_type`, `cycle_time_moyen`, `taux_garantie`, `echeances_30_60_90`, `top_clients`, `contrats_sans_document`) ; graphiques Recharts avec données réelles + drill-down vers la liste filtrée (URL) ; période configurable ; export PDF/XLSX ; rapports planifiés par e-mail ; vocabulaire bancaire validé (encours, engagements, garanties, sinistralité).
**Acceptation** : chaque chiffre est reproductible en SQL ; cliquer un segment ouvre la liste filtrée correspondante ; 0 donnée codée en dur.

#### R16. Collaboration temps réel (🔥 · 6 j)
**Constat** : `contract_comments` et `contract_versions` jamais câblés ; aucun canal Realtime.
**Benchmark** : Juro (édition collaborative navigateur, espace de négociation partagé avec la contrepartie), Ironclad (historique de négociation centralisé).
**Spécification** : commentaires avec @mentions → notification ; présence (qui consulte la fiche) via Realtime ; historique de versions avec diff et restauration ; partage externe contrôlé (contrepartie) avec lien à durée de vie et journalisation des accès.
**Acceptation** : deux utilisateurs voient le commentaire de l'autre en < 2 s ; une version antérieure est restaurable ; un lien externe expire et chaque accès est tracé.

#### R17. Administration multi-tenant : onboarding, invitations, SSO/MFA (🔥🔥 · 8 j)
**Constat** : D9, D10, A23, §2.2 rôles sous-exploités.
**Benchmark** : tous les acteurs enterprise (RBAC, SSO, résidence des données) ; exigence RSSI bancaire.
**Spécification** : création de banque par le super admin (avec devise, fuseau, délais d'alerte, rétention) ; invitation d'utilisateurs par e-mail avec rôle et agence ; gestion fine des permissions (matrice rôle × action) ; **SSO SAML/OIDC** + **MFA TOTP** (`input-otp` déjà installé) ; sessions actives et révocation ; journal des accès administratifs ; `profiles.created_at` ajouté (corrige A23).
**Acceptation** : onboarding d'une nouvelle banque en < 10 min sans SQL ; connexion MFA et SSO fonctionnelles ; le panneau utilisateurs liste/trie/filtre sans erreur.

#### R18. Performance & observabilité (🔥🔥 · 5 j)
**Constat** : E1-E10.
**Spécification** : `React.lazy` + `Suspense` par route ; `manualChunks` (`react`, `radix`, `charts`, `excel`, `i18n`) ; budget **200 kB gzip** pour le shell vérifié en CI (`size-limit`) ; polices self-hosted avec `font-display: swap` et subset ; landing : fond statique (SVG) au lieu de 180 divs aléatoires ; images/PDF en lazy + URLs signées courtes ; `staleTime`/`gcTime` configurés ; Sentry (erreurs + traces) et `web-vitals` (LCP, INP, CLS) remontés ; Lighthouse CI (perf ≥ 85, a11y ≥ 95, best practices ≥ 95).
**Acceptation** : LCP < 2,5 s et INP < 200 ms sur profil 4G moyen ; bundle shell ≤ 200 kB gzip ; les erreurs de production sont visibles dans Sentry avec contexte utilisateur/banque.

#### R19. Mobile assumé (🔥 · 6 j)
**Constat** : A28 (Capacitor configuré mais pointing vers un site distant `lovableproject.com`, `usePlatform` et `mobile.css` morts).
**Spécification** : décision explicite PWA **ou** natif. Si natif : build local embarqué (`webDir: dist` sans `server.url` distant), plugins (notifications push, biométrie, caméra pour photographier un document), zones sûres iOS appliquées (`safe-area-*` enfin utilisés), cibles tactiles 44 px, mode hors-ligne (cache des contrats consultés + file d'actions). Si PWA : manifest, service worker, installation, push.
**Acceptation** : un agent consulte et met à jour un contrat depuis un téléphone, en tactile confortable, avec notification d'échéance reçue.

#### R20. Landing & conformité marketing/légale (🔥 · 4 j)
**Constat** : A26, A27, D13, D15, D16, E4.
**Spécification** : un seul message de valeur vérifiable (le crédit bancaire multi-agences, la conformité, le gain de temps **mesuré**) ; preuves (captures du produit réel, chiffres sourcés, logo de pilote avec accord) ; formulaire branché (Supabase table `leads` + e-mail + consentement RGPD explicite) ; pages **Mentions légales, CGU, Politique de confidentialité, Sous-traitants/DPA, Sécurité** ; SEO (titre/description cohérents avec la marque, `og:image` propre — actuellement l'image par défaut de Lovable, `index.html:18` — sitemap, hreflang si multilingue) ; CTA unique (« Demander une démo » / « Essayer ») ; bandeau cookies conforme ; suppression des témoignages et statistiques non étayés.
**Acceptation** : un prospect peut comprendre le produit, voir une démo réelle, soumettre le formulaire et recevoir une réponse ; les 5 pages légales existent ; Lighthouse SEO ≥ 95.

---

## 5. Feuille de route 90 jours

| Sprint | Semaines | Contenu | Livrable vérifiable |
|---|---|---|---|
| **S1 — Sécuriser** | S1-S2 | R1 (RLS, storage, functions, secrets, headers) + R5 (CI, typecheck, ErrorBoundary) | Rapport de vérification sécurité vert ; CI bloquante ; clé anon tournée |
| **S2 — Réparer le cœur** | S2-S3 | R2 (statuts, schéma, types régénérés) + R3 (CRUD complet) + R4 (données fantômes supprimées) | Démo 15 min sans donnée fausse, avec création/consultation/édition/statut/téléchargement/suppression |
| **S3 — Unifier** | S4-S5 | R6 (une app, routes, sidebar, ⌘K) + R11 (design system, white-label) + R12 (a11y AA) | URL partageables ; 0 axe-core critique ; branding appliqué ; audit contrastes |
| **S4 — Devenir un CLM** | S6-S8 | R7 (référentiel, recherche, vues, masse, export, import) + R8 (échéances, inbox, notifications) | 50 000 contrats testés ; inbox « À traiter » alimentée automatiquement ; import en masse |
| **S5 — Prouver** | S8-S10 | R10 (workflow, rôles, signature, audit complet) + R9 (IA extraction + assistant ancré) | Circuit d'approbation à 3 valideurs ; hash + certificat ; extraction avec validation humaine |
| **S6 — Élargir** | S11-S13 | R15 (analytics) + R13 (i18n/AR) ou R17 (SSO/MFA) selon le pipeline commercial + R18 (perf/observabilité) | Rapports réels ; FR/EN/AR ; LCP < 2,5 s ; Sentry en production |

**Règle de pilotage** : aucune fonctionnalité nouvelle (P2) ne démarre tant que le P0 n'est pas vert — c'est la condition pour que le reste ait de la valeur.

---

## 6. Indicateurs de succès à instrumenter dès S1

| Famille | Indicateur | Cible 90 jours |
|---|---|---|
| **Fiabilité** | Contrats créés avec succès (taux) | ≥ 99,5 % |
| | Erreurs JS en production / 1 000 sessions (Sentry) | < 5 |
| | Erreurs TS / lint en CI | 0 |
| **Sécurité** | Politiques RLS publiques | 0 |
| | Endpoints non authentifiés | 0 |
| | Couverture des actions sensibles dans l'audit | 100 % |
| **Valeur métier** | Délai médian de saisie d'un contrat | < 3 min (avec extraction IA : < 90 s) |
| | % de contrats avec échéance suivie et propriétaire | ≥ 95 % |
| | Alertes traitées dans les délais | ≥ 90 % |
| | Temps de recherche d'un contrat | < 10 s |
| **Adoption** | Utilisateurs actifs hebdo / utilisateurs créés | ≥ 60 % |
| | % d'actions réalisées au clavier/⌘K | mesuré, croissant |
| **Qualité perçue** | Lighthouse (perf / a11y / BP / SEO) | ≥ 85 / 95 / 95 / 95 |
| | Bundle shell (gzip) | ≤ 200 kB |
| | Violations axe-core critiques | 0 |
| | Couverture de tests (lignes) | ≥ 60 % sur `lib/`, `hooks/`, flux critiques |

---

## 7. Annexes

### Annexe A — Registre des défauts avec preuve

| ID | Type | Fichier:ligne | Description courte | Réf. reco |
|---|---|---|---|---|
| B01 | Sécurité | `migrations/20250615114558…sql:5-27` | 4 politiques RLS `TO public` sur `contracts` | R1 |
| B02 | Sécurité | `migrations/20250615191823…sql:8-12` | Bucket documents public en lecture | R1 |
| B03 | Sécurité | `migrations/20250615194949…sql:94` | Auto-escalade de rôle via `profiles FOR ALL` | R1 |
| B04 | Sécurité | `migrations/20250615210615…sql:29-34` | INSERT d'audit ouvert, attributs non contraints | R1 |
| B05 | Sécurité | `migrations/20250705115709…sql:127,191` | INSERT notifications/extractions sans clause `TO` (= PUBLIC, dont anonyme) | R1 |
| B06 | Sécurité | `functions/ai-assistant-chat/index.ts:5-16` | CORS `*`, pas de contrôle d'auth | R1 |
| B07 | Sécurité | `functions/ai-contract-generator/index.ts:7-18` | `service_role` sur endpoint non authentifié | R1 |
| B08 | Sécurité | `integrations/supabase/client.ts:5-6` | URL + clé anon en dur, pas de `.env` | R1 |
| B09 | Sécurité | `contexts/AuthContext.tsx:119` | Admin déterminé par un e-mail personnel codé en dur | R1 |
| B10 | Sécurité | `OrganizationBrandingManager.tsx:38,393` | Champ `custom_css` libre (injection potentielle) | R11 |
| B11 | Sécurité | `CreateContractDialog.tsx:60,119,132` | Données de contrat imprimées en console | R5 |
| B12 | Fonctionnel | `App.tsx:76,93` | Deux apps ; `/legacy` inaccessible depuis l'UI | R6 |
| B13 | Fonctionnel | `Dashboard.tsx:186-191` | Bouton « Nouveau Contrat » sans handler | R3/R6 |
| B14 | Fonctionnel | `Dashboard.tsx:144-147` | Bouton réglages `onClick={() => {}}` | R6 |
| B15 | Fonctionnel | `ContractTable.tsx:90-93,207-215` | Consultation = `TODO` ; téléchargement sans handler | R3 |
| B16 | Fonctionnel | `ContractKanban.tsx:74-81` | Drag & drop non persisté | R3 |
| B17 | Fonctionnel | `SearchBar.tsx:19-22` | Recherche = `console.log`, filtres inactifs | R7 |
| B18 | Fonctionnel | `UserManagementPanel.tsx:33` | Tri sur `profiles.created_at` (colonne inexistante) | R2/R17 |
| B19 | Fonctionnel | `CreateContractDialog.tsx:104-117` | `currency` saisi mais jamais inséré | R2 |
| B20 | Données | `migrations/20250705115709…sql:102-104` | CHECK de statut incompatible avec l'app et le défaut DB | R2 |
| B21 | Données | `contract-helpers.ts:19-31` vs `ContractTable.tsx:38-70` | Deux vocabulaires de statuts côté client | R2 |
| B22 | Données | `migrations/20250611…sql:5,51-68` | `reference_decision` UNIQUE global + `MAX()+1` sans verrou | R2 |
| B23 | Données | `migrations/20250705115709…sql:196-220` | Trigger de rappels dupliqué à chaque UPDATE | R8 |
| B24 | Données | `types.ts` (0 occurrence de `notifications`, `contract_value`, `tags`…) | Types générés désynchronisés du schéma | R2/R5 |
| B25 | Données | `migrations/20250705115709…sql:90` | `montant` et `contract_value` en double | R2 |
| B26 | Données | aucune trigger `set_updated_at` | `updated_at` jamais maintenu | R2 |
| B27 | UI | `Dashboard.tsx:44-88,104,139` | Alertes/échéances codées en dur, badge « 3 », onglet « en développement » | R4 |
| B28 | UI | `DashboardStats.tsx:39-46,99,117,153,218,244` | Séries mensuelles fictives, +12 %/+8 %, « 85 % », `NaN%` si total = 0 | R4 |
| B29 | UI | `FinancialDashboard.tsx:29-52,93,110` | Graphiques simulés, +15,3 %, `NaN%` | R4 |
| B30 | UI | `AlertsPanel.tsx:8-49,76-80,126-128` | Panneau d'alertes 100 % statique, bouton « Traiter » inerte | R4/R8 |
| B31 | UI | `ContractTable.tsx:96-101` | Erreur de requête affichée comme « Aucun contrat disponible » | R3 |
| B32 | UI | `contract-helpers.ts:57-60` vs `DashboardStats.tsx:48-53` | Devises MAD et EUR mélangées | R2/R11 |
| B33 | UI | `AuditLogPanel.tsx:34-36,56,66-70` | Interface en anglais + JSON brut affiché | R10/R11 |
| B34 | IA | `ClauseEditor.tsx:77-86` | « Amélioration IA » simulée par un `setTimeout` | R4/R9 |
| B35 | IA | `lib/ai-utils.ts:10` | `process.env` dans le navigateur (Vite) + appel OpenAI direct côté client | R9 |
| B36 | IA | `AiAssistantSheet.tsx:18-23,62-68` | Questions codées en dur ; `fetch` sans header d'auth ; pas de streaming | R9 |
| B37 | i18n | `public/locales/*` (5 clés), 0 `t()` | Traduction factice | R13 |
| B38 | i18n | `LanguageSwitcher.tsx:28-31` | `dir=rtl` sans aucun style RTL | R12/R13 |
| B39 | Perf | build (`dist/assets/index-*.js` = 1 309 kB) ; `vite.config.ts` | Chunk unique, pas de `lazy`, pas de `manualChunks` | R18 |
| B40 | Perf | `index.css:2-3` | 2 familles Google Fonts render-blocking (Poppins + Inter) | R18 |
| B41 | Perf | `Landing.tsx:63-105` | 180 divs positionnés par `Math.random()` à chaque rendu | R18/R20 |
| B42 | Perf | `ContractList.tsx:10-17`, `DashboardStats.tsx:14`, `FinancialDashboard.tsx:14`, `ContractKanban.tsx:26` | `select('*')` sans `.limit()`/`.range()`, agrégations client | R7 |
| B43 | A11y | `ContractTable.tsx:124-138,198-216` | `<select>` sans label, boutons icône sans nom accessible | R12 |
| B44 | A11y | `Landing.tsx:175-195` | Champs sans `<label>` (placeholder seul) | R12 |
| B45 | A11y | `ContractKanban.tsx:70-81` | Drag & drop sans alternative (WCAG 2.5.7) | R12 |
| B46 | Qualité | `package.json:8` | Build sans type-check (21 erreurs TS livrables) | R5 |
| B47 | Qualité | ESLint | 53 erreurs, 8 warnings | R5 |
| B48 | Qualité | `package.json` | 0 test, 0 CI, `jspdf`/`xlsx` inutilisés, 6 composants orphelins, 28 `ui/` inutilisés | R5/R7 |
| B49 | Qualité | `README.md` | README Lovable par défaut, aucune documentation produit/architecture | R5 |
| B50 | Marketing | `Landing.tsx:33-38,241`, `:41-56`, `:340-378` | Chiffres non étayés, témoignages invérifiables, footer non cliquable, pas de pages légales | R20 |
| B51 | Mobile | `capacitor.config.ts:6-9` | App native pointant vers un site distant + `cleartext: true` | R19 |
| B52 | Mobile | `use-platform.tsx`, `mobile.css` | Code mort (0 usage des classes et du hook) | R19 |

### Annexe B — Snippets de référence

**B.1 Découpage de code (R18)**
```ts
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        react:  ['react', 'react-dom', 'react-router-dom'],
        radix:  ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
        charts: ['recharts'],
        office: ['xlsx', 'jspdf', 'jspdf-autotable'],
        i18n:   ['i18next', 'react-i18next', 'i18next-http-backend'],
      },
    },
  },
},
```
```tsx
// App.tsx
const Dashboard = lazy(() => import('./pages/AppShell'));
const ContractDetail = lazy(() => import('./pages/ContractDetail'));
<Suspense fallback={<RouteSkeleton />}>…</Suspense>
```

**B.2 Téléchargement sécurisé (R1/R3)**
```ts
async function downloadContractFile(path: string, filename: string) {
  const { data, error } = await supabase.storage
    .from('contract_files')
    .createSignedUrl(path, 60, { download: filename });
  if (error || !data) throw error;
  const a = Object.assign(document.createElement('a'), { href: data.signedUrl, download: filename });
  a.click();
  await writeAudit('contract.document.download', { path });
}
```

**B.3 KPI sans NaN, sans donnée fantôme (R4)**
```ts
export const safePct = (part: number, total: number) => (total > 0 ? (part / total) * 100 : null);
export const Pct = ({ value }: { value: number | null }) =>
  value === null ? <span aria-label="Non disponible">—</span> : <>{value.toFixed(1)} %</>;
```

**B.4 Palette de commandes (R6, `cmdk` déjà installé)**
```tsx
<CommandDialog open={open} onOpenChange={setOpen}>
  <CommandInput placeholder="Rechercher un contrat, une action…" />
  <CommandList>
    <CommandGroup heading="Navigation">…</CommandGroup>
    <CommandGroup heading="Contrats">{results.map(c => <CommandItem key={c.id} onSelect={() => nav(`/app/contrats/${c.id}`)}>{c.client} · {c.reference_decision}</CommandItem>)}</CommandGroup>
    <CommandGroup heading="Actions"><CommandItem onSelect={newContract}>Nouveau contrat (N)</CommandItem></CommandGroup>
  </CommandList>
</CommandDialog>
```

**B.5 Garde d'auth + quota sur une Edge Function (R1/R9)**
```ts
const { data: { user }, error } = await supabase.auth.getUser(req.headers.get('Authorization')?.replace('Bearer ', '') ?? '');
if (error || !user) return json({ error: 'unauthorized' }, 401);
const { data: quota } = await admin.from('ai_usage').select('calls').eq('user_id', user.id).eq('day', today()).single();
if ((quota?.calls ?? 0) >= DAILY_LIMIT) return json({ error: 'quota_exceeded' }, 429);
```

### Annexe C — Définition de « terminé » proposée (à coller dans le README)

1. La donnée affichée vient d'une requête ; aucun nombre codé en dur.
2. Les 4 états sont traités : chargement (skeleton), vide (pédagogique), erreur (avec `Retry`), succès.
3. Toute action destructive demande une confirmation et est journalisée.
4. Toute chaîne visible passe par `t()` ; les dates/devises par `Intl`.
5. Accessible au clavier, noms accessibles présents, contrastes AA, cible ≥ 24 px.
6. `tsc -b`, `eslint --max-warnings=0`, `vitest run` verts ; taille de bundle dans le budget.
7. Aucune donnée sensible en console, aucune clé dans le code, aucun `service_role` côté client ou dans une function non authentifiée.
8. L'URL de l'écran est partageable et rejoue l'état (filtres, tri, page).

### Annexe D — Sources du benchmark

**Comparatifs de marché CLM 2025-2026** (différenciateurs, limites, notes, prix, délais d'implémentation)
- ContractSafe — *16 Best Contract Management Software* : https://www.contractsafe.com/blog/best-clm-software
- Haqq — *CLM Software: 2026 Benchmark* (tableau des notes G2/Capterra/Gartner ; Juro ≈ 60 % d'utilisateurs quotidiens non juristes ; panorama IA par plateforme) : https://www.haqq.ai/blog/contract-lifecycle-management-software
- Redbrick Labs — *Best Contract Management Software With Top-tier Usability* (Juro, SpotDraft, Contractbook, Oneflow, PandaDoc, Ironclad, LinkSquares, DocuSign, Agiloft, Icertis + grille d'évaluation UX) : https://www.redbricklabs.io/blog/best-contract-management-software-options-with-top-tier-usability
- Pactly — *Top 10 CLM Software* : https://www.pactly.com/blog/top-10-contract-lifecycle-management-software-2026
- Concord — *Best CLM Software* (prix et délais d'implémentation comparés) : https://www.concord.app/best-contract-lifecycle-management-software/
- Bind — *Ironclad Alternatives* (coût total 3 ans, setup 1-2 semaines vs 2-3 mois, UX) : https://bindlegal.com/resources/comparisons/ironclad-alternatives/
- ERP Research — *Ironclad vs Juro* (matrice capability par capability) : https://www.erpresearch.com/erp-add-ons/clm/ironclad-vs-juro
- G2 — catégorie *Contract Lifecycle Management* : https://www.g2.com/categories/contract-lifecycle-management-clm

**Ironclad** (workflow, Dynamic Repository, Jurist, obligations)
- Support Ironclad — *Obligations Overview* (obligations typées, propriétaire, dashboard filtrable, **vues sauvegardées**) : https://support.ironcladapp.com/hc/en-us/articles/31128326700183-Obligations-Overview
- Ironclad — *Contract Obligation Tracking Made Simple* (champs minimaux d'une obligation, dashboards 30/60/90, « les obligations sans propriétaire sont celles qu'on rate ») : https://ironcladapp.com/resources/articles/contract-obligation-tracking
- Ironclad — *Contract Data Extraction* (métadonnées extraites, recherche plein texte, alertes d'échéance) : https://ironcladapp.com/journal/contract-data/contract-data-extraction
- Legal Technology Hub — fiche Ironclad (repository, search, analytics, obligations, Clickwrap, e-signature + audit trail) : https://www.legaltechnologyhub.com/vendors/ironclad/
- Contrary Research — *Ironclad Business Breakdown* (« 194+ AI-detected contract metadata properties », universal search, KPIs/renewals/obligations) : https://research.contrary.com/company/ironclad
- *Ironclad in 2026: Dynamic Repository, Jurist* (3 couches produit ; réserve sur la lourdeur de configuration) : https://agenticcontractreview.com/vs-ironclad/

**Signature électronique, preuve et conformité (eIDAS / ESIGN / SOC 2)**
- Signbee — *E-Signature API Compliance Checklist* (niveaux SES/AES/QES ; contenu d'une piste d'audit : e-mail, IP, horodatage ISO 8601, **hash SHA-256**, méthode, user-agent ; rétention 7 ans+) : https://signb.ee/blog/e-signature-api-compliance-checklist
- Contracko — *Contract management software with e-signature* (eIDAS/ESIGN, RGPD, RBAC, chiffrement, **2FA**, timeline unique pré/post-signature) : https://contracko.com/blog/contract-management-software-with-e-signature
- Zignt — *E-Signature Software with Audit Trail* (services financiers : l'audit trail est une infrastructure de conformité, pas une option) : https://zignt.com/blog/e-signature-software-with-audit-trail

**Accessibilité — WCAG 2.2**
- GetWCAG — *WCAG 2.2 Checklist* (2.5.7 Dragging Movements, 2.5.8 Target Size 24×24, 2.4.11 Focus Not Obscured, 3.3.8 Accessible Authentication, 2.4.13 Focus Appearance) : https://getwcag.com/en/wcag-2-2-guidelines
- Deque University — *WCAG 2.2 Updates* (intent et exemples d'implémentation) : https://dequeuniversity.com/resources/wcag-2.2/

**Performance web** (budgets, Core Web Vitals, code splitting) : https://web.dev/explore/performance et https://web.dev/articles/vitals

> Note de méthode : les capacités concurrentes citées proviennent de sources publiques de 2025-2026 ; elles doivent être re-vérifiées avant tout argumentaire commercial. Les constats sur JURIX, eux, sont reproductibles avec les commandes indiquées en §0.
