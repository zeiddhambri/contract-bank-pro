
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
import { AlertTriangle } from "lucide-react";

const ALERT_TYPES = [
  {
    value: "echeance",
    label: "Alerte échéance",
    description: (ref: string, client: string) =>
      `Échéance pour ${ref} (${client})`,
  },
  {
    value: "montants",
    label: "Alerte montants",
    description: (ref: string, client: string) =>
      `Montant inhabituel pour ${ref} (${client})`,
  },
  {
    value: "retard",
    label: "Alerte retard",
    description: (ref: string, client: string) =>
      `Retard de traitement : ${ref} (${client})`,
  },
  {
    value: "personnalisee",
    label: "Alerte personnalisée",
    description: (ref: string, client: string) =>
      `Alerte personnalisée pour ${ref} (${client})`,
  },
];

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
  const [selectedAlert, setSelectedAlert] = useState(ALERT_TYPES[0].value);

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
    });
    onOpenChange(false);
  };

  const handleCreateAlert = () => {
    const alertType = ALERT_TYPES.find((a) => a.value === selectedAlert);
    toast({
      title: alertType?.label ?? "Alerte",
      description:
        alertType?.description(contract.reference_decision, contract.client),
    });
    // Ici on pourrait appeler une fonction backend pour stocker l’alerte
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
          {/* Menu déroulant d'alertes */}
          <div>
            <div className="text-xs text-slate-400 mb-1">Type d’alerte</div>
            <select
              value={selectedAlert}
              onChange={(e) => setSelectedAlert(e.target.value)}
              className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white w-full focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {ALERT_TYPES.map((alert) => (
                <option key={alert.value} value={alert.value}>
                  {alert.label} – {alert.description(contract.reference_decision, contract.client)}
                </option>
              ))}
            </select>
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
