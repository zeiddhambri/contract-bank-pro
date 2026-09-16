import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";
import { Tables, TablesUpdate } from "@/integrations/supabase/types";
import ContractDetailForm from "./ContractDetailForm";
import ContractFileUpload from "./ContractFileUpload";
import ContractAlertCreator from "./ContractAlertCreator";
import { downloadContractFile, replaceContractFile } from "@/lib/storage";
import { AUDIT_ACTIONS, logAction } from "@/lib/audit-log";

interface ContractDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Tables<'contracts'>;
  onSaveChanges: (contractId: string, updates: Partial<TablesUpdate<'contracts'>>) => Promise<void>;
  isSaving: boolean;
}

const ContractDetailDialog: React.FC<ContractDetailDialogProps> = ({
  open,
  onOpenChange,
  contract,
  onSaveChanges,
  isSaving,
}) => {
  const [editedContract, setEditedContract] = useState<Tables<'contracts'>>(contract);
  const [customAlertMessage, setCustomAlertMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  React.useEffect(() => {
    if (open) {
      setEditedContract(contract);
      setFile(null);
      setIsUploading(false);
      setIsDownloading(false);
      setCustomAlertMessage('');

      // Traçabilité de la consultation (exigence d'audit bancaire — D18).
      void logAction(AUDIT_ACTIONS.contractView, {
        contractId: contract.id,
        reference: contract.reference_decision,
      });
    }
  }, [contract, open]);

  const handleFieldChange = (
    field: keyof TablesUpdate<'contracts'>,
    value: string | number | null,
  ) => {
    setEditedContract(prev => ({ ...prev, [field]: value }) as Tables<'contracts'>);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    } else {
      setFile(null);
    }
  };
  
  const getChangedFields = () => {
    const changes: Partial<TablesUpdate<'contracts'>> = {};
    if (editedContract.reference_decision !== contract.reference_decision) {
      changes.reference_decision = editedContract.reference_decision;
    }
    if (editedContract.client !== contract.client) {
      changes.client = editedContract.client;
    }
    if (editedContract.montant !== contract.montant) {
      changes.montant = editedContract.montant;
    }
    if (editedContract.date_decision !== contract.date_decision) {
      changes.date_decision = editedContract.date_decision;
    }
    if (editedContract.agence !== contract.agence) {
      changes.agence = editedContract.agence;
    }
    if (editedContract.statut !== contract.statut) {
      changes.statut = editedContract.statut;
    }
    return changes;
  };
  
  const changedFields = getChangedFields();
  const hasChanges = Object.keys(changedFields).length > 0 || !!file;

  const handleSave = async () => {
    if (!hasChanges || isUploading) return;

    const updates = getChangedFields();

    if (file) {
      setIsUploading(true);
      try {
        const newFilePath = await replaceContractFile({
          bankId: contract.bank_id,
          contractId: contract.id,
          file,
          previousPath: contract.file_path,
        });

        updates.file_path = newFilePath;

        await logAction(AUDIT_ACTIONS.documentReplace, {
          contractId: contract.id,
          reference: contract.reference_decision,
          fileName: file.name,
        });
      } catch (error) {
        toast({
          title: "Erreur de téléversement",
          description: error instanceof Error ? error.message : "Téléversement impossible.",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    if (Object.keys(updates).length > 0 || (file && updates.file_path)) {
      await onSaveChanges(contract.id, updates);

      // R1.3 : l'auteur, l'horodatage et la banque sont imposés côté serveur par
      // public.write_audit() — la piste n'est pas falsifiable depuis le client.
      // On journalise les champs modifiés, pas leurs valeurs (déjà en base).
      await logAction(AUDIT_ACTIONS.contractUpdate, {
        contractId: contract.id,
        fields: Object.keys(updates),
      });
    }
    
    onOpenChange(false);
  };

  const handleCreateAlert = () => {
    if (!customAlertMessage.trim()) {
      toast({
        title: "Champ vide",
        description: "Veuillez saisir un message pour l'alerte.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Alerte personnalisée créée",
      description: customAlertMessage,
    });
    // Ici on pourrait appeler une fonction backend pour stocker l’alerte
    setCustomAlertMessage('');
  };

  /** Téléchargement via URL signée de courte durée (jamais d'URL publique). */
  const handleDownload = async (filePath: string) => {
    setIsDownloading(true);
    try {
      await downloadContractFile(filePath);
      await logAction(AUDIT_ACTIONS.documentDownload, {
        contractId: contract.id,
        reference: contract.reference_decision,
      });
    } catch (error) {
      toast({
        title: "Téléchargement impossible",
        description: error instanceof Error ? error.message : "Le lien sécurisé n'a pas pu être généré.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Détails du contrat
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <ContractDetailForm
            editedContract={editedContract}
            handleFieldChange={handleFieldChange}
            isSaving={isSaving}
          />
          <ContractFileUpload
            filePath={contract.file_path}
            file={file}
            isUploading={isUploading}
            isDownloading={isDownloading}
            onDownload={handleDownload}
            handleFileChange={handleFileChange}
          />
          <ContractAlertCreator
            alertMessage={customAlertMessage}
            setAlertMessage={setCustomAlertMessage}
          />
        </div>
        <DialogFooter className="flex flex-row gap-2 pt-4">
          <Button
            variant="destructive"
            onClick={handleCreateAlert}
            className="flex items-center gap-1"
            type="button"
            disabled={!customAlertMessage.trim()}
          >
            <AlertTriangle size={16} className="mr-1" />
            Créer une alerte
          </Button>
          <div className="flex-1" />
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges || isUploading}
          >
            {isUploading ? "Téléversement..." : "Sauvegarder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContractDetailDialog;
