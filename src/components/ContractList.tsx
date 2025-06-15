import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import ContractTable from "./ContractTable";
// Patch: add currency as an optional property for older contracts
type Contract = Tables<'contracts'> & { currency?: string };

interface ContractListProps {
  onRefresh?: number;
}

const STATUS_OPTIONS = [
  { value: "en_cours", label: "En cours" },
  { value: "attente_signature", label: "Attente signature" },
  { value: "valide", label: "Validé" },
  { value: "alerte", label: "Alerte" },
];

const ContractList = ({ onRefresh }: ContractListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("tous");
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);

  const fetchContracts = async () => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setContracts((data || []));
    } catch (error) {
      console.error("Error fetching contracts:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les contrats.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [onRefresh]);

  const formatCurrency = (amount: number) => {
    // Use EUR by default, as currency field does not exist
    const symbol = "€";
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount) + ' ' + symbol;
  };

  // Adapter: Badge color according to the status
  const getStatusBadgeClass = (status: string) => {
    const statusConfig = {
      en_cours: "bg-blue-600/20 text-blue-400 border-blue-500/30",
      attente_signature: "bg-orange-600/20 text-orange-400 border-orange-500/30",
      valide: "bg-green-600/20 text-green-400 border-green-500/30",
      alerte: "bg-red-600/20 text-red-400 border-red-500/30",
    };
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.en_cours;
  };

  const getTypeLabel = (type: string) => {
    const typeLabels = {
      credit_ct: "Crédit CT",
      credit_mt: "Crédit MT", 
      credit_lt: "Crédit LT",
      credit_immobilier: "Crédit Immobilier",
      credit_consommation: "Crédit à la Consommation",
      credit_auto: "Crédit Auto",
      decouvert_autorise: "Découvert Autorisé",
      pret_personnel: "Prêt Personnel"
    };
    return typeLabels[type as keyof typeof typeLabels] || type;
  };

  const getGarantieLabel = (garantie: string) => {
    const garantieLabels = {
      hypotheque: "Hypothèque",
      nantissement: "Nantissement",
      caution: "Caution",
      gage: "Gage",
      sans_garantie: "Sans garantie",
      aucune: "Aucune"
    };
    return garantieLabels[garantie as keyof typeof garantieLabels] || garantie;
  };

  const getAgenceLabel = (agence: string) => {
    const agenceLabels = {
      agence_centrale_cun: "Agence Centrale CUN",
      la_marsa: "La Marsa",
      aouina: "Aouina",
      berges_du_lac_2: "Les Berges du Lac 2",
      petite_ariana: "Petite Ariana",
      ben_arous: "Ben Arous",
      denden: "Denden",
      ennasr: "Ennasr",
      kheireddine_pacha: "Kheireddine Pacha",
      bizerte: "Bizerte",
      nabeul: "Nabeul",
      nabeul_mrezga: "Nabeul Mrezga",
      sousse: "Sousse",
      monastir: "Monastir",
      sfax_bostene: "Sfax Bostène",
      sfax_gremda: "Sfax Gremda",
      sfax_route_gabes: "Sfax Route de Gabès",
      gabes: "Gabès",
      medenine: "Médenine",
      djerba: "Djerba",
      ras_jdir: "Ras Jdir",
      megrine: "Mégrine"
    };
    return agenceLabels[agence as keyof typeof agenceLabels] || agence;
  };

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = contract.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.reference_decision.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "tous" || contract.statut === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const handleStatusChange = async (contractId: string, newStatus: string) => {
    setStatusLoadingId(contractId);
    try {
      const { error } = await supabase
        .from('contracts')
        .update({ statut: newStatus })
        .eq('id', contractId);

      if (error) {
        throw error;
      }

      toast({
        title: "Statut mis à jour",
        description: "Le statut du contrat a bien été modifié.",
        // Remove icon for compatibility
      });
      fetchContracts();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Échec de la mise à jour du statut.",
        variant: "destructive",
      });
      console.error(error);
    } finally {
      setStatusLoadingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-black/40 border-slate-700/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <p className="text-slate-400">Chargement des contrats...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-black/40 border-slate-700/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <CardTitle className="flex items-center space-x-2 text-white font-bold tracking-wide">
              <FileText className="h-5 w-5 text-orange-400" />
              <span>GESTION DES CONTRATS</span>
            </CardTitle>
            <p className="text-sm text-slate-400 mt-1">
              {filteredContracts.length} contrat(s) trouvé(s)
            </p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
            <Input
              placeholder="Rechercher un contrat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 bg-black/30 border-slate-600 text-white placeholder:text-slate-400"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-black/30 border-slate-600 text-white">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="tous">Tous les statuts</SelectItem>
                <SelectItem value="en_cours">En cours</SelectItem>
                <SelectItem value="attente_signature">Attente signature</SelectItem>
                <SelectItem value="valide">Validé</SelectItem>
                <SelectItem value="alerte">Alerte</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ContractTable
          contracts={filteredContracts}
          isLoading={isLoading}
          statusLoadingId={statusLoadingId}
          handleStatusChange={handleStatusChange}
          getTypeLabel={getTypeLabel}
          getGarantieLabel={getGarantieLabel}
          getStatusBadgeClass={getStatusBadgeClass}
          getAgenceLabel={getAgenceLabel}
          formatDate={formatDate}
          formatCurrency={formatCurrency}
        />
      </CardContent>
    </Card>
  );
};

export default ContractList;
