// ============================================================================
// Données de la fiche contrat (R3.1)
// ----------------------------------------------------------------------------
// Une requête par collection (contrat, historique de statuts, versions de
// documents, commentaires, rappels) : chacune a son propre état de chargement et
// son propre rafraîchissement, et la fiche reste utilisable si l'une échoue.
// La timeline est une fusion côté client de ces collections — la base reste la
// seule source (aucune donnée reconstituée).
// ============================================================================
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { getStatusLabel, normalizeStatus, type ContractStatus } from "@/lib/contract-status";

export type Contract = Tables<"contracts">;
export type ContractComment = Tables<"contract_comments">;

/** Commentaire + auteur (jointure `profiles` : nom affiché dans la fiche). */
export type ContractCommentWithAuthor = ContractComment & {
  profiles: { id: string; full_name: string | null } | null;
};
export type ContractVersion = Tables<"contract_versions">;
export type ContractReminder = Tables<"contract_reminders">;
export type StatusHistoryEntry = Tables<"contract_status_history">;

export const contractKey = (id: string) => ["contract", id] as const;
const historyKey = (id: string) => ["contract", id, "status-history"] as const;
const versionsKey = (id: string) => ["contract", id, "versions"] as const;
const commentsKey = (id: string) => ["contract", id, "comments"] as const;
const remindersKey = (id: string) => ["contract", id, "reminders"] as const;

export { historyKey, versionsKey, commentsKey, remindersKey };

export function useContract(id: string | undefined) {
  return useQuery<Contract | null>({
    queryKey: id ? contractKey(id) : ["contract", "none"],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase.from("contracts").select("*").eq("id", id).single();

      // `PGRST116` = aucune ligne : contrat inexistant ou hors périmètre (RLS).
      if (error && error.code !== "PGRST116") throw error;
      return data ? { ...data, statut: normalizeStatus(data.statut) } : null;
    },
  });
}

export function useContractStatusHistory(contractId: string | undefined) {
  return useQuery<StatusHistoryEntry[]>({
    queryKey: contractId ? historyKey(contractId) : ["contract", "none", "status-history"],
    enabled: Boolean(contractId),
    queryFn: async () => {
      if (!contractId) return [];

      const { data, error } = await supabase
        .from("contract_status_history")
        .select("*")
        .eq("contract_id", contractId)
        .order("changed_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useContractVersions(contractId: string | undefined) {
  return useQuery<ContractVersion[]>({
    queryKey: contractId ? versionsKey(contractId) : ["contract", "none", "versions"],
    enabled: Boolean(contractId),
    queryFn: async () => {
      if (!contractId) return [];

      const { data, error } = await supabase
        .from("contract_versions")
        .select("*")
        .eq("contract_id", contractId)
        .order("version_number", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useContractComments(contractId: string | undefined) {
  return useQuery<ContractCommentWithAuthor[]>({
    queryKey: contractId ? commentsKey(contractId) : ["contract", "none", "comments"],
    enabled: Boolean(contractId),
    queryFn: async () => {
      if (!contractId) return [];

      const { data, error } = await supabase
        .from("contract_comments")
        .select("*, profiles(id, full_name)")
        .eq("contract_id", contractId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useContractReminders(contractId: string | undefined) {
  return useQuery<ContractReminder[]>({
    queryKey: contractId ? remindersKey(contractId) : ["contract", "none", "reminders"],
    enabled: Boolean(contractId),
    queryFn: async () => {
      if (!contractId) return [];

      const { data, error } = await supabase
        .from("contract_reminders")
        .select("*")
        .eq("contract_id", contractId)
        .order("remind_at", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------
export interface TimelineEntry {
  id: string;
  kind: "creation" | "status" | "document" | "comment";
  at: string;
  title: string;
  description?: string;
  actorEmail?: string | null;
  status?: ContractStatus;
}

/** Libellés des types de rappel (valeurs imposées par la contrainte CHECK). */
const REMINDER_LABELS: Record<string, string> = {
  expiry: "Rappel d'échéance",
  renewal: "Rappel de renouvellement",
  payment: "Rappel de paiement",
  review: "Rappel de révision",
};

export { REMINDER_LABELS };

/**
 * Fusionne création, changements de statut, versions de documents et
 * commentaires en une chronologie unique, du plus récent au plus ancien
 * (pattern « timeline continue » des CLM de référence).
 */
export function buildTimeline(params: {
  contract: Contract | null | undefined;
  history: StatusHistoryEntry[] | undefined;
  versions: ContractVersion[] | undefined;
  comments: ContractCommentWithAuthor[] | undefined;
}): TimelineEntry[] {
  const { contract, history, versions, comments } = params;
  const entries: TimelineEntry[] = [];

  if (contract) {
    entries.push({
      id: `creation-${contract.id}`,
      kind: "creation",
      at: contract.created_at,
      title: "Contrat créé",
      description: `${contract.reference_decision} · ${contract.client}`,
    });
  }

  for (const item of history ?? []) {
    entries.push({
      id: `status-${item.id}`,
      kind: "status",
      at: item.changed_at,
      title: item.from_status
        ? `Statut : ${getStatusLabel(item.from_status)} → ${getStatusLabel(item.to_status)}`
        : `Statut : ${getStatusLabel(item.to_status)}`,
      description: item.reason ?? undefined,
      actorEmail: item.changed_by_email,
      status: normalizeStatus(item.to_status),
    });
  }

  for (const version of versions ?? []) {
    entries.push({
      id: `document-${version.id}`,
      kind: "document",
      at: version.created_at ?? new Date().toISOString(),
      title: `Document archivé (version ${version.version_number})`,
      description: version.changes_description ?? undefined,
    });
  }

  for (const comment of comments ?? []) {
    entries.push({
      id: `comment-${comment.id}`,
      kind: "comment",
      at: comment.created_at ?? new Date().toISOString(),
      title: comment.profiles?.full_name ? `Commentaire · ${comment.profiles.full_name}` : "Commentaire",
      description: comment.comment,
    });
  }

  return entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
