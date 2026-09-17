-- ============================================================================
-- R4.5 · Bibliothèque de clauses persistée (multi-tenant)
-- ----------------------------------------------------------------------------
-- Avant : `ClauseManager` affichait trois clauses de démonstration codées en
-- dur, « chargées » par un `setTimeout` d'une seconde, et les créations
-- vivaient dans un `useState` — tout était perdu au rafraîchissement. Aucune
-- table `clauses` n'existait.
--
-- Cette migration crée la bibliothèque de clauses **par banque** :
--   • périmètre multi-tenant vérifié en base (RLS + trigger) ;
--   • auteur et dernier modificateur imposés par le serveur (non falsifiables) ;
--   • `version` incrémentée automatiquement quand le titre ou le contenu change ;
--   • rattachement bancaire immuable (comme `contracts.reference_decision`) ;
--   • suppression réservée à l'auteur ou à un administrateur de la banque ;
--   • index de lecture (banque + catégorie, banque + date de mise à jour, tags).
--
-- Additive et rejouable. À appliquer APRÈS `20260915120000-harden-security.sql`
-- (utilise `public.get_my_bank_id()` et `public.get_my_role()`).
--
-- Échec maîtrisé : tant que cette migration n'est pas appliquée, seul l'écran
-- « Bibliothèque de clauses » affiche un état d'erreur avec « Réessayer ». Le
-- tableau de bord, la liste et la fiche contrat ne dépendent pas de cette table.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clauses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Par défaut la banque de l'utilisateur courant : le client n'a pas à la
  -- connaître et ne peut pas se tromper de tenant (contrôlé aussi par trigger
  -- et par politique RLS).
  bank_id       UUID NOT NULL DEFAULT public.get_my_bank_id()
                REFERENCES public.banks(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,
  category      TEXT NOT NULL,
  tags          TEXT[] NOT NULL DEFAULT '{}',
  language      TEXT NOT NULL DEFAULT 'fr',
  version       INTEGER NOT NULL DEFAULT 1,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT clause_language_valid  CHECK (language IN ('fr', 'en', 'ar')),
  CONSTRAINT clause_version_valid   CHECK (version >= 1),
  CONSTRAINT clause_title_not_blank CHECK (length(btrim(title)) >= 3),
  CONSTRAINT clause_content_not_blank CHECK (length(btrim(content)) >= 20),
  CONSTRAINT clause_category_not_blank CHECK (length(btrim(category)) >= 2)
);

COMMENT ON TABLE public.clauses IS
  'Bibliothèque de clauses réutilisables, cloisonnée par banque (R4.5).';

-- Titre unique par banque parmi les clauses actives : pas de doublon visible,
-- sans bloquer la réactivation d'une clause désactivée portant le même titre.
CREATE UNIQUE INDEX IF NOT EXISTS clauses_bank_title_uniq
  ON public.clauses (bank_id, lower(btrim(title)))
  WHERE is_active;

CREATE INDEX IF NOT EXISTS clauses_bank_category_idx
  ON public.clauses (bank_id, category);
CREATE INDEX IF NOT EXISTS clauses_bank_updated_idx
  ON public.clauses (bank_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS clauses_tags_idx
  ON public.clauses USING gin (tags);

-- ----------------------------------------------------------------------------
-- 2. SÉCURITÉ : RLS + trigger d'attribution
-- ----------------------------------------------------------------------------
ALTER TABLE public.clauses ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_clause_audit_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Opération sur clause non authentifiée' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Un utilisateur ne crée pas de clause pour une autre banque
    -- (le super_admin, dont get_my_bank_id() est NULL, peut porter assistance).
    IF public.get_my_role() <> 'super_admin'
       AND NEW.bank_id IS DISTINCT FROM public.get_my_bank_id() THEN
      RAISE EXCEPTION 'Une clause ne peut être créée que pour votre banque'
        USING ERRCODE = '42501';
    END IF;

    NEW.created_by := auth.uid();
    NEW.updated_by := auth.uid();
    NEW.version    := 1;
    NEW.created_at := now();
    NEW.updated_at := now();
  ELSE
    -- Le cloisonnement bancaire est immuable : on ne déplace pas une clause.
    IF NEW.bank_id IS DISTINCT FROM OLD.bank_id THEN
      RAISE EXCEPTION 'Le rattachement bancaire d''une clause est immuable'
        USING ERRCODE = '42501';
    END IF;

    NEW.created_by := OLD.created_by;
    NEW.created_at := OLD.created_at;
    NEW.updated_by := auth.uid();
    NEW.updated_at := now();

    -- La version n'avance que sur un changement éditorial réel.
    IF NEW.title IS DISTINCT FROM OLD.title
       OR NEW.content IS DISTINCT FROM OLD.content THEN
      NEW.version := OLD.version + 1;
    ELSE
      NEW.version := OLD.version;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_clause_audit_fields() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trigger_clause_audit_fields ON public.clauses;
CREATE TRIGGER trigger_clause_audit_fields
  BEFORE INSERT OR UPDATE ON public.clauses
  FOR EACH ROW EXECUTE FUNCTION public.set_clause_audit_fields();

DROP POLICY IF EXISTS clauses_select_bank ON public.clauses;
DROP POLICY IF EXISTS clauses_insert_bank ON public.clauses;
DROP POLICY IF EXISTS clauses_update_bank ON public.clauses;
DROP POLICY IF EXISTS clauses_delete_bank ON public.clauses;

CREATE POLICY clauses_select_bank ON public.clauses
  FOR SELECT TO authenticated
  USING (
    public.get_my_role() = 'super_admin'
    OR bank_id = public.get_my_bank_id()
  );

CREATE POLICY clauses_insert_bank ON public.clauses
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() = 'super_admin'
    OR bank_id = public.get_my_bank_id()
  );

CREATE POLICY clauses_update_bank ON public.clauses
  FOR UPDATE TO authenticated
  USING (
    public.get_my_role() = 'super_admin'
    OR bank_id = public.get_my_bank_id()
  )
  WITH CHECK (
    public.get_my_role() = 'super_admin'
    OR bank_id = public.get_my_bank_id()
  );

-- Retrait réservé à l'auteur ou à un administrateur : une bibliothèque partagée
-- ne se vide pas au gré de chaque collaborateur.
CREATE POLICY clauses_delete_bank ON public.clauses
  FOR DELETE TO authenticated
  USING (
    public.get_my_role() IN ('super_admin', 'bank_admin')
    OR (
      created_by = auth.uid()
      AND bank_id = public.get_my_bank_id()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clauses TO authenticated;
REVOKE ALL ON public.clauses FROM anon;

-- ----------------------------------------------------------------------------
-- 3. VÉRIFICATIONS
-- ----------------------------------------------------------------------------
-- 3.1 Cloisonnement : aucune clause d'une autre banque n'est visible
--   SELECT count(*) FROM public.clauses
--    WHERE bank_id <> public.get_my_bank_id()
--      AND public.get_my_role() <> 'super_admin';        -- doit renvoyer 0
--
-- 3.2 Création pour une autre banque refusée
--   INSERT INTO public.clauses (bank_id, title, content, category)
--   VALUES ('<autre_bank_id>', 'Test', 'Contenu de test sufficiently long', 'RGPD');
--   → erreur 42501
--
-- 3.3 Auteur imposé par le serveur
--   INSERT INTO public.clauses (bank_id, title, content, category, created_by)
--   VALUES (public.get_my_bank_id(), 'Test', 'Contenu de test sufficiently long', 'RGPD',
--           '<autre_user_id>');
--   → erreur 42501 (ou created_by réécrit pour le super_admin)
--
-- 3.4 Versionnement automatique
--   UPDATE public.clauses SET content = content || ' (précision)' WHERE id = '<id>';
--   SELECT version FROM public.clauses WHERE id = '<id>';   -- 1 → 2
--   UPDATE public.clauses SET tags = ARRAY['revu'] WHERE id = '<id>';
--   SELECT version FROM public.clauses WHERE id = '<id>';   -- reste 2
--
-- 3.5 Banque immuable
--   UPDATE public.clauses SET bank_id = '<autre_bank_id>' WHERE id = '<id>';  -- 42501
--
-- 3.6 Doublon de titre refusé (clause active, même banque)
--   INSERT INTO public.clauses (bank_id, title, content, category)
--   VALUES (public.get_my_bank_id(), 'Test', 'Contenu de test sufficiently long', 'RGPD');
--   → violation d'unicité clauses_bank_title_uniq
--
-- 3.7 Accès anonyme
--   SELECT * FROM public.clauses;   -- sans JWT : 0 ligne (RLS) ou accès refusé
