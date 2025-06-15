
import React from 'react';
import { Building } from 'lucide-react';

interface BankLogoProps {
  logoUrl?: string | null;
  bankName?: string | null;
}

const BankLogo: React.FC<BankLogoProps> = ({ logoUrl, bankName }) => {
  if (logoUrl) {
    return (
      <img 
        src={logoUrl} 
        alt={`${bankName || 'Bank'} logo`} 
        className="h-8 w-auto"
      />
    );
  }
  return <Building className="h-8 w-8 text-white" />;
};

export default BankLogo;
