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
import { Tables } from "@/integrations/supabase/types";

interface ContractTableProps {
  contracts: Tables<'contracts', 'Row'>[];
  isLoading: boolean;
  updatingContractId: string | null;
  handleContractUpdate: (contractId: string, updates: Partial<Tables<'contracts', 'Update'>>) => Promise<void>;
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
        <p>Chargement des contrats...</p>
      </div>
    );
  }
  return (
    <>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-muted/50">
              <TableHead>Référence Décision</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Garantie</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Agence</TableHead>
              <TableHead>Date décision</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((contract) => (
              <TableRow key={contract.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{contract.reference_decision}</TableCell>
                <TableCell>{contract.client}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {getTypeLabel(contract.type)}
                  </Badge>
                </TableCell>
                <TableCell className="font-semibold text-primary">
                  {formatCurrency(contract.montant)}
                </TableCell>
                <TableCell>{getGarantieLabel(contract.garantie)}</TableCell>
                <TableCell>
                  <ContractStatusSelect
                    value={contract.statut}
                    disabled={updatingContractId === contract.id}
                    onChange={(v) => handleContractUpdate(contract.id, { statut: v })}
                  />
                </TableCell>
                <TableCell>{getAgenceLabel(contract.agence)}</TableCell>
                <TableCell>{formatDate(contract.date_decision)}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
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
