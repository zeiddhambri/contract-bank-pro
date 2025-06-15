import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ContractTable from "./ContractTable";
import { Tables, TablesUpdate } from "@/integrations/supabase/types";
import { logAction } from "@/lib/audit-log";

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
    onSuccess: (_, { contractId, updates }) => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast({
        title: "Succès",
        description: "Contrat mis à jour.",
      });
      logAction("contract.update", { contractId, changes: updates });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de mettre à jour le contrat.",
      });
    },
  });

  const deleteContractMutation = useMutation<
    void,
    Error,
    { contractId: string }
  >({
    mutationFn: async ({ contractId }) => {
      const { error } = await supabase
        .from("contracts")
        .delete()
        .eq("id", contractId);
      if (error) throw error;
    },
    onSuccess: (_, { contractId }) => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast({
        title: "Succès",
        description: "Contrat supprimé avec succès.",
      });
      logAction("contract.delete", { contractId });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de supprimer le contrat.",
      });
    },
  });

  const handleContractUpdate = async (contractId: string, updates: Partial<TablesUpdate<'contracts'>>) => {
    await updateContractMutation.mutateAsync({ contractId, updates });
  };

  const handleContractDelete = async (contractId: string) => {
    await deleteContractMutation.mutateAsync({ contractId });
  };

  const mutatingContractId =
    (updateContractMutation.isPending && updateContractMutation.variables?.contractId) ||
    (deleteContractMutation.isPending && deleteContractMutation.variables?.contractId) ||
    null;

  return (
    <ContractTable
      contracts={contracts || []}
      isLoading={isLoading}
      updatingContractId={mutatingContractId}
      handleContractUpdate={handleContractUpdate}
      handleContractDelete={handleContractDelete}
    />
  );
};

export default ContractList;
