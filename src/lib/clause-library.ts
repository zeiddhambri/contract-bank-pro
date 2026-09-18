// ============================================================================
// Bibliothèque de clauses — nomenclature et exports (R4.5)
// ----------------------------------------------------------------------------
// Les catégories de l'ancienne maquette (« SaaS », « Travail », « RGPD »)
// venaient d'un autre produit : elles ne décrivent pas un contrat de
// financement bancaire. La nomenclature ci-dessous reprend les rubriques
// réellement utilisées dans un dossier de crédit.
//
// La valeur stockée en base est le `value` (slug stable) ; le libellé affiché
// peut évoluer sans migration de données.
// ============================================================================
import type { Tables } from "@/integrations/supabase/types";

export type ClauseRow = Tables<"clauses">;

export interface ClauseCategoryDef {
  value: string;
  label: string;
  description: string;
  /** Classes Tailwind du badge (même nuancier que les statuts de contrat). */
  badgeClass: string;
}

export const CLAUSE_CATEGORIES: ClauseCategoryDef[] = [
  {
    value: "garanties",
    label: "Garanties & sûretés",
    description: "Hypothèque, caution, gage, nantissement, privilèges",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  {
    value: "conditions_financieres",
    label: "Conditions financières",
    description: "Taux fixe ou révisable, intérêts, frais, pénalités",
    badgeClass: "border-blue-200 bg-blue-50 text-blue-800",
  },
  {
    value: "remboursement",
    label: "Remboursement",
    description: "Échéancier, différé, remboursement anticipé",
    badgeClass: "border-cyan-200 bg-cyan-50 text-cyan-800",
  },
  {
    value: "defaut",
    label: "Défaut & exigibilité",
    description: "Cas de défaut, déchéance du terme, mise en demeure",
    badgeClass: "border-red-200 bg-red-50 text-red-800",
  },
  {
    value: "assurances",
    label: "Assurances",
    description: "Assurance emprunteur, délégation, dommages",
    badgeClass: "border-violet-200 bg-violet-50 text-violet-800",
  },
  {
    value: "conformite",
    label: "Conformité",
    description: "LCB-FT, RGPD, devoir de conseil, connaissance client",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-800",
  },
  {
    value: "confidentialite",
    label: "Confidentialité",
    description: "Secret bancaire, divulgation, sous-traitants",
    badgeClass: "border-slate-200 bg-slate-100 text-slate-700",
  },
  {
    value: "resiliation",
    label: "Résiliation",
    description: "Fin anticipée, clôture, restitution des fonds",
    badgeClass: "border-orange-200 bg-orange-50 text-orange-800",
  },
  {
    value: "litiges",
    label: "Litiges & loi applicable",
    description: "Juridiction compétente, droit applicable, médiation",
    badgeClass: "border-indigo-200 bg-indigo-50 text-indigo-800",
  },
  {
    value: "divers",
    label: "Divers",
    description: "Clauses hors nomenclature, à reclasser",
    badgeClass: "border-gray-200 bg-gray-100 text-gray-700",
  },
];

const CATEGORY_BY_VALUE = new Map(CLAUSE_CATEGORIES.map((c) => [c.value, c]));

/** Libellé d'une catégorie ; tolère une valeur libre héritée d'un import. */
export function clauseCategoryLabel(value: string | null | undefined): string {
  if (!value) return "Non classée";
  return CATEGORY_BY_VALUE.get(value)?.label ?? value;
}

export function clauseCategoryDef(value: string | null | undefined): ClauseCategoryDef | null {
  if (!value) return null;
  return CATEGORY_BY_VALUE.get(value) ?? null;
}

export function clauseCategoryBadgeClass(value: string | null | undefined): string {
  return (
    clauseCategoryDef(value)?.badgeClass ?? "border-gray-200 bg-gray-100 text-gray-700"
  );
}

/** Valeur de catégorie acceptée par la base : slug connu ou texte libre court. */
export function normalizeClauseCategory(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (CATEGORY_BY_VALUE.has(slug)) return slug;

  // Une banque peut ajouter sa propre rubrique : on conserve le libellé saisi.
  return value.trim().slice(0, 60);
}

// ----------------------------------------------------------------------------
// Tags
// ----------------------------------------------------------------------------
/** Transforme une saisie libre (« caution, acte notarié ») en liste propre. */
export function parseTags(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(/[;,]/)
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
        .map((tag) => tag.slice(0, 40)),
    ),
  ).slice(0, 12);
}

export function tagsToInput(tags: string[] | null | undefined): string {
  return (tags ?? []).join(", ");
}

// ----------------------------------------------------------------------------
// Validation (mêmes seuils que les contraintes CHECK de la base)
// ----------------------------------------------------------------------------
export const CLAUSE_LIMITS = {
  titleMin: 3,
  titleMax: 160,
  contentMin: 20,
  contentMax: 20_000,
} as const;

export interface ClauseValidation {
  titleError?: string;
  contentError?: string;
}

/**
 * Contrôle côté client aligné sur les contraintes SQL : l'utilisateur voit
 * l'erreur avant l'aller-retour réseau, et le message correspond au refus de
 * la base s'il passe outre.
 */
export function validateClause(title: string, content: string): ClauseValidation {
  const result: ClauseValidation = {};
  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();

  if (trimmedTitle.length < CLAUSE_LIMITS.titleMin) {
    result.titleError = `Titre trop court (${CLAUSE_LIMITS.titleMin} caractères minimum).`;
  } else if (trimmedTitle.length > CLAUSE_LIMITS.titleMax) {
    result.titleError = `Titre trop long (${CLAUSE_LIMITS.titleMax} caractères maximum).`;
  }

  if (trimmedContent.length < CLAUSE_LIMITS.contentMin) {
    result.contentError = `Rédaction trop courte (${CLAUSE_LIMITS.contentMin} caractères minimum) : une clause doit être exploitable telle quelle.`;
  } else if (trimmedContent.length > CLAUSE_LIMITS.contentMax) {
    result.contentError = `Rédaction trop longue (${CLAUSE_LIMITS.contentMax} caractères maximum).`;
  }

  return result;
}

// ----------------------------------------------------------------------------
// Exports (le contenu de la bibliothèque appartient à la banque)
// ----------------------------------------------------------------------------
function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export function clausesToMarkdown(clauses: ClauseRow[], bankName?: string): string {
  const header = [
    `# Bibliothèque de clauses${bankName ? ` — ${bankName}` : ""}`,
    "",
    `> ${clauses.length} clause(s) · export du ${new Date().toISOString().slice(0, 10)}`,
    "",
  ];

  const body = clauses.flatMap((clause) => [
    `## ${clause.title}`,
    "",
    `- Catégorie : ${clauseCategoryLabel(clause.category)}`,
    `- Version : ${clause.version}${clause.is_active ? "" : " (désactivée)"}`,
    clause.tags.length > 0 ? `- Étiquettes : ${clause.tags.join(", ")}` : "",
    `- Mise à jour : ${formatDate(clause.updated_at)}`,
    "",
    clause.content,
    "",
  ]);

  return [...header, ...body].filter((line) => line !== "").join("\n").replace(/\n{3,}/g, "\n\n");
}

export function clausesToJson(clauses: ClauseRow[], bankName?: string): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      bank: bankName ?? null,
      count: clauses.length,
      clauses: clauses.map((clause) => ({
        title: clause.title,
        category: clause.category,
        categoryLabel: clauseCategoryLabel(clause.category),
        tags: clause.tags,
        version: clause.version,
        isActive: clause.is_active,
        updatedAt: clause.updated_at,
        content: clause.content,
      })),
    },
    null,
    2,
  );
}

export function downloadTextFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
