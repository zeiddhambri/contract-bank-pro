// ============================================================================
// Liste des contrats (R3.1 / R3.6 / R3.7)
// ----------------------------------------------------------------------------
// • Recherche, filtres, tri et **pagination serveur** (`.range()` + `count=exact`)
//   via `useContracts` : 10 000 lignes ne sont plus téléchargées d'un coup.
// • Clic sur « Ouvrir la fiche » → `/contrats/:id` (page complète à onglets).
// • Le crayon ouvre l'édition rapide en panneau (dialog), les deux surfaces
//   partagent les mêmes mutations et le même cache.
// • Erreur réseau/RLS → état d'erreur avec « Réessayer », jamais un faux vide.
// • Archivage logique (`deleted_at`) avec confirmation explicite.
// ============================================================================
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import ContractTable from "./ContractTable";
import ContractDetailDialog from "./ContractDetailDialog";
import CreateContractDialog from "./CreateContractDialog";
import {
  DEFAULT_CONTRACT_FILTERS,
  useContracts,
  useDebouncedValue,
  type Contract,
  type ContractListFilters,
} from "@/hooks/useContracts";
import {
  useArchiveContract,
  useUpdateContract,
} from "@/hooks/useContractMutations";
import { AUDIT_ACTIONS, logAction } from "@/lib/audit-log";
import { downloadContractFile } from "@/lib/storage";

interface ContractListProps {
  /**
   * Recherche pilotée depuis l'en-tête du tableau de bord. Si `search` est
   * fourni, la liste devient contrôlée : la barre globale et le champ de la
   * liste partagent le même état (une seule source de vérité).
   */
  search?: string;
  onSearchChange?: (value: string) => void;
}

const ContractList: React.FC<ContractListProps> = ({ search: controlledSearch, onSearchChange }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [internalFilters, setInternalFilters] = useState<ContractListFilters>(DEFAULT_CONTRACT_FILTERS);
  const isSearchControlled = controlledSearch !== undefined;
  const filters: ContractListFilters = isSearchControlled
    ? { ...internalFilters, search: controlledSearch }
    : internalFilters;
  const [quickEditContract, setQuickEditContract] = useState<Contract | null>(null);
  const [contractToArchive, setContractToArchive] = useState<Contract | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // La saisie est retardée : une requête par pause de frappe, pas par caractère.
  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const effectiveFilters: ContractListFilters = { ...filters, search: debouncedSearch };

  const { data, isLoading, isError, error, refetch, isFetching } = useContracts(effectiveFilters);

  const updateContract = useUpdateContract();
  const archiveContract = useArchiveContract();

  const patchFilters = (patch: Partial<ContractListFilters>) => {
    if (isSearchControlled && "search" in patch) {
      // Le terme remonte au tableau de bord ; les autres filtres restent locaux.
      onSearchChange?.(patch.search ?? "");
      const { search: _ignored, ...rest } = patch;
      if (Object.keys(rest).length > 0) {
        setInternalFilters((current) => ({ ...current, ...rest }));
      }
      return;
    }

    setInternalFilters((current) => ({ ...current, ...patch }));
  };

  const handleSaveChanges = async (
    contractId: string,
    updates: Parameters<typeof updateContract.mutateAsync>[0]["updates"],
  ) => {
    await updateContract.mutateAsync({ contractId, updates });
  };

  const handleDownload = async (contract: Contract) => {
    if (!contract.file_path) {
      toast({
        title: "Aucun document",
        description: "Ce contrat n'a pas de fichier associé.",
        variant: "destructive",
      });
      return;
    }

    setDownloadingId(contract.id);
    try {
      await downloadContractFile(contract.file_path, contract.reference_decision || undefined);
      await logAction(AUDIT_ACTIONS.documentDownload, {
        contractId: contract.id,
        reference: contract.reference_decision,
      });
    } catch (downloadError) {
      toast({
        title: "Téléchargement impossible",
        description:
          downloadError instanceof Error ? downloadError.message : "Erreur inconnue.",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <>
      <ContractTable
        contracts={data?.rows ?? []}
        total={data?.total ?? 0}
        filters={filters}
        onFiltersChange={patchFilters}
        isLoading={isLoading || (isFetching && (data?.rows.length ?? 0) === 0)}
        isError={isError}
        errorMessage={error instanceof Error ? error.message : null}
        onRetry={() => void refetch()}
        onViewContract={(contract) => navigate(`/contrats/${contract.id}`)}
        onQuickEditContract={setQuickEditContract}
        onDownloadContract={handleDownload}
        isDownloadingId={downloadingId}
        onDeleteContract={setContractToArchive}
        isDeletingId={archiveContract.isPending ? contractToArchive?.id ?? null : null}
        onCreateContract={() => setIsCreateOpen(true)}
      />

      {quickEditContract && (
        <ContractDetailDialog
          open={Boolean(quickEditContract)}
          onOpenChange={(open) => {
            if (!open) setQuickEditContract(null);
          }}
          contract={quickEditContract}
          onSaveChanges={handleSaveChanges}
          isSaving={updateContract.isPending}
        />
      )}

      <CreateContractDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onContractCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["contracts"] });
          void refetch();
        }}
      />

      <AlertDialog
        open={Boolean(contractToArchive)}
        onOpenChange={(open) => !open && setContractToArchive(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiver ce contrat ?</AlertDialogTitle>
            <AlertDialogDescription>
              {contractToArchive
                ? `« ${contractToArchive.reference_decision || "sans référence"} — ${contractToArchive.client} » sera retiré des listes. Aucune donnée n'est détruite : le document, ses versions, l'historique de statuts, les commentaires et la piste d'audit sont conservés, et un administrateur peut restaurer le contrat.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                contractToArchive && archiveContract.mutate({ contract: contractToArchive })
              }
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Archiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ContractList;
