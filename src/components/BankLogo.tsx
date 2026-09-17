// ============================================================================
// Logo de la banque (R11.2 — white-label)
// ----------------------------------------------------------------------------
// Affiche le logo téléversé par la banque (colonne `banks.logo_url`, gérée par
// l'écran « Marque & thème ») et, à défaut, un pictogramme neutre. Utilisé dans
// l'en-tête du tableau de bord : chaque tenant voit sa propre marque.
// ============================================================================
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
        className="h-8 w-auto object-contain"
      />
    );
  }
  return (
    <Building
      className="h-8 w-8 text-slate-400"
      aria-label={bankName ? `Logo par défaut — ${bankName}` : "Logo par défaut"}
      role="img"
    />
  );
};

export default BankLogo;
