
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, FileX } from "lucide-react";

const AlertsPanel = () => {
  const alerts = [
    {
      id: 1,
      type: "document_manquant",
      title: "Documents manquants",
      description: "Contrat CT-2024-004 - Certificat hypothécaire non fourni",
      client: "Industrial Corp",
      priority: "haute",
      date: "2024-06-08",
      delai: "2 jours"
    },
    {
      id: 2,
      type: "delai_depasse",
      title: "Délai dépassé",
      description: "Contrat CT-2024-002 - Retour signature en attente depuis 10 jours",
      client: "Société Moderne SARL",
      priority: "moyenne",
      date: "2024-06-05",
      delai: "5 jours"
    },
    {
      id: 3,
      type: "validation_bloquee",
      title: "Validation bloquée",
      description: "Contrat CT-2024-005 - Montant contractuel différent de la décision",
      client: "Tech Solutions Ltd",
      priority: "haute",
      date: "2024-06-09",
      delai: "1 jour"
    },
    {
      id: 4,
      type: "piece_expiree",
      title: "Pièce expirée",
      description: "Contrat CT-2024-003 - Certificat fiscal expiré",
      client: "Export Plus SA",
      priority: "moyenne",
      date: "2024-06-07",
      delai: "3 jours"
    }
  ];

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "document_manquant":
        return <FileX className="h-5 w-5" />;
      case "delai_depasse":
        return <Clock className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const config = {
      haute: { label: "Haute", color: "bg-red-100 text-red-800" },
      moyenne: { label: "Moyenne", color: "bg-orange-100 text-orange-800" },
      basse: { label: "Basse", color: "bg-yellow-100 text-yellow-800" }
    };
    
    const priorityConfig = config[priority as keyof typeof config] || config.moyenne;
    return (
      <Badge className={priorityConfig.color}>
        {priorityConfig.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Alertes Critiques</p>
                <p className="text-2xl font-bold text-red-900">2</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">En Attente</p>
                <p className="text-2xl font-bold text-orange-900">6</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Traitées aujourd'hui</p>
                <p className="text-2xl font-bold text-blue-900">4</p>
              </div>
              <FileX className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Alertes Actives</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start space-x-4 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex-shrink-0 p-2 bg-slate-100 rounded-full">
                  {getAlertIcon(alert.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900">{alert.title}</h4>
                      <p className="text-sm text-slate-600 mt-1">{alert.description}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="text-sm text-slate-500">Client: {alert.client}</span>
                        <span className="text-sm text-slate-500">•</span>
                        <span className="text-sm text-slate-500">Échéance: {alert.delai}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {getPriorityBadge(alert.priority)}
                      <Button variant="outline" size="sm">
                        Traiter
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AlertsPanel;
