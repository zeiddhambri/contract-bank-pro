// ============================================================================
// Cycle de vie des contrats — SOURCE DE VÉRITÉ UNIQUE (R2.1 / R2.2)
// ----------------------------------------------------------------------------
// Avant : trois vocabulaires coexistaient (statuts métier français dans
// `contract-helpers.ts`, états anglais génériques dans le Kanban et les
// tableaux de bord, et « actif / en_attente / expire / resilie » dans
// `ContractTable.tsx`), plus une contrainte SQL qui n'autorisait que les
// valeurs anglaises alors que le défaut de colonne était `'en_cours'`.
// Conséquence : création de contrat impossible (23514), Kanban vide, compteurs
// de tableau de bord figés à zéro.
//
// Maintenant : un seul type énuméré en base (`public.contract_status`), un seul
// fichier de référence ici, consommé par tous les composants. La matrice de
// transitions ci-dessous **reflète** `public.contract_status_transitions`
// (migration 20260916090000) : la base reste l'autorité — si l'interface
// propose une transition refusée, le trigger renvoie un message en français.
// ============================================================================
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  FileEdit,
  FileWarning,
  PenLine,
  RefreshCw,
  ShieldCheck,
  UserX,
  type LucideIcon,
} from 'lucide-react';
import type { Enums } from '@/integrations/supabase/types';

export type ContractStatus = Enums<'contract_status'>;
export type AppRole = Enums<'app_role'>;

/** Regroupement utilisé par le Kanban et les filtres. */
export type StatusGroup = 'instruction' | 'mise_en_place' | 'execution' | 'cloture';

/** Agrégat utilisé par les tableaux de bord (montants, compteurs). */
export type StatusBucket = 'pipeline' | 'running' | 'closed';

export interface ContractStatusMeta {
  value: ContractStatus;
  /** Libellé complet, en français. */
  label: string;
  /** Libellé court pour les badges étroits et les en-têtes de colonne. */
  shortLabel: string;
  group: StatusGroup;
  bucket: StatusBucket;
  /** Classes du badge sur fond sombre (dialogues, sélecteur de statut). */
  badge: string;
  /** Classes du badge sur fond clair (tableaux, cartes, tableaux de bord). */
  badgeLight: string;
  /** Classe de la pastille de couleur. */
  dot: string;
  /** Couleur hexadécimale pour les graphiques (Recharts). */
  chartColor: string;
  icon: LucideIcon;
  /** Description affichée en infobulle : ce que l'état attend de l'utilisateur. */
  hint: string;
}

export const STATUS_GROUP_LABELS: Record<StatusGroup, string> = {
  instruction: 'Instruction',
  mise_en_place: 'Mise en place',
  execution: 'Exécution',
  cloture: 'Clôture',
};

/** Ordre d'affichage : suit le parcours réel d'un dossier. */
export const CONTRACT_STATUS_ORDER: ContractStatus[] = [
  'draft',
  'pending_documents',
  'in_review',
  'approved',
  'pending_signature_b',
  'pending_signature_c',
  'pending_mortgage_registration',
  'pending_insurance',
  'active',
  'alert',
  'expired',
  'renewed',
  'client_refused',
  'cancelled',
];

const META: Record<ContractStatus, ContractStatusMeta> = {
  draft: {
    value: 'draft',
    label: 'Brouillon',
    shortLabel: 'Brouillon',
    group: 'instruction',
    bucket: 'pipeline',
    badge: 'border-slate-400 text-slate-300 bg-slate-500/10',
    badgeLight: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
    chartColor: '#94a3b8',
    icon: FileEdit,
    hint: 'Dossier en cours de saisie : aucune pièce exigée à ce stade.',
  },
  pending_documents: {
    value: 'pending_documents',
    label: 'Documents manquants',
    shortLabel: 'Documents',
    group: 'instruction',
    bucket: 'pipeline',
    badge: 'border-slate-400 text-slate-300 bg-slate-500/10',
    badgeLight: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    dot: 'bg-slate-500',
    chartColor: '#71717a',
    icon: FileWarning,
    hint: 'En attente de pièces justificatives du client ou de la banque.',
  },
  in_review: {
    value: 'in_review',
    label: 'En révision',
    shortLabel: 'Révision',
    group: 'instruction',
    bucket: 'pipeline',
    badge: 'border-blue-400 text-blue-300 bg-blue-500/10',
    badgeLight: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-400',
    chartColor: '#3b82f6',
    icon: ShieldCheck,
    hint: 'Instruction du dossier : analyse risque et conformité.',
  },
  approved: {
    value: 'approved',
    label: 'Approuvé',
    shortLabel: 'Approuvé',
    group: 'mise_en_place',
    bucket: 'pipeline',
    badge: 'border-teal-400 text-teal-300 bg-teal-500/10',
    badgeLight: 'bg-teal-50 text-teal-700 border-teal-200',
    dot: 'bg-teal-400',
    chartColor: '#14b8a6',
    icon: CheckCircle2,
    hint: 'Décision favorable : reste à formaliser (signatures, garanties).',
  },
  pending_signature_b: {
    value: 'pending_signature_b',
    label: 'En cours de signature banque',
    shortLabel: 'Signature banque',
    group: 'mise_en_place',
    bucket: 'pipeline',
    badge: 'border-yellow-500 text-yellow-400 bg-yellow-500/10',
    badgeLight: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    dot: 'bg-yellow-500',
    chartColor: '#eab308',
    icon: PenLine,
    hint: 'En attente de la signature des représentants de la banque.',
  },
  pending_signature_c: {
    value: 'pending_signature_c',
    label: 'En cours de signature client',
    shortLabel: 'Signature client',
    group: 'mise_en_place',
    bucket: 'pipeline',
    badge: 'border-yellow-600 text-yellow-500 bg-yellow-500/10',
    badgeLight: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-yellow-600',
    chartColor: '#f59e0b',
    icon: PenLine,
    hint: 'En attente de la signature du client.',
  },
  pending_mortgage_registration: {
    value: 'pending_mortgage_registration',
    label: "En attente d'inscription de l'hypothèque",
    shortLabel: 'Hypothèque',
    group: 'mise_en_place',
    bucket: 'pipeline',
    badge: 'border-purple-400 text-purple-300 bg-purple-500/10',
    badgeLight: 'bg-purple-50 text-purple-700 border-purple-200',
    dot: 'bg-purple-400',
    chartColor: '#a855f7',
    icon: ShieldCheck,
    hint: "Formalité d'inscription hypothécaire en cours auprès de la conservation foncière.",
  },
  pending_insurance: {
    value: 'pending_insurance',
    label: 'Assurance manquante',
    shortLabel: 'Assurance',
    group: 'mise_en_place',
    bucket: 'pipeline',
    badge: 'border-amber-400 text-amber-300 bg-amber-500/10',
    badgeLight: 'bg-orange-50 text-orange-700 border-orange-200',
    dot: 'bg-amber-400',
    chartColor: '#f97316',
    icon: FileWarning,
    hint: "En attente de l'attestation d'assurance (décès-invalidité, dommage).",
  },
  active: {
    value: 'active',
    label: 'Mis en place',
    shortLabel: 'Mis en place',
    group: 'execution',
    bucket: 'running',
    badge: 'border-green-400 text-green-300 bg-green-500/10',
    badgeLight: 'bg-green-50 text-green-700 border-green-200',
    dot: 'bg-green-400',
    chartColor: '#22c55e',
    icon: CheckCircle2,
    hint: 'Contrat exécutoire : les fonds sont débloqués, les échéances courent.',
  },
  alert: {
    value: 'alert',
    label: 'Alerte',
    shortLabel: 'Alerte',
    group: 'execution',
    bucket: 'running',
    badge: 'border-red-400 text-red-300 bg-red-500/10',
    badgeLight: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-400',
    chartColor: '#ef4444',
    icon: AlertTriangle,
    hint: 'Incident en cours : impayé, dépassement, garantie échue.',
  },
  expired: {
    value: 'expired',
    label: 'Expiré',
    shortLabel: 'Expiré',
    group: 'cloture',
    bucket: 'closed',
    badge: 'border-orange-400 text-orange-300 bg-orange-500/10',
    badgeLight: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-orange-400',
    chartColor: '#f43f5e',
    icon: Clock,
    hint: 'Échéance dépassée sans renouvellement.',
  },
  renewed: {
    value: 'renewed',
    label: 'Renouvelé',
    shortLabel: 'Renouvelé',
    group: 'cloture',
    bucket: 'closed',
    badge: 'border-cyan-400 text-cyan-300 bg-cyan-500/10',
    badgeLight: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    dot: 'bg-cyan-400',
    chartColor: '#06b6d4',
    icon: RefreshCw,
    hint: 'Reconduit : un nouveau contrat prend la suite.',
  },
  client_refused: {
    value: 'client_refused',
    label: 'Refus client',
    shortLabel: 'Refus client',
    group: 'cloture',
    bucket: 'closed',
    badge: 'border-red-600 text-red-500 bg-red-500/10',
    badgeLight: 'bg-red-100 text-red-800 border-red-300',
    dot: 'bg-red-600',
    chartColor: '#dc2626',
    icon: UserX,
    hint: 'Le client a renoncé au financement.',
  },
  cancelled: {
    value: 'cancelled',
    label: 'Résilié',
    shortLabel: 'Résilié',
    group: 'cloture',
    bucket: 'closed',
    badge: 'border-gray-400 text-gray-300 bg-gray-500/10',
    badgeLight: 'bg-gray-100 text-gray-600 border-gray-200',
    dot: 'bg-gray-400',
    chartColor: '#6b7280',
    icon: Ban,
    hint: 'Contrat annulé ou résilié avant son terme.',
  },
};

/** Toutes les métadonnées, dans l'ordre du parcours. */
export const CONTRACT_STATUSES: ContractStatusMeta[] =
  CONTRACT_STATUS_ORDER.map((value) => META[value]);

/** Options pour les listes déroulantes (libellé complet). */
export const CONTRACT_STATUS_OPTIONS = CONTRACT_STATUSES.map(({ value, label }) => ({
  value,
  label,
}));

/** Colonnes du Kanban : regroupements lisibles plutôt que 14 colonnes. */
export const KANBAN_COLUMNS: { id: StatusGroup; title: string; statuses: ContractStatus[] }[] = [
  { id: 'instruction', title: 'Instruction', statuses: ['draft', 'pending_documents', 'in_review'] },
  {
    id: 'mise_en_place',
    title: 'Mise en place',
    statuses: [
      'approved',
      'pending_signature_b',
      'pending_signature_c',
      'pending_mortgage_registration',
      'pending_insurance',
    ],
  },
  { id: 'execution', title: 'Exécution', statuses: ['active', 'alert'] },
  { id: 'cloture', title: 'Clôture', statuses: ['expired', 'renewed', 'client_refused', 'cancelled'] },
];

// ---------------------------------------------------------------------------
// Transitions — miroir de public.contract_status_transitions (migration R2)
// ---------------------------------------------------------------------------
const ALL_ROLES: AppRole[] = ['user', 'manager', 'validator', 'bank_admin', 'super_admin'];
const SENIOR_ROLES: AppRole[] = ['validator', 'bank_admin', 'super_admin'];
const ADMIN_ROLES: AppRole[] = ['bank_admin', 'super_admin'];

const TRANSITIONS: Record<ContractStatus, { to: ContractStatus; roles: AppRole[] }[]> = {
  draft: [
    { to: 'pending_documents', roles: ALL_ROLES },
    { to: 'in_review', roles: ALL_ROLES },
    { to: 'cancelled', roles: ADMIN_ROLES },
    { to: 'client_refused', roles: ADMIN_ROLES },
  ],
  pending_documents: [
    { to: 'draft', roles: ALL_ROLES },
    { to: 'in_review', roles: ALL_ROLES },
    { to: 'cancelled', roles: ADMIN_ROLES },
    { to: 'client_refused', roles: ADMIN_ROLES },
  ],
  in_review: [
    { to: 'draft', roles: SENIOR_ROLES },
    { to: 'approved', roles: SENIOR_ROLES },
    { to: 'pending_documents', roles: ALL_ROLES },
    { to: 'alert', roles: SENIOR_ROLES },
    { to: 'cancelled', roles: ADMIN_ROLES },
    { to: 'client_refused', roles: SENIOR_ROLES },
  ],
  approved: [
    { to: 'pending_signature_b', roles: ALL_ROLES },
    { to: 'pending_signature_c', roles: ALL_ROLES },
    { to: 'pending_mortgage_registration', roles: ALL_ROLES },
    { to: 'pending_insurance', roles: ALL_ROLES },
    { to: 'active', roles: SENIOR_ROLES },
    { to: 'cancelled', roles: ADMIN_ROLES },
    { to: 'client_refused', roles: SENIOR_ROLES },
  ],
  pending_signature_b: [
    { to: 'pending_signature_c', roles: ALL_ROLES },
    { to: 'pending_mortgage_registration', roles: ALL_ROLES },
    { to: 'pending_insurance', roles: ALL_ROLES },
    { to: 'active', roles: SENIOR_ROLES },
    { to: 'alert', roles: SENIOR_ROLES },
    { to: 'cancelled', roles: ADMIN_ROLES },
    { to: 'client_refused', roles: SENIOR_ROLES },
  ],
  pending_signature_c: [
    { to: 'pending_mortgage_registration', roles: ALL_ROLES },
    { to: 'pending_insurance', roles: ALL_ROLES },
    { to: 'active', roles: SENIOR_ROLES },
    { to: 'alert', roles: SENIOR_ROLES },
    { to: 'cancelled', roles: ADMIN_ROLES },
    { to: 'client_refused', roles: SENIOR_ROLES },
  ],
  pending_mortgage_registration: [
    { to: 'active', roles: SENIOR_ROLES },
    { to: 'alert', roles: SENIOR_ROLES },
    { to: 'cancelled', roles: ADMIN_ROLES },
  ],
  pending_insurance: [
    { to: 'active', roles: SENIOR_ROLES },
    { to: 'alert', roles: SENIOR_ROLES },
    { to: 'cancelled', roles: ADMIN_ROLES },
  ],
  active: [
    { to: 'alert', roles: ALL_ROLES },
    { to: 'expired', roles: ADMIN_ROLES },
    { to: 'renewed', roles: ADMIN_ROLES },
    { to: 'cancelled', roles: ADMIN_ROLES },
  ],
  alert: [
    { to: 'active', roles: SENIOR_ROLES },
    { to: 'expired', roles: ADMIN_ROLES },
    { to: 'cancelled', roles: ADMIN_ROLES },
    { to: 'client_refused', roles: ADMIN_ROLES },
  ],
  expired: [
    { to: 'renewed', roles: ADMIN_ROLES },
    { to: 'cancelled', roles: ADMIN_ROLES },
  ],
  renewed: [
    { to: 'active', roles: ADMIN_ROLES },
    { to: 'expired', roles: ADMIN_ROLES },
    { to: 'cancelled', roles: ADMIN_ROLES },
  ],
  client_refused: [
    { to: 'draft', roles: ADMIN_ROLES },
    { to: 'cancelled', roles: ADMIN_ROLES },
  ],
  cancelled: [{ to: 'draft', roles: ['super_admin'] }],
};

// ---------------------------------------------------------------------------
// Anciens vocabulaires → statut canonique (données non migrées, imports IA,
// valeurs saisies à la main dans une ancienne version de l'app).
// ---------------------------------------------------------------------------
const LEGACY_STATUS_MAP: Record<string, ContractStatus> = {
  // vocabulaire métier français d'origine
  en_cours: 'draft',
  attente_signature: 'pending_signature_b',
  valide: 'active',
  alerte: 'alert',
  documents_manquants: 'pending_documents',
  assurance_manquante: 'pending_insurance',
  en_attente_inscription_hypotheque: 'pending_mortgage_registration',
  en_cours_de_signature_b: 'pending_signature_b',
  en_cours_de_signature_c: 'pending_signature_c',
  refus_client: 'client_refused',
  // vocabulaire de ContractTable.tsx
  actif: 'active',
  en_attente: 'in_review',
  expire: 'expired',
  resilie: 'cancelled',
  // vocabulaire anglais de l'ancienne contrainte SQL
  review: 'in_review',
  approval: 'approved',
  pending_signature: 'pending_signature_b',
  signed: 'active',
};

/** Statut par défaut appliqué quand une valeur est absente ou inconnue. */
export const FALLBACK_STATUS: ContractStatus = 'draft';

export function isContractStatus(value: unknown): value is ContractStatus {
  return typeof value === 'string' && value in META;
}

/**
 * Ramène n'importe quelle valeur historique au vocabulaire canonique.
 * Ne lève jamais : une valeur inconnue devient `draft`.
 */
export function normalizeStatus(value: unknown): ContractStatus {
  if (isContractStatus(value)) return value;
  if (typeof value !== 'string') return FALLBACK_STATUS;
  const key = value.trim().toLowerCase();
  return LEGACY_STATUS_MAP[key] ?? (isContractStatus(key) ? key : FALLBACK_STATUS);
}

export function getStatusMeta(value: unknown): ContractStatusMeta {
  return META[normalizeStatus(value)];
}

export const getStatusLabel = (value: unknown): string => getStatusMeta(value).label;
export const getStatusShortLabel = (value: unknown): string => getStatusMeta(value).shortLabel;
export const getStatusBadgeClass = (value: unknown): string => getStatusMeta(value).badge;
/** Variantes claires : tableaux, cartes et tableaux de bord sur fond blanc. */
export const getStatusBadgeClassLight = (value: unknown): string => getStatusMeta(value).badgeLight;
export const getStatusDotClass = (value: unknown): string => getStatusMeta(value).dot;
export const getStatusChartColor = (value: unknown): string => getStatusMeta(value).chartColor;
export const getStatusIcon = (value: unknown): LucideIcon => getStatusMeta(value).icon;
export const getStatusHint = (value: unknown): string => getStatusMeta(value).hint;
export const getStatusGroup = (value: unknown): StatusGroup => getStatusMeta(value).group;
export const getStatusBucket = (value: unknown): StatusBucket => getStatusMeta(value).bucket;

/** Transitions proposées à l'utilisateur, filtrées par rôle. */
export function allowedTransitions(
  from: unknown,
  role: AppRole | null | undefined,
): ContractStatus[] {
  const current = normalizeStatus(from);
  // super_admin garde la main partout (aligné sur le trigger SQL).
  if (role === 'super_admin') {
    return CONTRACT_STATUS_ORDER.filter((s) => s !== current);
  }
  if (!role) return [];
  return TRANSITIONS[current]
    .filter((t) => t.roles.includes(role))
    .map((t) => t.to)
    .sort((a, b) => CONTRACT_STATUS_ORDER.indexOf(a) - CONTRACT_STATUS_ORDER.indexOf(b));
}

/** Vérification côté client (la base reste l'autorité). */
export function canTransition(
  from: unknown,
  to: unknown,
  role: AppRole | null | undefined,
): boolean {
  return allowedTransitions(from, role).includes(normalizeStatus(to));
}

/** Statuts d'une colonne du Kanban. */
export function statusesOfColumn(columnId: StatusGroup): ContractStatus[] {
  return KANBAN_COLUMNS.find((c) => c.id === columnId)?.statuses ?? [];
}

/** Agrégats prêts à l'emploi pour les tableaux de bord. */
export const PIPELINE_STATUSES: ContractStatus[] = CONTRACT_STATUSES.filter(
  (s) => s.bucket === 'pipeline',
).map((s) => s.value);
export const ACTIVE_STATUSES: ContractStatus[] = CONTRACT_STATUSES.filter(
  (s) => s.bucket === 'running',
).map((s) => s.value);
export const CLOSED_STATUSES: ContractStatus[] = CONTRACT_STATUSES.filter(
  (s) => s.bucket === 'closed',
).map((s) => s.value);

/** Statuts qui attendent une action humaine (file de travail). */
export const BLOCKING_STATUSES: ContractStatus[] = [
  'pending_documents',
  'pending_signature_b',
  'pending_signature_c',
  'pending_mortgage_registration',
  'pending_insurance',
  'alert',
];
