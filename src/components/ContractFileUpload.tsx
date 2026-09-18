// ============================================================================
// Dépôt / téléchargement du document contractuel
// ----------------------------------------------------------------------------
// Le document est stocké dans un bucket PRIVÉ : le téléchargement passe par une
// URL signée générée à la demande (R1.2). Plus aucun lien public n'est produit.
// ============================================================================
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Download, Loader2, Paperclip, ShieldCheck } from "lucide-react";

interface ContractFileUploadProps {
  filePath: string | null;
  file: File | null;
  isUploading: boolean;
  /** Téléchargement en cours (génération de l'URL signée + transfert). */
  isDownloading?: boolean;
  /** Déclenche le téléchargement sécurisé du document existant. */
  onDownload?: (filePath: string) => void | Promise<void>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ContractFileUpload: React.FC<ContractFileUploadProps> = ({
  filePath,
  file,
  isUploading,
  isDownloading = false,
  onDownload,
  handleFileChange,
}) => {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">Fichier contractuel</Label>

      {filePath && (
        <Button
          type="button"
          variant="outline"
          className="mt-1 w-full justify-start"
          disabled={isDownloading || !onDownload}
          onClick={() => onDownload?.(filePath)}
        >
          {isDownloading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          {isDownloading ? "Préparation du lien sécurisé…" : "Télécharger le fichier actuel"}
        </Button>
      )}

      <div className="mt-2 space-y-1">
        <Label htmlFor="file-upload" className="text-sm font-medium sr-only">
          {filePath ? "Remplacer le fichier" : "Ajouter un fichier"}
        </Label>
        <Input
          id="file-upload"
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt"
          onChange={handleFileChange}
          disabled={isUploading}
        />
        {file && (
          <p className="text-sm text-muted-foreground flex items-center pt-1">
            <Paperclip className="h-4 w-4 mr-2" aria-hidden="true" /> {file.name}
          </p>
        )}
        {filePath && (
          <p className="text-xs text-muted-foreground pt-1">
            {file
              ? "Le nouveau fichier remplacera l'ancien lors de la sauvegarde."
              : "Vous pouvez remplacer le fichier existant."}
          </p>
        )}
        <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
          <ShieldCheck className="h-3 w-3" aria-hidden="true" />
          Stockage privé — lien de téléchargement à durée limitée, accès journalisé.
        </p>
      </div>
    </div>
  );
};

export default ContractFileUpload;
