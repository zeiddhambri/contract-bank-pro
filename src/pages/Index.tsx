
import ContractList from "@/components/ContractList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AlertsPanel from "@/components/AlertsPanel";
import AuditLogPanel from "@/components/AuditLogPanel";
import { useAuth } from "@/contexts/AuthContext";
import UserManagementPanel from "@/components/UserManagementPanel";
import ContractTemplateManager from "@/components/ContractTemplateManager";
import DashboardStats from "@/components/DashboardStats";
import Logo from "@/components/Logo";

const Index = () => {
  const { userRole } = useAuth();
  const isAdmin = userRole === 'super_admin' || userRole === 'bank_admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto p-4 md:p-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <Logo />
            <div>
              <h1 className="text-4xl font-bold text-white tracking-wide">CONTRACT MANAGER</h1>
              <p className="text-slate-300 text-lg">Tableau de bord</p>
            </div>
          </div>
        </div>
        
        <Tabs defaultValue="contracts" className="w-full">
          <TabsList className="mb-6 bg-black/30 border border-slate-700/50 p-1 h-12">
            <TabsTrigger 
              value="contracts" 
              className="px-6 py-2 text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-red-600 data-[state=active]:text-white"
            >
              Contrats
            </TabsTrigger>
            <TabsTrigger 
              value="dashboard" 
              className="px-6 py-2 text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-red-600 data-[state=active]:text-white"
            >
              Statistiques
            </TabsTrigger>
            <TabsTrigger 
              value="alerts" 
              className="px-6 py-2 text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-red-600 data-[state=active]:text-white"
            >
              Alertes
            </TabsTrigger>
            <TabsTrigger 
              value="audit" 
              className="px-6 py-2 text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-red-600 data-[state=active]:text-white"
            >
              Audit Trail
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger 
                value="templates" 
                className="px-6 py-2 text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-red-600 data-[state=active]:text-white"
              >
                Modèles
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger 
                value="admin" 
                className="px-6 py-2 text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-red-600 data-[state=active]:text-white"
              >
                Administration
              </TabsTrigger>
            )}
          </TabsList>
          
          <div className="animate-fade-in-up">
            <TabsContent value="contracts">
              <ContractList />
            </TabsContent>
            <TabsContent value="dashboard">
              <DashboardStats />
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
