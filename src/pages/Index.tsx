
import ContractList from "@/components/ContractList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AlertsPanel from "@/components/AlertsPanel";
import AuditLogPanel from "@/components/AuditLogPanel";
import { useAuth } from "@/contexts/AuthContext";
import UserManagementPanel from "@/components/UserManagementPanel";
import ContractTemplateManager from "@/components/ContractTemplateManager";

const Index = () => {
  const { userRole } = useAuth();
  const isAdmin = userRole === 'super_admin' || userRole === 'bank_admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95">
      <div className="container mx-auto p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-gradient">Tableau de bord</h1>
          <p className="text-muted-foreground text-lg">Gérez vos contrats et modèles efficacement</p>
        </div>
        
        <Tabs defaultValue="contracts" className="w-full">
          <TabsList className="mb-6 glass-effect p-1 h-12">
            <TabsTrigger value="contracts" className="px-6 py-2">Contrats</TabsTrigger>
            <TabsTrigger value="alerts" className="px-6 py-2">Alertes</TabsTrigger>
            <TabsTrigger value="audit" className="px-6 py-2">Audit Trail</TabsTrigger>
            {isAdmin && <TabsTrigger value="templates" className="px-6 py-2">Modèles</TabsTrigger>}
            {isAdmin && <TabsTrigger value="admin" className="px-6 py-2">Administration</TabsTrigger>}
          </TabsList>
          
          <div className="animate-fade-in-up">
            <TabsContent value="contracts">
              <ContractList />
            </TabsContent>
            <TabsContent value="alerts">
              <AlertsPanel />
            </TabsContent>
            <TabsContent value="audit">
              <AuditLogPanel />
            </TabsContent>
            {isAdmin && (
              <TabsContent value="templates">
                <ContractTemplateManager />
              </TabsContent>
            )}
            {isAdmin && (
              <TabsContent value="admin">
                <UserManagementPanel />
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
