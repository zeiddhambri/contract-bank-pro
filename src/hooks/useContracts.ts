// ============================================================================
// Liste paginée des contrats (R3.7)
// ----------------------------------------------------------------------------
// Pagination, recherche et filtres sont **côté serveur** : `.range()` +
// `count=exact`, `ilike` sur les champs métier, `eq`/`in` sur le statut.
// Avec 10 000 lignes, le client ne télécharge plus que la page affichée
// (avant : `select('*')` intégral à chaque ouverture du tableau de bord).
//
// Clé de cache préfixée par ['contracts'] : toute invalidation globale
// (création, changement de statut, archivage) rafraîchit aussi le Kanban et les
// tableaux de bord, qui utilisent ['contracts', 'all'].
// ============================================================================
import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  normalizeStatus,
  statusesOfColumn,
  type ContractStatus,
  type StatusGroup,
} from "@/lib/contract-status";

export type Contract = Tables<"contracts">;

export const CONTRACTS_LIST_KEY = "contracts" as const;
export const CONTRACTS_ALL_KEY = ["contracts", "all"] as const;

export interface ContractListFilters {
  search: string;
  statut: ContractStatus | "all";
  group: StatusGroup | "all";
  /** Page courante, à partir de 1. */
  page: number;
  pageSize: number;
  /** Tri applicatif. */
  sortBy: "created_at" | "date_decision" | "montant" | "client" | "reference_decision";
  sortAsc: boolean;
}

export const DEFAULT_CONTRACT_FILTERS: ContractListFilters = {
  search: "",
  statut: "all",
  group: "all",
  page: 1,
  pageSize: 25,
  sortBy: "created_at",
  sortAsc: false,
};

/**
 * Nettoie un terme de recherche pour l'injecter sans risque dans la syntaxe
 * PostgREST `or=(...)` : virgules, parenthèses et caractères joker retirés.
 * Ce n'est pas une protection SQL (le client PostgREST paramètre déjà les
 * valeurs) mais une protection de la **syntaxe du filtre**.
 */
export function sanitizeSearchTerm(term: string): string {
  return term
    .replace(/[,()%_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

/** Retard appliqué à la saisie pour ne pas requêter à chaque frappe. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export function useContracts(filters: ContractListFilters) {
  const search = sanitizeSearchTerm(filters.search);
  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  return useQuery<{ rows: Contract[]; total: number }>({
    queryKey: [CONTRACTS_LIST_KEY, "list", { ...filters, search }],
    // Conserve la page précédente pendant le chargement : pas de clignotement.
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let query = supabase.from("contracts").select("*", { count: "exact" });

      if (search) {
        const needle = `%${search}%`;
        query = query.or(
          `client.ilike.${needle},reference_decision.ilike.${needle},type.ilike.${needle},agence.ilike.${needle},description.ilike.${needle}`,
        );
      }

      if (filters.statut !== "all") {
        query = query.eq("statut", filters.statut);
      } else if (filters.group !== "all") {
        query = query.in("statut", statusesOfColumn(filters.group));
      }

      const { data, error, count } = await query
        .order(filters.sortBy, { ascending: filters.sortAsc, nullsFirst: false })
        .range(from, to);

      if (error) throw error;

      // Normalisation défensive : une valeur héritée d'un ancien import ne doit
      // jamais casser l'affichage.
      const rows = (data ?? []).map((row) => ({
        ...row,
        statut: normalizeStatus(row.statut),
      }));

      return { rows, total: count ?? rows.length };
    },
  });
}

/**
 * Tous les contrats de la banque (sans pagination) : le Kanban et les tableaux
 * de bord ont besoin du portefeuille complet pour leurs agrégats.
 */
export function useAllContracts() {
  return useQuery<Contract[]>({
    queryKey: CONTRACTS_ALL_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []).map((row) => ({ ...row, statut: normalizeStatus(row.statut) }));
    },
  });
}
