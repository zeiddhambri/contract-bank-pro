
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Plus } from "lucide-react";

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
      en_cours: { label: "En cours", variant: "default" as const, color: "bg-blue-100 text-blue-800" },
      attente_signature: { label: "Attente signature", variant: "secondary" as const, color: "bg-orange-100 text-orange-800" },
      valide: { label: "Validé", variant: "default" as const, color: "bg-green-100 text-green-800" },
      alerte: { label: "Alerte", variant: "destructive" as const, color: "bg-red-100 text-red-800" }
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
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Gestion des Contrats</span>
            </CardTitle>
            <p className="text-sm text-slate-600 mt-1">
              {filteredContracts.length} contrat(s) trouvé(s)
            </p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
            <Input
              placeholder="Rechercher un contrat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
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
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Agence</TableHead>
                <TableHead>Date décision</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContracts.map((contract) => (
                <TableRow key={contract.id} className="hover:bg-slate-50">
                  <TableCell className="font-medium">{contract.id}</TableCell>
                  <TableCell>{contract.client}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{contract.type}</Badge>
                  </TableCell>
                  <TableCell className="font-semibold">{contract.montant}</TableCell>
                  <TableCell>{getStatusBadge(contract.statut)}</TableCell>
                  <TableCell>{contract.agence}</TableCell>
                  <TableCell>{contract.dateDecision}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
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
