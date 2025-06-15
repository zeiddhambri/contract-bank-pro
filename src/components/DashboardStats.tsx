
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Clock, AlertTriangle, CheckCircle, DollarSign, TrendingUp } from "lucide-react";
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
  en_cours: "hsl(205 90% 55%)",
  attente_signature: "hsl(35 95% 55%)",
  valide: "hsl(145 65% 45%)",
  refuse: "hsl(0 85% 60%)",
  alerte: "hsl(300 75% 60%)",
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
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
}) => (
  <Card className="transform transition-transform duration-300 hover:-translate-y-1">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="h-5 w-5 text-primary" />
    </CardHeader>
    <CardContent>
      <div className="text-4xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

const formatCurrency = (value: number) => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M €`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K €`;
  }
  return `${value} €`;
};

const DashboardStats = () => {
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState({
    activeContracts: 0,
    pendingSignature: 0,
    activeAlerts: 0,
    validatedThisMonth: 0,
    statusDistribution: [] as ({ name: string; value: number; fill: string; })[],
    totalVolume: 0,
    creditsMTLT: 0,
    totalContracts: 0,
  });

  useEffect(() => {
    let ignore = false;
    async function computeStats() {
      setLoading(true);
      const { data, error } = await supabase.from("contracts").select("statut,type,montant,date_decision");
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
      let totalVolume = 0;
      let creditsMTLT = 0;

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
        if (row.montant) {
          totalVolume += row.montant;
          if (type === "credit_mt" || type === "credit_lt") {
            creditsMTLT += row.montant;
          }
        }
      });

      const statusDistribution = Object.entries(statusCounts).map(([name, value]) => ({
        name,
        value,
        fill: STATUS_COLORS[name as keyof typeof STATUS_COLORS] || "#8884d8"
      }));

      const totalContracts = statusDistribution.reduce((sum, item) => sum + item.value, 0);

      if (!ignore) {
        setStatsData({
          activeContracts,
          pendingSignature,
          activeAlerts,
          validatedThisMonth,
          statusDistribution,
          totalVolume,
          creditsMTLT,
          totalContracts,
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
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse h-32 bg-card rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 animate-pulse h-[400px] bg-card rounded-xl" />
          <div className="lg:col-span-2 animate-pulse h-[400px] bg-card rounded-xl" />
        </div>
      </div>
    );
  }

  const kpis = [
    { title: "Contrats Actifs", value: statsData.activeContracts.toLocaleString(), icon: FileText },
    { title: "En Attente Signature", value: statsData.pendingSignature.toLocaleString(), icon: Clock },
    { title: "Alertes Actives", value: statsData.activeAlerts.toLocaleString(), icon: AlertTriangle },
    { title: "Validés ce mois (MT/LT)", value: statsData.validatedThisMonth.toLocaleString(), icon: CheckCircle },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {kpis.map(kpi => <KpiCard key={kpi.title} {...kpi} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">Répartition par Statut</CardTitle>
            </CardHeader>
            <CardContent className="h-[350px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <ChartContainer config={chartConfig} className="mx-auto aspect-square h-full">
                  <PieChart>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                    <Pie data={statsData.statusDistribution} dataKey="value" nameKey="name" innerRadius="70%" strokeWidth={5} stroke="hsl(var(--background))">
                      {statsData.statusDistribution.map(entry => (
                        <Cell key={entry.name} fill={entry.fill} className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background rounded-full" />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent nameKey="name" className="!text-sm text-muted-foreground flex-wrap justify-center" />} />
                  </PieChart>
                </ChartContainer>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] text-center pointer-events-none">
                <p className="text-4xl font-bold">{statsData.totalContracts}</p>
                <p className="text-sm text-muted-foreground">Contrats</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <Card className="bg-gradient-to-br from-primary/10 to-background/30 border-primary/20 hover:border-primary/40 transition-all">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-primary/80">Volume Total</p>
                <p className="text-3xl font-bold text-foreground mt-1">{formatCurrency(statsData.totalVolume)}</p>
                <p className="text-xs text-muted-foreground mt-1">Engagements en cours</p>
              </div>
              <div className="p-3 rounded-full bg-background/50">
                <DollarSign className="h-7 w-7 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-primary/10 to-background/30 border-primary/20 hover:border-primary/40 transition-all">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-primary/80">Crédits MT/LT</p>
                <p className="text-3xl font-bold text-foreground mt-1">{formatCurrency(statsData.creditsMTLT)}</p>
                <p className="text-xs text-muted-foreground mt-1">Moyenne/Long terme</p>
              </div>
               <div className="p-3 rounded-full bg-background/50">
                <TrendingUp className="h-7 w-7 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
export default DashboardStats;
