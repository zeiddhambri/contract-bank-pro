/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL du projet Supabase, ex. https://xxxx.supabase.co */
  readonly VITE_SUPABASE_URL: string;
  /** Clé publique anon — nom historique (la protection des données est assurée par la RLS) */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Même clé publique, nomenclature Supabase actuelle (`sb_publishable_...` ou JWT anon) */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Identifiant du projet Supabase (fourni par certains outillages, non utilisé par l'app) */
  readonly VITE_SUPABASE_PROJECT_ID?: string;
  /** Environnement applicatif : development | staging | production */
  readonly VITE_APP_ENV?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
