// ============================================================================
// Écritures sur un contrat (R3.1)
// ----------------------------------------------------------------------------
// Partagées par la liste (édition rapide, archivage) et la fiche pleine page
// (onglets Aperçu, Documents, Commentaires) pour que les deux surfaces aient
// exactement le même comportement : même invalidation de cache, mêmes messages,
// même journalisation.
//
// Règle d'intégrité documentaire : remplacer un document **archive** l'ancien
// dans `contract_versions` (le fichier reste en stockage privé, téléchargeable
// en URL signée) — un contrat bancaire ne perd jamais une version signée.
// ============================================================================
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { AUDIT_ACTIONS, logAction } from "@/lib/audit-log";
import { replaceContractFile, uploadContractFile } from "@/lib/storage";
import { getStatusLabel } from "@/lib/contract-status";
import {
  commentsKey,
  contractKey,
  historyKey,
  remindersKey,
  versionsKey,
  type Contract,
} from "@/hooks/useContractDetail";

const CONTRACTS_PREFIX = ["contracts"] as const;

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>, contractId?: string) {
  queryClient.invalidateQueries({ queryKey: CONTRACTS_PREFIX });
  if (contractId) {
    queryClient.invalidateQueries({ queryKey: contractKey(contractId) });
    queryClient.invalidateQueries({ queryKey: historyKey(contractId) });
    queryClient.invalidateQueries({ queryKey: versionsKey(contractId) });
    // Le trigger de R2 régénère les rappels quand les dates ou le statut
    // changent : l'onglet « Rappels » doit refléter l'écriture.
    queryClient.invalidateQueries({ queryKey: remindersKey(contractId) });
  }
}

/** Mise à jour des champs d'un contrat (statut compris). */
export function useUpdateContract() {
  const queryClient = useQueryClient();

  return useMutation<
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

    onSuccess: (_data, { contractId, updates }) => {
      invalidateAll(queryClient, contractId);

      toast({
        title: "Contrat mis à jour",
        description: updates.statut
          ? `Nouveau statut : ${getStatusLabel(updates.statut)}. Le changement est tracé dans la timeline.`
          : undefined,
      });

      void logAction(AUDIT_ACTIONS.contractUpdate, {
        contractId,
        fields: Object.keys(updates),
      });
    },

    onError: (error) => {
      // Messages Postgres restitués tels quels : transition interdite, rôle
      // insuffisant, montant nul, dates incohérentes, référence immuable…
      toast({
        title: "Modification refusée",
        description: error.message || "Impossible de mettre à jour le contrat.",
        variant: "destructive",
      });
    },
  });
}

/** Archivage logique (`deleted_at`) : réversible par un administrateur. */
export function useArchiveContract() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { contract: Contract }>({
    mutationFn: async ({ contract }) => {
      const { error } = await supabase
        .from("contracts")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", contract.id);

      if (error) throw error;
    },

    onSuccess: (_data, { contract }) => {
      invalidateAll(queryClient, contract.id);

      toast({
        title: "Contrat archivé",
        description: `${contract.reference_decision || contract.client} est retiré des listes. Un administrateur peut le restaurer.`,
      });

      void logAction(AUDIT_ACTIONS.contractDelete, {
        contractId: contract.id,
        reference: contract.reference_decision,
        mode: "soft",
      });
    },

    onError: (error) => {
      toast({
        title: "Archivage refusé",
        description: error.message || "Impossible d'archiver ce contrat.",
        variant: "destructive",
      });
    },
  });
}

export interface ReplaceDocumentParams {
  contract: Contract;
  file: File;
  /** Motif d'archivage de la version précédente (visible dans la timeline). */
  description?: string;
}

/**
 * Remplace le document contractuel :
 * 1. archive l'ancien chemin dans `contract_versions` (fichier conservé),
 * 2. téléverse le nouveau dans `{bank_id}/{contract_id}/…`,
 * 3. met à jour `contracts.file_path`,
 * 4. journalise l'opération.
 */
export function useReplaceDocument() {
  const queryClient = useQueryClient();

  return useMutation<string, Error, ReplaceDocumentParams>({
    mutationFn: async ({ contract, file, description }) => {
      if (!contract.bank_id) {
        throw new Error("Ce contrat n'est rattaché à aucune banque : téléversement impossible.");
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      // 1. Version précédente archivée (numéro attribué par trigger SQL).
      if (contract.file_path) {
        const { error: versionError } = await supabase.from("contract_versions").insert({
          contract_id: contract.id,
          file_path: contract.file_path,
          uploaded_by: user?.id ?? null,
          changes_description: description?.trim() || "Document remplacé",
        });

        if (versionError) throw new Error(versionError.message);
      }

      // 2 + 3. Nouveau fichier, ancien objet conservé dans le bucket.
      const path = await replaceContractFile({
        bankId: contract.bank_id,
        contractId: contract.id,
        file,
        previousPath: contract.file_path,
        keepPrevious: true,
      });

      const { error } = await supabase
        .from("contracts")
        .update({ file_path: path })
        .eq("id", contract.id);

      if (error) throw error;

      return path;
    },

    onSuccess: (_path, { contract, file }) => {
      invalidateAll(queryClient, contract.id);

      toast({
        title: "Document remplacé",
        description: "La version précédente reste téléchargeable dans l'onglet Documents.",
      });

      void logAction(AUDIT_ACTIONS.documentReplace, {
        contractId: contract.id,
        reference: contract.reference_decision,
        fileName: file.name,
      });
    },

    onError: (error) => {
      toast({
        title: "Remplacement impossible",
        description: error.message || "Le document n'a pas pu être remplacé.",
        variant: "destructive",
      });
    },
  });
}

/** Premier dépôt de document (aucune version antérieure). */
export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation<string, Error, { contract: Contract; file: File }>({
    mutationFn: async ({ contract, file }) => {
      if (!contract.bank_id) {
        throw new Error("Ce contrat n'est rattaché à aucune banque : téléversement impossible.");
      }

      const path = await uploadContractFile({
        bankId: contract.bank_id,
        contractId: contract.id,
        file,
      });

      const { error } = await supabase
        .from("contracts")
        .update({ file_path: path })
        .eq("id", contract.id);

      if (error) throw error;
      return path;
    },

    onSuccess: (_path, { contract, file }) => {
      invalidateAll(queryClient, contract.id);

      toast({ title: "Document ajouté", description: file.name });

      void logAction(AUDIT_ACTIONS.documentUpload, {
        contractId: contract.id,
        reference: contract.reference_decision,
        fileName: file.name,
      });
    },

    onError: (error) => {
      toast({
        title: "Téléversement refusé",
        description: error.message || "Le document n'a pas pu être enregistré.",
        variant: "destructive",
      });
    },
  });
}

/** Commentaires : ajout, modification et retrait (auteur ou admin de banque). */
export function useCommentMutations(contractId: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: commentsKey(contractId) });
    queryClient.invalidateQueries({ queryKey: contractKey(contractId) });
  };

  const add = useMutation<void, Error, string>({
    mutationFn: async (comment) => {
      const { error } = await supabase.from("contract_comments").insert({
        contract_id: contractId,
        comment: comment.trim(),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Commentaire publié", description: "Visible par votre banque." });
    },
    onError: (error) => {
      toast({
        title: "Publication refusée",
        description: error.message || "Le commentaire n'a pas pu être enregistré.",
        variant: "destructive",
      });
    },
  });

  const update = useMutation<void, Error, { commentId: string; comment: string }>({
    mutationFn: async ({ commentId, comment }) => {
      const { error } = await supabase
        .from("contract_comments")
        .update({ comment: comment.trim() })
        .eq("id", commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Commentaire modifié" });
    },
    onError: (error) => {
      toast({
        title: "Modification refusée",
        description: error.message || "Seul l'auteur peut modifier son commentaire.",
        variant: "destructive",
      });
    },
  });

  const remove = useMutation<void, Error, string>({
    mutationFn: async (commentId) => {
      const { error } = await supabase.from("contract_comments").delete().eq("id", commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Commentaire supprimé" });
    },
    onError: (error) => {
      toast({
        title: "Suppression refusée",
        description: error.message || "Seul l'auteur ou un administrateur peut supprimer.",
        variant: "destructive",
      });
    },
  });

  return {
    addComment: add.mutate,
    isAdding: add.isPending,
    updateComment: update.mutate,
    isUpdating: update.isPending,
    deleteComment: remove.mutate,
    isDeleting: remove.isPending,
  };
}
