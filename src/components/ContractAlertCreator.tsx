
import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ContractAlertCreatorProps {
  alertMessage: string;
  setAlertMessage: (value: string) => void;
}

const ContractAlertCreator: React.FC<ContractAlertCreatorProps> = ({ alertMessage, setAlertMessage }) => {
  return (
    <div>
      <Label htmlFor="alert-message" className="text-xs text-muted-foreground">Message d'alerte personnalisé</Label>
      <Textarea
        id="alert-message"
        value={alertMessage}
        onChange={(e) => setAlertMessage(e.target.value)}
        placeholder="Saisissez le message pour votre alerte..."
        className="mt-1"
      />
    </div>
  );
};

export default ContractAlertCreator;
