// ============================================================================
// Formulaire de la fiche contrat (R2)
// ----------------------------------------------------------------------------
// • La référence de décision est **immuable** (trigger SQL) : champ en lecture
//   seule plutôt qu'une saisie qui échouerait au moment d'enregistrer.
// • Le montant est toujours présenté avec sa devise (contrainte SQL
//   `valid_currency` : EUR, USD, TND).
// • Le sélecteur de statut ne propose que les transitions autorisées pour le
//   rôle courant ; la base reste l'autorité (message d'erreur en français).
// ============================================================================
import React from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import ContractStatusSelect from "./ContractStatusSelect";
import {
  AGENCE_LABELS,
  CURRENCIES,
  DEFAULT_CURRENCY,
  isCurrency,
} from "@/lib/contract-helpers";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";
import type { ContractStatus } from "@/lib/contract-status";

interface ContractDetailFormProps {
  editedContract: Tables<"contracts">;
  handleFieldChange: (
    field: keyof TablesUpdate<"contracts">,
    value: string | number | null,
  ) => void;
  isSaving: boolean;
  /** Transitions autorisées pour le rôle courant (undefined = création). */
  allowedStatuses?: ContractStatus[];
}

/** `YYYY-MM-DD` attendu par `<input type="date">` (la base renvoie une ISO). */
const toDateInputValue = (value: string | null | undefined): string =>
  value ? value.slice(0, 10) : "";

const ContractDetailForm: React.FC<ContractDetailFormProps> = ({
  editedContract,
  handleFieldChange,
  isSaving,
  allowedStatuses,
}) => {
  const currency = isCurrency(editedContract.currency)
    ? editedContract.currency
    : DEFAULT_CURRENCY;

  return (
    <>
      <div>
        <Label htmlFor="reference_decision" className="text-xs text-muted-foreground">
          Référence de décision
        </Label>
        <Input
          id="reference_decision"
          value={editedContract.reference_decision || ""}
          readOnly
          disabled={isSaving}
          className="bg-muted font-mono text-sm"
          aria-describedby="reference_decision-help"
        />
        <p id="reference_decision-help" className="mt-1 text-xs text-muted-foreground">
          Attribuée automatiquement à la création, par banque. Non modifiable (traçabilité).
        </p>
      </div>

      <div>
        <Label htmlFor="client" className="text-xs text-muted-foreground">
          Client
        </Label>
        <Input
          id="client"
          value={editedContract.client || ""}
          disabled={isSaving}
          minLength={2}
          maxLength={200}
          required
          onChange={(e) => handleFieldChange("client", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <div>
          <Label htmlFor="montant" className="text-xs text-muted-foreground">
            Montant
          </Label>
          <Input
            id="montant"
            type="number"
            inputMode="decimal"
            min={0.01}
            step={0.01}
            value={editedContract.montant ?? 0}
            disabled={isSaving}
            required
            onChange={(e) => handleFieldChange("montant", Number(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="currency" className="text-xs text-muted-foreground">
            Devise
          </Label>
          <select
            id="currency"
            value={currency}
            disabled={isSaving}
            onChange={(e) => handleFieldChange("currency", e.target.value)}
            className="mt-1 block w-full rounded-md border-input bg-background py-2 pl-3 pr-8 text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-ring"
          >
            {CURRENCIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="date_decision" className="text-xs text-muted-foreground">
            Date de décision
          </Label>
          <Input
            id="date_decision"
            type="date"
            value={toDateInputValue(editedContract.date_decision)}
            disabled={isSaving}
            onChange={(e) => handleFieldChange("date_decision", e.target.value || null)}
          />
        </div>
        <div>
          <Label htmlFor="date_signature" className="text-xs text-muted-foreground">
            Date de signature
          </Label>
          <Input
            id="date_signature"
            type="date"
            value={toDateInputValue(editedContract.date_signature)}
            disabled={isSaving}
            onChange={(e) => handleFieldChange("date_signature", e.target.value || null)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="expiry_date" className="text-xs text-muted-foreground">
          Échéance du contrat
        </Label>
        <Input
          id="expiry_date"
          type="date"
          value={toDateInputValue(editedContract.expiry_date)}
          disabled={isSaving}
          onChange={(e) => handleFieldChange("expiry_date", e.target.value || null)}
          aria-describedby="expiry_date-help"
        />
        <p id="expiry_date-help" className="mt-1 text-xs text-muted-foreground">
          Sert aux rappels automatiques (J-30) et au passage en « Expiré ».
        </p>
      </div>

      <div>
        <Label htmlFor="agence" className="text-xs text-muted-foreground">
          Agence
        </Label>
        <select
          id="agence"
          value={editedContract.agence || ""}
          disabled={isSaving}
          onChange={(e) => handleFieldChange("agence", e.target.value)}
          className="mt-1 block w-full rounded-md border-input bg-background py-2 px-3 text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-ring"
        >
          {Object.entries(AGENCE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="statut" className="text-xs text-muted-foreground">
          Statut
        </Label>
        <ContractStatusSelect
          id="statut"
          value={editedContract.statut}
          disabled={isSaving}
          allowed={allowedStatuses}
          showHint
          onChange={(next) => handleFieldChange("statut", next)}
        />
      </div>
    </>
  );
};

export default ContractDetailForm;
