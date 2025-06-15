import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

// Patch: add currency as an optional property for older contracts
type Contract = Tables<'contracts'> & { currency?: string };

interface ContractListProps {
  onRefresh?: number;
}

const ContractList = ({ onRefresh }: ContractListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("tous");
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchContracts = async () => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Patch: just use returned data—no currency prop to add
      setContracts((data || []));
    } catch (error) {
      console.error("Error fetching contracts:", error);
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      en_cours: { label: "En cours", color: "bg-blue-600/20 text-blue-400 border-blue-500/30" },
      attente_signature: { label: "Attente signature", color: "bg-orange-600/20 text-orange-400 border-orange-500/30" },
      valide: { label: "Validé", color: "bg-green-600/20 text-green-400 border-green-500/30" },
      alerte: { label: "Alerte", color: "bg-red-600/20 text-red-400 border-red-500/30" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.en_cours;
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-slate-800/50">
                <TableHead className="text-slate-300 font-medium">Référence Décision</TableHead>
                <TableHead className="text-slate-300 font-medium">Client</TableHead>
                <TableHead className="text-slate-300 font-medium">Type</TableHead>
                <TableHead className="text-slate-300 font-medium">Montant</TableHead>
                <TableHead className="text-slate-300 font-medium">Garantie</TableHead>
                <TableHead className="text-slate-300 font-medium">Statut</TableHead>
                <TableHead className="text-slate-300 font-medium">Agence</TableHead>
                <TableHead className="text-slate-300 font-medium">Date décision</TableHead>
                <TableHead className="text-slate-300 font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContracts.map((contract) => (
                <TableRow key={contract.id} className="border-slate-700 hover:bg-slate-800/30 transition-colors">
                  <TableCell className="font-medium text-white">{contract.reference_decision}</TableCell>
                  <TableCell className="text-slate-300">{contract.client}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-slate-600 text-slate-300">
                      {getTypeLabel(contract.type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-orange-400">
                    {formatCurrency(contract.montant)}
                  </TableCell>
                  <TableCell className="text-slate-300">{getGarantieLabel(contract.garantie)}</TableCell>
                  <TableCell>{getStatusBadge(contract.statut)}</TableCell>
                  <TableCell className="text-slate-300">{getAgenceLabel(contract.agence)}</TableCell>
                  <TableCell className="text-slate-300">{formatDate(contract.date_decision)}</TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-orange-500/30 text-orange-400 hover:bg-orange-500/20 hover:text-orange-300"
                    >
                      Voir détails
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContractList;
