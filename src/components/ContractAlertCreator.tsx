
import React from 'react';
import { Tables } from '@/integrations/supabase/types';

interface AlertType {
  value: string;
  label: string;
  description: (ref: string, client: string) => string;
}

interface ContractAlertCreatorProps {
  selectedAlert: string;
  setSelectedAlert: (value: string) => void;
  contract: Tables<'contracts'>;
  alertTypes: AlertType[];
}

const ContractAlertCreator: React.FC<ContractAlertCreatorProps> = ({ selectedAlert, setSelectedAlert, contract, alertTypes }) => {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">Type d’alerte</div>
      <select
        value={selectedAlert}
        onChange={(e) => setSelectedAlert(e.target.value)}
        className="w-full rounded-md border-input bg-background py-2 px-3 shadow-sm focus:border-ring focus:outline-none focus:ring-ring sm:text-sm"
      >
        {alertTypes.map((alert) => (
          <option key={alert.value} value={alert.value}>
            {alert.label} – {alert.description(contract.reference_decision, contract.client)}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ContractAlertCreator;
