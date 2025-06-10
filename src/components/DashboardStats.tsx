
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, AlertTriangle, CheckCircle, DollarSign, TrendingUp, Edit, Check, X } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const DashboardStats = () => {
  const [editingActiveContracts, setEditingActiveContracts] = useState(false);
  const [activeContractsValue, setActiveContractsValue] = useState("247");
  const [tempValue, setTempValue] = useState("247");

  const stats = [
    {
      title: "Contrats Actifs",
      value: activeContractsValue,
      change: "+12%",
      icon: FileText,
      color: "text-blue-400",
      bgGradient: "from-blue-600/20 to-blue-800/20",
      editable: true
    },
    {
      title: "En Attente Signature",
      value: "23",
      change: "+5%",
      icon: Clock,
      color: "text-orange-400",
      bgGradient: "from-orange-600/20 to-orange-800/20"
    },
    {
      title: "Alertes Actives",
      value: "8",
      change: "-3%",
      icon: AlertTriangle,
      color: "text-red-400",
      bgGradient: "from-red-600/20 to-red-800/20"
    },
    {
      title: "Validés ce mois",
      value: "156",
      change: "+8%",
      icon: CheckCircle,
      color: "text-green-400",
      bgGradient: "from-green-600/20 to-green-800/20"
    }
  ];

  const financialStats = [
    {
      title: "Volume Total",
      value: "125.4M €",
      subtitle: "Engagements en cours",
      icon: DollarSign,
      trend: "+15.2%"
    },
    {
      title: "Crédits MT/LT",
      value: "89.2M €",
      subtitle: "Moyenne/Long terme",
      icon: TrendingUp,
      trend: "+8.7%"
    }
  ];

  const handleEditClick = () => {
    setEditingActiveContracts(true);
    setTempValue(activeContractsValue);
  };

  const handleSave = () => {
    setActiveContractsValue(tempValue);
    setEditingActiveContracts(false);
  };

  const handleCancel = () => {
    setTempValue(activeContractsValue);
    setEditingActiveContracts(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const IconComponent = stat.icon;
          const isEditing = stat.editable && editingActiveContracts;
          
          return (
            <Card key={index} className="bg-black/40 border-slate-700/50 backdrop-blur-sm hover:bg-black/50 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <p className="text-sm font-medium text-slate-400">{stat.title}</p>
                    
                    {isEditing ? (
                      <div className="flex items-center space-x-2">
                        <Input
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onKeyDown={handleKeyPress}
                          className="text-2xl font-bold bg-black/20 border-slate-600 text-white h-8 px-2"
                          autoFocus
                        />
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleSave}
                            className="h-6 w-6 p-0 text-green-400 hover:text-green-300 hover:bg-green-400/20"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancel}
                            className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-400/20"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <p className="text-2xl font-bold text-white">{stat.value}</p>
                        {stat.editable && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleEditClick}
                            className="h-6 w-6 p-0 text-slate-400 hover:text-orange-400 hover:bg-orange-400/20 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                    
                    <Badge 
                      variant={stat.change.startsWith('+') ? 'default' : 'destructive'} 
                      className={`text-xs ${stat.change.startsWith('+') ? 'bg-green-600/20 text-green-400 border-green-500/30' : 'bg-red-600/20 text-red-400 border-red-500/30'}`}
                    >
                      {stat.change}
                    </Badge>
                  </div>
                  <div className={`p-3 rounded-full bg-gradient-to-br ${stat.bgGradient} border border-slate-600/30`}>
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
            <Card key={index} className="bg-gradient-to-r from-orange-600/20 to-red-600/20 border-orange-500/30 backdrop-blur-sm hover:from-orange-600/30 hover:to-red-600/30 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-orange-200 text-sm font-medium">{stat.title}</p>
                    <p className="text-3xl font-bold text-white">{stat.value}</p>
                    <p className="text-orange-300 text-sm">{stat.subtitle}</p>
                    <Badge className="bg-white/20 text-white border-white/30 font-medium">
                      {stat.trend}
                    </Badge>
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
