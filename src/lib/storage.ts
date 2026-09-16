// ============================================================================
// Stockage des documents contractuels — privé + URLs signées (R1.2 / B02)
// ----------------------------------------------------------------------------
// Le bucket `contract_files` n'est plus public : chaque lecture passe par une
// URL signée à durée de vie courte, et chaque écriture est tracée.
// Convention de chemin : {bank_id}/{contract_id}/{horodatage}_{nom-nettoyé}
// Les politiques RLS de storage.objects vérifient que le premier segment
// correspond à la banque de l'utilisateur.
// ============================================================================
import { supabase, CONTRACT_FILES_BUCKET } from '@/integrations/supabase/client';

/** Taille maximale acceptée (25 Mo). */
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

/** Types acceptés pour un document contractuel. */
export const ALLOWED_FILE_TYPES: readonly string[] = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/plain',
] as const;

/** Durée de validité d'une URL signée, en secondes. */
export const SIGNED_URL_TTL_SECONDS = 60;

/**
 * Valide un fichier avant téléversement.
 * @returns un message d'erreur lisible, ou `null` si le fichier est accepté.
 */
export function validateContractFile(file: File): string | null {
  if (file.size === 0) {
    return 'Le fichier est vide.';
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `Le fichier dépasse la taille maximale de ${Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))} Mo.`;
  }
  // Certains navigateurs renvoient un type vide : on tolère alors l'extension.
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'webp', 'txt'];
  if (file.type && !ALLOWED_FILE_TYPES.includes(file.type) && !allowedExtensions.includes(extension)) {
    return `Format non pris en charge (${file.type || extension || 'inconnu'}). Formats acceptés : PDF, Word, Excel, PNG, JPEG, WEBP, TXT.`;
  }
  return null;
}

/** Nom de fichier sûr (aucun caractère de chemin, aucune injection possible). */
function sanitizeFileName(name: string): string {
  const cleaned = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(-120);
  return cleaned || 'document';
}

/** Construit le chemin de stockage scopé à la banque et au contrat. */
export function contractFilePath(bankId: string, contractId: string, fileName: string): string {
  return `${bankId}/${contractId}/${Date.now()}_${sanitizeFileName(fileName)}`;
}

export interface UploadContractFileParams {
  bankId: string;
  contractId: string;
  file: File;
}

/**
 * Téléverse un document contractuel dans le périmètre de la banque.
 * @returns le chemin stocké (à enregistrer dans `contracts.file_path`).
 */
export async function uploadContractFile({
  bankId,
  contractId,
  file,
}: UploadContractFileParams): Promise<string> {
  const validationError = validateContractFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const path = contractFilePath(bankId, contractId, file.name);
  const { error } = await supabase.storage
    .from(CONTRACT_FILES_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });

  if (error) {
    throw new Error(`Téléversement refusé : ${error.message}`);
  }

  return path;
}

/** Remplace le document d'un contrat (suppression de l'ancien puis envoi). */
export async function replaceContractFile(
  params: UploadContractFileParams & { previousPath: string | null },
): Promise<string> {
  const path = await uploadContractFile(params);
  if (params.previousPath && params.previousPath !== path) {
    // Un échec de suppression ne doit pas bloquer le remplacement.
    const { error } = await supabase.storage
      .from(CONTRACT_FILES_BUCKET)
      .remove([params.previousPath]);
    if (error) {
      console.warn('Ancien document non supprimé :', error.message);
    }
  }
  return path;
}

/**
 * Génère une URL signée de courte durée pour consulter un document.
 * Aucune URL publique n'est produite.
 */
export async function getSignedFileUrl(path: string, fileName?: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(CONTRACT_FILES_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS, {
      download: fileName ?? path.split('/').pop() ?? 'document',
    });

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? 'Impossible de générer un lien sécurisé.');
  }
  return data.signedUrl;
}

/** Déclenche le téléchargement sécurisé d'un document. */
export async function downloadContractFile(path: string, fileName?: string): Promise<void> {
  const url = await getSignedFileUrl(path, fileName);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.rel = 'noopener noreferrer';
  anchor.download = fileName ?? path.split('/').pop() ?? 'document';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
