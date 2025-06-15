
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ContractTable from "./ContractTable";

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
    />
  );
};

export default ContractList;
