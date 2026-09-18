-- ============================================================================
-- R3 · Collaboration sur la fiche contrat : commentaires et versions de documents
-- ----------------------------------------------------------------------------
-- Les tables `contract_comments` et `contract_versions` existent depuis la
-- migration du 2025-07-05 mais n'ont jamais été câblées : politiques de
-- lecture/insertion uniquement (impossible de corriger ou de retirer un
-- commentaire), aucun index de lecture, et `version_number` à la charge du
-- client (donc sujet aux doublons).
--
-- Cette migration prépare l'onglet « Commentaires » et l'onglet « Documents »
-- de la fiche contrat `/contrats/:id` (R3.1) :
--   • un commentaire peut être modifié ou supprimé **par son auteur** (et par un
--     administrateur de la banque), toujours dans le périmètre de la banque ;
--   • `user_id` est forcé à l'auteur authentifié (défaut + trigger), donc un
--     commentaire ne peut pas être publié au nom d'un autre ;
--   • `version_number` est attribué par trigger (max + 1 par contrat) et unique ;
--   • index de lecture pour les onglets de la fiche.
--
-- Additive et rejouable. À appliquer APRÈS `20260915120000-harden-security.sql`
-- (utilise `public.get_my_bank_id()` et `public.get_my_role()`) et après
-- `20260916090000-contract-lifecycle-integrity.sql`.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. COMMENTAIRES
-- ----------------------------------------------------------------------------
ALTER TABLE public.contract_comments ENABLE ROW LEVEL SECURITY;

-- L'auteur est toujours l'utilisateur authentifié.
ALTER TABLE public.contract_comments ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.contract_comments ALTER COLUMN comment SET NOT NULL;

CREATE OR REPLACE FUNCTION public.comment_author_is_current_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_is_super_admin BOOLEAN := public.get_my_role() = 'super_admin';
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Commentaire non authentifié' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Impossible de publier au nom d'un autre (sauf super_admin en support).
    IF NEW.user_id IS NOT NULL
       AND NEW.user_id IS DISTINCT FROM auth.uid()
       AND NOT v_is_super_admin THEN
      RAISE EXCEPTION 'Un commentaire ne peut être publié qu''au nom de son auteur'
        USING ERRCODE = '42501';
    END IF;
    NEW.user_id := auth.uid();
  ELSE
    -- L'auteur d'origine est préservé : une modification n'est pas une
    -- réattribution (sauf super_admin).
    IF NEW.user_id IS DISTINCT FROM OLD.user_id AND NOT v_is_super_admin THEN
      RAISE EXCEPTION 'L''auteur d''un commentaire ne peut pas être modifié'
        USING ERRCODE = '42501';
    END IF;
    NEW.user_id := OLD.user_id;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.comment_author_is_current_user() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trigger_comment_author ON public.contract_comments;
CREATE TRIGGER trigger_comment_author
  BEFORE INSERT OR UPDATE ON public.contract_comments
  FOR EACH ROW EXECUTE FUNCTION public.comment_author_is_current_user();

-- Politiques : lecture/insertion par banque (déjà en place, recréées ici pour
-- être certain du périmètre), modification et suppression réservées à l'auteur
-- ou à un administrateur de la banque.
DROP POLICY IF EXISTS "Users can view comments from their bank contracts"    ON public.contract_comments;
DROP POLICY IF EXISTS "Users can create comments on their bank contracts"    ON public.contract_comments;
DROP POLICY IF EXISTS contract_comments_select_bank ON public.contract_comments;
DROP POLICY IF EXISTS contract_comments_insert_bank ON public.contract_comments;
DROP POLICY IF EXISTS contract_comments_update_own  ON public.contract_comments;
DROP POLICY IF EXISTS contract_comments_delete_own  ON public.contract_comments;

CREATE POLICY contract_comments_select_bank ON public.contract_comments
  FOR SELECT TO authenticated
  USING (
    public.get_my_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM public.contracts c
       WHERE c.id = contract_comments.contract_id
         AND c.bank_id = public.get_my_bank_id()
    )
  );

CREATE POLICY contract_comments_insert_bank ON public.contract_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.contracts c
       WHERE c.id = contract_comments.contract_id
         AND c.bank_id = public.get_my_bank_id()
         AND c.deleted_at IS NULL
    )
  );

-- Le périmètre banque est vérifié en plus de l'auteur : un compte qui aurait
-- changé de banque ne peut ni corriger ni retirer d'anciens commentaires.
CREATE POLICY contract_comments_update_own ON public.contract_comments
  FOR UPDATE TO authenticated
  USING (
    public.get_my_role() = 'super_admin'
    OR (
      (
        user_id = auth.uid()
        OR public.get_my_role() = 'bank_admin'
      )
      AND EXISTS (
        SELECT 1 FROM public.contracts c
         WHERE c.id = contract_comments.contract_id
           AND c.bank_id = public.get_my_bank_id()
      )
    )
  )
  WITH CHECK (
    public.get_my_role() = 'super_admin'
    OR (
      (
        user_id = auth.uid()
        OR public.get_my_role() = 'bank_admin'
      )
      AND EXISTS (
        SELECT 1 FROM public.contracts c
         WHERE c.id = contract_comments.contract_id
           AND c.bank_id = public.get_my_bank_id()
      )
    )
  );

CREATE POLICY contract_comments_delete_own ON public.contract_comments
  FOR DELETE TO authenticated
  USING (
    public.get_my_role() = 'super_admin'
    OR (
      (
        user_id = auth.uid()
        OR public.get_my_role() = 'bank_admin'
      )
      AND EXISTS (
        SELECT 1 FROM public.contracts c
         WHERE c.id = contract_comments.contract_id
           AND c.bank_id = public.get_my_bank_id()
      )
    )
  );

CREATE INDEX IF NOT EXISTS contract_comments_contract_created_idx
  ON public.contract_comments (contract_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 2. VERSIONS DE DOCUMENTS
-- ----------------------------------------------------------------------------
ALTER TABLE public.contract_versions ENABLE ROW LEVEL SECURITY;

-- Numéro de version attribué par le serveur : jamais de doublon ni de trou.
CREATE OR REPLACE FUNCTION public.set_contract_version_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_max INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) INTO v_max
    FROM public.contract_versions
   WHERE contract_id = NEW.contract_id;

  NEW.version_number := v_max + 1;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_contract_version_number() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trigger_contract_version_number ON public.contract_versions;
CREATE TRIGGER trigger_contract_version_number
  BEFORE INSERT ON public.contract_versions
  FOR EACH ROW EXECUTE FUNCTION public.set_contract_version_number();

DROP POLICY IF EXISTS "Users can view versions from their bank contracts"  ON public.contract_versions;
DROP POLICY IF EXISTS "Users can create versions for their bank contracts" ON public.contract_versions;
DROP POLICY IF EXISTS contract_versions_select_bank ON public.contract_versions;
DROP POLICY IF EXISTS contract_versions_insert_bank ON public.contract_versions;

CREATE POLICY contract_versions_select_bank ON public.contract_versions
  FOR SELECT TO authenticated
  USING (
    public.get_my_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM public.contracts c
       WHERE c.id = contract_versions.contract_id
         AND c.bank_id = public.get_my_bank_id()
    )
  );

CREATE POLICY contract_versions_insert_bank ON public.contract_versions
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.contracts c
       WHERE c.id = contract_versions.contract_id
         AND c.bank_id = public.get_my_bank_id()
    )
  );

-- Aucune modification ni suppression : l'historique documentaire est une piste
-- d'audit (comme `audit_logs` et `contract_status_history`).
REVOKE UPDATE, DELETE ON public.contract_versions FROM anon, authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS contract_versions_contract_number_uniq
  ON public.contract_versions (contract_id, version_number);
CREATE INDEX IF NOT EXISTS contract_versions_contract_created_idx
  ON public.contract_versions (contract_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 3. RAPPELS : lecture seule pour l'application
--     Les rappels sont produits par le trigger `create_contract_reminders`
--     (idempotent depuis R2) puis par le moteur d'échéances (R9). L'interface
--     n'a pas à les créer ni à les modifier : politique « FOR ALL » remplacée.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage reminders from their bank contracts" ON public.contract_reminders;
DROP POLICY IF EXISTS contract_reminders_select_bank ON public.contract_reminders;

CREATE POLICY contract_reminders_select_bank ON public.contract_reminders
  FOR SELECT TO authenticated
  USING (
    public.get_my_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM public.contracts c
       WHERE c.id = contract_reminders.contract_id
         AND c.bank_id = public.get_my_bank_id()
    )
  );

REVOKE INSERT, UPDATE, DELETE ON public.contract_reminders FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS contract_reminders_contract_idx
  ON public.contract_reminders (contract_id, remind_at);

-- ----------------------------------------------------------------------------
-- 4. VÉRIFICATIONS
-- ----------------------------------------------------------------------------
-- 4.1 Un utilisateur ne voit que les commentaires de sa banque :
--   SELECT count(*) FROM public.contract_comments;                 -- en tant que user
--   SELECT count(*) FROM public.contract_comments cc
--     JOIN public.contracts c ON c.id = cc.contract_id
--    WHERE c.bank_id <> public.get_my_bank_id();                   -- doit être 0
--
-- 4.2 Modifier le commentaire d'un autre est refusé :
--   UPDATE public.contract_comments SET comment = 'x' WHERE user_id <> auth.uid();  -- 0 ligne
--
-- 4.3 Le numéro de version est attribué par le serveur :
--   INSERT INTO public.contract_versions (contract_id, file_path, uploaded_by)
--   VALUES ('<id>', 'bank/contract/ancien.pdf', auth.uid());
--   SELECT version_number FROM public.contract_versions WHERE contract_id = '<id>';
--   → 1, puis 2 au second appel (jamais de doublon)
--
-- 4.4 Écriture directe dans contract_reminders refusée :
--   INSERT INTO public.contract_reminders (contract_id, reminder_type, remind_at)
--   VALUES ('<id>', 'review', now());   -- erreur 42501 (permission denied)
