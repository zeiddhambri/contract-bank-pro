// ============================================================================
// Liste des contrats (R2 : vocabulaire de statuts unique, montants dans leur
// devise, référence de décision visible, actions accessibles)
// ============================================================================
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Eye, Filter, Search, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";
import {
  CONTRACT_STATUS_OPTIONS,
  STATUS_GROUP_LABELS,
  getStatusBadgeClassLight,
  getStatusLabel,
  getStatusMeta,
  normalizeStatus,
  type ContractStatus,
  type StatusGroup,
} from "@/lib/contract-status";
import {
  formatCurrency,
  getAgenceLabel,
  getTypeLabel,
} from "@/lib/contract-helpers";

type Contract = Tables<"contracts">;

type StatusFilter = "all" | ContractStatus;
type GroupFilter = "all" | StatusGroup;

interface ContractTableProps {
  contracts: Contract[];
  /** Conservé pour compatibilité : invalidation du cache après une action. */
  onContractUpdate?: () => void;
  isLoading?: boolean;
  /** Ouvre la fiche contrat (consultation / modification). */
  onViewContract?: (contract: Contract) => void;
  /** Télécharge le document contractuel via une URL signée. */
  onDownloadContract?: (contract: Contract) => void;
  isDownloadingId?: string | null;
  /** Archive le contrat (suppression logique : `deleted_at`). */
  onDeleteContract?: (contract: Contract) => void;
  isDeletingId?: string | null;
}

const ContractTable = ({
  contracts,
  isLoading = false,
  onViewContract,
  onDownloadContract,
  isDownloadingId = null,
  onDeleteContract,
  isDeletingId = null,
}: ContractTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("all");

  const filteredContracts = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();

    return contracts.filter((contract) => {
      const status = normalizeStatus(contract.statut);
      const meta = getStatusMeta(status);

      const matchesSearch =
        needle.length === 0 ||
        contract.client.toLowerCase().includes(needle) ||
        getTypeLabel(contract.type).toLowerCase().includes(needle) ||
        contract.type.toLowerCase().includes(needle) ||
        contract.reference_decision.toLowerCase().includes(needle) ||
        getAgenceLabel(contract.agence).toLowerCase().includes(needle);

      const matchesStatus = statusFilter === "all" || status === statusFilter;
      const matchesGroup = groupFilter === "all" || meta.group === groupFilter;

      return matchesSearch && matchesStatus && matchesGroup;
    });
  }, [contracts, searchTerm, statusFilter, groupFilter]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3" aria-busy="true" aria-live="polite">
            <p className="text-sm text-slate-500">Chargement des contrats…</p>
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="h-10 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Liste des contrats</span>
          <Badge variant="secondary" className="bg-slate-100 text-slate-700">
            {filteredContracts.length} contrat{filteredContracts.length > 1 ? "s" : ""}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Recherche et filtres ------------------------------------------------ */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              placeholder="Rechercher par client, type, référence ou agence…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-slate-200 bg-slate-50 pl-10 focus:border-orange-500"
              aria-label="Rechercher un contrat"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value as GroupFilter)}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              aria-label="Filtrer par phase du cycle de vie"
            >
              <option value="all">Toutes les phases</option>
              {(Object.keys(STATUS_GROUP_LABELS) as StatusGroup[]).map((group) => (
                <option key={group} value={group}>
                  {STATUS_GROUP_LABELS[group]}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              aria-label="Filtrer par statut"
            >
              <option value="all">Tous les statuts</option>
              {CONTRACT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tableau ------------------------------------------------------------ */}
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold text-slate-700">Référence</TableHead>
                <TableHead className="font-semibold text-slate-700">Client</TableHead>
                <TableHead className="font-semibold text-slate-700">Type</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Montant</TableHead>
                <TableHead className="font-semibold text-slate-700">Statut</TableHead>
                <TableHead className="font-semibold text-slate-700">Décision</TableHead>
                <TableHead className="font-semibold text-slate-700">Agence</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center">
                    <p className="font-medium text-slate-700">
                      {searchTerm || statusFilter !== "all" || groupFilter !== "all"
                        ? "Aucun contrat ne correspond à ces critères"
                        : "Aucun contrat pour le moment"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {searchTerm || statusFilter !== "all" || groupFilter !== "all"
                        ? "Élargissez la recherche ou réinitialisez les filtres."
                        : "Créez un premier contrat pour alimenter le portefeuille."}
                    </p>
                    {(searchTerm || statusFilter !== "all" || groupFilter !== "all") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-3"
                        onClick={() => {
                          setSearchTerm("");
                          setStatusFilter("all");
                          setGroupFilter("all");
                        }}
                      >
                        Réinitialiser les filtres
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredContracts.map((contract) => {
                  const meta = getStatusMeta(contract.statut);

                  return (
                    <TableRow key={contract.id} className="transition-colors hover:bg-slate-50">
                      <TableCell className="font-mono text-xs text-slate-600">
                        {contract.reference_decision || "—"}
                      </TableCell>
                      <TableCell className="font-medium text-slate-900">
                        {contract.client}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="border-blue-200 bg-blue-50 text-blue-700"
                        >
                          {getTypeLabel(contract.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(contract.montant, contract.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getStatusBadgeClassLight(meta.value)}
                          title={meta.hint}
                        >
                          <span
                            className={`mr-1.5 inline-block h-2 w-2 rounded-full ${meta.dot}`}
                            aria-hidden="true"
                          />
                          {getStatusLabel(meta.value)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {contract.date_decision
                          ? format(new Date(contract.date_decision), "dd/MM/yyyy", { locale: fr })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {getAgenceLabel(contract.agence)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewContract?.(contract)}
                            disabled={!onViewContract}
                            className="h-9 w-9 p-0 text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                            aria-label={`Consulter le contrat ${contract.reference_decision || contract.client}`}
                            title="Consulter / modifier"
                          >
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          {contract.file_path && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDownloadContract?.(contract)}
                              disabled={!onDownloadContract || isDownloadingId === contract.id}
                              className="h-9 w-9 p-0 text-slate-600 hover:bg-green-50 hover:text-green-600"
                              aria-label={`Télécharger le document du contrat ${contract.reference_decision || contract.client}`}
                              title="Télécharger le document"
                            >
                              <Download className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          )}
                          {onDeleteContract && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDeleteContract(contract)}
                              disabled={isDeletingId === contract.id}
                              className="h-9 w-9 p-0 text-slate-600 hover:bg-red-50 hover:text-red-600"
                              aria-label={`Archiver le contrat ${contract.reference_decision || contract.client}`}
                              title="Archiver (suppression logique)"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContractTable;
