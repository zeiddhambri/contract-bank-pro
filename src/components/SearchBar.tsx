// ============================================================================
// Recherche globale (R3.2)
// ----------------------------------------------------------------------------
// Avant : une barre qui ne déclenchait rien — `onSubmit` vide, plus un panneau
// « Filtres avancés » proposant une priorité et une période **absentes du modèle
// de données**. Un contrôle qui ne fait rien coûte plus cher qu'un contrôle
// absent : l'utilisateur doute de l'outil.
//
// Maintenant : recherche pilotée par le tableau de bord, partagée avec la liste
// des contrats (même état, même requête serveur `ilike`), et les filtres
// avancés réels (phase, statut) restent là où ils s'appliquent — dans la liste.
// ============================================================================
import React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  value: string;
  onValueChange: (value: string) => void;
  /** Appelé à la validation (Entrée ou bouton) : permet de changer de vue. */
  onSubmit?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onValueChange,
  onSubmit,
  placeholder = "Rechercher un client, une référence, une agence…",
  className = "",
}) => {
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit?.(value);
  };

  return (
    <form onSubmit={handleSubmit} role="search" className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={placeholder}
          aria-label="Rechercher dans les contrats"
          className="w-56 pl-9 sm:w-80"
          autoComplete="off"
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0 text-gray-400 hover:text-gray-700"
            onClick={() => {
              onValueChange("");
              onSubmit?.("");
            }}
            aria-label="Effacer la recherche"
            title="Effacer la recherche"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
      <Button type="submit" size="sm" variant="outline">
        Rechercher
      </Button>
    </form>
  );
};

export default SearchBar;
