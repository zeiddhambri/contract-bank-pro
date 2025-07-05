
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, Euro, User, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Tables } from '@/integrations/supabase/types';

type Contract = Tables<'contracts'> & {
  priority: string;
  tags: string[];
};

const ContractKanban = () => {
  const [draggedItem, setDraggedItem] = useState<Contract | null>(null);

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts-kanban'],
    queryFn: async (): Promise<Contract[]> => {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform data to match our Contract type
      return (data || []).map(contract => ({
        ...contract,
        priority: 'medium',
        tags: []
      }));
    },
  });

  const statusColumns = [
    { id: 'draft', title: 'Brouillon', color: 'bg-gray-100' },
    { id: 'review', title: 'En révision', color: 'bg-blue-100' },
    { id: 'approval', title: 'Approbation', color: 'bg-yellow-100' },
    { id: 'pending_signature', title: 'Signature', color: 'bg-orange-100' },
    { id: 'active', title: 'Actif', color: 'bg-green-100' },
    { id: 'expired', title: 'Expiré', color: 'bg-red-100' },
  ];

  const getContractsByStatus = (status: string) => {
    return contracts?.filter(contract => contract.statut === status) || [];
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleDragStart = (contract: Contract) => {
    setDraggedItem(contract);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (draggedItem && draggedItem.statut !== newStatus) {
      console.log(`Moving contract ${draggedItem.id} to ${newStatus}`);
    }
    setDraggedItem(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Chargement du workflow...</p>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Workflow des Contrats</h2>
        <p className="text-gray-600">Glissez-déposez les contrats pour changer leur statut</p>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4">
        {statusColumns.map((column) => {
          const columnContracts = getContractsByStatus(column.id);
          
          return (
            <div
              key={column.id}
              className={`flex-shrink-0 w-80 ${column.color} rounded-lg p-4`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">{column.title}</h3>
                <Badge variant="secondary" className="bg-white">
                  {columnContracts.length}
                </Badge>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {columnContracts.map((contract) => (
                  <Card
                    key={contract.id}
                    className="cursor-move hover:shadow-md transition-shadow bg-white"
                    draggable
                    onDragStart={() => handleDragStart(contract)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${getPriorityColor(contract.priority)}`}
                          />
                          <h4 className="font-medium text-gray-900 text-sm">
                            {contract.client}
                          </h4>
                        </div>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>

                      <Badge variant="outline" className="mb-2 text-xs">
                        {contract.type}
                      </Badge>

                      <div className="space-y-2 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Euro className="h-3 w-3" />
                          <span>{formatCurrency(contract.montant)}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {format(new Date(contract.date_decision), 'dd MMM yyyy', { locale: fr })}
                          </span>
                        </div>
                      </div>

                      {contract.tags && contract.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {contract.tags.slice(0, 2).map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {contract.tags.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{contract.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-3">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {contract.client.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ContractKanban;
