
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Settings, Search, Plus, BarChart3, Calendar, AlertTriangle, Users, FileText, TrendingUp } from 'lucide-react';
import ContractList from '@/components/ContractList';
import DashboardStats from '@/components/DashboardStats';
import NotificationCenter from '@/components/NotificationCenter';
import SearchBar from '@/components/SearchBar';
import ContractKanban from '@/components/ContractKanban';
import FinancialDashboard from '@/components/FinancialDashboard';

const Dashboard = () => {
  const { userProfile, bank, signOut } = useAuth();
  const [activeView, setActiveView] = useState<'overview' | 'contracts' | 'kanban' | 'financials' | 'analytics'>('overview');
  const [showNotifications, setShowNotifications] = useState(false);

  const navigationItems = [
    { key: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
    { key: 'contracts', label: 'Contrats', icon: FileText },
    { key: 'kanban', label: 'Workflow', icon: Calendar },
    { key: 'financials', label: 'Finances', icon: TrendingUp },
    { key: 'analytics', label: 'Analytiques', icon: BarChart3 },
  ];

  const renderContent = () => {
    switch (activeView) {
      case 'overview':
        return (
          <div className="space-y-6">
            <DashboardStats />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Contrats en Alerte
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                      <div>
                        <p className="font-medium text-red-900">Contrat ABC Corp</p>
                        <p className="text-sm text-red-600">Expire dans 5 jours</p>
                      </div>
                      <Badge variant="destructive">Urgent</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                      <div>
                        <p className="font-medium text-yellow-900">Contrat XYZ Ltd</p>
                        <p className="text-sm text-yellow-600">En attente de signature</p>
                      </div>
                      <Badge variant="secondary">En cours</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    Prochaines Échéances
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <div>
                        <p className="font-medium text-blue-900">Renouvellement DEF Inc</p>
                        <p className="text-sm text-blue-600">15 mars 2024</p>
                      </div>
                      <Badge variant="outline">Renouvellement</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <div>
                        <p className="font-medium text-green-900">Paiement GHI Corp</p>
                        <p className="text-sm text-green-600">22 mars 2024</p>
                      </div>
                      <Badge variant="outline">Paiement</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      case 'contracts':
        return <ContractList />;
      case 'kanban':
        return <ContractKanban />;
      case 'financials':
        return <FinancialDashboard />;
      case 'analytics':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Rapports et Analyses</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Fonctionnalité d'analyse avancée en cours de développement...</p>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">JURIX</h1>
              {bank && (
                <Badge variant="outline" className="text-blue-600 border-blue-200">
                  {bank.name}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <SearchBar />
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative"
                >
                  <Bell className="h-5 w-5" />
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs">3</Badge>
                </Button>
                {showNotifications && <NotificationCenter />}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {}}
              >
                <Settings className="h-5 w-5" />
              </Button>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {userProfile?.full_name || 'Utilisateur'}
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
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-sm min-h-screen">
          <nav className="p-4">
            <div className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveView(item.key as any)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeView === item.key
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
            
            <div className="mt-8">
              <Button className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Contrat
              </Button>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
