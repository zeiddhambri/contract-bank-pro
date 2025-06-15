
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 font-sans text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <Logo />
            <h1 className="text-xl font-bold tracking-wider">
              CONTRACT <span className="font-light text-blue-400">MANAGER</span>
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium flex items-center space-x-2 rounded-full px-5"
            >
              <Plus className="h-4 w-4" />
              <span>Nouveau Contrat</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b border-slate-800 bg-black/10 backdrop-blur-sm">
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
                    ? "border-blue-400 text-blue-300"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-400"
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
