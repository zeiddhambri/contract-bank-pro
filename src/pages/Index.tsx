
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import DashboardStats from "@/components/DashboardStats";
import ContractList from "@/components/ContractList";
import AlertsPanel from "@/components/AlertsPanel";
import AuditLogPanel from "@/components/AuditLogPanel";
import CreateContractDialog from "@/components/CreateContractDialog";
import AppLogo from "@/components/AppLogo";
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
  const { user } = useAuth();

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
      case "audit_trail":
        return <AuditLogPanel />;
      default:
        return <DashboardStats />;
    }
  };
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);

  return (
    <div className="min-h-screen text-foreground">
      {/* Header */}
      <header className="border-b border-border/40 sticky top-0 z-40 bg-background/95 backdrop-blur-sm">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <AppLogo />
            <h1 className="text-xl font-bold text-foreground">
              {t('contractManager')}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <Button onClick={() => setIsCreateDialogOpen(true)} className="transition-transform duration-200 hover:scale-105">
                <Plus className="h-4 w-4 mr-2" />
                <span>{t('newContract')}</span>
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={() => setAiAssistantOpen(true)} className="rounded-full" aria-label="Ouvrir l'assistant IA">
              <MessageCircle />
            </Button>
            <LanguageSwitcher />
            <UserNav />
          </div>
        </div>
      </header>
      {/* ... keep existing code (Navigation Tabs, Main Content, Dialogs) */}
      <nav className="border-b border-border/40">
        <div className="px-6">
          <div className="flex space-x-8">
            {[
              { id: "dashboard", label: t("dashboard") },
              { id: "contracts", label: t("contracts") },
              { id: "alerts", label: t("alerts") },
              { id: "audit_trail", label: "Audit Trail" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200
                  ${activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-primary/50'
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
        <div key={activeTab} className="animate-fade-in-up">
          {renderContent()}
        </div>
      </main>

      {/* Dialogue de création de contrat */}
      <CreateContractDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} onContractCreated={handleContractCreated} />
      {/* Assistant IA Panel */}
      <AiAssistantSheet open={aiAssistantOpen} onOpenChange={setAiAssistantOpen} />
    </div>
  );
};
export default Index;
