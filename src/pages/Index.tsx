
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import DashboardStats from "@/components/DashboardStats";
import ContractList from "@/components/ContractList";
import AlertsPanel from "@/components/AlertsPanel";
import CreateContractDialog from "@/components/CreateContractDialog";
import BankLogo from "@/components/BankLogo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from "@/contexts/AuthContext";
import UserNav from "@/components/UserNav";
import AiAssistantSheet from "@/components/AiAssistantSheet";
import { MessageCircle } from "lucide-react";

const Index = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [contractsRefreshTrigger, setContractsRefreshTrigger] = useState(0);
  const { user, bank } = useAuth();
  const handleContractCreated = () => {
    setContractsRefreshTrigger(prev => prev + 1);
  };
  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardStats />;
      case "contracts":
        return <ContractList key={contractsRefreshTrigger} />;
      case "alerts":
        return <AlertsPanel />;
      default:
        return <DashboardStats />;
    }
  };
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b sticky top-0 z-40 bg-background/95 backdrop-blur-sm">
        <div 
          className="flex h-16 items-center justify-between px-6 text-white"
          style={{ backgroundColor: bank?.primary_color || '#14b8a6' }}
        >
          <div className="flex items-center space-x-4">
            <BankLogo logoUrl={bank?.logo_url} bankName={bank?.name} />
            <h1 className="text-xl font-bold">
              {bank?.name || t('contractManager')}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <Button onClick={() => setIsCreateDialogOpen(true)} variant="secondary">
                <Plus className="h-4 w-4 mr-2" />
                <span>{t('newContract')}</span>
              </Button>
            )}
            {/* Ajout du bouton Assistant IA */}
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setAiAssistantOpen(true)}
              className="rounded-full"
              aria-label="Ouvrir l'assistant IA"
            >
              <MessageCircle />
            </Button>
            <LanguageSwitcher />
            <UserNav />
          </div>
        </div>
      </header>
      {/* Navigation Tabs */}
      <nav className="border-b">
        <div className="px-6">
          <div className="flex space-x-8 bg-blue-100 rounded-md">
            {[{
            id: "dashboard",
            label: t("dashboard")
          }, {
            id: "contracts",
            label: t("contracts")
          }, {
            id: "alerts",
            label: t("alerts")
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

      {/* Dialogue de création de contrat */}
      <CreateContractDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} onContractCreated={handleContractCreated} />
      {/* Assistant IA Panel */}
      <AiAssistantSheet open={aiAssistantOpen} onOpenChange={setAiAssistantOpen} />
    </div>
  );
};

export default Index;
