
import React, { useState } from "react";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
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
  CONTRACT_STATUS_OPTIONS,
} from "@/lib/contract-helpers";
import { Tables, TablesUpdate } from "@/integrations/supabase/types";
import { Download, Paperclip, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";

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
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleVoirDetails = (contract: Tables<'contracts'>) => {
    setSelectedContract(contract);
    setDialogOpen(true);
  };

  const getFileUrl = (filePath: string) => {
    const { data } = supabase.storage.from('contract_files').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const getStatusLabel = (statusValue: string) => {
    return CONTRACT_STATUS_OPTIONS.find(opt => opt.value === statusValue)?.label || statusValue;
  }

  const handleExportExcel = () => {
    const dataToExport = contracts.map(c => ({
      "Référence Décision": c.reference_decision,
      "Client": c.client,
      "Type": getTypeLabel(c.type),
      "Montant": c.montant,
      "Garantie": getGarantieLabel(c.garantie),
      "Statut": getStatusLabel(c.statut),
      "Agence": getAgenceLabel(c.agence),
      "Date décision": formatDate(c.date_decision),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Contrats");
    XLSX.writeFile(workbook, "contrats.xlsx");
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const tableColumn = ["Référence Décision", "Client", "Type", "Montant", "Garantie", "Statut", "Agence", "Date décision"];
    const tableRows: (string | number)[][] = [];

    contracts.forEach(c => {
      const contractData = [
        c.reference_decision,
        c.client,
        getTypeLabel(c.type),
        formatCurrency(c.montant),
        getGarantieLabel(c.garantie),
        getStatusLabel(c.statut),
        getAgenceLabel(c.agence),
        formatDate(c.date_decision),
      ];
      tableRows.push(contractData);
    });

    (doc as any).autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 20,
        styles: { font: "helvetica", fontSize: 8 },
        headStyles: { fillColor: [22, 160, 133] },
    });
    doc.text("Liste des Contrats", 14, 15);
    doc.save("contrats.pdf");
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
      <div className="flex justify-end gap-2 mb-4">
        <Button onClick={handleExportExcel} variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export Excel
        </Button>
        <Button onClick={handleExportPDF} variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </div>
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
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVoirDetails(contract)}
                      disabled={updatingContractId === contract.id}
                    >
                      Voir détails
                    </Button>
                    {contract.file_path && (
                        <Button asChild variant="ghost" size="icon">
                            <a href={getFileUrl(contract.file_path)} target="_blank" rel="noopener noreferrer" title="Télécharger le fichier">
                                <Paperclip className="h-4 w-4" />
                            </a>
                        </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive/90"
                          disabled={updatingContractId === contract.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Êtes-vous sûr?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action est irréversible. Le contrat sera définitivement supprimé.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleContractDelete(contract.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
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
