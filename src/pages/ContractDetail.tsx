// ============================================================================
// Fiche contrat pleine page — /contrats/:id (R3.1)
// ----------------------------------------------------------------------------
// Onglets : Aperçu · Garanties · Documents · Timeline · Commentaires · Rappels.
// Tout provient de la base (RLS par banque) : aucune donnée reconstituée.
//
// Principes appliqués (benchmark CLM) :
//   • timeline continue pré-signature → exécution (Contracko, Ironclad) ;
//   • contrôle de versions documentaire, l'ancien fichier reste téléchargeable ;
//   • changement d'état en ligne, limité aux transitions autorisées pour le rôle,
//     avec motif conservé (exigence d'audit) ;
//   • commentaires périmètre banque, modifiables par leur auteur seulement.
// ============================================================================
import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Download,
  FileText,
  History,
  MessageSquare,
  Pencil,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import ContractDetailDialog from "@/components/ContractDetailDialog";
import ContractStatusReasonField from "@/components/ContractStatusReasonField";
import QueryErrorState from "@/components/QueryErrorState";
import {
  buildTimeline,
  REMINDER_LABELS,
  useContract,
  useContractComments,
  useContractReminders,
  useContractStatusHistory,
  useContractVersions,
} from "@/hooks/useContractDetail";
import {
  useArchiveContract,
  useCommentMutations,
  useReplaceDocument,
  useUpdateContract,
  useUploadDocument,
} from "@/hooks/useContractMutations";
import {
  allowedTransitions,
  getStatusBadgeClass,
  getStatusBadgeClassLight,
  getStatusIcon,
  getStatusLabel,
  type ContractStatus,
} from "@/lib/contract-status";
import {
  formatCurrency,
  getAgenceLabel,
  getGarantieLabel,
  getTypeLabel,
} from "@/lib/contract-helpers";
import { AUDIT_ACTIONS, logAction } from "@/lib/audit-log";
import { downloadContractFile, MAX_FILE_SIZE_BYTES } from "@/lib/storage";

/** Motif obligatoire pour ces sorties de cycle (justification opposable). */
const REASON_REQUIRED_FOR = new Set<ContractStatus>([
  "alert",
  "cancelled",
  "client_refused",
  "expired",
]);

interface Guarantee {
  type?: string;
  hypotheque_type?: string;
  details?: string;
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : format(date, "dd MMMM yyyy", { locale: fr });
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : format(date, "dd MMM yyyy 'à' HH:mm", { locale: fr });
};

const ContractDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const role = userProfile?.role ?? null;

  const contractQuery = useContract(id);
  const historyQuery = useContractStatusHistory(id);
  const versionsQuery = useContractVersions(id);
  const commentsQuery = useContractComments(id);
  const remindersQuery = useContractReminders(id);

  const updateContract = useUpdateContract();
  const archiveContract = useArchiveContract();
  const replaceDocument = useReplaceDocument();
  const uploadDocument = useUploadDocument();
  const comments = useCommentMutations(id ?? "");

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<ContractStatus | "">("");
  const [statusReason, setStatusReason] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentDescription, setDocumentDescription] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null);

  const contract = contractQuery.data ?? null;

  const timeline = useMemo(
    () =>
      buildTimeline({
        contract,
        history: historyQuery.data,
        versions: versionsQuery.data,
        comments: commentsQuery.data,
      }),
    [contract, historyQuery.data, versionsQuery.data, commentsQuery.data],
  );

  const guarantees = useMemo<Guarantee[]>(() => {
    if (!contract) return [];
    return Array.isArray(contract.garanties) ? (contract.garanties as Guarantee[]) : [];
  }, [contract]);

  // ------------------------------------------------------------------ états
  if (contractQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-5xl space-y-4" aria-busy="true">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (contractQuery.isError) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-3xl">
          <QueryErrorState
            title="Fiche contrat indisponible"
            message={
              contractQuery.error instanceof Error ? contractQuery.error.message : null
            }
            onRetry={() => void contractQuery.refetch()}
            isRetrying={contractQuery.isFetching}
          />
          <Button variant="outline" className="mt-4" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Retour au tableau de bord
          </Button>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-3xl">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="font-semibold text-slate-900">Contrat introuvable</p>
              <p className="mt-1 text-sm text-slate-600">
                Ce contrat n'existe pas, a été archivé, ou n'appartient pas au périmètre de
                votre banque.
              </p>
              <Button className="mt-4" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Retour au tableau de bord
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------ actions
  const transitions = allowedTransitions(contract.statut, role);
  const StatusIcon = getStatusIcon(contract.statut);

  const download = async (path: string, label?: string) => {
    setDownloadingPath(path);
    try {
      await downloadContractFile(path, label ?? contract.reference_decision ?? undefined);
      await logAction(AUDIT_ACTIONS.documentDownload, {
        contractId: contract.id,
        reference: contract.reference_decision,
        path,
      });
    } catch (error) {
      toast({
        title: "Téléchargement impossible",
        description: error instanceof Error ? error.message : "Erreur inconnue.",
        variant: "destructive",
      });
    } finally {
      setDownloadingPath(null);
    }
  };

  const applyStatusChange = async () => {
    if (!targetStatus) return;

    const required = REASON_REQUIRED_FOR.has(targetStatus);
    if (required && !statusReason.trim()) {
      toast({
        title: "Motif requis",
        description: `Précisez le motif du passage à « ${getStatusLabel(targetStatus)} ».`,
        variant: "destructive",
      });
      return;
    }

    const metadata = (contract.metadata ?? {}) as Record<string, unknown>;

    updateContract.mutate(
      {
        contractId: contract.id,
        updates: {
          statut: targetStatus,
          metadata: { ...metadata, status_change_reason: statusReason.trim() || null },
        },
      },
      {
        onSuccess: () => {
          setTargetStatus("");
          setStatusReason("");
        },
      },
    );
  };

  const submitDocument = async () => {
    if (!documentFile) return;

    try {
      if (contract.file_path) {
        await replaceDocument.mutateAsync({
          contract,
          file: documentFile,
          description: documentDescription.trim() || undefined,
        });
      } else {
        await uploadDocument.mutateAsync({ contract, file: documentFile });
      }
      setDocumentFile(null);
      setDocumentDescription("");
    } catch {
      // Message déjà affiché par le hook.
    }
  };

  const submitComment = () => {
    if (!commentDraft.trim()) return;
    comments.addComment(commentDraft, {
      onSuccess: () => setCommentDraft(""),
    });
  };

  const canDeleteComment = (authorId: string | null) =>
    authorId === user?.id || role === "super_admin" || role === "bank_admin";

  // ------------------------------------------------------------------ rendu
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        {/* Fil d'Ariane + en-tête ------------------------------------------- */}
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="-ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Tableau de bord
          </Button>

          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{contract.client}</h1>
                <Badge variant="outline" className={getStatusBadgeClassLight(contract.statut)}>
                  <StatusIcon className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  {getStatusLabel(contract.statut)}
                </Badge>
              </div>
              <p className="mt-1 font-mono text-sm text-gray-600">
                {contract.reference_decision} · {getTypeLabel(contract.type)} ·{" "}
                {getAgenceLabel(contract.agence)}
              </p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {formatCurrency(contract.montant, contract.currency)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                Modifier
              </Button>
              {contract.file_path && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => download(contract.file_path as string)}
                  disabled={downloadingPath === contract.file_path}
                >
                  <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                  Document
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => setArchiveOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                Archiver
              </Button>
            </div>
          </div>
        </div>

        {/* Onglets ------------------------------------------------------------ */}
        <Tabs defaultValue="apercu">
          <TabsList className="flex w-full flex-wrap justify-start">
            <TabsTrigger value="apercu">Aperçu</TabsTrigger>
            <TabsTrigger value="garanties">
              Garanties{guarantees.length > 0 ? ` (${guarantees.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="documents">
              Documents
              {(versionsQuery.data?.length ?? 0) > 0
                ? ` (${(versionsQuery.data?.length ?? 0) + (contract.file_path ? 1 : 0)})`
                : contract.file_path
                  ? " (1)"
                  : ""}
            </TabsTrigger>
            <TabsTrigger value="timeline">Timeline ({timeline.length})</TabsTrigger>
            <TabsTrigger value="commentaires">
              Commentaires ({commentsQuery.data?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="rappels">
              Rappels ({remindersQuery.data?.length ?? 0})
            </TabsTrigger>
          </TabsList>

          {/* --- Aperçu ------------------------------------------------------ */}
          <TabsContent value="apercu" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Informations du contrat</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {[
                      { label: "Référence de décision", value: contract.reference_decision || "—" },
                      { label: "Client", value: contract.client },
                      { label: "Type", value: getTypeLabel(contract.type) },
                      {
                        label: "Montant",
                        value: formatCurrency(contract.montant, contract.currency),
                      },
                      { label: "Agence", value: getAgenceLabel(contract.agence) },
                      { label: "Garantie principale", value: getGarantieLabel(contract.garantie) },
                      { label: "Date de décision", value: formatDate(contract.date_decision) },
                      { label: "Date de signature", value: formatDate(contract.date_signature) },
                      { label: "Échéance", value: formatDate(contract.expiry_date) },
                      { label: "Renouvellement", value: formatDate(contract.renewal_date) },
                      { label: "Créé le", value: formatDateTime(contract.created_at) },
                      { label: "Modifié le", value: formatDateTime(contract.updated_at) },
                    ].map((item) => (
                      <div key={item.label}>
                        <dt className="text-xs uppercase tracking-wide text-gray-500">
                          {item.label}
                        </dt>
                        <dd className="text-sm font-medium text-gray-900">{item.value}</dd>
                      </div>
                    ))}
                  </dl>

                  {contract.description && (
                    <div className="mt-4 border-t pt-4">
                      <dt className="text-xs uppercase tracking-wide text-gray-500">
                        Description
                      </dt>
                      <dd className="mt-1 whitespace-pre-line text-sm text-gray-700">
                        {contract.description}
                      </dd>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <History className="h-4 w-4" aria-hidden="true" />
                    Changer de statut
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    État actuel :{" "}
                    <strong className={getStatusBadgeClass(contract.statut)}>
                      {getStatusLabel(contract.statut)}
                    </strong>
                  </p>

                  {transitions.length === 0 ? (
                    <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      Aucune transition n'est autorisée pour votre rôle à partir de cet état.
                    </p>
                  ) : (
                    <>
                      <div>
                        <Label htmlFor="target-status" className="text-xs text-gray-600">
                          Nouvel état
                        </Label>
                        <select
                          id="target-status"
                          value={targetStatus}
                          onChange={(e) => setTargetStatus(e.target.value as ContractStatus)}
                          className="mt-1 block w-full rounded-md border-input bg-background py-2 px-3 text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-ring"
                        >
                          <option value="">Choisir un état…</option>
                          {transitions.map((status) => (
                            <option key={status} value={status}>
                              {getStatusLabel(status)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {targetStatus && (
                        <ContractStatusReasonField
                          fromStatus={contract.statut}
                          toStatus={targetStatus}
                          value={statusReason}
                          onChange={setStatusReason}
                          disabled={updateContract.isPending}
                          required={REASON_REQUIRED_FOR.has(targetStatus)}
                        />
                      )}

                      <Button
                        className="w-full"
                        onClick={applyStatusChange}
                        disabled={!targetStatus || updateContract.isPending}
                      >
                        {updateContract.isPending ? (
                          "Enregistrement…"
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
                            Appliquer la transition
                          </>
                        )}
                      </Button>

                      <p className="text-xs text-gray-500">
                        La transition est vérifiée en base, horodatée et attribuée à votre
                        compte : elle apparaît dans la timeline et la piste d'audit.
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* --- Garanties --------------------------------------------------- */}
          <TabsContent value="garanties">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Garanties du financement</CardTitle>
              </CardHeader>
              <CardContent>
                {guarantees.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-500">
                    Aucune garantie enregistrée pour ce contrat.
                  </p>
                ) : (
                  <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {guarantees.map((guarantee, index) => (
                      <li
                        key={`${guarantee.type ?? "garantie"}-${index}`}
                        className="rounded-lg border p-3"
                      >
                        <p className="flex items-center gap-2 font-medium text-gray-900">
                          <ShieldCheck className="h-4 w-4 text-green-600" aria-hidden="true" />
                          {getGarantieLabel(guarantee.type ?? "")}
                        </p>
                        {guarantee.hypotheque_type && (
                          <p className="mt-1 text-sm text-gray-600">
                            Type : {guarantee.hypotheque_type}
                          </p>
                        )}
                        {guarantee.details && (
                          <p className="mt-1 whitespace-pre-line text-sm text-gray-600">
                            {guarantee.details}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-4 text-xs text-gray-500">
                  Les garanties se saisissent à la création du contrat ; utilisez « Modifier »
                  pour les compléter.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- Documents --------------------------------------------------- */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  Document contractuel en vigueur
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contract.file_path ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm text-gray-800">
                        {contract.file_path.split("/").pop()}
                      </p>
                      <p className="text-xs text-gray-500">
                        Stockage privé · accès par lien signé de 60 secondes · téléchargement
                        journalisé
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => download(contract.file_path as string)}
                      disabled={downloadingPath === contract.file_path}
                    >
                      <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                      Télécharger
                    </Button>
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed p-4 text-center text-sm text-gray-500">
                    Aucun document n'est associé à ce contrat.
                  </p>
                )}

                <div className="space-y-3 border-t pt-4">
                  <div>
                    <Label htmlFor="document-file" className="text-xs text-gray-600">
                      {contract.file_path ? "Remplacer le document" : "Ajouter un document"}
                    </Label>
                    <Input
                      id="document-file"
                      type="file"
                      accept=".pdf,.doc,.docx,.odt,.png,.jpg,.jpeg"
                      className="mt-1"
                      onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)}
                      aria-describedby="document-file-help"
                    />
                    <p id="document-file-help" className="mt-1 text-xs text-gray-500">
                      PDF, Word, ODT ou image · {Math.round(MAX_FILE_SIZE_BYTES / 1_048_576)} Mo
                      maximum.{" "}
                      {contract.file_path
                        ? "Le document actuel est archivé et reste téléchargeable."
                        : ""}
                    </p>
                  </div>

                  {documentFile && contract.file_path && (
                    <div>
                      <Label htmlFor="document-reason" className="text-xs text-gray-600">
                        Motif du remplacement
                      </Label>
                      <Textarea
                        id="document-reason"
                        value={documentDescription}
                        onChange={(e) => setDocumentDescription(e.target.value)}
                        placeholder="Ex. : avenant n°2 signé le 12/03."
                        className="mt-1"
                        maxLength={300}
                      />
                    </div>
                  )}

                  <Button
                    onClick={submitDocument}
                    disabled={
                      !documentFile || replaceDocument.isPending || uploadDocument.isPending
                    }
                  >
                    <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
                    {replaceDocument.isPending || uploadDocument.isPending
                      ? "Téléversement…"
                      : contract.file_path
                        ? "Remplacer et archiver l'ancien"
                        : "Déposer le document"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-4 w-4" aria-hidden="true" />
                  Versions antérieures
                </CardTitle>
              </CardHeader>
              <CardContent>
                {versionsQuery.isLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (versionsQuery.data?.length ?? 0) === 0 ? (
                  <p className="py-4 text-center text-sm text-gray-500">
                    Aucune version archivée : le document en vigueur est le premier déposé.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {versionsQuery.data?.map((version) => (
                      <li
                        key={version.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            Version {version.version_number}
                            <span className="ml-2 font-mono text-xs text-gray-500">
                              {version.file_path.split("/").pop()}
                            </span>
                          </p>
                          <p className="text-xs text-gray-500">
                            Archivée le {formatDateTime(version.created_at)}
                            {version.changes_description ? ` · ${version.changes_description}` : ""}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => download(version.file_path, `version-${version.version_number}`)}
                          disabled={downloadingPath === version.file_path}
                        >
                          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                          Télécharger
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- Timeline ---------------------------------------------------- */}
          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Chronologie du contrat ({timeline.length} événement
                  {timeline.length > 1 ? "s" : ""})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {timeline.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-500">
                    Aucun événement enregistré.
                  </p>
                ) : (
                  <ol className="relative space-y-4 border-l pl-6">
                    {timeline.map((entry) => {
                      const Icon =
                        entry.kind === "status"
                          ? getStatusIcon(entry.status ?? contract.statut)
                          : entry.kind === "document"
                            ? FileText
                            : entry.kind === "comment"
                              ? MessageSquare
                              : CheckCircle2;

                      return (
                        <li key={entry.id} className="relative">
                          <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full border bg-white">
                            <Icon className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
                          </span>
                          <div className="flex flex-wrap items-baseline gap-2">
                            <p className="text-sm font-medium text-gray-900">{entry.title}</p>
                            <span className="text-xs text-gray-500">
                              {formatDateTime(entry.at)}
                            </span>
                            {entry.actorEmail && (
                              <span className="text-xs text-gray-500">· {entry.actorEmail}</span>
                            )}
                          </div>
                          {entry.description && (
                            <p className="mt-0.5 whitespace-pre-line text-sm text-gray-600">
                              {entry.description}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- Commentaires ------------------------------------------------ */}
          <TabsContent value="commentaires">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="h-4 w-4" aria-hidden="true" />
                  Commentaires ({commentsQuery.data?.length ?? 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-comment" className="text-xs text-gray-600">
                    Ajouter un commentaire
                  </Label>
                  <Textarea
                    id="new-comment"
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    placeholder="Information utile à l'équipe : pièce reçue, relance client, réserve juridique…"
                    maxLength={1000}
                    disabled={comments.isAdding}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      Visible par votre banque uniquement · {commentDraft.length}/1000
                    </p>
                    <Button size="sm" onClick={submitComment} disabled={!commentDraft.trim() || comments.isAdding}>
                      <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                      Publier
                    </Button>
                  </div>
                </div>

                {commentsQuery.isLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : (commentsQuery.data?.length ?? 0) === 0 ? (
                  <p className="py-4 text-center text-sm text-gray-500">
                    Aucun commentaire pour l'instant.
                  </p>
                ) : (
                  <ul className="space-y-3 border-t pt-4">
                    {commentsQuery.data?.map((comment) => (
                      <li key={comment.id} className="rounded-lg border p-3">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900">
                            {comment.profiles?.full_name || "Utilisateur"}
                            {comment.user_id === user?.id && (
                              <span className="ml-2 text-xs font-normal text-gray-500">
                                (vous)
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {formatDateTime(comment.created_at)}
                              {comment.updated_at && comment.updated_at !== comment.created_at
                                ? " · modifié"
                                : ""}
                            </span>
                            {canDeleteComment(comment.user_id) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                onClick={() => comments.deleteComment(comment.id)}
                                disabled={comments.isDeleting}
                                aria-label="Supprimer ce commentaire"
                                title="Supprimer ce commentaire"
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="mt-1 whitespace-pre-line text-sm text-gray-700">
                          {comment.comment}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- Rappels ----------------------------------------------------- */}
          <TabsContent value="rappels">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarClock className="h-4 w-4" aria-hidden="true" />
                  Rappels programmés ({remindersQuery.data?.length ?? 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {remindersQuery.isLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (remindersQuery.data?.length ?? 0) === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-500">
                    Aucun rappel : renseignez une date de signature ou de renouvellement pour
                    qu'ils soient générés automatiquement.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {remindersQuery.data?.map((reminder) => {
                      const remindAt = new Date(reminder.remind_at);
                      const days = Math.round(
                        (remindAt.getTime() - Date.now()) / 86_400_000,
                      );
                      const overdue = days < 0 && !reminder.is_sent;

                      return (
                        <li
                          key={reminder.id}
                          className="flex flex-wrap items-center justify-between gap-3 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {REMINDER_LABELS[reminder.reminder_type] ?? reminder.reminder_type}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDateTime(reminder.remind_at)} ·{" "}
                              {overdue
                                ? `en retard de ${Math.abs(days)} jour(s)`
                                : days === 0
                                  ? "aujourd'hui"
                                  : `dans ${days} jour(s)`}
                            </p>
                          </div>
                          <Badge
                            variant={reminder.is_sent ? "secondary" : overdue ? "destructive" : "outline"}
                          >
                            {reminder.is_sent ? "Envoyé" : overdue ? "En retard" : "Programmé"}
                          </Badge>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <p className="mt-4 flex items-start gap-2 text-xs text-gray-500">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Rappels générés par la base (30 jours avant l'échéance, 60 jours avant un
                  renouvellement). L'envoi automatique des notifications est prévu au chantier
                  R9 (moteur d'échéances planifié).
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Édition rapide (mêmes règles que la liste) ------------------------- */}
      <ContractDetailDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        contract={contract}
        onSaveChanges={async (contractId, updates) => {
          await updateContract.mutateAsync({ contractId, updates });
        }}
        isSaving={updateContract.isPending}
      />

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiver ce contrat ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {contract.reference_decision} — {contract.client} » sera retiré des listes.
              Aucune donnée n'est détruite : documents, versions, historique de statuts,
              commentaires et piste d'audit sont conservés. Un administrateur peut restaurer le
              contrat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                archiveContract.mutate(
                  { contract },
                  { onSuccess: () => navigate("/dashboard") },
                )
              }
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Archiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ContractDetailPage;
