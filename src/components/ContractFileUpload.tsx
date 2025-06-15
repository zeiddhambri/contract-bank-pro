
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Download, Paperclip } from "lucide-react";

interface ContractFileUploadProps {
  filePath: string | null;
  file: File | null;
  isUploading: boolean;
  getFileUrl: (filePath: string) => string;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ContractFileUpload: React.FC<ContractFileUploadProps> = ({ filePath, file, isUploading, getFileUrl, handleFileChange }) => {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">Fichier contractuel</Label>
      {filePath && (
        <Button asChild variant="outline" className="mt-1 w-full justify-start">
          <a href={getFileUrl(filePath)} target="_blank" rel="noopener noreferrer">
            <Download className="mr-2 h-4 w-4" />
            Télécharger le fichier actuel
          </a>
        </Button>
      )}
      <div className="mt-2 space-y-1">
        <Label htmlFor="file-upload" className="text-sm font-medium sr-only">
          {filePath ? "Remplacer le fichier" : "Ajouter un fichier"}
        </Label>
        <Input
          id="file-upload"
          type="file"
          onChange={handleFileChange}
          disabled={isUploading}
        />
        {file && (
          <p className="text-sm text-muted-foreground flex items-center pt-1">
            <Paperclip className="h-4 w-4 mr-2" /> {file.name}
          </p>
        )}
          {filePath && (
            <p className="text-xs text-muted-foreground pt-1">
                {file ? 'Le nouveau fichier remplacera l\'ancien lors de la sauvegarde.' : 'Vous pouvez remplacer le fichier existant.'}
            </p>
        )}
      </div>
    </div>
  );
};

export default ContractFileUpload;
