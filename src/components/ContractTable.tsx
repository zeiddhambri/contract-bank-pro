
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Eye, Edit, Trash2, Download, Filter } from "lucide-react";
import { formatCurrency } from "@/lib/contract-helpers";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Contract {
  id: string;
  client: string;
  type: string;
  montant: number;
  statut: string;
  date_decision: string;
  date_signature: string | null;
  agence: string;
  reference_decision: string;
  garantie: string;
  description: string | null;
  file_path: string | null;
  bank_id: string;
  garanties: any;
  created_at: string;
  updated_at: string;
}

interface ContractTableProps {
  contracts: Contract[];
  onContractUpdate?: () => void;
  isLoading?: boolean;
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'actif':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'en_attente':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'expire':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'resilie':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-blue-100 text-blue-800 border-blue-200';
  }
};

const getStatusLabel = (status: string) => {
  switch (status.toLowerCase()) {
    case 'actif':
      return 'Actif';
    case 'en_attente':
      return 'En attente';
    case 'expire':
      return 'Expiré';
    case 'resilie':
      return 'Résilié';
    default:
      return status;
  }
};

const ContractTable = ({ contracts, onContractUpdate, isLoading }: ContractTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch = 
      contract.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.reference_decision.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || contract.statut === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleViewContract = (contract: Contract) => {
    console.log("Viewing contract:", contract);
    // TODO: Implement contract detail view
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-slate-400">
            Chargement des contrats...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Liste des Contrats</span>
          <Badge variant="secondary" className="bg-slate-100 text-slate-700">
            {filteredContracts.length} contrat{filteredContracts.length > 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filtres et recherche */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Rechercher par client, type ou référence..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-50 border-slate-200 focus:border-orange-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-md bg-white text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="actif">Actif</option>
              <option value="en_attente">En attente</option>
              <option value="expire">Expiré</option>
              <option value="resilie">Résilié</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold text-slate-700">Client</TableHead>
                <TableHead className="font-semibold text-slate-700">Type</TableHead>
                <TableHead className="font-semibold text-slate-700">Montant</TableHead>
                <TableHead className="font-semibold text-slate-700">Statut</TableHead>
                <TableHead className="font-semibold text-slate-700">Date Décision</TableHead>
                <TableHead className="font-semibold text-slate-700">Agence</TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                    {searchTerm || statusFilter !== "all" 
                      ? "Aucun contrat ne correspond à vos critères de recherche"
                      : "Aucun contrat disponible"
                    }
                  </TableCell>
                </TableRow>
              ) : (
                filteredContracts.map((contract) => (
                  <TableRow key={contract.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-medium text-slate-900">
                      {contract.client}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {contract.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900">
                      {formatCurrency(contract.montant)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={getStatusColor(contract.statut)}
                      >
                        {getStatusLabel(contract.statut)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {format(new Date(contract.date_decision), 'dd/MM/yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {contract.agence}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewContract(contract)}
                          className="text-slate-600 hover:text-orange-600 hover:bg-orange-50"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {contract.file_path && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-600 hover:text-green-600 hover:bg-green-50"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContractTable;
