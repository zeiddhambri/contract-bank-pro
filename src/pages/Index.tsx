
import ContractList from "@/components/ContractList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AlertsPanel from "@/components/AlertsPanel";
import AuditLogPanel from "@/components/AuditLogPanel";
import { useAuth } from "@/contexts/AuthContext";
import UserManagementPanel from "@/components/UserManagementPanel";
import ContractTemplateManager from "@/components/ContractTemplateManager";
import DashboardStats from "@/components/DashboardStats";
import Logo from "@/components/Logo";
import UserNav from "@/components/UserNav";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import CreateContractDialog from "@/components/CreateContractDialog";
import AiAssistantSheet from "@/components/AiAssistantSheet";
import { Button } from "@/components/ui/button";
import { Plus, MessageCircle } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { userRole, user } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigate = useNavigate();
  const isAdmin = userRole === 'super_admin' || userRole === 'bank_admin';

  const handleContractCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center space-x-4 mb-8">
            <Logo />
            <div>
              <h1 className="text-4xl font-bold text-white tracking-wide">CONTRACT MANAGER</h1>
              <p className="text-slate-300 text-lg">Plateforme de gestion des contrats</p>
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-slate-300 text-lg">Veuillez vous connecter pour accéder à l'application</p>
            <Button 
              onClick={() => navigate('/auth')}
              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-medium px-8 py-3"
            >
              Se connecter
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto p-4 md:p-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Logo />
              <div>
                <h1 className="text-4xl font-bold text-white tracking-wide">CONTRACT MANAGER</h1>
                <p className="text-slate-300 text-lg">Tableau de bord</p>
              </div>
            </div>
            
            {/* Navigation Bar */}
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-medium"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Contrat
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setAiAssistantOpen(true)}
                className="border-orange-600/50 text-orange-400 hover:bg-orange-600/10 hover:border-orange-500"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Assistant IA
              </Button>
              
              <LanguageSwitcher />
              <UserNav />
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
              <ContractList key={refreshTrigger} />
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

      {/* Dialogs and Sheets */}
      <CreateContractDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onContractCreated={handleContractCreated}
      />
      
      <AiAssistantSheet
        open={aiAssistantOpen}
        onOpenChange={setAiAssistantOpen}
      />
    </div>
  );
};

export default Index;
