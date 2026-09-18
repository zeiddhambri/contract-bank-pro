// ============================================================================
// Bibliothèque de clauses — lectures et écritures (R4.5)
// ----------------------------------------------------------------------------
// Remplace l'ancien `ClauseManager` : trois clauses de démonstration codées en
// dur, un `setTimeout` d'une seconde pour faire « vrai », et des créations
// stockées dans un `useState` (perdues au rafraîchissement).
//
// Ici, tout vient de la table `public.clauses`, cloisonnée par banque (RLS +
// trigger `set_clause_audit_fields`) : auteur et dernier modificateur imposés
// par le serveur, `version` incrémentée sur chaque changement éditorial.
//
// Volume attendu : quelques dizaines à quelques centaines de clauses par
// banque. La liste est donc chargée en une requête puis filtrée côté client ;
// le passage en recherche serveur (trigramme) est prévu avec R7.1, quand le
// référentiel de contrats suivra le même chemin.
// ============================================================================
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import { AUDIT_ACTIONS, logAction } from "@/lib/audit-log";
import { normalizeClauseCategory, type ClauseRow } from "@/lib/clause-library";

export const CLAUSES_KEY = ["clauses"] as const;

export interface ClauseFilters {
  search: string;
  category: string;
  includeInactive: boolean;
}

export const DEFAULT_CLAUSE_FILTERS: ClauseFilters = {
  search: "",
  category: "all",
  includeInactive: false,
};

export function useClauses() {
  return useQuery<ClauseRow[]>({
    queryKey: CLAUSES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clauses")
        .select("*")
        .order("category", { ascending: true })
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Filtrage local (recherche insensible à la casse sur titre, contenu, tags). */
export function filterClauses(clauses: ClauseRow[], filters: ClauseFilters): ClauseRow[] {
  const needle = filters.search.trim().toLowerCase();

  return clauses.filter((clause) => {
    if (!filters.includeInactive && !clause.is_active) return false;
    if (filters.category !== "all" && clause.category !== filters.category) return false;

    if (!needle) return true;

    return (
      clause.title.toLowerCase().includes(needle) ||
      clause.content.toLowerCase().includes(needle) ||
      clause.tags.some((tag) => tag.toLowerCase().includes(needle))
    );
  });
}

export interface ClauseDraft {
  title: string;
  content: string;
  category: string;
  tags: string[];
  isActive: boolean;
}

function toInsert(draft: ClauseDraft): TablesInsert<"clauses"> {
  return {
    title: draft.title.trim(),
    content: draft.content.trim(),
    category: normalizeClauseCategory(draft.category),
    tags: draft.tags,
    is_active: draft.isActive,
    // bank_id, created_by, updated_by, version, horodatages : imposés en base.
  };
}

function toUpdate(draft: ClauseDraft): TablesUpdate<"clauses"> {
  return {
    title: draft.title.trim(),
    content: draft.content.trim(),
    category: normalizeClauseCategory(draft.category),
    tags: draft.tags,
    is_active: draft.isActive,
  };
}

export function useClauseMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: CLAUSES_KEY });
  };

  const create = useMutation<ClauseRow, Error, ClauseDraft>({
    mutationFn: async (draft) => {
      const { data, error } = await supabase
        .from("clauses")
        .insert(toInsert(draft))
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (clause) => {
      invalidate();
      toast({
        title: "Clause créée",
        description: `« ${clause.title} » est disponible pour votre banque.`,
      });
      void logAction(AUDIT_ACTIONS.clauseCreate, {
        clauseId: clause.id,
        title: clause.title,
        category: clause.category,
      });
    },
    onError: (error) => {
      toast({
        title: "Création refusée",
        description: error.message || "La clause n'a pas pu être enregistrée.",
        variant: "destructive",
      });
    },
  });

  const update = useMutation<ClauseRow, Error, { id: string; draft: ClauseDraft }>({
    mutationFn: async ({ id, draft }) => {
      const { data, error } = await supabase
        .from("clauses")
        .update(toUpdate(draft))
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (clause) => {
      invalidate();
      toast({
        title: "Clause mise à jour",
        description: `Version ${clause.version} enregistrée.`,
      });
      void logAction(AUDIT_ACTIONS.clauseUpdate, {
        clauseId: clause.id,
        title: clause.title,
        version: clause.version,
      });
    },
    onError: (error) => {
      toast({
        title: "Modification refusée",
        description: error.message || "La clause n'a pas pu être mise à jour.",
        variant: "destructive",
      });
    },
  });

  const remove = useMutation<void, Error, ClauseRow>({
    mutationFn: async (clause) => {
      const { error } = await supabase.from("clauses").delete().eq("id", clause.id);
      if (error) throw error;
    },
    onSuccess: (_data, clause) => {
      invalidate();
      toast({
        title: "Clause supprimée",
        description: `« ${clause.title} » a été retirée de la bibliothèque.`,
      });
      void logAction(AUDIT_ACTIONS.clauseDelete, {
        clauseId: clause.id,
        title: clause.title,
        version: clause.version,
      });
    },
    onError: (error) => {
      toast({
        title: "Suppression refusée",
        description:
          error.message ||
          "Seul l'auteur de la clause ou un administrateur de la banque peut la supprimer.",
        variant: "destructive",
      });
    },
  });

  return {
    createClause: create.mutate,
    updateClause: update.mutate,
    deleteClause: remove.mutate,
    isCreating: create.isPending,
    isUpdating: update.isPending,
    isDeleting: remove.isPending,
    isSaving: create.isPending || update.isPending,
  };
}
