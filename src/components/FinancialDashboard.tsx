
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, DollarSign, CreditCard, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const FinancialDashboard = () => {
  const { data: contracts, isLoading } = useQuery({
    queryKey: ['financial-data'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('*');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Calculer les métriques financières
  const totalRevenue = contracts?.reduce((sum, contract) => sum + contract.montant, 0) || 0;
  const activeRevenue = contracts?.filter(c => c.statut === 'active').reduce((sum, contract) => sum + contract.montant, 0) || 0;
  const pendingRevenue = contracts?.filter(c => c.statut === 'pending_signature').reduce((sum, contract) => sum + contract.montant, 0) || 0;
  
  // Données simulées pour les graphiques
  const monthlyRevenue = [
    { month: 'Jan', revenue: 45000, contracts: 12, target: 50000 },
    { month: 'Fév', revenue: 67000, contracts: 19, target: 55000 },
    { month: 'Mar', revenue: 52000, contracts: 15, target: 60000 },
    { month: 'Avr', revenue: 78000, contracts: 22, target: 65000 },
    { month: 'Mai', revenue: 63000, contracts: 18, target: 70000 },
    { month: 'Jun', revenue: 89000, contracts: 25, target: 75000 },
  ];

  const revenueByType = [
    { name: 'Crédit immobilier', value: 320000, color: '#3b82f6' },
    { name: 'Crédit auto', value: 180000, color: '#10b981' },
    { name: 'Crédit personnel', value: 120000, color: '#f59e0b' },
    { name: 'Crédit professionnel', value: 95000, color: '#ef4444' },
  ];

  const paymentStatus = [
    { status: 'Payé', amount: 450000, percentage: 65, color: '#10b981' },
    { status: 'En attente', amount: 180000, percentage: 26, color: '#f59e0b' },
    { status: 'En retard', amount: 62000, percentage: 9, color: '#ef4444' },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Métriques financières principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Chiffre d'Affaires Total</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+15.3% vs mois dernier</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Revenus Actifs</p>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(activeRevenue)}</p>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-600">{formatPercentage((activeRevenue / totalRevenue) * 100)} du total</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Revenus Pendants</p>
                <p className="text-3xl font-bold text-yellow-600">{formatCurrency(pendingRevenue)}</p>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-600">En attente de signature</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taux de Conversion</p>
                <p className="text-3xl font-bold text-purple-600">78.5%</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+2.1% ce mois</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques de performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Évolution du Chiffre d'Affaires</CardTitle>
            <Button variant="outline" size="sm">
              Exporter
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} name="Réalisé" />
                <Line type="monotone" dataKey="target" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" name="Objectif" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition par Type de Crédit</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={revenueByType}
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {revenueByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Statut des paiements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Statut des Paiements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {paymentStatus.map((status, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{status.status}</span>
                  <Badge 
                    variant="outline" 
                    style={{ borderColor: status.color, color: status.color }}
                  >
                    {status.percentage}%
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${status.percentage}%`, 
                      backgroundColor: status.color 
                    }}
                  ></div>
                </div>
                <p className="text-lg font-semibold" style={{ color: status.color }}>
                  {formatCurrency(status.amount)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Revenus par mois avec barres */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Mensuelle Détaillée</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="revenue" fill="#3b82f6" name="Chiffre d'affaires" />
              <Bar dataKey="target" fill="#10b981" name="Objectif" opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialDashboard;
