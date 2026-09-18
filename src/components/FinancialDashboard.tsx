// ============================================================================
// Tableau de bord financier (R2)
// ----------------------------------------------------------------------------
// Règles d'intégrité appliquées ici :
//   • aucune somme de montants dans des devises différentes — la devise de
//     référence est celle qui porte le plus d'encours, les autres sont affichées
//     séparément et signalées ;
//   • aucun pourcentage `NaN` (dénominateur nul → « — ») ;
//   • plus de données inventées (les anciennes séries « Jan → Jun » et la
//     répartition « Payé / En attente / En retard » étaient codées en dur).
// ============================================================================
import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, BadgeDollarSign, Hourglass, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAllContracts } from "@/hooks/useContracts";
import {
  formatCurrency,
  formatCurrencyTotals,
  formatNumber,
  formatPct,
} from "@/lib/contract-helpers";
import {
  amountsByType,
  countOtherCurrencies,
  monthlySeries,
  primaryCurrency,
  statusCounters,
  type Contract,
} from "@/lib/contract-metrics";

const PHASE_COLORS = {
  pipeline: "#f59e0b",
  running: "#22c55e",
  closed: "#6b7280",
} as const;

const PHASE_LABELS = {
  pipeline: "Mise en place",
  running: "En exécution",
  closed: "Clôturé",
} as const;

const FinancialDashboard = () => {
  // Portefeuille complet partagé (clé ['contracts','all']).
  const { data: contracts, isLoading } = useAllContracts();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((card) => (
          <Card key={card} className="animate-pulse">
            <CardContent className="p-6">
              <div className="mb-2 h-4 w-3/4 rounded bg-gray-200" />
              <div className="h-8 w-1/2 rounded bg-gray-200" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const rows = contracts ?? [];
  const counters = statusCounters(rows);
  const currency = primaryCurrency(rows);
  const monthly = monthlySeries(rows, currency, 6);
  const byType = amountsByType(rows, currency);
  const otherCurrencies = countOtherCurrencies(rows, currency);

  const phases = [
    { key: "pipeline" as const, count: counters.pipeline, amounts: counters.pipelineAmounts },
    { key: "running" as const, count: counters.active, amounts: counters.activeAmounts },
  ];

  const phaseDistribution = [
    { name: PHASE_LABELS.pipeline, value: counters.pipeline, color: PHASE_COLORS.pipeline },
    { name: PHASE_LABELS.running, value: counters.active, color: PHASE_COLORS.running },
    { name: PHASE_LABELS.closed, value: counters.closed, color: PHASE_COLORS.closed },
  ].filter((entry) => entry.value > 0);

  const kpis = [
    {
      label: "Encours total",
      value: formatCurrencyTotals(counters.totalAmounts),
      detail: `${formatNumber(counters.total)} contrat(s)`,
      icon: BadgeDollarSign,
      tone: "bg-blue-100 text-blue-600",
    },
    {
      label: "En exécution",
      value: formatCurrencyTotals(counters.activeAmounts),
      detail: `${formatNumber(counters.active)} contrat(s) · ${formatPct(counters.active, counters.total)} du portefeuille`,
      icon: TrendingUp,
      tone: "bg-green-100 text-green-600",
    },
    {
      label: "En mise en place",
      value: formatCurrencyTotals(counters.pipelineAmounts),
      detail: `${formatNumber(counters.pipeline)} contrat(s) avant déblocage`,
      icon: Hourglass,
      tone: "bg-yellow-100 text-yellow-600",
    },
    {
      label: "En alerte",
      value: formatCurrencyTotals(counters.alertAmounts),
      detail:
        counters.alerts > 0
          ? `${formatNumber(counters.alerts)} contrat(s) à traiter`
          : "Aucun incident déclaré",
      icon: AlertTriangle,
      tone: "bg-red-100 text-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Indicateurs financiers --------------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-600">{kpi.label}</p>
                  <p className="truncate text-2xl font-bold text-gray-900">{kpi.value}</p>
                  <p className="mt-2 text-sm text-gray-600">{kpi.detail}</p>
                </div>
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${kpi.tone}`}
                >
                  <kpi.icon className="h-6 w-6" aria-hidden="true" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {otherCurrencies > 0 && (
        <p className="text-xs text-gray-500">
          Graphiques en {currency} (devise la plus représentée) ·{" "}
          {otherCurrencies} contrat(s) dans une autre devise sont comptés mais non convertis.
        </p>
      )}

      {/* Évolution et composition ------------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Montants engagés par mois de création ({currency})</CardTitle>
          </CardHeader>
          <CardContent>
            {monthly.every((m) => m.amount === 0) ? (
              <p className="py-16 text-center text-sm text-gray-500">
                Aucun montant enregistré sur la période.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis
                    tickFormatter={(value) => formatCurrency(Number(value), currency, 0)}
                    width={110}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value), currency), "Montant"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Montant"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Encours par type de contrat ({currency})</CardTitle>
          </CardHeader>
          <CardContent>
            {byType.length === 0 ? (
              <p className="py-16 text-center text-sm text-gray-500">
                Aucun montant dans cette devise.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={byType} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => formatCurrency(Number(value), currency, 0)}
                    width={110}
                  />
                  <YAxis type="category" dataKey="name" width={140} />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value), currency), "Encours"]}
                  />
                  <Bar dataKey="value" fill="#8b5cf6" name="Encours" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Répartition par phase</CardTitle>
          </CardHeader>
          <CardContent>
            {phaseDistribution.length === 0 ? (
              <p className="py-16 text-center text-sm text-gray-500">Aucun contrat.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={phaseDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, value }) => `${name} (${value})`}
                  >
                    {phaseDistribution.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} contrat(s)`, "Effectif"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Encours par phase</CardTitle>
          </CardHeader>
          <CardContent>
            {phases.every((phase) => phase.amounts.length === 0) ? (
              <p className="py-16 text-center text-sm text-gray-500">Aucun encours.</p>
            ) : (
              <ul className="divide-y">
                {phases.map((phase) => (
                  <li key={phase.key} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: PHASE_COLORS[phase.key] }}
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {PHASE_LABELS[phase.key]}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatNumber(phase.count)} contrat(s) ·{" "}
                          {formatPct(phase.count, counters.total)} du portefeuille
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrencyTotals(phase.amounts)}
                    </p>
                  </li>
                ))}
                <li className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: PHASE_COLORS.closed }}
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Clôturé</p>
                      <p className="text-xs text-gray-500">
                        Expiré, renouvelé, refus client ou résilié
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatNumber(counters.closed)} contrat(s)
                  </p>
                </li>
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinancialDashboard;
