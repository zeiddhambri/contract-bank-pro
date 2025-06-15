
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

interface Contract {
  id: string;
  reference_decision: string;
  client: string;
  type: string;
  montant: number;
  garantie: string;
  statut: string;
  agence: string;
  date_decision: string;
}

interface ContractTableProps {
  contracts: Contract[];
  isLoading: boolean;
  statusLoadingId: string | null;
  handleStatusChange: (contractId: string, newStatus: string) => void;
}

const ContractTable: React.FC<ContractTableProps> = ({
  contracts,
  isLoading,
  statusLoadingId,
  handleStatusChange,
}) => {
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleVoirDetails = (contract: Contract) => {
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
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700 hover:bg-slate-800/50">
              <TableHead className="text-slate-300 font-medium">Référence Décision</TableHead>
              <TableHead className="text-slate-300 font-medium">Client</TableHead>
              <TableHead className="text-slate-300 font-medium">Type</TableHead>
              <TableHead className="text-slate-300 font-medium">Montant</TableHead>
              <TableHead className="text-slate-300 font-medium">Garantie</TableHead>
              <TableHead className="text-slate-300 font-medium">Statut</TableHead>
              <TableHead className="text-slate-300 font-medium">Agence</TableHead>
              <TableHead className="text-slate-300 font-medium">Date décision</TableHead>
              <TableHead className="text-slate-300 font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((contract) => (
              <TableRow key={contract.id} className="border-slate-700 hover:bg-slate-800/30 transition-colors">
                <TableCell className="font-medium text-white">{contract.reference_decision}</TableCell>
                <TableCell className="text-slate-300">{contract.client}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-slate-600 text-slate-300">
                    {getTypeLabel(contract.type)}
                  </Badge>
                </TableCell>
                <TableCell className="font-semibold text-orange-400">
                  {formatCurrency(contract.montant)}
                </TableCell>
                <TableCell className="text-slate-300">{getGarantieLabel(contract.garantie)}</TableCell>
                <TableCell>
                  <ContractStatusSelect
                    value={contract.statut}
                    disabled={statusLoadingId === contract.id}
                    onChange={(v) => handleStatusChange(contract.id, v)}
                  />
                </TableCell>
                <TableCell className="text-slate-300">{getAgenceLabel(contract.agence)}</TableCell>
                <TableCell className="text-slate-300">{formatDate(contract.date_decision)}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-orange-500/30 text-orange-400 hover:bg-orange-500/20 hover:text-orange-300"
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
          onSaveStatus={async (id, newStatus) => {
            handleStatusChange(id, newStatus);
          }}
          statusLoading={statusLoadingId === selectedContract.id}
        />
      )}
    </>
  );
};

export default ContractTable;
