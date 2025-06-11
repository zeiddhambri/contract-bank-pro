
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import DashboardStats from "@/components/DashboardStats";
import ContractList from "@/components/ContractList";
import AlertsPanel from "@/components/AlertsPanel";
import CreateContractDialog from "@/components/CreateContractDialog";

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
        return <ContractList onRefresh={contractsRefreshTrigger} />;
      case "alerts":
        return <AlertsPanel />;
      default:
        return <DashboardStats />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-black/20 backdrop-blur-sm">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-white tracking-wider">
              SI<span className="text-orange-400">RINE</span>
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-medium flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Nouveau Contrat</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b border-slate-700/50 bg-black/10 backdrop-blur-sm">
        <div className="px-6">
          <div className="flex space-x-8">
            {[
              { id: "dashboard", label: "Tableau de Bord" },
              { id: "contracts", label: "Contrats" },
              { id: "alerts", label: "Alertes" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-orange-400 text-orange-400"
                    : "border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-6">
        {renderContent()}
      </main>

      {/* Create Contract Dialog */}
      <CreateContractDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onContractCreated={handleContractCreated}
      />
    </div>
  );
};

export default Index;
