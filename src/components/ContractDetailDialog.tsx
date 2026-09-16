// ============================================================================
// Fiche contrat — consultation, modification, document, historique (R1 + R2)
// ----------------------------------------------------------------------------
// • Document servi en URL signée de courte durée (jamais d'URL publique).
// • Le statut ne propose que les transitions autorisées pour le rôle courant ;
//   un motif est demandé et conservé dans `contract_status_history`.
// • L'historique des changements de statut est lu depuis la base (piste
//   métier opposable), complément de la piste d'audit globale.
// ============================================================================
import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { History } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import ContractDetailForm from "./ContractDetailForm";
import ContractFileUpload from "./ContractFileUpload";
import ContractStatusReasonField from "./ContractStatusReasonField";
import { downloadContractFile, replaceContractFile } from "@/lib/storage";
import { AUDIT_ACTIONS, logAction } from "@/lib/audit-log";
import {
  allowedTransitions,
  getStatusBadgeClassLight,
  getStatusLabel,
  normalizeStatus,
} from "@/lib/contract-status";
import { formatCurrency } from "@/lib/contract-helpers";

interface ContractDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Tables<"contracts">;
  onSaveChanges: (
    contractId: string,
    updates: Partial<TablesUpdate<"contracts">>,
  ) => Promise<void>;
  isSaving: boolean;
}

/** Motif exigé pour ces sorties de cycle (justification opposable). */
const REASON_REQUIRED_FOR = new Set(["alert", "cancelled", "client_refused", "expired"]);

const ContractDetailDialog: React.FC<ContractDetailDialogProps> = ({
  open,
  onOpenChange,
  contract,
  onSaveChanges,
  isSaving,
}) => {
  const { userProfile } = useAuth();
  const [editedContract, setEditedContract] = useState<Tables<"contracts">>(contract);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [statusReason, setStatusReason] = useState("");

  useEffect(() => {
    if (open) {
      setEditedContract(contract);
      setFile(null);
      setIsUploading(false);
      setIsDownloading(false);
      setStatusReason("");

      // Traçabilité de la consultation (exigence d'audit bancaire — D18).
      void logAction(AUDIT_ACTIONS.contractView, {
        contractId: contract.id,
        reference: contract.reference_decision,
      });
    }
  }, [contract, open]);

  const role = userProfile?.role ?? null;

  /** Transitions proposées : matrice SQL filtrée par le rôle de l'utilisateur. */
  const allowedStatuses = useMemo(
    () => allowedTransitions(contract.statut, role),
    [contract.statut, role],
  );

  const { data: statusHistory } = useQuery({
    queryKey: ["contract-status-history", contract.id],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_status_history")
        .select("*")
        .eq("contract_id", contract.id)
        .order("changed_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data ?? [];
    },
  });

  const statusChanged = editedContract.statut !== contract.statut;

  const handleFieldChange = (
    field: keyof TablesUpdate<"contracts">,
    value: string | number | null,
  ) => {
    setEditedContract((prev) => ({ ...prev, [field]: value }) as Tables<"contracts">);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
  };

  /** Champs réellement modifiés — la référence est immuable, elle n'est jamais envoyée. */
  const getChangedFields = (): Partial<TablesUpdate<"contracts">> => {
    const changes: Partial<TablesUpdate<"contracts">> = {};

    if (editedContract.client !== contract.client) changes.client = editedContract.client;
    if (editedContract.montant !== contract.montant) changes.montant = editedContract.montant;
    if (editedContract.currency !== contract.currency) changes.currency = editedContract.currency;
    if (editedContract.date_decision !== contract.date_decision) {
      changes.date_decision = editedContract.date_decision;
    }
    if (editedContract.date_signature !== contract.date_signature) {
      changes.date_signature = editedContract.date_signature;
    }
    if (editedContract.expiry_date !== contract.expiry_date) {
      changes.expiry_date = editedContract.expiry_date;
    }
    if (editedContract.agence !== contract.agence) changes.agence = editedContract.agence;

    if (statusChanged) {
      changes.statut = editedContract.statut;

      // Le trigger recopie ce motif dans contract_status_history.reason.
      const metadata = (contract.metadata ?? {}) as Record<string, unknown>;
      changes.metadata = {
        ...metadata,
        status_change_reason: statusReason.trim() || null,
      };
    }

    return changes;
  };

  const changedFields = getChangedFields();
  const hasChanges = Object.keys(changedFields).length > 0 || Boolean(file);

  const handleSave = async () => {
    if (!hasChanges || isUploading) return;

    const updates = getChangedFields();

    // Garde-fous côté client : mêmes règles que les contraintes SQL, pour un
    // retour immédiat plutôt qu'une erreur de base.
    if (updates.montant !== undefined && !(updates.montant > 0)) {
      toast({
        title: "Montant invalide",
        description: "Le montant d'un contrat doit être strictement positif.",
        variant: "destructive",
      });
      return;
    }

    if (updates.client !== undefined && updates.client.trim().length < 2) {
      toast({
        title: "Client invalide",
        description: "Le nom du client doit comporter au moins 2 caractères.",
        variant: "destructive",
      });
      return;
    }

    if (statusChanged && REASON_REQUIRED_FOR.has(normalizeStatus(editedContract.statut)) && !statusReason.trim()) {
      toast({
        title: "Motif requis",
        description: `Précisez le motif du passage à « ${getStatusLabel(editedContract.statut)} ».`,
        variant: "destructive",
      });
      return;
    }

    if (file) {
      if (!contract.bank_id) {
        toast({
          title: "Banque inconnue",
          description: "Ce contrat n'est rattaché à aucune banque : téléversement impossible.",
          variant: "destructive",
        });
        return;
      }

      setIsUploading(true);
      try {
        const newFilePath = await replaceContractFile({
          bankId: contract.bank_id,
          contractId: contract.id,
          file,
          previousPath: contract.file_path,
        });

        updates.file_path = newFilePath;

        await logAction(AUDIT_ACTIONS.documentReplace, {
          contractId: contract.id,
          reference: contract.reference_decision,
          fileName: file.name,
        });
      } catch (error) {
        toast({
          title: "Erreur de téléversement",
          description: error instanceof Error ? error.message : "Téléversement impossible.",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    if (Object.keys(updates).length > 0) {
      // La journalisation `contract.update` est faite par l'appelant
      // (ContractList), au plus près de l'écriture réussie en base.
      await onSaveChanges(contract.id, updates);
    }

    onOpenChange(false);
  };

  /** Téléchargement via URL signée de courte durée (jamais d'URL publique). */
  const handleDownload = async (filePath: string) => {
    setIsDownloading(true);
    try {
      await downloadContractFile(filePath, contract.reference_decision || undefined);
      await logAction(AUDIT_ACTIONS.documentDownload, {
        contractId: contract.id,
        reference: contract.reference_decision,
      });
    } catch (error) {
      toast({
        title: "Téléchargement impossible",
        description:
          error instanceof Error ? error.message : "Le lien sécurisé n'a pas pu être généré.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">
              {contract.reference_decision || "sans référence"}
            </span>
            <span className="text-base font-semibold">{contract.client}</span>
            <Badge
              variant="outline"
              className={getStatusBadgeClassLight(contract.statut)}
            >
              {getStatusLabel(contract.statut)}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {formatCurrency(contract.montant, contract.currency)}
            {contract.date_decision
              ? ` · décision du ${format(new Date(contract.date_decision), "dd/MM/yyyy", { locale: fr })}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <ContractDetailForm
            editedContract={editedContract}
            handleFieldChange={handleFieldChange}
            isSaving={isSaving}
            allowedStatuses={allowedStatuses}
          />

          {statusChanged && (
            <ContractStatusReasonField
              fromStatus={contract.statut}
              toStatus={editedContract.statut}
              value={statusReason}
              onChange={setStatusReason}
              disabled={isSaving}
              required={REASON_REQUIRED_FOR.has(normalizeStatus(editedContract.statut))}
            />
          )}

          <ContractFileUpload
            filePath={contract.file_path}
            file={file}
            isUploading={isUploading}
            isDownloading={isDownloading}
            onDownload={handleDownload}
            handleFileChange={handleFileChange}
          />

          {statusHistory && statusHistory.length > 0 && (
            <section aria-labelledby="status-history-title" className="rounded-md border p-3">
              <h3
                id="status-history-title"
                className="mb-2 flex items-center gap-2 text-sm font-medium"
              >
                <History className="h-4 w-4" aria-hidden="true" />
                Historique des statuts
              </h3>
              <ol className="space-y-2">
                {statusHistory.map((entry) => (
                  <li key={entry.id} className="flex flex-wrap items-baseline gap-2 text-sm">
                    <Badge variant="outline" className={getStatusBadgeClassLight(entry.to_status)}>
                      {getStatusLabel(entry.to_status)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {entry.from_status
                        ? `depuis « ${getStatusLabel(entry.from_status)} » · `
                        : ""}
                      {format(new Date(entry.changed_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                      {entry.changed_by_email ? ` · ${entry.changed_by_email}` : ""}
                    </span>
                    {entry.reason && (
                      <span className="w-full text-xs italic text-muted-foreground">
                        « {entry.reason} »
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <DialogFooter className="flex flex-row gap-2 pt-2">
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <div className="flex-1" />
          <Button onClick={handleSave} disabled={isSaving || !hasChanges || isUploading}>
            {isUploading ? "Téléversement…" : isSaving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContractDetailDialog;
