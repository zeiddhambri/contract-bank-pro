
import ContractList from "@/components/ContractList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AlertsPanel from "@/components/AlertsPanel";
import AuditLogPanel from "@/components/AuditLogPanel";
import { useAuth } from "@/contexts/AuthContext";
import UserManagementPanel from "@/components/UserManagementPanel";

const Index = () => {
  const { userRole } = useAuth();
  const isAdmin = userRole === 'super_admin' || userRole === 'bank_admin';

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6">Tableau de bord</h1>
      <Tabs defaultValue="contracts" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="contracts">Contrats</TabsTrigger>
          <TabsTrigger value="alerts">Alertes</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          {isAdmin && <TabsTrigger value="admin">Administration</TabsTrigger>}
        </TabsList>
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
          <TabsContent value="admin">
            <UserManagementPanel />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Index;

