
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ContractTable from "./ContractTable";
import { Tables, TablesUpdate } from "@/integrations/supabase/types";

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

  const { data: contracts, isLoading } = useQuery<Tables<'contracts'>[]>({
    queryKey: ["contracts"],
    queryFn: fetchContracts,
  });

  const updateContractMutation = useMutation<
    void,
    Error,
    { contractId: string; updates: Partial<TablesUpdate<'contracts'>> }
  >({
    mutationFn: async ({ contractId, updates }) => {
      const { error } = await supabase
        .from("contracts")
        .update(updates)
        .eq("id", contractId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast({
        title: "Succès",
        description: "Contrat mis à jour.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de mettre à jour le contrat.",
      });
    },
  });

  const handleContractUpdate = async (contractId: string, updates: Partial<TablesUpdate<'contracts'>>) => {
    await updateContractMutation.mutateAsync({ contractId, updates });
  };

  return (
    <ContractTable
      contracts={contracts || []}
      isLoading={isLoading}
      updatingContractId={
        updateContractMutation.isPending && updateContractMutation.variables
          ? updateContractMutation.variables.contractId
          : null
      }
      handleContractUpdate={handleContractUpdate}
    />
  );
};

export default ContractList;
