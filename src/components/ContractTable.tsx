
import React, { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Edit2, Trash2, FileText, Brain } from "lucide-react";
import { Tables, TablesUpdate } from "@/integrations/supabase/types";
import ContractDetailDialog from "./ContractDetailDialog";
import AiContractGenerator from "./AiContractGenerator";

interface ContractTableProps {
  contracts: Tables<'contracts'>[];
  isLoading: boolean;
  updatingContractId: string | null;
  handleContractUpdate: (contractId: string, updates: Partial<TablesUpdate<'contracts'>>) => Promise<void>;
  handleContractDelete: (contractId: string) => Promise<void>;
}

const ContractTable: React.FC<ContractTableProps> = ({
  contracts,
  isLoading,
  updatingContractId,
  handleContractUpdate,
  handleContractDelete,
}) => {
  const [selectedContract, setSelectedContract] = useState<Tables<'contracts'> | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [aiGeneratorOpen, setAiGeneratorOpen] = useState(false);
  const [aiContractId, setAiContractId] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "signe":
        return "bg-green-500";
      case "en_cours":
        return "bg-blue-500";
      case "refuse":
        return "bg-red-500";
      case "attente":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "signe":
        return "Signé";
      case "en_cours":
        return "En cours";
      case "refuse":
        return "Refusé";
      case "attente":
        return "En attente";
      default:
        return status;
    }
  };

  const handleViewContract = (contract: Tables<'contracts'>) => {
    setSelectedContract(contract);
    setDetailDialogOpen(true);
  };

  const handleAiGenerate = (contractId: string) => {
    setAiContractId(contractId);
    setAiGeneratorOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="bg-black/30 border-slate-700/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-slate-400">Chargement des contrats...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (contracts.length === 0) {
    return (
      <Card className="bg-black/30 border-slate-700/50">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <FileText className="w-12 h-12 mx-auto mb-4 text-slate-500" />
            <p className="text-slate-400 text-lg">Aucun contrat trouvé</p>
            <p className="text-slate-500 text-sm">Créez votre premier contrat pour commencer.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-black/30 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Liste des Contrats ({contracts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700/50 hover:bg-slate-800/30">
                  <TableHead className="text-slate-300">Client</TableHead>
                  <TableHead className="text-slate-300">Type</TableHead>
                  <TableHead className="text-slate-300">Montant</TableHead>
                  <TableHead className="text-slate-300">Statut</TableHead>
                  <TableHead className="text-slate-300">Date Décision</TableHead>
                  <TableHead className="text-slate-300">Agence</TableHead>
                  <TableHead className="text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((contract) => (
                  <TableRow
                    key={contract.id}
                    className="border-slate-700/50 hover:bg-slate-800/20 transition-colors"
                  >
                    <TableCell className="text-slate-200 font-medium">
                      {contract.client}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {contract.type}
                    </TableCell>
                    <TableCell className="text-slate-200 font-mono">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'EUR'
                      }).format(Number(contract.montant))}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(contract.statut)} text-white`}>
                        {getStatusLabel(contract.statut)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {format(new Date(contract.date_decision), 'dd/MM/yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {contract.agence}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewContract(contract)}
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                          title="Voir les détails"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAiGenerate(contract.id)}
                          className="text-purple-400 hover:text-purple-300 hover:bg-purple-400/10"
                          title="Améliorer avec l'IA"
                        >
                          <Brain className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleContractDelete(contract.id)}
                          disabled={updatingContractId === contract.id}
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                          title="Supprimer"
                        >
                          {updatingContractId === contract.id ? (
                            <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      {selectedContract && (
        <ContractDetailDialog
          contract={selectedContract}
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          onContractUpdate={handleContractUpdate}
        />
      )}
      
      <AiContractGenerator
        open={aiGeneratorOpen}
        onOpenChange={setAiGeneratorOpen}
        contractId={aiContractId}
        onContractGenerated={() => {
          // Refresh contracts list if needed
        }}
      />
    </>
  );
};

export default ContractTable;
