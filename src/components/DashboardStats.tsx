
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, AlertTriangle, CheckCircle, DollarSign, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const DashboardStats = () => {
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState({
    activeContracts: 0,
    pendingSignature: 0,
    activeAlerts: 0,
    validatedThisMonth: 0,
    totalVolume: 0,
    creditMTLT: 0,
  });

  // Pour éviter l'affichage du bouton édition
  // et regrouper tout le calcul ici
  useEffect(() => {
    let ignore = false;
    async function computeStats() {
      setLoading(true);
      const { data, error } = await supabase
        .from("contracts")
        .select(
          "statut,type,montant,date_decision"
        );
      if (error || !data) {
        setLoading(false);
        return;
      }

      // Dates du mois courant
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Calcul du volume total (en EUR)
      let totalVolume = 0;
      let activeContracts = 0;
      let pendingSignature = 0;
      let activeAlerts = 0;
      let validatedThisMonth = 0;
      let creditMTLT = 0;

      data.forEach((row) => {
        const statut = row.statut;
        const type = row.type;
        const montant = Number(row.montant) || 0;
        // For volume, on somme tout
        totalVolume += montant;

        if (statut === "en_cours") activeContracts += 1;
        if (statut === "attente_signature") pendingSignature += 1;
        if (statut === "alerte") activeAlerts += 1;

        // Validés ce mois (crédits MT/LT)
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

        // Crédit MT/LT encours (total des montants MT/LT, peu clair : volume ou nb valides ? On reprend en volume validés)
        if (
          (type === "credit_mt" || type === "credit_lt") &&
          (statut === "valide" || statut === "en_cours")
        ) {
          creditMTLT += montant;
        }
      });

      if (!ignore) {
        setStatsData({
          activeContracts,
          pendingSignature,
          activeAlerts,
          validatedThisMonth,
          totalVolume,
          creditMTLT,
        });
        setLoading(false);
      }
    }
    computeStats();
    return () => { ignore = true };
  }, []);

  const stats = [
    {
      id: "activeContracts",
      title: "Contrats Actifs",
      value: statsData.activeContracts.toLocaleString(),
      change: "", // Plus de simulation du pourcentage
      icon: FileText,
      color: "text-blue-400",
      bgGradient: "from-blue-600/20 to-blue-800/20",
    },
    {
      id: "pendingSignature",
      title: "En Attente Signature",
      value: statsData.pendingSignature.toLocaleString(),
      change: "",
      icon: Clock,
      color: "text-orange-400",
      bgGradient: "from-orange-600/20 to-orange-800/20",
    },
    {
      id: "activeAlerts",
      title: "Alertes Actives",
      value: statsData.activeAlerts.toLocaleString(),
      change: "",
      icon: AlertTriangle,
      color: "text-red-400",
      bgGradient: "from-red-600/20 to-red-800/20",
    },
    {
      id: "validatedThisMonth",
      title: "Validés ce mois (MT/LT)",
      value: statsData.validatedThisMonth.toLocaleString(),
      change: "",
      icon: CheckCircle,
      color: "text-green-400",
      bgGradient: "from-green-600/20 to-green-800/20",
    },
  ];

  const financialStats = [
    {
      id: "totalVolume",
      title: "Volume Total",
      value: statsData.totalVolume.toLocaleString("fr-FR", {
        style: "decimal",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + " €",
      subtitle: "Engagements en cours",
      icon: DollarSign,
      trend: "",
    },
    {
      id: "creditMTLT",
      title: "Crédits MT/LT",
      value: statsData.creditMTLT.toLocaleString("fr-FR", {
        style: "decimal",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + " €",
      subtitle: "Moyenne/Long terme en cours/validés",
      icon: TrendingUp,
      trend: "",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card
              key={i}
              className="bg-black/40 border-slate-700/50 backdrop-blur-sm"
            >
              <CardContent className="p-6">
                <div className="animate-pulse h-10 bg-slate-700/30 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card
              key={i}
              className="bg-gradient-to-r from-orange-600/20 to-red-600/20 border-orange-500/30 backdrop-blur-sm"
            >
              <CardContent className="p-6 bg-amber-600">
                <div className="animate-pulse h-10 bg-orange-900/40 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <Card
              key={index}
              className="bg-black/40 border-slate-700/50 backdrop-blur-sm hover:bg-black/50 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10 group"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <p className="text-sm font-medium text-slate-400">
                      {stat.title}
                    </p>
                    <div className="flex items-center space-x-2">
                      <p className="text-2xl font-bold text-white">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`p-3 rounded-full bg-gradient-to-br ${stat.bgGradient} border border-slate-600/30`}
                  >
                    <IconComponent className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {financialStats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <Card
              key={index}
              className="bg-gradient-to-r from-orange-600/20 to-red-600/20 border-orange-500/30 backdrop-blur-sm hover:from-orange-600/30 hover:to-red-600/30 transition-all duration-300 group"
            >
              <CardContent className="p-6 bg-amber-600">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-orange-200 text-sm font-medium">
                      {stat.title}
                    </p>
                    <div className="flex items-center space-x-2">
                      <p className="text-3xl font-bold text-white">
                        {stat.value}
                      </p>
                    </div>
                    <p className="text-orange-300 text-sm">{stat.subtitle}</p>
                  </div>
                  <div className="p-3 bg-white/20 rounded-full border border-white/20">
                    <IconComponent className="h-8 w-8 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardStats;
