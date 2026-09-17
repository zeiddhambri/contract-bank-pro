// ============================================================================
// État d'erreur réutilisable (R3.6)
// ----------------------------------------------------------------------------
// Une coupure réseau ou un refus RLS ne doit jamais s'afficher comme une liste
// vide (« Aucun contrat disponible ») : l'utilisateur croirait ses données
// perdues. Ce composant distingue explicitement l'erreur du vide, explique la
// cause et propose de réessayer.
// ============================================================================
import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export interface QueryErrorStateProps {
  /** Titre court, adapté au contexte (« Contrats indisponibles »…). */
  title?: string;
  /** Message technique restitué tel quel (PostgREST, RLS, réseau). */
  message?: string | null;
  /**
   * Conseil d'exploitation affiché sous le message (migration à appliquer,
   * droit manquant…). Réservé aux causes que l'utilisateur peut corriger.
   */
  hint?: string | null;
  onRetry?: () => void;
  isRetrying?: boolean;
  /** Variante compacte (carte de tableau de bord plutôt que pleine page). */
  compact?: boolean;
}

const QueryErrorState: React.FC<QueryErrorStateProps> = ({
  title = "Données indisponibles",
  message,
  hint,
  onRetry,
  isRetrying = false,
  compact = false,
}) => (
  <Card className={compact ? "" : "border-red-200"}>
    <CardContent className={compact ? "p-4" : "p-8"}>
      <div
        className={`flex ${compact ? "items-start" : "flex-col items-center"} gap-3 text-center ${
          compact ? "" : "mx-auto max-w-md"
        }`}
        role="alert"
      >
        <AlertTriangle className="h-6 w-6 shrink-0 text-red-500" aria-hidden="true" />
        <div className={compact ? "text-left" : ""}>
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm text-slate-600">
            {message ||
              "La connexion au serveur a échoué. Vos données n'ont pas été modifiées."}
          </p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={isRetrying}
            className={compact ? "ml-auto shrink-0" : "mt-2"}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isRetrying ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            {isRetrying ? "Nouvelle tentative…" : "Réessayer"}
          </Button>
        )}
      </div>
    </CardContent>
  </Card>
);

export default QueryErrorState;
