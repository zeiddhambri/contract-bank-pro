import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  TrendingUp,
  ArrowDown,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const STATUT_OPTIONS: Record<string, string> = {
  en_cours: "En cours",
  attente_signature: "Attente signature",
  valide: "Validé",
  refuse: "Refusé",
  alerte: "Alerte",
};

const getStatutLabel = (statut: string) => {
  return STATUT_OPTIONS[statut] || statut;
};

const STATUS_COLORS: Record<string, string> = {
  en_cours: "hsl(var(--chart-1))",
  attente_signature: "hsl(var(--chart-2))",
  valide: "hsl(var(--chart-3))",
  refuse: "hsl(var(--chart-4))",
  alerte: "hsl(var(--chart-5))",
};

const chartConfig = Object.keys(STATUT_OPTIONS).reduce((acc, key) => {
  acc[key] = {
    label: STATUT_OPTIONS[key],
    color: STATUS_COLORS[key],
  };
  return acc;
}, {} as ChartConfig);

const KpiCard = ({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) => (
  <Card className="bg-slate-800/50 border-slate-700/50 p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-400">{title}</p>
        <p className="text-3xl font-bold text-white">{value}</p>
      </div>
      <Icon className={`h-8 w-8 ${color}`} />
    </div>
  </Card>
);

const DashboardStats = () => {
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState({
    activeContracts: 0,
    pendingSignature: 0,
    activeAlerts: 0,
    validatedThisMonth: 0,
    totalVolume: 0,
    creditMTLT: 0,
    statusDistribution: [] as ({ name: string; value: number; fill: string })[],
  });

  useEffect(() => {
    let ignore = false;
    async function computeStats() {
      setLoading(true);
      const { data, error } = await supabase
        .from("contracts")
        .select("statut,type,montant,date_decision");
      if (error || !data) {
        setLoading(false);
        return;
      }

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      let totalVolume = 0;
      let activeContracts = 0;
      let pendingSignature = 0;
      let activeAlerts = 0;
      let validatedThisMonth = 0;
      let creditMTLT = 0;

      const statusCounts = data.reduce(
        (acc, contract) => {
          const status = contract.statut;
          if (status) {
            acc[status] = (acc[status] || 0) + 1;
          }
          return acc;
        },
        {} as Record<string, number>
      );

      data.forEach((row) => {
        const statut = row.statut;
        const type = row.type;
        const montant = Number(row.montant) || 0;
        totalVolume += montant;

        if (statut === "en_cours") activeContracts += 1;
        if (statut === "attente_signature") pendingSignature += 1;
        if (statut === "alerte") activeAlerts += 1;

        if (
          (type === "credit_mt" || type === "credit_lt") &&
          statut === "valide" &&
          row.date_decision
        ) {
          const d = new Date(row.date_decision);
          if (
            d.getMonth() === currentMonth &&
            d.getFullYear() === currentYear
          )
            validatedThisMonth += 1;
        }

        if (
          (type === "credit_mt" || type === "credit_lt") &&
          (statut === "valide" || statut === "en_cours")
        ) {
          creditMTLT += montant;
        }
      });
      
      const statusDistribution = Object.entries(statusCounts).map(
        ([name, value]) => ({
          name,
          value,
          fill: STATUS_COLORS[name] || "#8884d8",
        })
      );

      if (!ignore) {
        setStatsData({
          activeContracts,
          pendingSignature,
          activeAlerts,
          validatedThisMonth,
          totalVolume,
          creditMTLT,
          statusDistribution,
        });
        setLoading(false);
      }
    }
    computeStats();
    return () => {
      ignore = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          {[...Array(4)].map((_, i) => (
             <div key={i} className="animate-pulse h-24 bg-slate-700/30 rounded-lg" />
          ))}
        </div>
        <div className="lg:col-span-2">
            <div className="animate-pulse h-[400px] bg-slate-700/30 rounded-lg" />
        </div>
      </div>
    );
  }

  const kpis = [
    {
      title: "Contrats Actifs",
      value: statsData.activeContracts.toLocaleString(),
      icon: FileText,
      color: "text-blue-400",
    },
    {
      title: "En Attente Signature",
      value: statsData.pendingSignature.toLocaleString(),
      icon: Clock,
      color: "text-orange-400",
    },
    {
      title: "Alertes Actives",
      value: statsData.activeAlerts.toLocaleString(),
      icon: AlertTriangle,
      color: "text-red-400",
    },
    {
      title: "Validés ce mois (MT/LT)",
      value: statsData.validatedThisMonth.toLocaleString(),
      icon: CheckCircle,
      color: "text-green-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-4">
        <h2 className="text-xl font-bold text-white">Indicateurs de Performance</h2>
        <div className="space-y-2">
           {kpis.map((kpi, index) => (
             <React.Fragment key={kpi.title}>
              <KpiCard {...kpi} />
              {index < kpis.length - 1 && <ArrowDown className="mx-auto h-6 w-6 text-slate-600" />}
             </React.Fragment>
           ))}
        </div>
      </div>
      <div className="lg:col-span-2 space-y-6">
        <Card className="bg-black/40 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Répartition par Statut</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              <ChartContainer
                config={chartConfig}
                className="mx-auto aspect-square h-full"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie
                    data={statsData.statusDistribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="65%"
                    strokeWidth={5}
                  >
                    {statsData.statusDistribution.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={entry.fill}
                        className="focus:outline-none"
                      />
                    ))}
                  </Pie>
                  <ChartLegend
                    content={<ChartLegendContent nameKey="name" />}
                  />
                </PieChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardStats;
