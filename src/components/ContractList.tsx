// ============================================================================
// Liste des contrats + fiche de détail (R2 / R3.1)
// ----------------------------------------------------------------------------
// • Une seule source de données (`contracts`, filtrée par la RLS : banque de
//   l'utilisateur et `deleted_at IS NULL`).
// • Les mises à jour passent par la base : le trigger
//   `enforce_contract_status_transition` refuse toute transition hors matrice et
//   renvoie un message en français, affiché tel quel à l'utilisateur.
// • La suppression est **logique** (`deleted_at`) : aucune perte définitive,
//   piste d'audit conservée, restauration possible par un administrateur.
// ============================================================================
import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
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
import ContractTable from "./ContractTable";
import ContractDetailDialog from "./ContractDetailDialog";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";
import { AUDIT_ACTIONS, logAction } from "@/lib/audit-log";
import { downloadContractFile } from "@/lib/storage";

type Contract = Tables<"contracts">;

const CONTRACTS_QUERY_KEY = ["contracts"] as const;

const fetchContracts = async (): Promise<Contract[]> => {
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
};

const ContractList: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: contracts, isLoading } = useQuery<Contract[]>({
    queryKey: CONTRACTS_QUERY_KEY,
    queryFn: fetchContracts,
  });

  const updateContractMutation = useMutation<
    void,
    Error,
    { contractId: string; updates: Partial<TablesUpdate<"contracts">> }
  >({
    mutationFn: async ({ contractId, updates }) => {
      const { error } = await supabase
        .from("contracts")
        .update(updates)
        .eq("id", contractId);
      if (error) throw error;
    },
    onSuccess: (_, { contractId, updates }) => {
      queryClient.invalidateQueries({ queryKey: CONTRACTS_QUERY_KEY });
      toast({
        title: "Contrat mis à jour",
        description: updates.statut
          ? "Le changement de statut est enregistré dans l'historique."
          : undefined,
      });
      void logAction(AUDIT_ACTIONS.contractUpdate, { contractId, fields: Object.keys(updates) });
    },
    onError: (error) => {
      // Messages Postgres lisibles : transition interdite, rôle insuffisant,
      // contrainte d'intégrité (montant, dates, devise)…
      toast({
        title: "Modification refusée",
        description: error.message || "Impossible de mettre à jour le contrat.",
        variant: "destructive",
      });
    },
  });

  const archiveContractMutation = useMutation<void, Error, { contract: Contract }>({
    mutationFn: async ({ contract }) => {
      const { error } = await supabase
        .from("contracts")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", contract.id);
      if (error) throw error;
    },
    onSuccess: (_, { contract }) => {
      queryClient.invalidateQueries({ queryKey: CONTRACTS_QUERY_KEY });
      setContractToDelete(null);
      toast({
        title: "Contrat archivé",
        description: `${contract.reference_decision || contract.client} n'apparaît plus dans la liste. Un administrateur peut le restaurer.`,
      });
      void logAction(AUDIT_ACTIONS.contractDelete, {
        contractId: contract.id,
        reference: contract.reference_decision,
        mode: "soft",
      });
    },
    onError: (error) => {
      setContractToDelete(null);
      toast({
        title: "Archivage refusé",
        description: error.message || "Impossible d'archiver ce contrat.",
        variant: "destructive",
      });
    },
  });

  const handleSaveChanges = async (
    contractId: string,
    updates: Partial<TablesUpdate<"contracts">>,
  ) => {
    await updateContractMutation.mutateAsync({ contractId, updates });
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
    } catch (error) {
      toast({
        title: "Téléchargement impossible",
        description: error instanceof Error ? error.message : "Erreur inconnue.",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <>
      <ContractTable
        contracts={contracts ?? []}
        isLoading={isLoading}
        onContractUpdate={() => queryClient.invalidateQueries({ queryKey: CONTRACTS_QUERY_KEY })}
        onViewContract={setSelectedContract}
        onDownloadContract={handleDownload}
        isDownloadingId={downloadingId}
        onDeleteContract={setContractToDelete}
        isDeletingId={archiveContractMutation.isPending ? contractToDelete?.id ?? null : null}
      />

      {selectedContract && (
        <ContractDetailDialog
          open={Boolean(selectedContract)}
          onOpenChange={(open) => {
            if (!open) setSelectedContract(null);
          }}
          contract={selectedContract}
          onSaveChanges={handleSaveChanges}
          isSaving={updateContractMutation.isPending}
        />
      )}

      <AlertDialog open={Boolean(contractToDelete)} onOpenChange={(open) => !open && setContractToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiver ce contrat ?</AlertDialogTitle>
            <AlertDialogDescription>
              {contractToDelete
                ? `« ${contractToDelete.reference_decision || "sans référence"} — ${contractToDelete.client} » sera retiré de la liste. Aucune donnée n'est détruite : le document, l'historique de statuts et la piste d'audit sont conservés, et un administrateur peut restaurer le contrat.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => contractToDelete && archiveContractMutation.mutate({ contract: contractToDelete })}
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
