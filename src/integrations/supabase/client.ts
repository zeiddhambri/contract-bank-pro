// ============================================================================
// Client Supabase — configuration par variables d'environnement (R1.7 / B08)
// ----------------------------------------------------------------------------
// Aucune URL ni clé ne doit figurer dans le code source : tout provient de
// `.env` (non versionné). Voir `.env.example` pour les variables attendues.
//
// La clé `anon` est publique par conception : c'est la RLS qui protège les
// données (migration 20260915120000-harden-security.sql). Elle doit néanmoins
// être tournée si elle a été exposée dans l'historique Git.
// ============================================================================
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

// Deux noms coexistent pour la même clé publique :
//   • VITE_SUPABASE_ANON_KEY        — nom historique du projet ;
//   • VITE_SUPABASE_PUBLISHABLE_KEY — nomenclature Supabase actuelle.
// Les deux sont acceptés pour qu'aucun environnement (.env local, variables de
// la plateforme d'hébergement) ne casse au démarrage.
const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Message explicite au démarrage plutôt qu'un échec silencieux des requêtes.
  throw new Error(
    'Configuration Supabase absente : définissez VITE_SUPABASE_URL et ' +
      'VITE_SUPABASE_ANON_KEY (ou VITE_SUPABASE_PUBLISHABLE_KEY) dans un ' +
      'fichier .env — voir .env.example.',
  );
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/** Nom du bucket de documents contractuels (privé, servi en URLs signées). */
export const CONTRACT_FILES_BUCKET = 'contract_files';

/** Origine de l'API : utile pour les liens absolus et le diagnostic. */
export const SUPABASE_ORIGIN = SUPABASE_URL;
