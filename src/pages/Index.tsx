import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import DashboardStats from "@/components/DashboardStats";
import ContractList from "@/components/ContractList";
import AlertsPanel from "@/components/AlertsPanel";
import CreateContractDialog from "@/components/CreateContractDialog";
import Logo from "@/components/Logo";
const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [contractsRefreshTrigger, setContractsRefreshTrigger] = useState(0);
  const handleContractCreated = () => {
    setContractsRefreshTrigger(prev => prev + 1);
  };
  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardStats />;
      case "contracts":
        return <ContractList />;
      case "alerts":
        return <AlertsPanel />;
      default:
        return <DashboardStats />;
    }
  };
  return <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b sticky top-0 z-40 bg-background/95 backdrop-blur-sm">
        <div className="flex h-16 items-center justify-between px-6 bg-teal-500">
          <div className="flex items-center space-x-4">
            <Logo />
            <h1 className="text-xl font-bold">
              Contract Manager
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              <span>Nouveau Contrat</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b">
        <div className="px-6">
          <div className="flex space-x-8 bg-blue-100">
            {[{
            id: "dashboard",
            label: "Tableau de Bord"
          }, {
            id: "contracts",
            label: "Contrats"
          }, {
            id: "alerts",
            label: "Alertes"
          }].map(tab => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"}`}>
                {tab.label}
              </button>)}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-6">
        {renderContent()}
      </main>

      {/* Create Contract Dialog */}
      <CreateContractDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} onContractCreated={handleContractCreated} />
    </div>;
};
export default Index;