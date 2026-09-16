// ============================================================================
// Helpers métier contrats (R2)
// ----------------------------------------------------------------------------
// Les statuts ne sont plus définis ici : voir `@/lib/contract-status`, source de
// vérité unique partagée avec l'énuméré SQL `public.contract_status`. Les
// exports historiques sont conservés en ré-export pour ne pas casser les imports.
// ============================================================================
import type { Tables } from "@/integrations/supabase/types";

export {
  CONTRACT_STATUS_OPTIONS,
  CONTRACT_STATUSES,
  getStatusBadgeClass,
  getStatusLabel,
} from "@/lib/contract-status";

export const TYPE_LABELS: Record<string, string> = {
  credit_consommation: "Crédit Conso",
  credit_immo: "Crédit Immo",
  decouvert: "Découvert",
};

export const CONTRACT_TYPES = [
  { value: "credit_consommation", label: "Crédit Consommation" },
  { value: "credit_immo", label: "Crédit Immobilier" },
  { value: "decouvert", label: "Découvert" },
];

export const GARANTIE_LABELS: Record<string, string> = {
  hypotheque: "Hypothèque",
  nantissement: "Nantissement",
  caution: "Caution",
  aucune: "Aucune",
};

export const AGENCE_LABELS: Record<string, string> = {
  agence_centre: "Centre",
  agence_nord: "Nord",
  agence_sud: "Sud",
};

/**
 * Devises autorisées — alignées sur la contrainte SQL `valid_currency`
 * (EUR, USD, TND). Ajouter une devise = migration + cette liste.
 */
export const CURRENCIES = [
  { value: "EUR", label: "Euro (€)", symbol: "€", locale: "fr-FR" },
  { value: "USD", label: "Dollar ($)", symbol: "$", locale: "fr-FR" },
  { value: "TND", label: "Dinar tunisien (TND)", symbol: "TND", locale: "fr-FR" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["value"];

export const DEFAULT_CURRENCY: CurrencyCode = "EUR";

export function isCurrency(value: unknown): value is CurrencyCode {
  return typeof value === "string" && CURRENCIES.some((c) => c.value === value);
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string, digits: number) {
  const key = `${currency}:${digits}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    formatterCache.set(key, formatter);
  }
  return formatter;
}

/**
 * Formate un montant dans **sa** devise (défaut EUR).
 * `digits = 0` pour les tableaux de bord, `2` pour une fiche contrat.
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency: string = DEFAULT_CURRENCY,
  digits = 2,
): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return "—";
  const code = isCurrency(currency) ? currency : DEFAULT_CURRENCY;
  try {
    return getFormatter(code, digits).format(amount);
  } catch {
    // Devise inconnue d'Intl : on retombe sur un affichage lisible.
    return `${amount.toLocaleString("fr-FR", { maximumFractionDigits: digits })} ${code}`;
  }
}

/** Formate un nombre sans devise (quantités, compteurs). */
export function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString("fr-FR", { maximumFractionDigits: digits });
}

/**
 * Pourcentage sûr : renvoie `null` quand le total est nul (jamais `NaN` ni
 * `Infinity` dans un graphique). L'affichage attendu est alors « — ».
 */
export function safePct(part: number, total: number, digits = 1): number | null {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total === 0) return null;
  return Number(((part / total) * 100).toFixed(digits));
}

export function formatPct(part: number, total: number): string {
  const value = safePct(part, total);
  return value === null ? "—" : `${value.toLocaleString("fr-FR")} %`;
}

export function formatDate(dateString: string | null | undefined) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR");
}

export const getTypeLabel = (type: string) => TYPE_LABELS[type] || type;
export const getGarantieLabel = (garantie: string) => GARANTIE_LABELS[garantie] || garantie;
export const getAgenceLabel = (agence: string) => AGENCE_LABELS[agence] || agence;

// ---------------------------------------------------------------------------
// Agrégats monétaires — un montant n'a de sens que dans sa devise : additionner
// des EUR et des TND produit un chiffre faux (constat C6/B21).
// ---------------------------------------------------------------------------
type ContractLike = Pick<Tables<"contracts">, "montant" | "currency">;

/** Totaux groupés par devise, dans l'ordre EUR → USD → TND. */
export function sumByCurrency<T extends ContractLike>(rows: T[]): {
  currency: CurrencyCode;
  total: number;
  count: number;
}[] {
  const totals = new Map<CurrencyCode, { total: number; count: number }>();

  for (const row of rows) {
    const code: CurrencyCode = isCurrency(row.currency) ? row.currency : DEFAULT_CURRENCY;
    const amount = Number(row.montant) || 0;
    const current = totals.get(code) ?? { total: 0, count: 0 };
    totals.set(code, { total: current.total + amount, count: current.count + 1 });
  }

  const order: CurrencyCode[] = ["EUR", "USD", "TND"];
  return order
    .filter((code) => totals.has(code))
    .map((code) => ({ currency: code, total: totals.get(code)!.total, count: totals.get(code)!.count }));
}

/**
 * Libellé compact multi-devises : « 1,2 M € · 300 000 $ ».
 * `digits = 0` évite les centimes dans les KPI.
 */
export function formatCurrencyTotals(
  totals: { currency: string; total: number }[],
  digits = 0,
): string {
  if (totals.length === 0) return "—";
  return totals.map((t) => formatCurrency(t.total, t.currency, digits)).join(" · ");
}
