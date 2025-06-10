
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText } from "lucide-react";

const ContractList = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("tous");

  // Sample contract data
  const contracts = [
    {
      id: "CT-2024-001",
      client: "SARL Tech Innovation",
      type: "Crédit MT",
      montant: "500,000 €",
      statut: "en_cours",
      agence: "Tunis Centre",
      dateDecision: "2024-05-15",
      dateSignature: "2024-05-20"
    },
    {
      id: "CT-2024-002",
      client: "Société Moderne SARL",
      type: "Crédit LT",
      montant: "1,200,000 €",
      statut: "attente_signature",
      agence: "Sfax",
      dateDecision: "2024-05-18",
      dateSignature: "-"
    },
    {
      id: "CT-2024-003",
      client: "Export Plus SA",
      type: "Crédit CT",
      montant: "250,000 €",
      statut: "valide",
      agence: "Sousse",
      dateDecision: "2024-05-10",
      dateSignature: "2024-05-12"
    },
    {
      id: "CT-2024-004",
      client: "Industrial Corp",
      type: "Crédit MT",
      montant: "800,000 €",
      statut: "alerte",
      agence: "Tunis Centre",
      dateDecision: "2024-05-22",
      dateSignature: "-"
    }
  ];

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

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = contract.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contract.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "tous" || contract.statut === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
                <TableHead className="text-slate-300 font-medium">Référence</TableHead>
                <TableHead className="text-slate-300 font-medium">Client</TableHead>
                <TableHead className="text-slate-300 font-medium">Type</TableHead>
                <TableHead className="text-slate-300 font-medium">Montant</TableHead>
                <TableHead className="text-slate-300 font-medium">Statut</TableHead>
                <TableHead className="text-slate-300 font-medium">Agence</TableHead>
                <TableHead className="text-slate-300 font-medium">Date décision</TableHead>
                <TableHead className="text-slate-300 font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContracts.map((contract) => (
                <TableRow key={contract.id} className="border-slate-700 hover:bg-slate-800/30 transition-colors">
                  <TableCell className="font-medium text-white">{contract.id}</TableCell>
                  <TableCell className="text-slate-300">{contract.client}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-slate-600 text-slate-300">
                      {contract.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-orange-400">{contract.montant}</TableCell>
                  <TableCell>{getStatusBadge(contract.statut)}</TableCell>
                  <TableCell className="text-slate-300">{contract.agence}</TableCell>
                  <TableCell className="text-slate-300">{contract.dateDecision}</TableCell>
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
