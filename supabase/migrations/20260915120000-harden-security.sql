-- ============================================================================
-- R1 · DURCISSEMENT SÉCURITÉ (audit JURIX du 2026-09-15)
-- ----------------------------------------------------------------------------
-- Corrige les défauts B01→B05 du registre d'audit :
--   B01  politiques RLS « TO public » sur contracts (lecture/écriture anonymes)
--   B02  bucket de documents contractuels public en lecture
--   B03  auto-escalade de rôle via « profiles FOR ALL USING (id = auth.uid()) »
--   B04  piste d'audit falsifiable (INSERT ouvert, attributs non contraints)
--   B05  INSERT anonymes sur notifications / contract_ai_extractions
-- Plus : référence de décision par banque sans course critique (B22),
--        suppression logique (amorce B/C11), table de quota IA (R1.6),
--        révocation de tout accès anonyme au schéma public.
--
-- ⚠️  À exécuter d'abord en staging. La migration est idempotente
--    (DROP … IF EXISTS / CREATE … IF NOT EXISTS / OR REPLACE).
-- ⚠️  Elle NE corrige PAS la contrainte CHECK sur « statut » (B20 → R2.1) :
--    tant que R2 n'est pas appliqué, la création de contrat peut rester
--    bloquée par « contracts_statut_check ».
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Pré-requis : extensions utilisées par les index de recherche
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ----------------------------------------------------------------------------
-- 1. Tables dont l'existence est incertaine (migration de juillet 2025
--    potentiellement non appliquée — défaut B24). On les (re)crée ici pour
--    que ce durcissement soit autonome.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
  is_read BOOLEAN DEFAULT false,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contract_ai_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
  extracted_data JSONB NOT NULL,
  confidence_score DECIMAL(3,2),
  extraction_type TEXT NOT NULL CHECK (extraction_type IN ('dates', 'penalties', 'payments', 'parties', 'terms')),
  reviewed_by UUID REFERENCES public.profiles(id),
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_ai_extractions_contract ON public.contract_ai_extractions (contract_id);

-- ----------------------------------------------------------------------------
-- 2. RLS · CONTRATS — suppression de TOUTES les politiques héritées (B01)
--    Les politiques RLS se combinent par OU : une seule politique permissive
--    annule tout le reste. On repart d'une base saine et explicite.
-- ----------------------------------------------------------------------------
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert on contracts"             ON public.contracts;
DROP POLICY IF EXISTS "Allow public select on contracts"             ON public.contracts;
DROP POLICY IF EXISTS "Allow public update on contracts"             ON public.contracts;
DROP POLICY IF EXISTS "Allow public delete on contracts"             ON public.contracts;
DROP POLICY IF EXISTS "Authenticated users can view contracts"       ON public.contracts;
DROP POLICY IF EXISTS "Authenticated users can create contracts"     ON public.contracts;
DROP POLICY IF EXISTS "Authenticated users can update contracts"     ON public.contracts;
DROP POLICY IF EXISTS "Authenticated users can delete contracts"     ON public.contracts;
DROP POLICY IF EXISTS "Accès complet pour les super admins"          ON public.contracts;
DROP POLICY IF EXISTS "Les membres d'une banque peuvent voir les contrats"            ON public.contracts;
DROP POLICY IF EXISTS "Les membres d'une banque peuvent insérer les contrats"         ON public.contracts;
DROP POLICY IF EXISTS "Les membres d'une banque peuvent mettre à jour les contrats"   ON public.contracts;
DROP POLICY IF EXISTS "Les membres d'une banque peuvent supprimer les contrats"       ON public.contracts;

-- Suppression logique : on ne détruit plus un contrat bancaire (exigence de
-- conservation). La suppression physique devient un acte d'administration.
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE POLICY contracts_select_super_admin ON public.contracts
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'super_admin');

CREATE POLICY contracts_select_bank ON public.contracts
  FOR SELECT TO authenticated
  USING (bank_id = public.get_my_bank_id() AND deleted_at IS NULL);

CREATE POLICY contracts_insert_bank ON public.contracts
  FOR INSERT TO authenticated
  WITH CHECK (bank_id = public.get_my_bank_id() AND public.get_my_role() IS NOT NULL);

CREATE POLICY contracts_update_bank ON public.contracts
  FOR UPDATE TO authenticated
  USING (bank_id = public.get_my_bank_id())
  WITH CHECK (bank_id = public.get_my_bank_id());

-- Suppression physique réservée aux administrateurs (les autres rôles passent
-- par deleted_at via UPDATE).
CREATE POLICY contracts_delete_admin ON public.contracts
  FOR DELETE TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'bank_admin')
         AND (public.get_my_role() = 'super_admin' OR bank_id = public.get_my_bank_id()));

-- ----------------------------------------------------------------------------
-- 3. Référence de décision : unique PAR BANQUE et sans course critique (B22)
-- ----------------------------------------------------------------------------
ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_reference_decision_key;

CREATE UNIQUE INDEX IF NOT EXISTS contracts_bank_reference_uniq
  ON public.contracts (bank_id, reference_decision);

CREATE INDEX IF NOT EXISTS contracts_bank_idx        ON public.contracts (bank_id);
CREATE INDEX IF NOT EXISTS contracts_bank_statut_idx ON public.contracts (bank_id, statut);
CREATE INDEX IF NOT EXISTS contracts_client_trgm_idx ON public.contracts USING gin (client gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.generate_reference_decision(p_bank_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  year_part TEXT := to_char(CURRENT_DATE, 'YYYY');
  counter   INTEGER;
BEGIN
  -- Verrou transactionnel par (banque, année) : deux insertions simultanées
  -- sont sérialisées, plus de doublon CT-AAAA-NNN.
  PERFORM pg_advisory_xact_lock(hashtext('ref_decision:' || p_bank_id::text || ':' || year_part));

  SELECT COALESCE(MAX(CAST(SUBSTRING(reference_decision FROM '\d+$') AS INTEGER)), 0) + 1
    INTO counter
    FROM public.contracts
   WHERE bank_id = p_bank_id
     AND reference_decision LIKE 'CT-' || year_part || '-%';

  RETURN 'CT-' || year_part || '-' || LPAD(counter::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_reference_decision()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.reference_decision IS NULL OR NEW.reference_decision = '' THEN
    NEW.reference_decision := public.generate_reference_decision(NEW.bank_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_reference_decision ON public.contracts;
CREATE TRIGGER trigger_set_reference_decision
  BEFORE INSERT ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_reference_decision();

-- updated_at réellement maintenu (défaut B26)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_contracts_updated_at ON public.contracts;
CREATE TRIGGER trigger_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. RLS · PROFILS — fin de l'auto-escalade de rôle (B03)
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Les utilisateurs peuvent gérer leur propre profil" ON public.profiles;
DROP POLICY IF EXISTS "Les admins peuvent voir les profils"               ON public.profiles;
DROP POLICY IF EXISTS "Les admins peuvent modifier les profils"           ON public.profiles;

CREATE POLICY profiles_select_self_or_admin ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.get_my_role() = 'super_admin'
    OR (public.get_my_role() = 'bank_admin' AND bank_id = public.get_my_bank_id())
  );

-- Un utilisateur peut mettre à jour son propre profil (nom, préférences) ;
-- le trigger ci-dessous interdit toute modification de role / bank_id.
CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update_admin ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    public.get_my_role() = 'super_admin'
    OR (public.get_my_role() = 'bank_admin' AND bank_id = public.get_my_bank_id())
  )
  WITH CHECK (
    public.get_my_role() = 'super_admin'
    OR (public.get_my_role() = 'bank_admin' AND bank_id = public.get_my_bank_id())
  );

-- Aucune création ni suppression de profil depuis le client :
-- la création passe par le trigger auth.users (SECURITY DEFINER).

CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role OR NEW.bank_id IS DISTINCT FROM OLD.bank_id THEN
    -- 1. Personne ne modifie son propre rôle ou son propre rattachement.
    IF NEW.id = auth.uid() THEN
      RAISE EXCEPTION 'Vous ne pouvez pas modifier votre propre rôle ou votre banque'
        USING ERRCODE = '42501';
    END IF;

    -- 2. Le super_admin peut tout.
    IF public.get_my_role() = 'super_admin' THEN
      RETURN NEW;
    END IF;

    -- 3. Un bank_admin peut changer un rôle au sein de SA banque,
    --    jamais vers/depuis super_admin, jamais le rattachement de banque.
    IF public.get_my_role() = 'bank_admin'
       AND OLD.bank_id = public.get_my_bank_id()
       AND NEW.bank_id = OLD.bank_id
       AND NEW.role <> 'super_admin'
       AND OLD.role <> 'super_admin' THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Modification du rôle ou de la banque non autorisée'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_protect_profile ON public.profiles;
CREATE TRIGGER trigger_protect_profile
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_sensitive_fields();

-- ----------------------------------------------------------------------------
-- 5. RLS · BANQUES (rappel explicite, inchangé sur le fond)
-- ----------------------------------------------------------------------------
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Les super admins peuvent tout gérer"              ON public.banks;
DROP POLICY IF EXISTS "Les membres d'une banque peuvent voir leur banque" ON public.banks;

CREATE POLICY banks_all_super_admin ON public.banks
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY banks_select_member ON public.banks
  FOR SELECT TO authenticated
  USING (id = public.get_my_bank_id());

-- ----------------------------------------------------------------------------
-- 6. PISTE D'AUDIT — non falsifiable (B04)
--    Plus aucun INSERT direct depuis le client : l'attribution (user, e-mail,
--    banque) est faite par le serveur.
-- ----------------------------------------------------------------------------
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs"              ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;

CREATE POLICY audit_logs_select_admin ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    public.get_my_role() IN ('super_admin', 'auditor')
    OR (public.get_my_role() = 'bank_admin' AND bank_id = public.get_my_bank_id())
  );

-- Ni UPDATE ni DELETE : la piste d'audit est immuable.
REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.write_audit(p_action TEXT, p_details JSONB DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email   TEXT;
  v_bank    UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Action non authentifiée' USING ERRCODE = '42501';
  END IF;

  SELECT u.email, p.bank_id INTO v_email, v_bank
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
   WHERE p.id = v_user_id;

  INSERT INTO public.audit_logs (user_id, user_email, action, details, bank_id)
  VALUES (v_user_id, v_email, p_action, p_details, v_bank);
END;
$$;

REVOKE ALL ON FUNCTION public.write_audit(TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.write_audit(TEXT, JSONB) TO authenticated;

CREATE INDEX IF NOT EXISTS audit_logs_bank_created_idx ON public.audit_logs (bank_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx       ON public.audit_logs (action);

-- ----------------------------------------------------------------------------
-- 7. NOTIFICATIONS & EXTRACTIONS IA — plus d'INSERT anonyme (B05)
-- ----------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "System can create notifications"          ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications"   ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

REVOKE INSERT ON public.notifications FROM PUBLIC, anon, authenticated;

CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.get_my_role() = 'super_admin');

CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY notifications_delete_own ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Écriture serveur uniquement (triggers, cron, Edge Functions SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID, p_title TEXT, p_message TEXT,
  p_type TEXT DEFAULT 'info', p_contract_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, contract_id)
  VALUES (p_user_id, p_title, p_message, p_type, p_contract_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
-- Appel réservé au service_role / fonctions serveur :
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, UUID) TO service_role;

ALTER TABLE public.contract_ai_extractions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "System can create AI extractions"                ON public.contract_ai_extractions;
DROP POLICY IF EXISTS "Users can view AI extractions from their bank contracts" ON public.contract_ai_extractions;

REVOKE INSERT, UPDATE, DELETE ON public.contract_ai_extractions FROM PUBLIC, anon, authenticated;

CREATE POLICY ai_extractions_select_bank ON public.contract_ai_extractions
  FOR SELECT TO authenticated
  USING (
    public.get_my_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM public.contracts c
       WHERE c.id = contract_id AND c.bank_id = public.get_my_bank_id()
    )
  );

-- Enregistrement d'une extraction : vérifie le périmètre bancaire AVANT d'écrire.
CREATE OR REPLACE FUNCTION public.record_ai_extraction(
  p_contract_id UUID, p_extraction_type TEXT, p_extracted_data JSONB, p_confidence NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.contracts c
     WHERE c.id = p_contract_id AND c.bank_id = public.get_my_bank_id()
  ) THEN
    RAISE EXCEPTION 'Contrat hors du périmètre de votre organisation' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.contract_ai_extractions (contract_id, extraction_type, extracted_data, confidence_score)
  VALUES (p_contract_id, p_extraction_type, p_extracted_data, p_confidence)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_ai_extraction(UUID, TEXT, JSONB, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_ai_extraction(UUID, TEXT, JSONB, NUMERIC) TO authenticated;

-- ----------------------------------------------------------------------------
-- 8. QUOTA IA — table de comptage par utilisateur et par jour (R1.6)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_usage (
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day        DATE NOT NULL DEFAULT CURRENT_DATE,
  calls      INTEGER NOT NULL DEFAULT 0,
  tokens     INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_usage_select_self ON public.ai_usage;
DROP POLICY IF EXISTS ai_usage_insert_self ON public.ai_usage;
DROP POLICY IF EXISTS ai_usage_update_self ON public.ai_usage;

CREATE POLICY ai_usage_select_self ON public.ai_usage
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.get_my_role() = 'super_admin');

CREATE POLICY ai_usage_insert_self ON public.ai_usage
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY ai_usage_update_self ON public.ai_usage
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Incrémente et renvoie le nombre d'appels du jour (utilisé par les Functions).
CREATE OR REPLACE FUNCTION public.ai_consume_quota(p_tokens INTEGER DEFAULT 0)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_calls INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Appel non authentifié' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.ai_usage (user_id, calls, tokens)
  VALUES (auth.uid(), 1, GREATEST(p_tokens, 0))
  ON CONFLICT (user_id, day) DO UPDATE
    SET calls = public.ai_usage.calls + 1,
        tokens = public.ai_usage.tokens + GREATEST(p_tokens, 0),
        updated_at = now()
  RETURNING calls INTO v_calls;

  RETURN v_calls;
END;
$$;

REVOKE ALL ON FUNCTION public.ai_consume_quota(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_consume_quota(INTEGER) TO authenticated;

-- ----------------------------------------------------------------------------
-- 9. STORAGE — documents contractuels privés, servis en URLs signées (B02)
--    Convention de chemin : {bank_id}/{contract_id}/{fichier}
-- ----------------------------------------------------------------------------
UPDATE storage.buckets SET public = false WHERE id = 'contract_files';

DROP POLICY IF EXISTS "Public read access for contract files"      ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload files"  ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update files"  ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete files"  ON storage.objects;

CREATE POLICY contract_files_read_bank ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'contract_files'
    AND (public.get_my_role() = 'super_admin'
         OR (storage.foldername(name))[1] = public.get_my_bank_id()::text)
  );

CREATE POLICY contract_files_insert_bank ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'contract_files'
    AND (storage.foldername(name))[1] = public.get_my_bank_id()::text
  );

CREATE POLICY contract_files_update_bank ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'contract_files'
    AND (storage.foldername(name))[1] = public.get_my_bank_id()::text
  );

CREATE POLICY contract_files_delete_admin ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'contract_files'
    AND public.get_my_role() IN ('super_admin', 'bank_admin')
    AND (public.get_my_role() = 'super_admin'
         OR (storage.foldername(name))[1] = public.get_my_bank_id()::text)
  );

-- ----------------------------------------------------------------------------
-- 10. Droits : plus AUCUN accès anonyme au schéma public
--     (l'authentification reste gérée par GoTrue sur le schéma auth)
-- ----------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE ALL ON SCHEMA public FROM anon;

GRANT USAGE ON SCHEMA public TO authenticated;

-- Les futures tables ne seront plus exposées à anon par défaut.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;

-- ----------------------------------------------------------------------------
-- 11. Vérification post-migration (à lancer manuellement)
-- ----------------------------------------------------------------------------
-- SELECT polname, polcmd, polroles::regrole[] FROM pg_policy
--  WHERE polrelid = 'public.contracts'::regclass;
-- SELECT id, public FROM storage.buckets;
-- SELECT has_table_privilege('anon', 'public.contracts', 'SELECT');  -- doit être false
-- SELECT public.generate_reference_decision((SELECT id FROM public.banks LIMIT 1));
