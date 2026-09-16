// ============================================================================
// Piste d'audit — écriture via fonction SQL (R1.4 / B04)
// ----------------------------------------------------------------------------
// Le client n'a plus le droit d'insérer directement dans `audit_logs`
// (INSERT révoqué) : l'attribution de l'auteur, de l'e-mail et de la banque est
// faite côté serveur par `public.write_audit()`, ce qui rend la piste
// non falsifiable.
//
// L'échec d'une journalisation ne doit jamais bloquer l'action utilisateur :
// il est tracé côté console et remonté à l'administrateur via le code retour.
// ============================================================================
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

/** Actions journalisées — à compléter au fil des fonctionnalités (R10.4). */
export const AUDIT_ACTIONS = {
  contractCreate: 'contract.create',
  contractUpdate: 'contract.update',
  contractDelete: 'contract.delete',
  contractView: 'contract.view',
  contractStatusChange: 'contract.status_change',
  documentUpload: 'contract.document.upload',
  documentDownload: 'contract.document.download',
  documentReplace: 'contract.document.replace',
  aiGenerate: 'ai.generate',
  aiExtraction: 'ai.extraction',
  aiAssistant: 'ai.assistant',
  exportData: 'data.export',
  authSignIn: 'auth.sign_in',
  authSignOut: 'auth.sign_out',
  authResetPassword: 'auth.reset_password',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS] | string;

/**
 * Journalise une action de l'utilisateur courant.
 * @returns `true` si l'écriture a réussi.
 */
export async function logAction(action: AuditAction, details?: Json): Promise<boolean> {
  const { error } = await supabase.rpc('write_audit', {
    p_action: action,
    p_details: details ?? null,
  });

  if (error) {
    // Volontairement discret : on n'expose pas le détail de la piste d'audit.
    console.error(`Audit (${action}) non enregistré :`, error.message);
    return false;
  }
  return true;
}
