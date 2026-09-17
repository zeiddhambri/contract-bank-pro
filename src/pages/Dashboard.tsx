// ============================================================================
// Tableau de bord — poste de pilotage (R2 + R4)
// ----------------------------------------------------------------------------
// Plus aucune donnée de maquette : les cartes « Contrats en alerte » et
// « Prochaines échéances » lisent les contrats réels de la banque (RLS), le
// badge de notifications compte les messages non lus, et le bouton
// « Nouveau contrat » ouvre réellement le formulaire de création.
// L'onglet « Analytiques » (écran « en cours de développement ») et le bouton de
// réglages inactif sont retirés : ils reviendront avec les rapports (R15) et les
// préférences de banque (R16), branchés.
// ============================================================================
import React, { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Calendar,
  FileText,
  Layers,
  Library,
  Palette,
  Plus,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wand2,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAllContracts } from "@/hooks/useContracts";
import ContractList from "@/components/ContractList";
import DashboardStats from "@/components/DashboardStats";
import NotificationCenter from "@/components/NotificationCenter";
import SearchBar from "@/components/SearchBar";
import ContractKanban from "@/components/ContractKanban";
import FinancialDashboard from "@/components/FinancialDashboard";
import CreateContractDialog from "@/components/CreateContractDialog";
import ClauseLibrary from "@/components/ClauseLibrary";
import ContractTemplateManager from "@/components/ContractTemplateManager";
import UserManagementPanel from "@/components/UserManagementPanel";
import AuditLogPanel from "@/components/AuditLogPanel";
import OrganizationBrandingManager from "@/components/OrganizationBrandingManager";
import AiAssistantSheet from "@/components/AiAssistantSheet";
import AiContractGenerator from "@/components/AiContractGenerator";
import Logo from "@/components/Logo";
import BankLogo from "@/components/BankLogo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import type { Tables } from "@/integrations/supabase/types";
import { getStatusBadgeClassLight, getStatusLabel, normalizeStatus } from "@/lib/contract-status";
import { formatCurrency } from "@/lib/contract-helpers";

type Contract = Tables<"contracts">;

/**
 * Une seule coquille applicative (R6.1) : les écrans qui n'étaient atteignables
 * que par la route orpheline `/legacy` (bibliothèque de clauses, modèles,
 * utilisateurs, piste d'audit, marque, IA) deviennent des vues du tableau de
 * bord, avec leurs droits d'accès.
 */
type View =
  | "overview"
  | "contracts"
  | "kanban"
  | "financials"
  | "clauses"
  | "templates"
  | "users"
  | "audit"
  | "branding";

interface NavItem {
  key: View;
  label: string;
  icon: LucideIcon;
}

interface NavSection {
  label: string;
  items: NavItem[];
}



/** Fenêtre de surveillance des échéances, en jours. */
const DEADLINE_WINDOW_DAYS = 90;

interface Deadline {
  contract: Contract;
  date: Date;
  daysLeft: number;
  kind: "Échéance" | "Renouvellement" | "Signature";
}

const Dashboard = () => {
  const { userProfile, userRole, bank, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState<View>("overview");
  const [showNotifications, setShowNotifications] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [aiGeneratorOpen, setAiGeneratorOpen] = useState(false);

  /** Administration : super_admin (toutes banques) ou bank_admin (sa banque). */
  const canAdminister = userRole === "super_admin" || userRole === "bank_admin";
  /** Recherche globale : partagée avec la liste des contrats (une seule source). */
  const [searchTerm, setSearchTerm] = useState("");

  const { unreadCount } = useNotifications();

  // Même clé de cache que ContractList et le Kanban : une création ou un
  // changement de statut rafraîchit les trois vues.
  // Le Kanban, les cartes de synthèse et les agrégats financiers partagent
  // cette requête unique (clé ['contracts','all']) ; la liste paginée utilise
  // ['contracts','list', …] et toutes sont invalidées par le préfixe.
  const { data: contracts } = useAllContracts();

  const rows = useMemo(() => contracts ?? [], [contracts]);

  const alertContracts = useMemo(
    () => rows.filter((contract) => normalizeStatus(contract.statut) === "alert"),
    [rows],
  );

  /** Prochaines échéances réelles : échéance, renouvellement ou signature. */
  const deadlines = useMemo<Deadline[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const candidates: Deadline[] = [];

    for (const contract of rows) {
      const entries: { value: string | null; kind: Deadline["kind"] }[] = [
        { value: contract.expiry_date, kind: "Échéance" },
        { value: contract.renewal_date, kind: "Renouvellement" },
        { value: contract.date_signature, kind: "Signature" },
      ];

      for (const entry of entries) {
        if (!entry.value) continue;
        const date = new Date(entry.value);
        if (Number.isNaN(date.getTime())) continue;

        const daysLeft = Math.round((date.getTime() - today.getTime()) / 86_400_000);
        // Les dates déjà passées remontent en premier : ce sont les plus urgentes.
        if (daysLeft <= DEADLINE_WINDOW_DAYS) {
          candidates.push({ contract, date, daysLeft, kind: entry.kind });
        }
      }
    }

    return candidates.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5);
  }, [rows]);

  const navigationSections: NavSection[] = [
    {
      label: "Pilotage",
      items: [
        { key: "overview", label: "Vue d'ensemble", icon: BarChart3 },
        { key: "contracts", label: "Contrats", icon: FileText },
        { key: "kanban", label: "Cycle de vie", icon: Calendar },
        { key: "financials", label: "Finances", icon: TrendingUp },
      ],
    },
    {
      label: "Référentiels",
      items: [
        { key: "clauses", label: "Bibliothèque de clauses", icon: Library },
        { key: "templates", label: "Modèles de contrat", icon: Layers },
      ],
    },
    // Écrans d'administration : invisibles sans le rôle correspondant.
    ...(canAdminister
      ? [
          {
            label: "Administration",
            items: [
              { key: "users", label: "Utilisateurs", icon: Users },
              { key: "audit", label: "Piste d'audit", icon: ShieldCheck },
              { key: "branding", label: "Marque & thème", icon: Palette },
            ] as NavItem[],
          },
        ]
      : []),
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      <DashboardStats />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" aria-hidden="true" />
              Contrats en alerte
              {alertContracts.length > 0 && (
                <Badge variant="destructive" className="ml-auto">
                  {alertContracts.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alertContracts.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                Aucun contrat en alerte. Les incidents déclarés apparaîtront ici.
              </p>
            ) : (
              <ul className="space-y-3">
                {alertContracts.slice(0, 5).map((contract) => (
                  <li
                    key={contract.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-red-50 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-red-900">
                        {contract.client}
                        <span className="ml-2 font-mono text-xs text-red-700">
                          {contract.reference_decision}
                        </span>
                      </p>
                      <p className="text-sm text-red-600">
                        {formatCurrency(contract.montant, contract.currency)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveView("contracts")}
                    >
                      Ouvrir la liste
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" aria-hidden="true" />
              Prochaines échéances
              <span className="ml-auto text-xs font-normal text-gray-500">
                à {DEADLINE_WINDOW_DAYS} jours
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deadlines.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                Aucune échéance, renouvellement ou signature à venir. Renseignez l'échéance
                d'un contrat pour alimenter les rappels automatiques.
              </p>
            ) : (
              <ul className="space-y-3">
                {deadlines.map(({ contract, date, daysLeft, kind }) => {
                  const overdue = daysLeft < 0;
                  const soon = !overdue && daysLeft <= 30;

                  return (
                    <li
                      key={`${contract.id}-${kind}`}
                      className={`flex items-center justify-between gap-3 rounded-lg p-3 ${
                        overdue ? "bg-red-50" : soon ? "bg-yellow-50" : "bg-blue-50"
                      }`}
                    >
                      <div className="min-w-0">
                        <p
                          className={`truncate font-medium ${
                            overdue ? "text-red-900" : soon ? "text-yellow-900" : "text-blue-900"
                          }`}
                        >
                          {kind} · {contract.client}
                        </p>
                        <p
                          className={`text-sm ${
                            overdue ? "text-red-600" : soon ? "text-yellow-700" : "text-blue-600"
                          }`}
                        >
                          {format(date, "dd MMMM yyyy", { locale: fr })}
                          {" · "}
                          {overdue
                            ? `dépassée de ${Math.abs(daysLeft)} jour(s)`
                            : daysLeft === 0
                              ? "aujourd'hui"
                              : `dans ${daysLeft} jour(s)`}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={getStatusBadgeClassLight(contract.statut)}
                      >
                        {getStatusLabel(contract.statut)}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderForbidden = () => (
    <Card>
      <CardContent className="p-8 text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-gray-300" aria-hidden="true" />
        <p className="mt-2 font-semibold text-gray-900">Accès restreint</p>
        <p className="mt-1 text-sm text-gray-500">
          Cet écran est réservé aux administrateurs de la banque.
        </p>
      </CardContent>
    </Card>
  );

  const renderContent = () => {
    switch (activeView) {
      case "overview":
        return renderOverview();
      case "contracts":
        return <ContractList search={searchTerm} onSearchChange={setSearchTerm} />;
      case "kanban":
        return <ContractKanban />;
      case "financials":
        return <FinancialDashboard />;
      case "clauses":
        return <ClauseLibrary />;
      case "templates":
        return <ContractTemplateManager />;
      case "users":
        return canAdminister ? <UserManagementPanel /> : renderForbidden();
      case "audit":
        return canAdminister ? <AuditLogPanel /> : renderForbidden();
      case "branding":
        return canAdminister ? <OrganizationBrandingManager /> : renderForbidden();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white shadow-sm">
        <div className="px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Logo />
              <h1 className="text-2xl font-bold text-gray-900">JURIX</h1>
              {bank && (
                <span className="flex items-center gap-2 rounded-full border border-blue-200 py-1 pl-1 pr-3">
                  <BankLogo logoUrl={bank.logo_url} bankName={bank.name} />
                  <span className="text-sm font-medium text-blue-700">{bank.name}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              <SearchBar
                value={searchTerm}
                onValueChange={(value) => {
                  setSearchTerm(value);
                  // Toute saisie bascule sur la liste : la recherche agit là où
                  // elle est visible, pas sur une vue qui ne l'affiche pas.
                  if (value.trim().length > 0) setActiveView("contracts");
                }}
                onSubmit={() => setActiveView("contracts")}
              />

              <Button
                variant="outline"
                size="sm"
                onClick={() => setAiAssistantOpen(true)}
                title="Poser une question à l'assistant"
              >
                <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                Assistant IA
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAiGeneratorOpen(true)}
                title="Générer un brouillon de contrat"
              >
                <Wand2 className="mr-2 h-4 w-4" aria-hidden="true" />
                Générer
              </Button>
              <LanguageSwitcher />

              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotifications((open) => !open)}
                  aria-expanded={showNotifications}
                  aria-label={
                    unreadCount > 0
                      ? `Notifications : ${unreadCount} non lue(s)`
                      : "Notifications : aucune non lue"
                  }
                  className="relative h-9 w-9 p-0"
                >
                  <Bell className="h-5 w-5" aria-hidden="true" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -right-2 -top-2 h-5 min-w-5 p-0 text-xs">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Badge>
                  )}
                </Button>
                {showNotifications && <NotificationCenter />}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {userProfile?.full_name || "Utilisateur"}
                </span>
                <Button variant="outline" size="sm" onClick={signOut}>
                  Déconnexion
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="min-h-screen w-64 bg-white shadow-sm">
          <nav className="p-4" aria-label="Navigation principale">
            <div className="space-y-6">
              {navigationSections.map((section) => (
                <div key={section.label}>
                  <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {section.label}
                  </p>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeView === item.key;

                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setActiveView(item.key)}
                          aria-current={isActive ? "page" : undefined}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                            isActive
                              ? "border border-blue-200 bg-blue-50 font-medium text-blue-700"
                              : "border border-transparent text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <Button
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Nouveau contrat
              </Button>
            </div>
          </nav>
        </aside>

        <main className="flex-1 p-6">{renderContent()}</main>
      </div>

      <AiAssistantSheet open={aiAssistantOpen} onOpenChange={setAiAssistantOpen} />
      <AiContractGenerator
        open={aiGeneratorOpen}
        onOpenChange={setAiGeneratorOpen}
        onContractGenerated={() => {
          queryClient.invalidateQueries({ queryKey: ["contracts"] });
          setActiveView("contracts");
        }}
      />

      <CreateContractDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onContractCreated={() => {
          // Préfixe : rafraîchit la liste paginée, le Kanban et les agrégats.
          queryClient.invalidateQueries({ queryKey: ["contracts"] });
          setActiveView("contracts");
        }}
      />
    </div>
  );
};

export default Dashboard;
