
import * as z from "zod";

const guaranteeSchema = z.object({
  type: z.string().min(1, "Le type de garantie est requis"),
  hypotheque_type: z.string().optional(),
  details: z.string().optional(),
});

export const contractFormSchema = z.object({
  client: z.string().min(1, "Le nom du client est requis"),
  type: z.string().min(1, "Le type de contrat est requis"),
  montant: z.number().min(0, "Le montant doit être positif"),
  currency: z.string().min(1, "La devise est requise"),
  garanties: z.array(guaranteeSchema)
    .min(1, "Au moins une garantie est requise.")
    .max(4, "Maximum 4 garanties."),
  agence: z.string().min(1, "L'agence est requise"),
  description: z.string().optional(),
}).superRefine((data, ctx) => {
  data.garanties.forEach((g, index) => {
    if (g.type === "hypotheque") {
      if (!g.hypotheque_type) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Champs requis",
          path: [`garanties`, index, `hypotheque_type`],
        });
      }
      if (!g.details || g.details.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Détails requis pour l'hypothèque",
          path: [`garanties`, index, `details`],
        });
      }
    }
  });
});

export type ContractFormData = z.infer<typeof contractFormSchema>;
