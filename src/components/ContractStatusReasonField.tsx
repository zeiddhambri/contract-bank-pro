// ============================================================================
// Motif d'un changement de statut (R2.2)
// ----------------------------------------------------------------------------
// Le motif est enregistré dans `contracts.metadata.status_change_reason` et
// recopié par le trigger `enforce_contract_status_transition` dans
// `contract_status_history.reason` : c'est la justification métier opposable
// (exigence d'audit bancaire), pas une simple alerte cosmétique.
// ============================================================================
import React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getStatusLabel } from "@/lib/contract-status";

interface ContractStatusReasonFieldProps {
  fromStatus: string;
  toStatus: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Le motif est obligatoire pour les sorties de cycle (résiliation, refus, alerte). */
  required?: boolean;
}

const ContractStatusReasonField: React.FC<ContractStatusReasonFieldProps> = ({
  fromStatus,
  toStatus,
  value,
  onChange,
  disabled = false,
  required = false,
}) => (
  <div className="space-y-1">
    <Label htmlFor="status-change-reason" className="text-xs text-muted-foreground">
      Motif du passage de « {getStatusLabel(fromStatus)} » à « {getStatusLabel(toStatus)} »
      {required ? " (obligatoire)" : ""}
    </Label>
    <Textarea
      id="status-change-reason"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Ex. : attestation d'assurance reçue le 12/03, dossier complet."
      className="mt-1"
      maxLength={500}
      aria-describedby="status-change-reason-help"
    />
    <p id="status-change-reason-help" className="text-xs text-muted-foreground">
      {value.length}/500 caractères — conservé dans l'historique du contrat et la piste d'audit.
    </p>
  </div>
);

export default ContractStatusReasonField;
