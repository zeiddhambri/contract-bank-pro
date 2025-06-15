
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: "en_cours", label: "En cours" },
  { value: "attente_signature", label: "Attente signature" },
  { value: "valide", label: "Validé" },
  { value: "alerte", label: "Alerte" },
];

interface ContractStatusSelectProps {
  value: string;
  disabled: boolean;
  onChange: (newStatus: string) => void;
  getStatusBadgeClass: (status: string) => string;
}

const ContractStatusSelect: React.FC<ContractStatusSelectProps> = ({
  value,
  disabled,
  onChange,
  getStatusBadgeClass,
}) => (
  <Select value={value} onValueChange={onChange} disabled={disabled}>
    <SelectTrigger
      className={`min-w-[120px] border ${getStatusBadgeClass(value)} px-2 py-1 text-sm font-medium`}
    >
      <SelectValue>
        {STATUS_OPTIONS.find(opt => opt.value === value)?.label || value}
      </SelectValue>
    </SelectTrigger>
    <SelectContent className="bg-black border-slate-600 z-50">
      {STATUS_OPTIONS.map(opt => (
        <SelectItem key={opt.value} value={opt.value} className="text-white">
          {opt.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export default ContractStatusSelect;
