// ============================================================================
// Bibliothèque de clauses (R4.5)
// ----------------------------------------------------------------------------
// Remplace `ClauseManager` : trois clauses de démonstration, un faux
// chargement d'une seconde et des enregistrements perdus au rafraîchissement.
//
// Désormais : table `public.clauses` cloisonnée par banque, création /
// modification / suppression persistantes, version incrémentée par le serveur
// sur chaque changement éditorial, auteur et dernier modificateur imposés en
// base, exports JSON et Markdown, et copie du texte pour réutilisation dans un
// contrat.
//
// Aucun bouton d'« amélioration IA » : l'ancienne version simulait un appel
// (attente de 2 s puis ajout de la mention « fonctionnalité en développement »).
// Un assistant réel, branché sur les données du tenant et clairement identifié
// comme brouillon à valider, est le chantier R9.
// ============================================================================
import React, { useMemo, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  BookOpen,
  Check,
  Copy,
  Download,
  Library,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import QueryErrorState from "@/components/QueryErrorState";
import {
  DEFAULT_CLAUSE_FILTERS,
  filterClauses,
  useClauses,
  useClauseMutations,
  type ClauseDraft,
} from "@/hooks/useClauses";
import type { ClauseRow } from "@/lib/clause-library";
import {
  CLAUSE_CATEGORIES,
  CLAUSE_LIMITS,
  clauseCategoryBadgeClass,
  clauseCategoryLabel,
  clausesToJson,
  clausesToMarkdown,
  downloadTextFile,
  parseTags,
  tagsToInput,
  validateClause,
} from "@/lib/clause-library";
import { AUDIT_ACTIONS, logAction } from "@/lib/audit-log";

const EMPTY_DRAFT: ClauseDraft = {
  title: "",
  content: "",
  category: CLAUSE_CATEGORIES[0].value,
  tags: [],
  isActive: true,
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : format(date, "dd MMM yyyy 'à' HH:mm", { locale: fr });
};

const ClauseLibrary = () => {
  const { bank } = useAuth();
  const clausesQuery = useClauses();
  const { createClause, updateClause, deleteClause, isSaving, isDeleting } =
    useClauseMutations();

  const [filters, setFilters] = useState(DEFAULT_CLAUSE_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ClauseDraft>(EMPTY_DRAFT);
  const [tagsInput, setTagsInput] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  /** Sélection demandée pendant qu'une modification n'est pas enregistrée. */
  const [pendingSelection, setPendingSelection] = useState<string | null | undefined>(undefined);
  const [clauseToDelete, setClauseToDelete] = useState<ClauseRow | null>(null);

  const clauses = useMemo(() => clausesQuery.data ?? [], [clausesQuery.data]);
  const visible = useMemo(() => filterClauses(clauses, filters), [clauses, filters]);
  const selected = useMemo(
    () => clauses.find((clause) => clause.id === selectedId) ?? null,
    [clauses, selectedId],
  );

  /**
   * Charge une clause dans le formulaire (ou le vide pour une création).
   * Volontairement sans `useEffect` : un rafraîchissement de la liste ne doit
   * jamais écraser une rédaction en cours.
   */
  const openClause = (clause: ClauseRow | null) => {
    setSelectedId(clause?.id ?? null);
    setDraft(
      clause
        ? {
            title: clause.title,
            content: clause.content,
            category: clause.category,
            tags: clause.tags ?? [],
            isActive: clause.is_active,
          }
        : EMPTY_DRAFT,
    );
    setTagsInput(tagsToInput(clause?.tags));
    setIsDirty(false);
  };

  const patchDraft = (patch: Partial<ClauseDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setIsDirty(true);
  };

  const validation = validateClause(draft.title, draft.content);
  const canSave = !validation.titleError && !validation.contentError && !isSaving;

  const activeCount = clauses.filter((clause) => clause.is_active).length;
  const categoriesInUse = new Set(clauses.map((clause) => clause.category)).size;

  const requestSelection = (id: string | null) => {
    if (id === selectedId) return;

    if (isDirty) {
      setPendingSelection(id);
      return;
    }

    openClause(id ? clauses.find((clause) => clause.id === id) ?? null : null);
  };

  const discardPendingSelection = () => {
    if (pendingSelection === undefined) return;

    openClause(
      pendingSelection
        ? clauses.find((clause) => clause.id === pendingSelection) ?? null
        : null,
    );
    setPendingSelection(undefined);
  };

  const saveDraft = async () => {
    if (!canSave) return;

    const payload: ClauseDraft = { ...draft, tags: parseTags(tagsInput) };

    if (selectedId) {
      updateClause(
        { id: selectedId, draft: payload },
        // La ligne renvoyée porte la nouvelle version attribuée par la base.
        { onSuccess: (updated) => openClause(updated) },
      );
      return;
    }

    createClause(payload, { onSuccess: (created) => openClause(created) });
  };

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(draft.content);
      toast({
        title: "Texte copié",
        description: "Collez-le dans le contrat ou le modèle concerné.",
      });
      if (selectedId) {
        void logAction(AUDIT_ACTIONS.exportData, {
          clauseId: selectedId,
          mode: "clipboard",
        });
      }
    } catch {
      toast({
        title: "Copie impossible",
        description: "Le presse-papiers est inaccessible dans ce navigateur.",
        variant: "destructive",
      });
    }
  };

  const exportLibrary = (format: "json" | "markdown") => {
    if (visible.length === 0) {
      toast({
        title: "Rien à exporter",
        description: "Aucune clause ne correspond aux filtres actuels.",
        variant: "destructive",
      });
      return;
    }

    const stamp = new Date().toISOString().slice(0, 10);
    const name = bank?.name ? `-${bank.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : "";

    if (format === "json") {
      downloadTextFile(clausesToJson(visible, bank?.name), `clauses${name}-${stamp}.json`, "application/json");
    } else {
      downloadTextFile(
        clausesToMarkdown(visible, bank?.name),
        `clauses${name}-${stamp}.md`,
        "text/markdown",
      );
    }

    toast({ title: `Export ${format === "json" ? "JSON" : "Markdown"} terminé`, description: `${visible.length} clause(s).` });
    void logAction(AUDIT_ACTIONS.exportData, {
      scope: "clauses",
      format,
      count: visible.length,
    });
  };

  // ------------------------------------------------------------------ états
  if (clausesQuery.isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (clausesQuery.isError) {
    return (
      <QueryErrorState
        title="Bibliothèque de clauses indisponible"
        message={clausesQuery.error instanceof Error ? clausesQuery.error.message : null}
        hint="Si la table `clauses` n'existe pas encore, appliquez la migration 20260917090000-clause-library.sql."
        onRetry={() => void clausesQuery.refetch()}
        isRetrying={clausesQuery.isFetching}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Bandeau : compteurs, recherche, filtres, exports ------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <Library className="h-5 w-5 text-blue-600" aria-hidden="true" />
            Bibliothèque de clauses
            <Badge variant="secondary" className="bg-slate-100 text-slate-700">
              {activeCount} active{activeCount > 1 ? "s" : ""} / {clauses.length}
            </Badge>
            {categoriesInUse > 0 && (
              <span className="text-xs font-normal text-gray-500">
                {categoriesInUse} catégorie{categoriesInUse > 1 ? "s" : ""} utilisée
                {categoriesInUse > 1 ? "s" : ""}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={filters.search}
                onChange={(e) => setFilters((c) => ({ ...c, search: e.target.value }))}
                placeholder="Rechercher dans le titre, la rédaction ou les étiquettes…"
                aria-label="Rechercher une clause"
                className="pl-9"
              />
            </div>

            <div>
              <Label htmlFor="clause-category-filter" className="sr-only">
                Catégorie
              </Label>
              <select
                id="clause-category-filter"
                value={filters.category}
                onChange={(e) => setFilters((c) => ({ ...c, category: e.target.value }))}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-ring"
              >
                <option value="all">Toutes les catégories</option>
                {CLAUSE_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={filters.includeInactive}
                onChange={(e) =>
                  setFilters((c) => ({ ...c, includeInactive: e.target.checked }))
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              Inclure les clauses désactivées
            </label>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => exportLibrary("markdown")}>
                <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                Markdown
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportLibrary("json")}>
                <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                JSON
              </Button>
              <Button size="sm" onClick={() => requestSelection(null)}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Nouvelle clause
              </Button>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Bibliothèque propre à {bank?.name ?? "votre banque"} : chaque clause est versionnée,
            attribuée à son auteur et journalisée. Les catégories couvrent les rubriques d'un
            dossier de crédit (garanties, conditions financières, défaut, conformité…).
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Liste ------------------------------------------------------------ */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">
              Clauses ({visible.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clauses.length === 0 ? (
              <div className="py-8 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-gray-300" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium text-gray-900">
                  Bibliothèque vide
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Rédigez la première clause réutilisable : garanties, conditions
                  financières, défaut, conformité…
                </p>
                <Button size="sm" className="mt-3" onClick={() => requestSelection(null)}>
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Créer une clause
                </Button>
              </div>
            ) : visible.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm font-medium text-gray-900">Aucun résultat</p>
                <p className="mt-1 text-sm text-gray-500">
                  Aucune clause ne correspond à ces critères.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setFilters(DEFAULT_CLAUSE_FILTERS)}
                >
                  Réinitialiser les filtres
                </Button>
              </div>
            ) : (
              <ul className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
                {visible.map((clause) => {
                  const isSelected = clause.id === selectedId;

                  return (
                    <li key={clause.id}>
                      <button
                        type="button"
                        onClick={() => requestSelection(clause.id)}
                        aria-current={isSelected ? "true" : undefined}
                        className={`w-full rounded-lg border p-3 text-left transition-colors ${
                          isSelected
                            ? "border-blue-300 bg-blue-50"
                            : "hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <p className="truncate text-sm font-medium text-gray-900">
                          {clause.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={clauseCategoryBadgeClass(clause.category)}
                          >
                            {clauseCategoryLabel(clause.category)}
                          </Badge>
                          <span className="text-xs text-gray-500">v{clause.version}</span>
                          {!clause.is_active && (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                              désactivée
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Mise à jour le {formatDate(clause.updated_at)}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Éditeur ---------------------------------------------------------- */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <Pencil className="h-4 w-4" aria-hidden="true" />
              {selectedId ? (selected?.title ?? "Clause") : "Nouvelle clause"}
              {isDirty && (
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                  modifications non enregistrées
                </Badge>
              )}
              {selected && (
                <span className="ml-auto text-xs font-normal text-gray-500">
                  version {selected.version} · créée le {formatDate(selected.created_at)}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="clause-title">Titre</Label>
                <Input
                  id="clause-title"
                  value={draft.title}
                  onChange={(e) => patchDraft({ title: e.target.value })}
                  placeholder="Ex. : Délégation d'assurance emprunteur"
                  maxLength={CLAUSE_LIMITS.titleMax}
                  aria-invalid={Boolean(validation.titleError)}
                  aria-describedby={validation.titleError ? "clause-title-error" : undefined}
                  className="mt-1"
                />
                {validation.titleError ? (
                  <p id="clause-title-error" className="mt-1 text-xs text-red-600">
                    {validation.titleError}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">
                    {draft.title.trim().length}/{CLAUSE_LIMITS.titleMax} · unique par banque
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="clause-category">Catégorie</Label>
                <select
                  id="clause-category"
                  value={draft.category}
                  onChange={(e) => patchDraft({ category: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-ring"
                >
                  {CLAUSE_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {CLAUSE_CATEGORIES.find((c) => c.value === draft.category)?.description}
                </p>
              </div>

              <div>
                <Label htmlFor="clause-tags">Étiquettes</Label>
                <Input
                  id="clause-tags"
                  value={tagsInput}
                  onChange={(e) => {
                    setTagsInput(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="caution, acte notarié, quotité"
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Séparées par des virgules · 12 maximum, 40 caractères chacune
                </p>
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="clause-content">Rédaction</Label>
                <Textarea
                  id="clause-content"
                  value={draft.content}
                  onChange={(e) => patchDraft({ content: e.target.value })}
                  rows={14}
                  maxLength={CLAUSE_LIMITS.contentMax}
                  aria-invalid={Boolean(validation.contentError)}
                  aria-describedby={
                    validation.contentError ? "clause-content-error" : "clause-content-help"
                  }
                  placeholder="Texte intégral de la clause, prêt à être inséré dans un contrat."
                  className="mt-1 font-mono text-sm"
                />
                {validation.contentError ? (
                  <p id="clause-content-error" className="mt-1 text-xs text-red-600">
                    {validation.contentError}
                  </p>
                ) : (
                  <p id="clause-content-help" className="mt-1 text-xs text-gray-500">
                    {draft.content.trim().length} caractère(s) · minimum{" "}
                    {CLAUSE_LIMITS.contentMin}
                  </p>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(e) => patchDraft({ isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Clause active (proposée à la réutilisation)
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t pt-4">
              <Button onClick={saveDraft} disabled={!canSave}>
                <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                {isSaving
                  ? "Enregistrement…"
                  : selectedId
                    ? "Enregistrer les modifications"
                    : "Créer la clause"}
              </Button>

              <Button variant="outline" onClick={copyContent} disabled={!draft.content.trim()}>
                <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                Copier le texte
              </Button>

              {selectedId && (
                <Button
                  variant="outline"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => selected && setClauseToDelete(selected)}
                  disabled={isDeleting}
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  Supprimer
                </Button>
              )}

              {isDirty && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDraft(
                      selected
                        ? {
                            title: selected.title,
                            content: selected.content,
                            category: selected.category,
                            tags: selected.tags ?? [],
                            isActive: selected.is_active,
                          }
                        : EMPTY_DRAFT,
                    );
                    setTagsInput(tagsToInput(selected?.tags));
                    setIsDirty(false);
                  }}
                >
                  Annuler les modifications
                </Button>
              )}
            </div>

            <p className="text-xs text-gray-500">
              La version n'avance que si le titre ou la rédaction change ; l'auteur, le dernier
              modificateur et les horodatages sont écrits par la base, jamais par le navigateur.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Modifications non enregistrées ------------------------------------- */}
      <AlertDialog
        open={pendingSelection !== undefined}
        onOpenChange={(open) => !open && setPendingSelection(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modifications non enregistrées</AlertDialogTitle>
            <AlertDialogDescription>
              La clause en cours de rédaction n'est pas enregistrée. Voulez-vous la conserver
              avant de changer de clause ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <Button variant="outline" onClick={discardPendingSelection}>
              Abandonner
            </Button>
            <AlertDialogAction
              onClick={async () => {
                await saveDraft();
                setPendingSelection(undefined);
              }}
              disabled={!canSave}
            >
              Enregistrer puis continuer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation de suppression ---------------------------------------- */}
      <AlertDialog
        open={Boolean(clauseToDelete)}
        onOpenChange={(open) => !open && setClauseToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette clause ?</AlertDialogTitle>
            <AlertDialogDescription>
              {clauseToDelete
                ? `« ${clauseToDelete.title} » (version ${clauseToDelete.version}) sera définitivement retirée de la bibliothèque. Les contrats déjà rédigés ne sont pas modifiés. Vous pouvez aussi la désactiver pour la conserver sans la proposer.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!clauseToDelete) return;
                deleteClause(clauseToDelete, {
                  onSuccess: () => {
                    if (selectedId === clauseToDelete.id) setSelectedId(null);
                  },
                });
                setClauseToDelete(null);
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClauseLibrary;
