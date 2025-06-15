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
import { supabase } from "@/integrations/supabase/client";
import JSZip from "jszip";
import ContractDetailForm from "./ContractDetailForm";
import ContractFileUpload from "./ContractFileUpload";
import ContractAlertCreator from "./ContractAlertCreator";

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

  React.useEffect(() => {
    if (open) {
      setEditedContract(contract);
      setFile(null);
      setIsUploading(false);
      setCustomAlertMessage('');
    }
  }, [contract, open]);

  const handleFieldChange = (field: keyof TablesUpdate<'contracts'>, value: any) => {
    setEditedContract(prev => ({ ...prev, [field]: value as any }));
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
        const zip = new JSZip();
        zip.file(file.name, file);
        const zippedBlob = await zip.generateAsync({ type: "blob" });
        const fileName = `${file.name}.zip`;
        const newFilePath = `${Date.now()}-${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('contract_files')
          .upload(newFilePath, zippedBlob);

        if (uploadError) {
          throw uploadError;
        }
        updates.file_path = newFilePath;
      } catch (error: any) {
        toast({
          title: "Erreur de téléversement",
          description: error.message,
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    if (Object.keys(updates).length > 0 || (file && updates.file_path)) {
      await onSaveChanges(contract.id, updates);
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

  const getFileUrl = (filePath: string) => {
    const { data } = supabase.storage.from('contract_files').getPublicUrl(filePath);
    return data.publicUrl;
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
            getFileUrl={getFileUrl}
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
