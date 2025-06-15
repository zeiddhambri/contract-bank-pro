
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CONTRACT_STATUS_OPTIONS, getStatusBadgeClass } from "@/lib/contract-helpers";

interface ContractStatusSelectProps {
  value: string;
  disabled: boolean;
  onChange: (newStatus: string) => void;
}

const ContractStatusSelect: React.FC<ContractStatusSelectProps> = ({
  value,
  disabled,
  onChange,
}) => (
  <Select value={value} onValueChange={onChange} disabled={disabled}>
    <SelectTrigger
      className={`w-full min-w-[150px] border ${getStatusBadgeClass(value)} px-2 py-1 text-sm font-medium`}
    >
      <SelectValue>
        {CONTRACT_STATUS_OPTIONS.find(opt => opt.value === value)?.label || value}
      </SelectValue>
    </SelectTrigger>
    <SelectContent className="bg-slate-800 border-slate-600 z-50">
      {CONTRACT_STATUS_OPTIONS.map(opt => (
        <SelectItem key={opt.value} value={opt.value} className="text-white focus:bg-slate-700">
          {opt.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export default ContractStatusSelect;
