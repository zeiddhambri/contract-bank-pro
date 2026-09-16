// ============================================================================
// Kanban du cycle de vie (R2.2)
// ----------------------------------------------------------------------------
// Avant : six colonnes portant des statuts anglais inexistants en base
// (`review`, `approval`, `pending_signature`…) → tableau toujours vide, et un
// glisser-déposer qui se contentait d'écrire dans la console du navigateur.
//
// Maintenant :
//   • colonnes = phases réelles, sous-sections = statuts du cycle de vie unique ;
//   • le déplacement **persiste** (mise à jour optimiste + rollback + toast) ;
//   • seules les transitions autorisées pour le rôle courant sont proposées —
//     la base (trigger `enforce_contract_status_transition`) reste l'autorité ;
//   • alternative clavier au glisser-déposer : menu « Déplacer vers… » sur
//     chaque carte (WCAG 2.5.7).
// ============================================================================
import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowRightLeft, Calendar, GripVertical } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";
import {
  KANBAN_COLUMNS,
  allowedTransitions,
  canTransition,
  getStatusBadgeClassLight,
  getStatusDotClass,
  getStatusLabel,
  normalizeStatus,
  type ContractStatus,
} from "@/lib/contract-status";
import { formatCurrency, getTypeLabel } from "@/lib/contract-helpers";

type Contract = Tables<"contracts">;

const CONTRACTS_QUERY_KEY = ["contracts"] as const;

const COLUMN_TONES: Record<string, string> = {
  instruction: "bg-slate-100",
  mise_en_place: "bg-amber-50",
  execution: "bg-green-50",
  cloture: "bg-gray-100",
};

const ContractKanban = () => {
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();
  const role = userProfile?.role ?? null;
  const [draggedContract, setDraggedContract] = useState<Contract | null>(null);
  const [dropTarget, setDropTarget] = useState<ContractStatus | null>(null);

  const { data: contracts, isLoading } = useQuery<Contract[]>({
    queryKey: CONTRACTS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });

  const moveContract = useMutation<
    void,
    Error,
    { contract: Contract; to: ContractStatus; reason?: string },
    { previous?: Contract[] }
  >({
    mutationFn: async ({ contract, to, reason }) => {
      const metadata = (contract.metadata ?? {}) as Record<string, unknown>;
      const { error } = await supabase
        .from("contracts")
        .update({
          statut: to,
          // Le trigger recopie ce motif dans contract_status_history.reason.
          ...(reason ? { metadata: { ...metadata, status_change_reason: reason } } : {}),
        })
        .eq("id", contract.id);

      if (error) throw error;
    },

    // Mise à jour optimiste : le plateau reflète le déplacement immédiatement.
    onMutate: async ({ contract, to }) => {
      await queryClient.cancelQueries({ queryKey: CONTRACTS_QUERY_KEY });
      const previous = queryClient.getQueryData<Contract[]>(CONTRACTS_QUERY_KEY);

      queryClient.setQueryData<Contract[]>(CONTRACTS_QUERY_KEY, (rows) =>
        (rows ?? []).map((row) => (row.id === contract.id ? { ...row, statut: to } : row)),
      );

      return { previous };
    },

    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(CONTRACTS_QUERY_KEY, context.previous);
      }
      toast({
        title: "Déplacement refusé",
        description: error.message || "Cette transition de statut n'est pas autorisée.",
        variant: "destructive",
      });
    },

    onSuccess: (_data, { contract, to }) => {
      toast({
        title: "Statut mis à jour",
        description: `${contract.reference_decision || contract.client} → ${getStatusLabel(to)}. Le motif est conservé dans l'historique.`,
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CONTRACTS_QUERY_KEY });
    },
  });

  const requestMove = (contract: Contract, to: ContractStatus) => {
    const from = normalizeStatus(contract.statut);
    if (from === to) return;

    if (!canTransition(from, to, role)) {
      toast({
        title: "Transition impossible",
        description: `Votre rôle ne permet pas de passer de « ${getStatusLabel(from)} » à « ${getStatusLabel(to)} ».`,
        variant: "destructive",
      });
      return;
    }

    moveContract.mutate({ contract, to });
  };

  const handleDragOver = (event: React.DragEvent, status: ContractStatus) => {
    event.preventDefault();
    setDropTarget(status);
  };

  const handleDrop = (event: React.DragEvent, status: ContractStatus) => {
    event.preventDefault();
    setDropTarget(null);
    if (draggedContract) requestMove(draggedContract, status);
    setDraggedContract(null);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center" aria-busy="true">
        <p className="text-gray-500">Chargement du plateau…</p>
      </div>
    );
  }

  const rows = contracts ?? [];

  return (
    <div className="h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Cycle de vie des contrats</h2>
        <p className="text-gray-600">
          Glissez une carte vers un statut, ou utilisez le menu « Déplacer vers… » de la carte.
          Seules les transitions autorisées pour votre rôle sont proposées.
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((column) => {
          const columnContracts = rows.filter((contract) =>
            column.statuses.includes(normalizeStatus(contract.statut)),
          );

          return (
            <section
              key={column.id}
              aria-label={`Phase ${column.title}`}
              className={`w-80 flex-shrink-0 rounded-lg p-3 ${COLUMN_TONES[column.id]}`}
            >
              <header className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{column.title}</h3>
                <Badge variant="secondary" className="bg-white">
                  {columnContracts.length}
                </Badge>
              </header>

              <div className="max-h-[32rem] space-y-4 overflow-y-auto pr-1">
                {column.statuses.map((status) => {
                  const cards = columnContracts.filter(
                    (contract) => normalizeStatus(contract.statut) === status,
                  );
                  const isTarget = dropTarget === status;
                  const canDropHere = draggedContract
                    ? canTransition(normalizeStatus(draggedContract.statut), status, role)
                    : false;

                  return (
                    <div
                      key={status}
                      onDragOver={(event) => handleDragOver(event, status)}
                      onDragLeave={() => setDropTarget(null)}
                      onDrop={(event) => handleDrop(event, status)}
                      className={`rounded-md border-2 border-dashed p-2 transition-colors ${
                        isTarget
                          ? canDropHere
                            ? "border-green-500 bg-green-50"
                            : "border-red-400 bg-red-50"
                          : "border-transparent"
                      }`}
                    >
                      <div className="mb-2 flex items-center gap-2 px-1">
                        <span
                          className={`inline-block h-2.5 w-2.5 rounded-full ${getStatusDotClass(status)}`}
                          aria-hidden="true"
                        />
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                          {getStatusLabel(status)}
                        </h4>
                        <span className="ml-auto text-xs text-gray-500">{cards.length}</span>
                      </div>

                      <div className="space-y-2">
                        {cards.length === 0 ? (
                          <p className="px-1 py-2 text-xs text-gray-400">Aucun contrat</p>
                        ) : (
                          cards.map((contract) => {
                            const transitions = allowedTransitions(contract.statut, role);

                            return (
                              <Card
                                key={contract.id}
                                className="cursor-grab bg-white transition-shadow hover:shadow-md active:cursor-grabbing"
                                draggable
                                onDragStart={() => setDraggedContract(contract)}
                                onDragEnd={() => {
                                  setDraggedContract(null);
                                  setDropTarget(null);
                                }}
                              >
                                <CardContent className="p-3">
                                  <div className="mb-2 flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium text-gray-900">
                                        {contract.client}
                                      </p>
                                      <p className="font-mono text-xs text-gray-500">
                                        {contract.reference_decision}
                                      </p>
                                    </div>

                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 shrink-0 p-0"
                                          aria-label={`Déplacer le contrat ${contract.client}`}
                                          title="Déplacer vers…"
                                        >
                                          <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-64">
                                        <DropdownMenuLabel>
                                          Déplacer vers… ({getStatusLabel(contract.statut)})
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {transitions.length === 0 ? (
                                          <p className="px-2 py-1.5 text-xs text-gray-500">
                                            Aucune transition autorisée pour votre rôle.
                                          </p>
                                        ) : (
                                          transitions.map((to) => (
                                            <DropdownMenuItem
                                              key={to}
                                              onClick={() => requestMove(contract, to)}
                                              disabled={moveContract.isPending}
                                            >
                                              {getStatusLabel(to)}
                                            </DropdownMenuItem>
                                          ))
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>

                                  <div className="mb-2 flex flex-wrap items-center gap-1">
                                    <Badge variant="outline" className="text-xs">
                                      {getTypeLabel(contract.type)}
                                    </Badge>
                                    <Badge
                                      variant="outline"
                                      className={`text-xs ${getStatusBadgeClassLight(status)}`}
                                    >
                                      {getStatusLabel(status)}
                                    </Badge>
                                  </div>

                                  <div className="space-y-1 text-xs text-gray-600">
                                    <p className="font-semibold tabular-nums text-gray-900">
                                      {formatCurrency(contract.montant, contract.currency)}
                                    </p>
                                    <p className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" aria-hidden="true" />
                                      {contract.date_decision
                                        ? format(new Date(contract.date_decision), "dd MMM yyyy", {
                                            locale: fr,
                                          })
                                        : "date non renseignée"}
                                    </p>
                                  </div>

                                  <div className="mt-3 flex items-center justify-between">
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback className="text-xs">
                                        {contract.client
                                          .split(" ")
                                          .map((part) => part[0])
                                          .join("")
                                          .slice(0, 2)
                                          .toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <GripVertical
                                      className="h-4 w-4 text-gray-300"
                                      aria-hidden="true"
                                    />
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default ContractKanban;
