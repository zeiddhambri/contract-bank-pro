
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, FileText, DollarSign, Clock, Users, CheckCircle, Plus, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardStats from "@/components/DashboardStats";
import ContractList from "@/components/ContractList";
import AlertsPanel from "@/components/AlertsPanel";
import CreateContractDialog from "@/components/CreateContractDialog";
import Logo from "@/components/Logo";

const Index = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { user, signOut, loading, isAdmin, userRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white">Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-black/50 border-b border-slate-700/50 shadow-2xl backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Logo />
              <div>
                <h1 className="text-xl font-bold text-white tracking-wide">CONTRACT MANAGER</h1>
                <p className="text-sm text-slate-300">Gestion des contrats de financement</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                onClick={() => setIsCreateDialogOpen(true)} 
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-medium tracking-wide shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Plus className="h-4 w-4 mr-2" />
                NOUVEAU CONTRAT
              </Button>
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                  {isAdmin ? <Shield className="h-4 w-4 text-white" /> : <Users className="h-4 w-4 text-white" />}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-200">{user.email}</span>
                  {isAdmin && (
                    <Badge variant="secondary" className="text-xs bg-orange-600/20 text-orange-300 border-orange-600/30">
                      ADMIN
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="text-slate-300 hover:text-white hover:bg-slate-700/50"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Admin Banner */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 border-b border-orange-600/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex items-center justify-center space-x-2">
              <Shield className="h-4 w-4 text-orange-300" />
              <span className="text-sm font-medium text-orange-300">
                MODE ADMINISTRATEUR ACTIVÉ - Accès complet aux données
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Stats */}
        <DashboardStats />

        {/* Main Tabs */}
        <Tabs defaultValue="contracts" className="mt-8">
          <TabsList className="grid w-full grid-cols-4 mb-8 bg-black/30 border border-slate-700/50 backdrop-blur-sm">
            <TabsTrigger 
              value="contracts" 
              className="flex items-center space-x-2 text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-red-600 data-[state=active]:text-white font-medium"
            >
              <FileText className="h-4 w-4" />
              <span>CONTRATS</span>
            </TabsTrigger>
            <TabsTrigger 
              value="alerts" 
              className="flex items-center space-x-2 text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-red-600 data-[state=active]:text-white font-medium"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>ALERTES</span>
            </TabsTrigger>
            <TabsTrigger 
              value="juridique" 
              className="flex items-center space-x-2 text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-red-600 data-[state=active]:text-white font-medium"
            >
              <CheckCircle className="h-4 w-4" />
              <span>SUIVI JURIDIQUE</span>
            </TabsTrigger>
            <TabsTrigger 
              value="reporting" 
              className="flex items-center space-x-2 text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-red-600 data-[state=active]:text-white font-medium"
            >
              <DollarSign className="h-4 w-4" />
              <span>REPORTING</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contracts">
            <ContractList />
          </TabsContent>

          <TabsContent value="alerts">
            <AlertsPanel />
          </TabsContent>

          <TabsContent value="juridique">
            <Card className="bg-black/40 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white font-bold tracking-wide">SUIVI JURIDIQUE</CardTitle>
                <CardDescription className="text-slate-300">
                  Gestion des pièces juridiques et validation des documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400 font-medium">MODULE EN COURS DE DÉVELOPPEMENT</p>
                  {isAdmin && (
                    <p className="text-orange-300 text-sm mt-2">Mode admin : Configuration avancée disponible</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reporting">
            <Card className="bg-black/40 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white font-bold tracking-wide">REPORTING & STATISTIQUES</CardTitle>
                <CardDescription className="text-slate-300">
                  Génération de rapports et analyses statistiques
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <DollarSign className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400 font-medium">MODULE EN COURS DE DÉVELOPPEMENT</p>
                  {isAdmin && (
                    <p className="text-orange-300 text-sm mt-2">Mode admin : Rapports détaillés et export de données</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <CreateContractDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen} 
      />
    </div>
  );
};

export default Index;
