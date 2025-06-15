import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
const STATUT_OPTIONS: Record<string, string> = {
  en_cours: "En cours",
  attente_signature: "Attente signature",
  valide: "Validé",
  refuse: "Refusé",
  alerte: "Alerte"
};
const STATUS_COLORS = {
  en_cours: "hsl(210 90% 60%)",
  attente_signature: "hsl(260 85% 65%)",
  valide: "hsl(140 80% 60%)",
  refuse: "hsl(0 80% 65%)",
  alerte: "hsl(320 80% 65%)"
};
const chartConfig = Object.keys(STATUT_OPTIONS).reduce((acc, key) => {
  acc[key] = {
    label: STATUT_OPTIONS[key],
    color: STATUS_COLORS[key as keyof typeof STATUS_COLORS]
  };
  return acc;
}, {} as ChartConfig);
const KpiCard = ({
  title,
  value,
  icon: Icon,
  color
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) => <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-teal-200 rounded-md">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className={`h-4 w-4 text-muted-foreground ${color}`} />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>;
const DashboardStats = () => {
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState({
    activeContracts: 0,
    pendingSignature: 0,
    activeAlerts: 0,
    validatedThisMonth: 0,
    statusDistribution: [] as ({
      name: string;
      value: number;
      fill: string;
    })[]
  });
  useEffect(() => {
    let ignore = false;
    async function computeStats() {
      setLoading(true);
      const {
        data,
        error
      } = await supabase.from("contracts").select("statut,type,montant,date_decision");
      if (error || !data) {
        setLoading(false);
        return;
      }
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      let activeContracts = 0;
      let pendingSignature = 0;
      let activeAlerts = 0;
      let validatedThisMonth = 0;
      const statusCounts = data.reduce((acc, contract) => {
        const status = contract.statut;
        if (status) {
          acc[status] = (acc[status] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
      data.forEach(row => {
        const statut = row.statut;
        const type = row.type;
        if (statut === "en_cours") activeContracts += 1;
        if (statut === "attente_signature") pendingSignature += 1;
        if (statut === "alerte") activeAlerts += 1;
        if ((type === "credit_mt" || type === "credit_lt") && statut === "valide" && row.date_decision) {
          const d = new Date(row.date_decision);
          if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) validatedThisMonth += 1;
        }
      });
      const statusDistribution = Object.entries(statusCounts).map(([name, value]) => ({
        name,
        value,
        fill: STATUS_COLORS[name as keyof typeof STATUS_COLORS] || "#8884d8"
      }));
      if (!ignore) {
        setStatsData({
          activeContracts,
          pendingSignature,
          activeAlerts,
          validatedThisMonth,
          statusDistribution
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
    return <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              {[...Array(4)].map((_, i) => <div key={i} className="animate-pulse h-24 bg-muted rounded-lg" />)}
            </div>
            <div className="lg:col-span-2">
                <div className="animate-pulse h-[400px] bg-muted rounded-lg" />
            </div>
          </div>;
  }
  const kpis = [{
    title: "Contrats Actifs",
    value: statsData.activeContracts.toLocaleString(),
    icon: FileText,
    color: "text-sky-500"
  }, {
    title: "En Attente Signature",
    value: statsData.pendingSignature.toLocaleString(),
    icon: Clock,
    color: "text-indigo-500"
  }, {
    title: "Alertes Actives",
    value: statsData.activeAlerts.toLocaleString(),
    icon: AlertTriangle,
    color: "text-violet-500"
  }, {
    title: "Validés ce mois (MT/LT)",
    value: statsData.validatedThisMonth.toLocaleString(),
    icon: CheckCircle,
    color: "text-emerald-500"
  }];
  return <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-4">
        <h2 className="text-xl font-semibold mb-2">Indicateurs Clés</h2>
        <div className="space-y-4">
           {kpis.map(kpi => <KpiCard key={kpi.title} {...kpi} />)}
        </div>
      </div>
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Répartition par Statut</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ChartContainer config={chartConfig} className="mx-auto aspect-square h-full">
                <PieChart>
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Pie data={statsData.statusDistribution} dataKey="value" nameKey="name" innerRadius="65%" strokeWidth={5} stroke="hsl(var(--background))">
                    {statsData.statusDistribution.map(entry => <Cell key={entry.name} fill={entry.fill} className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background rounded-full" />)}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} className="!text-sm" />
                </PieChart>
              </ChartContainer>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default DashboardStats;