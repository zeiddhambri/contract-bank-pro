/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL du projet Supabase, ex. https://xxxx.supabase.co */
  readonly VITE_SUPABASE_URL: string;
  /** Clé publique anon (la protection des données est assurée par la RLS) */
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Environnement applicatif : development | staging | production */
  readonly VITE_APP_ENV?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
