import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CONTRACT_STATUS_OPTIONS,
  getStatusBadgeClass,
  getStatusHint,
  getStatusLabel,
  normalizeStatus,
  type ContractStatus,
} from "@/lib/contract-status";

interface ContractStatusSelectProps {
  value: string;
  disabled?: boolean;
  onChange: (newStatus: ContractStatus) => void;
  /**
   * Statuts proposés, i.e. les transitions autorisées pour le rôle courant
   * (`allowedTransitions()`). La valeur actuelle est toujours affichée.
   * Si absent, toutes les options sont proposées (création d'un contrat).
   */
  allowed?: ContractStatus[];
  /** Affiche l'explication de l'état sélectionné sous le champ. */
  showHint?: boolean;
  id?: string;
}

const ContractStatusSelect: React.FC<ContractStatusSelectProps> = ({
  value,
  disabled = false,
  onChange,
  allowed,
  showHint = false,
  id,
}) => {
  const current = normalizeStatus(value);

  const options = allowed
    ? [
        current,
        ...allowed.filter((status) => status !== current),
      ].map((status) => ({
        value: status,
        label: getStatusLabel(status),
      }))
    : CONTRACT_STATUS_OPTIONS;

  return (
    <div className="space-y-1">
      <Select
        value={current}
        onValueChange={(next) => onChange(next as ContractStatus)}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          className={`w-full min-w-[150px] border ${getStatusBadgeClass(current)} px-2 py-1 text-sm font-medium`}
          aria-label="Statut du contrat"
        >
          <SelectValue>{getStatusLabel(current)}</SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-600 z-50">
          {options.map((opt) => (
            <SelectItem
              key={opt.value}
              value={opt.value}
              className="text-white focus:bg-slate-700"
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showHint && (
        <p className="text-xs text-muted-foreground">{getStatusHint(current)}</p>
      )}

      {allowed && allowed.length === 0 && (
        <p className="text-xs text-amber-300">
          Aucune transition n'est autorisée pour votre rôle à partir de cet état.
        </p>
      )}
    </div>
  );
};

export default ContractStatusSelect;
