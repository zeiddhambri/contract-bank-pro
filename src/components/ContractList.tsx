
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ContractTable from "./ContractTable";

// Helpers to display labels (can be improved/refactored out)
const TYPE_LABELS: Record<string, string> = {
  credit_consommation: "Crédit Conso",
  credit_immo: "Crédit Immo",
  decouvert: "Découvert",
};
const GARANTIE_LABELS: Record<string, string> = {
  hypotheque: "Hypothèque",
  nantissement: "Nantissement",
  caution: "Caution",
};
const STATUS_BADGE_CLASSES: Record<string, string> = {
  en_cours: "border-orange-400 text-orange-300 bg-orange-500/10",
  attente_signature: "border-yellow-400 text-yellow-300 bg-yellow-500/10",
  valide: "border-green-400 text-green-300 bg-green-500/10",
  alerte: "border-red-400 text-red-300 bg-red-500/10",
};
const AGENCE_LABELS: Record<string, string> = {
  agence_centre: "Centre",
  agence_nord: "Nord",
  agence_sud: "Sud",
};
function formatDate(dateString: string) {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleDateString();
}
function formatCurrency(amount: number) {
  return `${amount.toLocaleString("fr-FR")} MAD`;
}

const supabase = createClient();

const fetchContracts = async () => {
  let { data, error } = await supabase
    .from("contracts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
};

const ContractList: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: contracts, isLoading, error } = useQuery({
    queryKey: ["contracts"],
    queryFn: fetchContracts,
  });

  // Status update with optimistic UI
  const statusMutation = useMutation({
    mutationFn: async ({
      contractId,
      newStatus,
    }: {
      contractId: string;
      newStatus: string;
    }) => {
      const { error } = await supabase
        .from("contracts")
        .update({ statut: newStatus })
        .eq("id", contractId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast({
        title: "Succès",
        description: "Statut mis à jour.",
      });
    },
    meta: {
      onError: (error: any) => {
        toast({
          title: "Erreur",
          description: error?.message || "Impossible de mettre à jour le statut.",
        });
      },
    },
  });

  const handleStatusChange = (contractId: string, newStatus: string) => {
    statusMutation.mutate({ contractId, newStatus });
  };

  return (
    <ContractTable
      contracts={contracts || []}
      isLoading={isLoading}
      statusLoadingId={
        statusMutation.isPending && statusMutation.variables
          ? statusMutation.variables.contractId
          : null
      }
      handleStatusChange={handleStatusChange}
      getTypeLabel={(type) => TYPE_LABELS[type] || type}
      getGarantieLabel={(garantie) => GARANTIE_LABELS[garantie] || garantie}
      getStatusBadgeClass={(status) => STATUS_BADGE_CLASSES[status] || ""}
      getAgenceLabel={(agence) => AGENCE_LABELS[agence] || agence}
      formatDate={formatDate}
      formatCurrency={formatCurrency}
    />
  );
};

export default ContractList;
