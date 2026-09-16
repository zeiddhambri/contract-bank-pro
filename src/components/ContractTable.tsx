// ============================================================================
// Liste des contrats (R2 + R3)
// ----------------------------------------------------------------------------
// Composant **contrôlé** : recherche, filtres, tri et pagination vivent dans le
// parent (`ContractList`) parce qu'ils sont exécutés côté serveur
// (`.range()` + `count=exact` + `ilike`). Avec 10 000 lignes, seule la page
// affichée est transférée.
//
// Accessibilité : en-têtes triables avec `aria-sort`, actions explicites
// (pas de ligne cliquable sans équivalent clavier), cibles ≥ 36 px, états de
// chargement / erreur / vide distincts.
// ============================================================================
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CONTRACT_STATUS_OPTIONS,
  STATUS_GROUP_LABELS,
  getStatusBadgeClassLight,
  getStatusLabel,
  getStatusMeta,
  type ContractStatus,
  type StatusGroup,
} from "@/lib/contract-status";
import { formatCurrency, getAgenceLabel, getTypeLabel } from "@/lib/contract-helpers";
import type { Contract, ContractListFilters } from "@/hooks/useContracts";
import QueryErrorState from "./QueryErrorState";

type StatusFilter = "all" | ContractStatus;
type GroupFilter = "all" | StatusGroup;

const PAGE_SIZES = [25, 50, 100] as const;

interface ContractTableProps {
  contracts: Contract[];
  total: number;
  filters: ContractListFilters;
  onFiltersChange: (patch: Partial<ContractListFilters>) => void;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  /** Ouvre la fiche pleine page `/contrats/:id`. */
  onViewContract?: (contract: Contract) => void;
  /** Édition rapide dans le panneau latéral. */
  onQuickEditContract?: (contract: Contract) => void;
  onDownloadContract?: (contract: Contract) => void;
  isDownloadingId?: string | null;
  onDeleteContract?: (contract: Contract) => void;
  isDeletingId?: string | null;
  /** Affiché dans l'état vide sans filtre. */
  onCreateContract?: () => void;
}

type SortableColumn = ContractListFilters["sortBy"];

const SORTABLE_COLUMNS: { key: SortableColumn; label: string; className?: string }[] = [
  { key: "reference_decision", label: "Référence" },
  { key: "client", label: "Client" },
  { key: "montant", label: "Montant", className: "text-right" },
  { key: "date_decision", label: "Décision" },
];

const ContractTable = ({
  contracts,
  total,
  filters,
  onFiltersChange,
  isLoading = false,
  isError = false,
  errorMessage = null,
  onRetry,
  onViewContract,
  onQuickEditContract,
  onDownloadContract,
  isDownloadingId = null,
  onDeleteContract,
  isDeletingId = null,
  onCreateContract,
}: ContractTableProps) => {
  const pageCount = Math.max(1, Math.ceil(total / filters.pageSize));
  const firstIndex = total === 0 ? 0 : (filters.page - 1) * filters.pageSize + 1;
  const lastIndex = Math.min(total, filters.page * filters.pageSize);
  const hasFilters =
    filters.search.trim().length > 0 || filters.statut !== "all" || filters.group !== "all";

  const toggleSort = (column: SortableColumn) => {
    if (filters.sortBy === column) {
      onFiltersChange({ sortAsc: !filters.sortAsc, page: 1 });
    } else {
      onFiltersChange({ sortBy: column, sortAsc: true, page: 1 });
    }
  };

  const SortIcon = ({ column }: { column: SortableColumn }) => {
    if (filters.sortBy !== column) return null;
    return filters.sortAsc ? (
      <ArrowUp className="ml-1 inline h-3 w-3" aria-hidden="true" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3" aria-hidden="true" />
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span>Liste des contrats</span>
          <Badge variant="secondary" className="bg-slate-100 text-slate-700">
            {isLoading ? "Chargement…" : `${total} contrat${total > 1 ? "s" : ""}`}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Recherche et filtres ------------------------------------------------ */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <Input
              type="search"
              placeholder="Rechercher par client, référence, type, agence…"
              value={filters.search}
              onChange={(e) => onFiltersChange({ search: e.target.value, page: 1 })}
              className="border-slate-200 bg-slate-50 pl-10 focus:border-orange-500"
              aria-label="Rechercher un contrat"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <select
              value={filters.group}
              onChange={(e) =>
                onFiltersChange({
                  group: e.target.value as GroupFilter,
                  // Un statut précis et une phase sont exclusifs.
                  statut: "all",
                  page: 1,
                })
              }
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
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
              value={filters.statut}
              onChange={(e) =>
                onFiltersChange({
                  statut: e.target.value as StatusFilter,
                  group: "all",
                  page: 1,
                })
              }
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              aria-label="Filtrer par statut"
            >
              <option value="all">Tous les statuts</option>
              {CONTRACT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={filters.pageSize}
              onChange={(e) =>
                onFiltersChange({ pageSize: Number(e.target.value), page: 1 })
              }
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              aria-label="Nombre de lignes par page"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  onFiltersChange({ search: "", statut: "all", group: "all", page: 1 })
                }
              >
                Réinitialiser
              </Button>
            )}
          </div>
        </div>

        {/* Erreur ---------------------------------------------------------------- */}
        {isError ? (
          <QueryErrorState
            title="Contrats indisponibles"
            message={errorMessage}
            onRetry={onRetry}
            isRetrying={isLoading}
          />
        ) : (
          <>
            {/* Tableau ------------------------------------------------------------- */}
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    {SORTABLE_COLUMNS.map((column) => (
                      <TableHead
                        key={column.key}
                        className={column.className}
                        aria-sort={
                          filters.sortBy === column.key
                            ? filters.sortAsc
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                      >
                        <button
                          type="button"
                          onClick={() => toggleSort(column.key)}
                          className="font-semibold text-slate-700 hover:text-orange-600"
                        >
                          {column.label}
                          <SortIcon column={column.key} />
                        </button>
                      </TableHead>
                    ))}
                    <TableHead className="font-semibold text-slate-700">Type</TableHead>
                    <TableHead className="font-semibold text-slate-700">Statut</TableHead>
                    <TableHead className="font-semibold text-slate-700">Agence</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isLoading ? (
                    Array.from({ length: Math.min(filters.pageSize, 8) }).map((_, index) => (
                      <TableRow key={`skeleton-${index}`}>
                        {Array.from({ length: 8 }).map((__, cell) => (
                          <TableCell key={`cell-${cell}`}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : contracts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center">
                        {hasFilters ? (
                          <>
                            <p className="font-medium text-slate-700">
                              Aucun contrat ne correspond à ces critères
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {total} contrat{total > 1 ? "s" : ""} au total dans votre
                              portefeuille : élargissez la recherche.
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-4"
                              onClick={() =>
                                onFiltersChange({
                                  search: "",
                                  statut: "all",
                                  group: "all",
                                  page: 1,
                                })
                              }
                            >
                              Réinitialiser les filtres
                            </Button>
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-slate-700">
                              Aucun contrat pour le moment
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              Créez un premier contrat : la référence de décision est attribuée
                              automatiquement.
                            </p>
                            {onCreateContract && (
                              <Button size="sm" className="mt-4" onClick={onCreateContract}>
                                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                                Créer un contrat
                              </Button>
                            )}
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    contracts.map((contract) => {
                      const meta = getStatusMeta(contract.statut);

                      return (
                        <TableRow key={contract.id} className="transition-colors hover:bg-slate-50">
                          <TableCell className="font-mono text-xs text-slate-600">
                            {contract.reference_decision || "—"}
                          </TableCell>
                          <TableCell className="font-medium text-slate-900">
                            {contract.client}
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums text-slate-900">
                            {formatCurrency(contract.montant, contract.currency)}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {contract.date_decision
                              ? format(new Date(contract.date_decision), "dd/MM/yyyy", {
                                  locale: fr,
                                })
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="border-blue-200 bg-blue-50 text-blue-700"
                            >
                              {getTypeLabel(contract.type)}
                            </Badge>
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
                                aria-label={`Ouvrir la fiche du contrat ${contract.reference_decision || contract.client}`}
                                title="Ouvrir la fiche"
                              >
                                <Eye className="h-4 w-4" aria-hidden="true" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onQuickEditContract?.(contract)}
                                disabled={!onQuickEditContract}
                                className="h-9 w-9 p-0 text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                                aria-label={`Modifier rapidement le contrat ${contract.reference_decision || contract.client}`}
                                title="Édition rapide"
                              >
                                <Pencil className="h-4 w-4" aria-hidden="true" />
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

            {/* Pagination -------------------------------------------------------- */}
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-sm text-slate-600" aria-live="polite">
                {total === 0
                  ? "Aucun résultat"
                  : `${firstIndex}–${lastIndex} sur ${total}`}
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onFiltersChange({ page: filters.page - 1 })}
                  disabled={filters.page <= 1 || isLoading}
                  aria-label="Page précédente"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  Précédent
                </Button>
                <span className="text-sm text-slate-600">
                  Page {filters.page} / {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onFiltersChange({ page: filters.page + 1 })}
                  disabled={filters.page >= pageCount || isLoading}
                  aria-label="Page suivante"
                >
                  Suivant
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ContractTable;
