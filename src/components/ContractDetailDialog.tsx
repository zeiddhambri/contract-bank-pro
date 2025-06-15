
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
import { Tables, TablesUpdate } from "@/integrations/supabase/types";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { AGENCE_LABELS } from "@/lib/contract-helpers";

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
  const [editedContract, setEditedContract] = useState(contract);
  const [selectedAlert, setSelectedAlert] = useState(ALERT_TYPES[0].value);

  React.useEffect(() => {
    if (open) {
      setEditedContract(contract);
    }
  }, [contract, open]);

  const handleFieldChange = (field: keyof TablesUpdate<'contracts'>, value: any) => {
    setEditedContract(prev => ({ ...prev, [field]: value as any }));
  };
  
  const getChangedFields = () => {
    const changes: Partial<TablesUpdate<'contracts'>> = {};
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
  const hasChanges = Object.keys(changedFields).length > 0;

  const handleSave = async () => {
    if (!hasChanges) return;
    await onSaveChanges(contract.id, changedFields);
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Détails du contrat
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <div className="text-xs text-muted-foreground">Référence</div>
            <div className="font-bold">{contract.reference_decision}</div>
          </div>
          <div>
            <Label htmlFor="client" className="text-xs text-muted-foreground">Client</Label>
            <Input id="client" value={editedContract.client} onChange={(e) => handleFieldChange('client', e.target.value)} />
          </div>
           <div>
            <Label htmlFor="montant" className="text-xs text-muted-foreground">Montant</Label>
            <Input id="montant" type="number" value={editedContract.montant} onChange={(e) => handleFieldChange('montant', Number(e.target.value))} />
          </div>
          <div>
            <Label htmlFor="date_decision" className="text-xs text-muted-foreground">Date décision</Label>
            <Input id="date_decision" type="date" value={editedContract.date_decision?.split('T')[0] || ''} onChange={(e) => handleFieldChange('date_decision', e.target.value)} />
          </div>
          <div>
             <Label htmlFor="agence" className="text-xs text-muted-foreground">Agence</Label>
             <select id="agence" value={editedContract.agence} onChange={(e) => handleFieldChange('agence', e.target.value)} className="mt-1 block w-full rounded-md border-input bg-background py-2 px-3 shadow-sm focus:border-ring focus:outline-none focus:ring-ring sm:text-sm">
               {Object.entries(AGENCE_LABELS).map(([value, label]) => (
                 <option key={value} value={value}>{label}</option>
               ))}
             </select>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Statut</div>
            <ContractStatusSelect
              value={editedContract.statut}
              disabled={isSaving}
              onChange={(v) => handleFieldChange('statut', v)}
            />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Type d’alerte</div>
            <select
              value={selectedAlert}
              onChange={(e) => setSelectedAlert(e.target.value)}
              className="w-full rounded-md border-input bg-background py-2 px-3 shadow-sm focus:border-ring focus:outline-none focus:ring-ring sm:text-sm"
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
            variant="destructive"
            onClick={handleCreateAlert}
            className="flex items-center gap-1"
            type="button"
          >
            <AlertTriangle size={16} className="mr-1" />
            Créer une alerte
          </Button>
          <div className="flex-1" />
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
          >
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContractDetailDialog;
