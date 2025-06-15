
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ContractStatusSelect from "./ContractStatusSelect";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, Check } from "lucide-react";

interface ContractDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: {
    id: string;
    client: string;
    reference_decision: string;
    type: string;
    montant: number;
    garantie: string;
    statut: string;
    agence: string;
    date_decision: string;
    // Add any more fields if needed
  };
  onSaveStatus: (contractId: string, newStatus: string) => Promise<void>;
  statusLoading: boolean;
  getStatusBadgeClass: (status: string) => string;
}

const ContractDetailDialog: React.FC<ContractDetailDialogProps> = ({
  open,
  onOpenChange,
  contract,
  onSaveStatus,
  statusLoading,
  getStatusBadgeClass,
}) => {
  const [localStatus, setLocalStatus] = useState(contract.statut);

  // Synchronize local status with contract updates
  React.useEffect(() => {
    setLocalStatus(contract.statut);
  }, [contract.statut, contract.id, open]);

  const handleStatusSave = async () => {
    if (localStatus !== contract.statut) {
      await onSaveStatus(contract.id, localStatus);
    }
    toast({
      title: "Contrat mis à jour",
      description: "Le statut a bien été modifié.",
      icon: Check,
    });
    onOpenChange(false);
  };

  const handleCreateAlert = () => {
    toast({
      title: "Alerte créée",
      description: `Alerte envoyée pour le contrat ${contract.reference_decision}.`,
      icon: AlertTriangle,
    });
    // You can add backend logic later for alerts if required
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Détails du contrat
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <div>
            <div className="text-xs text-slate-400">Référence</div>
            <div className="font-bold text-white">{contract.reference_decision}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Client</div>
            <div className="text-white">{contract.client}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Statut</div>
            <ContractStatusSelect
              value={localStatus}
              disabled={statusLoading}
              onChange={setLocalStatus}
              getStatusBadgeClass={getStatusBadgeClass}
            />
          </div>
        </div>
        <DialogFooter className="flex flex-row gap-2 pt-4">
          <Button
            variant="outline"
            onClick={handleCreateAlert}
            className="flex items-center gap-1 border-red-500/30 text-red-400"
            type="button"
          >
            <AlertTriangle size={16} className="mr-1" />
            Créer une alerte
          </Button>
          <div className="flex-1" />
          <Button
            onClick={handleStatusSave}
            disabled={statusLoading || localStatus === contract.statut}
            className="bg-orange-500 text-white hover:bg-orange-600"
          >
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContractDetailDialog;
