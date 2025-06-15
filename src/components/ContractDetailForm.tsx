
import React from 'react';
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import ContractStatusSelect from "./ContractStatusSelect";
import { AGENCE_LABELS } from "@/lib/contract-helpers";
import { Tables, TablesUpdate } from "@/integrations/supabase/types";

interface ContractDetailFormProps {
  editedContract: Tables<'contracts'>;
  handleFieldChange: (field: keyof TablesUpdate<'contracts'>, value: any) => void;
  isSaving: boolean;
}

const ContractDetailForm: React.FC<ContractDetailFormProps> = ({ editedContract, handleFieldChange, isSaving }) => {
  return (
    <>
      <div>
        <Label htmlFor="reference_decision" className="text-xs text-muted-foreground">Référence</Label>
        <Input id="reference_decision" value={editedContract.reference_decision || ''} onChange={(e) => handleFieldChange('reference_decision', e.target.value)} />
      </div>
      <div>
        <Label htmlFor="client" className="text-xs text-muted-foreground">Client</Label>
        <Input id="client" value={editedContract.client || ''} onChange={(e) => handleFieldChange('client', e.target.value)} />
      </div>
       <div>
        <Label htmlFor="montant" className="text-xs text-muted-foreground">Montant</Label>
        <Input id="montant" type="number" value={editedContract.montant || 0} onChange={(e) => handleFieldChange('montant', Number(e.target.value))} />
      </div>
      <div>
        <Label htmlFor="date_decision" className="text-xs text-muted-foreground">Date décision</Label>
        <Input id="date_decision" type="date" value={editedContract.date_decision?.split('T')[0] || ''} onChange={(e) => handleFieldChange('date_decision', e.target.value)} />
      </div>
      <div>
         <Label htmlFor="agence" className="text-xs text-muted-foreground">Agence</Label>
         <select id="agence" value={editedContract.agence || ''} onChange={(e) => handleFieldChange('agence', e.target.value)} className="mt-1 block w-full rounded-md border-input bg-background py-2 px-3 shadow-sm focus:border-ring focus:outline-none focus:ring-ring sm:text-sm">
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
    </>
  );
};

export default ContractDetailForm;
