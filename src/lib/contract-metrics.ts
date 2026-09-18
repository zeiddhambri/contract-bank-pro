// ============================================================================
// Agrégats de portefeuille (R2)
// ----------------------------------------------------------------------------
// Fonctions pures, sans React ni Supabase : les deux tableaux de bord (et les
// futurs tests R19) consomment les mêmes calculs. Deux règles d'intégrité :
//   1. un montant n'est agrégé qu'avec les montants de **sa** devise ;
//   2. un pourcentage dont le dénominateur est nul vaut `null` (jamais `NaN`).
// ============================================================================
import type { Tables } from "@/integrations/supabase/types";
import {
  BLOCKING_STATUSES,
  CONTRACT_STATUSES,
  getStatusChartColor,
  getStatusLabel,
  normalizeStatus,
  type ContractStatus,
  type StatusBucket,
} from "@/lib/contract-status";
import {
  DEFAULT_CURRENCY,
  getTypeLabel,
  isCurrency,
  safePct,
  sumByCurrency,
  type CurrencyCode,
} from "@/lib/contract-helpers";

export type Contract = Tables<"contracts">;

const amount = (contract: Contract): number => Number(contract.montant) || 0;

const currencyOf = (contract: Contract): CurrencyCode =>
  isCurrency(contract.currency) ? contract.currency : DEFAULT_CURRENCY;

/** Totaux par devise, triés du plus élevé au plus faible. */
export function totalsByCurrency(contracts: Contract[]) {
  return sumByCurrency(contracts).sort((a, b) => b.total - a.total);
}

/**
 * Devise de référence du portefeuille : celle qui porte le plus d'encours.
 * Sert aux graphiques monétaires (on n'additionne jamais deux devises).
 */
export function primaryCurrency(contracts: Contract[]): CurrencyCode {
  return totalsByCurrency(contracts)[0]?.currency ?? DEFAULT_CURRENCY;
}

/** Contrats dont la devise diffère de la devise de référence (information). */
export function countOtherCurrencies(contracts: Contract[], reference: CurrencyCode): number {
  return contracts.filter((c) => currencyOf(c) !== reference).length;
}

export function countByStatus(contracts: Contract[]): Record<ContractStatus, number> {
  const counts = Object.fromEntries(
    CONTRACT_STATUSES.map((s) => [s.value, 0]),
  ) as Record<ContractStatus, number>;

  for (const contract of contracts) {
    counts[normalizeStatus(contract.statut)] += 1;
  }
  return counts;
}

/** Répartition par statut, prête pour un graphique (secteurs ou barres). */
export function statusDistribution(contracts: Contract[]) {
  const counts = countByStatus(contracts);

  return CONTRACT_STATUSES.filter((meta) => counts[meta.value] > 0).map((meta) => ({
    name: meta.label,
    status: meta.value,
    value: counts[meta.value],
    color: getStatusChartColor(meta.value),
    percentage: safePct(counts[meta.value], contracts.length, 0),
  }));
}

/** Compteurs des KPI : total, en exécution, en attente d'action, bloquants, clos. */
export function statusCounters(contracts: Contract[]) {
  const total = contracts.length;
  const byBucket = (bucket: StatusBucket) =>
    contracts.filter((c) => {
      const meta = CONTRACT_STATUSES.find((s) => s.value === normalizeStatus(c.statut));
      return meta?.bucket === bucket;
    });

  const active = byBucket("running");
  const closed = byBucket("closed");
  const pipeline = byBucket("pipeline");
  const blocking = contracts.filter((c) =>
    BLOCKING_STATUSES.includes(normalizeStatus(c.statut)),
  );
  const alerts = contracts.filter((c) => normalizeStatus(c.statut) === "alert");

  return {
    total,
    active: active.length,
    activeShare: safePct(active.length, total),
    pipeline: pipeline.length,
    pipelineShare: safePct(pipeline.length, total),
    closed: closed.length,
    blocking: blocking.length,
    alerts: alerts.length,
    alertAmounts: totalsByCurrency(alerts),
    activeAmounts: totalsByCurrency(active),
    pipelineAmounts: totalsByCurrency(pipeline),
    totalAmounts: totalsByCurrency(contracts),
  };
}

/** Encours par type de contrat, dans la devise de référence uniquement. */
export function amountsByType(contracts: Contract[], currency: CurrencyCode) {
  const totals = new Map<string, number>();

  for (const contract of contracts) {
    if (currencyOf(contract) !== currency) continue;
    const label = getTypeLabel(contract.type);
    totals.set(label, (totals.get(label) ?? 0) + amount(contract));
  }

  return [...totals.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Série mensuelle réelle (créations et montants) sur les `months` derniers mois,
 * à partir de `created_at`. Les mois sans activité apparaissent à zéro : une
 * courbe trouée laisse croire à des données manquantes.
 */
export function monthlySeries(
  contracts: Contract[],
  currency: CurrencyCode,
  months = 6,
): { month: string; contracts: number; amount: number }[] {
  const now = new Date();
  const buckets: { key: string; label: string; contracts: number; amount: number }[] = [];

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    buckets.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      contracts: 0,
      amount: 0,
    });
  }

  const index = new Map(buckets.map((b) => [b.key, b]));

  for (const contract of contracts) {
    const created = new Date(contract.created_at);
    if (Number.isNaN(created.getTime())) continue;
    const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;
    const bucket = index.get(key);
    if (!bucket) continue;

    bucket.contracts += 1;
    if (currencyOf(contract) === currency) bucket.amount += amount(contract);
  }

  return buckets.map(({ label, contracts: count, amount: total }) => ({
    month: label,
    contracts: count,
    amount: total,
  }));
}

/** Contrats créés depuis le début du mois courant. */
export function createdThisMonth(contracts: Contract[]): number {
  const now = new Date();
  return contracts.filter((c) => {
    const created = new Date(c.created_at);
    return (
      !Number.isNaN(created.getTime()) &&
      created.getFullYear() === now.getFullYear() &&
      created.getMonth() === now.getMonth()
    );
  }).length;
}

/** Libellé lisible d'un statut (rappel pratique pour les tableaux de bord). */
export const statusLabel = getStatusLabel;
