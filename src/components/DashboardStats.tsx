// ============================================================================
// Tableau de bord — synthèse du portefeuille (R2)
// ----------------------------------------------------------------------------
// Tous les chiffres proviennent des contrats réels de la banque (RLS). Les
// valeurs fabriquées de l'ancienne version (« +12 % ce mois », série mensuelle
// codée en dur, statuts anglais jamais présents en base) ont été supprimées :
// un indicateur invérifiable dans un outil bancaire est pire qu'un indicateur
// absent.
// ============================================================================
import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, CheckCircle, Clock, FileText, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAllContracts } from "@/hooks/useContracts";
import { formatCurrency, formatCurrencyTotals, formatPct } from "@/lib/contract-helpers";
import {
  createdThisMonth,
  monthlySeries,
  primaryCurrency,
  countOtherCurrencies,
  statusCounters,
  statusDistribution,
  type Contract,
} from "@/lib/contract-metrics";

const DashboardStats = () => {
  // Même source que le Kanban et la liste : ['contracts','all'], une requête.
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
  const distribution = statusDistribution(rows);
  const currency = primaryCurrency(rows);
  const monthly = monthlySeries(rows, currency, 6);
  const otherCurrencies = countOtherCurrencies(rows, currency);
  const newThisMonth = createdThisMonth(rows);

  return (
    <div className="space-y-6">
      {/* Indicateurs clés --------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Contrats</p>
                <p className="text-3xl font-bold text-gray-900">{counters.total}</p>
                <p className="mt-2 text-sm text-gray-600">
                  {newThisMonth} créé{newThisMonth > 1 ? "s" : ""} ce mois-ci
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <FileText className="h-6 w-6 text-blue-600" aria-hidden="true" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En cours d'exécution</p>
                <p className="text-3xl font-bold text-green-600">{counters.active}</p>
                <p className="mt-2 text-sm text-gray-600">
                  {formatPct(counters.active, counters.total)} du portefeuille
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" aria-hidden="true" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En attente d'action</p>
                <p className="text-3xl font-bold text-yellow-600">{counters.blocking}</p>
                <p className="mt-2 text-sm text-gray-600">
                  Signature, garantie, assurance ou alerte
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                <Clock className="h-6 w-6 text-yellow-600" aria-hidden="true" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-600">Encours total</p>
                <p className="truncate text-2xl font-bold text-gray-900">
                  {formatCurrencyTotals(counters.totalAmounts)}
                </p>
                <p className="mt-2 flex items-center gap-1 text-sm text-gray-600">
                  {counters.alerts > 0 ? (
                    <>
                      <AlertTriangle className="h-4 w-4 text-red-500" aria-hidden="true" />
                      {counters.alerts} en alerte ·{" "}
                      {formatCurrencyTotals(counters.alertAmounts)}
                    </>
                  ) : (
                    <>Aucun contrat en alerte</>
                  )}
                </p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-100">
                <Wallet className="h-6 w-6 text-purple-600" aria-hidden="true" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {otherCurrencies > 0 && (
        <p className="text-xs text-gray-500">
          {otherCurrencies} contrat{otherCurrencies > 1 ? "s" : ""} dans une autre devise :
          les montants ne sont pas convertis, chaque devise est totalisée séparément.
        </p>
      )}

      {/* Graphiques --------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Créations des 6 derniers mois</CardTitle>
          </CardHeader>
          <CardContent>
            {monthly.every((m) => m.contracts === 0) ? (
              <p className="py-16 text-center text-sm text-gray-500">
                Aucun contrat créé sur la période.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    formatter={(value, name) =>
                      name === "Montant"
                        ? [formatCurrency(Number(value), currency, 0), name]
                        : [value, name]
                    }
                  />
                  <Legend />
                  <Bar dataKey="contracts" fill="#3b82f6" name="Contrats créés" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition par statut</CardTitle>
          </CardHeader>
          <CardContent>
            {distribution.length === 0 ? (
              <p className="py-16 text-center text-sm text-gray-500">
                Aucun contrat à répartir.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={distribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => `${name} (${value})`}
                  >
                    {distribution.map((entry) => (
                      <Cell key={entry.status} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value} contrat(s)`, "Effectif"]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardStats;
