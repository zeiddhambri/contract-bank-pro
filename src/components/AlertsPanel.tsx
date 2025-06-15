
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, FileX, CheckCircle } from "lucide-react";

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
        return <FileX className="h-5 w-5 text-muted-foreground" />;
      case "delai_depasse":
        return <Clock className="h-5 w-5 text-muted-foreground" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "haute":
        return <Badge variant="destructive">Haute</Badge>;
      case "moyenne":
        return <Badge variant="secondary" className="bg-orange-500/80 border-orange-500/20 text-white">Moyenne</Badge>;
      default:
        return <Badge variant="outline">Basse</Badge>;
    }
  };

  const summaryData = [
    { title: "Alertes Critiques", value: "2", icon: AlertTriangle, color: "text-destructive" },
    { title: "En Attente", value: "6", icon: Clock, color: "text-orange-400" },
    { title: "Traitées aujourd'hui", value: "4", icon: CheckCircle, color: "text-green-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {summaryData.map(item => (
          <Card key={item.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{item.title}</p>
                  <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
                </div>
                <item.icon className={`h-8 w-8 ${item.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-foreground font-bold tracking-wide">
            <AlertTriangle className="h-5 w-5 text-primary" />
            <span>ALERTES ACTIVES</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start space-x-4 p-4 border border-border rounded-lg hover:bg-accent transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="flex-shrink-0 mt-1 p-2 bg-background rounded-full">
                  {getAlertIcon(alert.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{alert.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="text-sm text-muted-foreground">Client: {alert.client}</span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">Échéance: {alert.delai}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
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
