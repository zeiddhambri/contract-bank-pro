export const TYPE_LABELS: Record<string, string> = {
  credit_consommation: "Crédit Conso",
  credit_immo: "Crédit Immo",
  decouvert: "Découvert",
};

export const CONTRACT_TYPES = [
  { value: "credit_consommation", label: "Crédit Consommation" },
  { value: "credit_immo", label: "Crédit Immobilier" },
  { value: "decouvert", label: "Découvert" },
];

export const GARANTIE_LABELS: Record<string, string> = {
  hypotheque: "Hypothèque",
  nantissement: "Nantissement",
  caution: "Caution",
};

export const CONTRACT_STATUS_OPTIONS = [
  { value: "en_cours", label: "En cours" },
  { value: "attente_signature", label: "Attente signature" },
  { value: "valide", label: "Mis en Place" },
  { value: "alerte", label: "Alerte" },
  { value: "documents_manquants", label: "Documents manquants" },
  { value: "en_cours_de_signature_b", label: "En cours de signature B" },
  { value: "en_cours_de_signature_c", label: "En cours de signature C" },
  { value: "en_attente_inscription_hypotheque", label: "En attente d'inscription de l'hypothèque" },
  { value: "assurance_manquante", label: "Assurance manquante" },
  { value: "refus_client", label: "Refus client" },
];

export const STATUS_BADGE_CLASSES: Record<string, string> = {
  en_cours: "border-orange-400 text-orange-300 bg-orange-500/10",
  attente_signature: "border-yellow-400 text-yellow-300 bg-yellow-500/10",
  valide: "border-green-400 text-green-300 bg-green-500/10",
  alerte: "border-red-400 text-red-300 bg-red-500/10",
  documents_manquants: "border-slate-400 text-slate-300 bg-slate-500/10",
  en_cours_de_signature_b: "border-yellow-500 text-yellow-400 bg-yellow-500/10",
  en_cours_de_signature_c: "border-yellow-600 text-yellow-500 bg-yellow-500/10",
  en_attente_inscription_hypotheque: "border-purple-400 text-purple-300 bg-purple-500/10",
  assurance_manquante: "border-amber-400 text-amber-300 bg-amber-500/10",
  refus_client: "border-red-600 text-red-500 bg-red-500/10",
};

export const AGENCE_LABELS: Record<string, string> = {
  agence_centre: "Centre",
  agence_nord: "Nord",
  agence_sud: "Sud",
};

export function formatDate(dateString: string) {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleDateString("fr-FR");
}

export function formatCurrency(amount: number) {
  if (typeof amount !== "number") return "";
  return `${amount.toLocaleString("fr-FR")} MAD`;
}

export const getTypeLabel = (type: string) => TYPE_LABELS[type] || type;
export const getGarantieLabel = (garantie: string) => GARANTIE_LABELS[garantie] || garantie;
export const getStatusBadgeClass = (status: string) => STATUS_BADGE_CLASSES[status] || "border-slate-400 text-slate-300 bg-slate-500/10";
export const getAgenceLabel = (agence: string) => AGENCE_LABELS[agence] || agence;
