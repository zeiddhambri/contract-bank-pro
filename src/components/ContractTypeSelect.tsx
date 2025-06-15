
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ContractTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
}

const CONTRACT_TYPES = [
  { value: "credit_immobilier", label: "Crédit Immobilier" },
  { value: "credit_consommation", label: "Crédit à la Consommation" },
  { value: "credit_auto", label: "Crédit Auto" },
  { value: "decouvert_autorise", label: "Découvert Autorisé" },
  { value: "pret_personnel", label: "Prêt Personnel" },
  { value: "ligne_credit", label: "Ligne de crédit" },
  { value: "augmentation_ligne_credit", label: "Augmentation d'une ligne de crédit" },
  { value: "diminution_ligne_credit", label: "Diminution d'une ligne de crédit" },
  { value: "operation_ponctuelle", label: "Opération ponctuelle" },
  { value: "financement_devises", label: "Financement en devises" },
  { value: "cmt", label: "CMT" },
  { value: "clt", label: "CLT" },
  { value: "cct", label: "CCT" }
];

export default function ContractTypeSelect({ value, onChange }: ContractTypeSelectProps) {
  return (
    <Select onValueChange={onChange} defaultValue={value} value={value}>
      <SelectTrigger>
        <SelectValue placeholder="Sélectionnez le type" />
      </SelectTrigger>
      <SelectContent>
        {CONTRACT_TYPES.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
