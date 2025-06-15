
import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ContractStatusSelect from "./ContractStatusSelect";
import ContractDetailDialog from "./ContractDetailDialog";
import {
  formatCurrency,
  formatDate,
  getAgenceLabel,
  getGarantieLabel,
  getTypeLabel,
} from "@/lib/contract-helpers";
import { Tables, TablesUpdate } from "@/integrations/supabase/types";

interface ContractTableProps {
  contracts: Tables<'contracts', 'Row'>[];
  isLoading: boolean;
  updatingContractId: string | null;
  handleContractUpdate: (contractId: string, updates: Partial<TablesUpdate<'contracts'>>) => Promise<void>;
}

const ContractTable: React.FC<ContractTableProps> = ({
  contracts,
  isLoading,
  updatingContractId,
  handleContractUpdate,
}) => {
  const [selectedContract, setSelectedContract] = useState<Tables<'contracts', 'Row'> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleVoirDetails = (contract: Tables<'contracts', 'Row'>) => {
    setSelectedContract(contract);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-slate-400">Chargement des contrats...</p>
      </div>
    );
  }
  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-gray-900/30">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-slate-800/50">
              <TableHead className="text-slate-400 font-medium">Référence Décision</TableHead>
              <TableHead className="text-slate-400 font-medium">Client</TableHead>
              <TableHead className="text-slate-400 font-medium">Type</TableHead>
              <TableHead className="text-slate-400 font-medium">Montant</TableHead>
              <TableHead className="text-slate-400 font-medium">Garantie</TableHead>
              <TableHead className="text-slate-400 font-medium">Statut</TableHead>
              <TableHead className="text-slate-400 font-medium">Agence</TableHead>
              <TableHead className="text-slate-400 font-medium">Date décision</TableHead>
              <TableHead className="text-slate-400 font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((contract) => (
              <TableRow key={contract.id} className="border-slate-800 hover:bg-slate-800/40 transition-colors">
                <TableCell className="font-medium text-white">{contract.reference_decision}</TableCell>
                <TableCell className="text-slate-300">{contract.client}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-slate-700 text-slate-300 bg-slate-800/60">
                    {getTypeLabel(contract.type)}
                  </Badge>
                </TableCell>
                <TableCell className="font-semibold text-blue-400">
                  {formatCurrency(contract.montant)}
                </TableCell>
                <TableCell className="text-slate-300">{getGarantieLabel(contract.garantie)}</TableCell>
                <TableCell>
                  <ContractStatusSelect
                    value={contract.statut}
                    disabled={updatingContractId === contract.id}
                    onChange={(v) => handleContractUpdate(contract.id, { statut: v })}
                  />
                </TableCell>
                <TableCell className="text-slate-300">{getAgenceLabel(contract.agence)}</TableCell>
                <TableCell className="text-slate-300">{formatDate(contract.date_decision)}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-500/30 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-all duration-200"
                    onClick={() => handleVoirDetails(contract)}
                  >
                    Voir détails
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedContract && (
        <ContractDetailDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          contract={selectedContract}
          onSaveChanges={handleContractUpdate}
          isSaving={updatingContractId === selectedContract.id}
        />
      )}
    </>
  );
};

export default ContractTable;
