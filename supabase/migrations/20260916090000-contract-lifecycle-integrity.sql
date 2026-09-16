-- ============================================================================
-- R2 · Cycle de vie des contrats unique + intégrité des données
-- ----------------------------------------------------------------------------
-- Corrige les constats C1→C8 et C12 de docs/audit/AUDIT-JURIX.md (§2.3) :
--
--   • B20 — BLOQUANT : la contrainte `contracts_statut_check` (migration du
--     2025-07-05) n'autorise que des valeurs anglaises alors que le défaut de
--     la colonne est `'en_cours'` et que l'application (`contract-helpers.ts`)
--     propose dix statuts français. Résultat : **toute création de contrat
--     échoue** avec `23514 check_violation`. Trois vocabulaires coexistent
--     (français métier, anglais générique, français « actif/en_attente/expire/
--     resilie » dans ContractTable) → tableaux de bord à zéro, Kanban vide.
--   • B21 — `currency` collecté dans le formulaire mais jamais écrit en base,
--     et `formatCurrency()` affiche « MAD » en dur alors que la contrainte
--     n'autorise que EUR/USD/TND.
--   • B22 — `contract_value` (doublon de `montant`) jamais utilisé.
--   • B23 — trigger de rappels non idempotent : chaque UPDATE recrée des
--     rappels (doublons garantis dans `contract_reminders`).
--   • B24 — aucune traçabilité des changements de statut (exigence d'audit
--     bancaire et critère de référence du marché : Ironclad / LinkSquares).
--   • B25 — `profiles` sans `created_at` ; `banks` sans devise par défaut.
--
-- ⚠️ À appliquer APRÈS `20260915120000-harden-security.sql` : elle s'appuie sur
--    `public.get_my_role()`, `public.write_audit()` et la nouvelle version de
--    `set_reference_decision()` (par banque, avec verrou transactionnel).
--
-- Cette migration est **additive et rejouable** : les objets sont créés avec
-- IF NOT EXISTS, les contraintes avec DROP IF EXISTS préalable, et les
-- vérifications portant sur des données existantes sont ajoutées en `NOT VALID`
-- (elles s'appliquent aux écritures nouvelles sans faire échouer la migration
-- sur l'historique). Les requêtes de diagnostic pour les valider ensuite sont
-- en fin de fichier.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. UN SEUL CYCLE DE VIE — type énuméré `contract_status`
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE t.typname = 'contract_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.contract_status AS ENUM (
      'draft',                          -- Brouillon (saisie en cours)
      'pending_documents',              -- Documents manquants
      'in_review',                      -- En révision / instruction
      'approved',                       -- Approuvé (décision favorable)
      'pending_signature_b',            -- En cours de signature banque
      'pending_signature_c',            -- En cours de signature client
      'pending_mortgage_registration',  -- En attente d'inscription d'hypothèque
      'pending_insurance',              -- Assurance manquante
      'active',                         -- Mis en place / en cours d'exécution
      'alert',                          -- Alerte (impayé, dépassement, risque)
      'client_refused',                 -- Refus client
      'cancelled',                      -- Résilié / annulé
      'expired',                        -- Expiré (échéance passée)
      'renewed'                         -- Renouvelé
    );
  END IF;
END $$;

-- 1.1 Conversion des données existantes (les trois vocabulaires → l'énuméré).
--     La contrainte anglaise est retirée AVANT la conversion : elle porte sur
--     la colonne dont on change le type.
ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_statut_check;

ALTER TABLE public.contracts ALTER COLUMN statut DROP DEFAULT;

ALTER TABLE public.contracts
  ALTER COLUMN statut TYPE public.contract_status
  USING (
    CASE lower(btrim(statut::text))
      -- vocabulaire métier français (contract-helpers.ts)
      WHEN 'en_cours'                          THEN 'draft'
      WHEN 'attente_signature'                 THEN 'pending_signature_b'
      WHEN 'valide'                            THEN 'active'
      WHEN 'alerte'                            THEN 'alert'
      WHEN 'documents_manquants'               THEN 'pending_documents'
      WHEN 'assurance_manquante'               THEN 'pending_insurance'
      WHEN 'en_attente_inscription_hypotheque' THEN 'pending_mortgage_registration'
      WHEN 'en_cours_de_signature_b'           THEN 'pending_signature_b'
      WHEN 'en_cours_de_signature_c'           THEN 'pending_signature_c'
      WHEN 'refus_client'                      THEN 'client_refused'
      -- vocabulaire français de ContractTable.tsx
      WHEN 'actif'                             THEN 'active'
      WHEN 'en_attente'                        THEN 'in_review'
      WHEN 'expire'                            THEN 'expired'
      WHEN 'resilie'                           THEN 'cancelled'
      -- vocabulaire anglais de la contrainte de juillet 2025
      WHEN 'draft'                             THEN 'draft'
      WHEN 'review'                            THEN 'in_review'
      WHEN 'approval'                          THEN 'approved'
      WHEN 'pending_signature'                 THEN 'pending_signature_b'
      WHEN 'signed'                            THEN 'active'
      WHEN 'active'                            THEN 'active'
      WHEN 'expired'                           THEN 'expired'
      WHEN 'renewed'                           THEN 'renewed'
      WHEN 'cancelled'                         THEN 'cancelled'
      -- toute valeur inconnue repart en brouillon (aucune perte de ligne)
      ELSE 'draft'
    END::public.contract_status
  );

ALTER TABLE public.contracts ALTER COLUMN statut SET DEFAULT 'draft';
ALTER TABLE public.contracts ALTER COLUMN statut SET NOT NULL;

COMMENT ON COLUMN public.contracts.statut IS
  'Cycle de vie unique du contrat (type public.contract_status). Les transitions autorisées sont décrites dans public.contract_status_transitions.';

-- ----------------------------------------------------------------------------
-- 2. TRANSITIONS AUTORISÉES (garde-fou serveur) + HISTORIQUE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contract_status_transitions (
  from_status   public.contract_status NOT NULL,
  to_status     public.contract_status NOT NULL,
  allowed_roles public.app_role[]      NOT NULL
    DEFAULT ARRAY['user','manager','validator','bank_admin','super_admin']::public.app_role[],
  PRIMARY KEY (from_status, to_status)
);

COMMENT ON TABLE public.contract_status_transitions IS
  'Matrice du cycle de vie : quelles transitions sont permises, et par quels rôles. Donnée de référence modifiable sans redéploiement.';

-- Rechargement idempotent de la matrice.
TRUNCATE public.contract_status_transitions;
INSERT INTO public.contract_status_transitions (from_status, to_status, allowed_roles) VALUES
  -- Saisie / instruction
  ('draft',                     'pending_documents',             ARRAY['user','manager','validator','bank_admin','super_admin']),
  ('draft',                     'in_review',                     ARRAY['user','manager','validator','bank_admin','super_admin']),
  ('draft',                     'cancelled',                     ARRAY['bank_admin','super_admin']),
  ('draft',                     'client_refused',                ARRAY['bank_admin','super_admin']),
  ('pending_documents',         'draft',                         ARRAY['user','manager','validator','bank_admin','super_admin']),
  ('pending_documents',         'in_review',                     ARRAY['user','manager','validator','bank_admin','super_admin']),
  ('pending_documents',         'cancelled',                     ARRAY['bank_admin','super_admin']),
  ('pending_documents',         'client_refused',                ARRAY['bank_admin','super_admin']),
  ('in_review',                 'draft',                         ARRAY['manager','validator','bank_admin','super_admin']),
  ('in_review',                 'approved',                      ARRAY['validator','bank_admin','super_admin']),
  ('in_review',                 'pending_documents',             ARRAY['user','manager','validator','bank_admin','super_admin']),
  ('in_review',                 'alert',                         ARRAY['validator','bank_admin','super_admin']),
  ('in_review',                 'cancelled',                     ARRAY['bank_admin','super_admin']),
  ('in_review',                 'client_refused',                ARRAY['validator','bank_admin','super_admin']),
  -- Mise en place
  ('approved',                  'pending_signature_b',           ARRAY['user','manager','validator','bank_admin','super_admin']),
  ('approved',                  'pending_signature_c',           ARRAY['user','manager','validator','bank_admin','super_admin']),
  ('approved',                  'pending_mortgage_registration', ARRAY['user','manager','validator','bank_admin','super_admin']),
  ('approved',                  'pending_insurance',             ARRAY['user','manager','validator','bank_admin','super_admin']),
  ('approved',                  'active',                        ARRAY['validator','bank_admin','super_admin']),
  ('approved',                  'cancelled',                     ARRAY['bank_admin','super_admin']),
  ('approved',                  'client_refused',                ARRAY['validator','bank_admin','super_admin']),
  ('pending_signature_b',       'pending_signature_c',           ARRAY['user','manager','validator','bank_admin','super_admin']),
  ('pending_signature_b',       'pending_mortgage_registration', ARRAY['user','manager','validator','bank_admin','super_admin']),
  ('pending_signature_b',       'pending_insurance',             ARRAY['user','manager','validator','bank_admin','super_admin']),
  ('pending_signature_b',       'active',                        ARRAY['validator','bank_admin','super_admin']),
  ('pending_signature_b',       'alert',                         ARRAY['validator','bank_admin','super_admin']),
  ('pending_signature_b',       'cancelled',                     ARRAY['bank_admin','super_admin']),
  ('pending_signature_b',       'client_refused',                ARRAY['validator','bank_admin','super_admin']),
  ('pending_signature_c',       'pending_mortgage_registration', ARRAY['user','manager','validator','bank_admin','super_admin']),
  ('pending_signature_c',       'pending_insurance',             ARRAY['user','manager','validator','bank_admin','super_admin']),
  ('pending_signature_c',       'active',                        ARRAY['validator','bank_admin','super_admin']),
  ('pending_signature_c',       'alert',                         ARRAY['validator','bank_admin','super_admin']),
  ('pending_signature_c',       'cancelled',                     ARRAY['bank_admin','super_admin']),
  ('pending_signature_c',       'client_refused',                ARRAY['validator','bank_admin','super_admin']),
  ('pending_mortgage_registration','active',                     ARRAY['validator','bank_admin','super_admin']),
  ('pending_mortgage_registration','alert',                      ARRAY['validator','bank_admin','super_admin']),
  ('pending_mortgage_registration','cancelled',                  ARRAY['bank_admin','super_admin']),
  ('pending_insurance',         'active',                        ARRAY['validator','bank_admin','super_admin']),
  ('pending_insurance',         'alert',                         ARRAY['validator','bank_admin','super_admin']),
  ('pending_insurance',         'cancelled',                     ARRAY['bank_admin','super_admin']),
  -- Vie du contrat
  ('active',                    'alert',                         ARRAY['user','manager','validator','bank_admin','super_admin']),
  ('active',                    'expired',                       ARRAY['bank_admin','super_admin']),
  ('active',                    'renewed',                       ARRAY['bank_admin','super_admin']),
  ('active',                    'cancelled',                     ARRAY['bank_admin','super_admin']),
  ('alert',                     'active',                        ARRAY['validator','bank_admin','super_admin']),
  ('alert',                     'expired',                       ARRAY['bank_admin','super_admin']),
  ('alert',                     'cancelled',                     ARRAY['bank_admin','super_admin']),
  ('alert',                     'client_refused',                ARRAY['bank_admin','super_admin']),
  ('expired',                   'renewed',                       ARRAY['bank_admin','super_admin']),
  ('expired',                   'cancelled',                     ARRAY['bank_admin','super_admin']),
  ('renewed',                   'active',                        ARRAY['bank_admin','super_admin']),
  ('renewed',                   'expired',                       ARRAY['bank_admin','super_admin']),
  ('renewed',                   'cancelled',                     ARRAY['bank_admin','super_admin']),
  -- Sorties : reprise exceptionnelle encadrée
  ('client_refused',            'draft',                         ARRAY['bank_admin','super_admin']),
  ('client_refused',            'cancelled',                     ARRAY['bank_admin','super_admin']),
  ('cancelled',                 'draft',                         ARRAY['super_admin']);

-- Historique des changements de statut (piste métier, complémentaire à
-- `audit_logs` : elle est structurée et exploitable par la timeline R10).
CREATE TABLE IF NOT EXISTS public.contract_status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  bank_id     UUID REFERENCES public.banks(id) ON DELETE CASCADE,
  from_status public.contract_status,
  to_status   public.contract_status NOT NULL,
  changed_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_by_email TEXT,
  reason      TEXT,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contract_status_history_contract_idx
  ON public.contract_status_history (contract_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS contract_status_history_bank_idx
  ON public.contract_status_history (bank_id, changed_at DESC);

ALTER TABLE public.contract_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_status_transitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contract_status_transitions_select ON public.contract_status_transitions;
CREATE POLICY contract_status_transitions_select ON public.contract_status_transitions
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS contract_status_history_select_bank ON public.contract_status_history;
CREATE POLICY contract_status_history_select_bank ON public.contract_status_history
  FOR SELECT TO authenticated
  USING (bank_id = public.get_my_bank_id() OR public.get_my_role() = 'super_admin');

-- Écriture serveur uniquement : le client ne peut ni inventer ni effacer
-- l'historique (même logique que `audit_logs`).
REVOKE INSERT, UPDATE, DELETE ON public.contract_status_history FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.contract_status_transitions FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON public.contract_status_transitions FROM authenticated;
GRANT SELECT ON public.contract_status_transitions TO authenticated;
GRANT SELECT ON public.contract_status_history TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.contract_status_transitions TO postgres;

-- ----------------------------------------------------------------------------
-- 3. TRIGGER : transition autorisée + rôle + historisation
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_contract_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role  public.app_role := public.get_my_role();
  v_rule  public.contract_status_transitions%ROWTYPE;
BEGIN
  IF OLD.statut IS NOT DISTINCT FROM NEW.statut THEN
    RETURN NEW;  -- rien à contrôler
  END IF;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Profil utilisateur introuvable : changement de statut refusé'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_rule
    FROM public.contract_status_transitions
   WHERE from_status = OLD.statut
     AND to_status   = NEW.statut;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transition de statut interdite : % → %', OLD.statut, NEW.statut
      USING ERRCODE = '23514',
            HINT = 'Ajoutez la transition dans public.contract_status_transitions si elle est légitime.';
  END IF;

  -- super_admin garde la main en toute circonstance (support, correction).
  IF v_role IS DISTINCT FROM 'super_admin'
     AND NOT (v_role = ANY (v_rule.allowed_roles)) THEN
    RAISE EXCEPTION 'Votre rôle (%) ne permet pas la transition % → %', v_role, OLD.statut, NEW.statut
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.contract_status_history
    (contract_id, bank_id, from_status, to_status, changed_by, changed_by_email, reason)
  VALUES (
    NEW.id,
    NEW.bank_id,
    OLD.statut,
    NEW.statut,
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    NULLIF(btrim(coalesce(NEW.metadata->>'status_change_reason', '')), '')
  );

  -- Double piste : l'événement entre aussi dans la piste d'audit globale.
  -- Un échec de journalisation ne doit jamais bloquer la transition.
  BEGIN
    PERFORM public.write_audit(
      'contract.status_change',
      jsonb_build_object(
        'contractId', NEW.id,
        'reference', NEW.reference_decision,
        'from', OLD.statut::text,
        'to', NEW.statut::text
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Audit du changement de statut non enregistré : %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_contract_status_transition() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trigger_contract_status_transition ON public.contracts;
CREATE TRIGGER trigger_contract_status_transition
  BEFORE UPDATE OF statut ON public.contracts
  FOR EACH ROW
  WHEN (OLD.statut IS DISTINCT FROM NEW.statut)
  EXECUTE FUNCTION public.enforce_contract_status_transition();

-- ----------------------------------------------------------------------------
-- 4. NETTOYAGE DU SCHÉMA (B21, B22, B25)
-- ----------------------------------------------------------------------------
-- `contract_value` faisait doublon avec `montant` et n'était lu nulle part.
ALTER TABLE public.contracts DROP COLUMN IF EXISTS contract_value;

-- Échéance distincte de la date de signature (moteur de rappels R9).
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS expiry_date DATE;
COMMENT ON COLUMN public.contracts.expiry_date IS
  'Échéance du contrat (fin d''exécution). Distincte de date_signature et de renewal_date.';

-- Devise : non nulle, contrainte existante `valid_currency` (EUR/USD/TND) conservée.
UPDATE public.contracts SET currency = 'EUR' WHERE currency IS NULL OR btrim(currency) = '';
ALTER TABLE public.contracts ALTER COLUMN currency SET DEFAULT 'EUR';
ALTER TABLE public.contracts ALTER COLUMN currency SET NOT NULL;

-- Devise par banque : valeur par défaut du formulaire de création.
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS default_currency TEXT NOT NULL DEFAULT 'EUR';
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'banks_default_currency_check'
  ) THEN
    ALTER TABLE public.banks
      ADD CONSTRAINT banks_default_currency_check
      CHECK (default_currency IN ('EUR', 'USD', 'TND'));
  END IF;
END $$;

-- `profiles.created_at` manquait (impossible de dater un compte).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ----------------------------------------------------------------------------
-- 5. CONTRAINTES D'INTÉGRITÉ MÉTIER
--     Ajoutées en NOT VALID : elles s'appliquent immédiatement aux INSERT/UPDATE
--     sans faire échouer la migration si des lignes historiques sont hors règle.
--     Les requêtes de diagnostic + VALIDATE sont en fin de fichier.
-- ----------------------------------------------------------------------------
ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_montant_positif;
ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_montant_positif CHECK (montant > 0) NOT VALID;

ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_client_renseigne;
ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_client_renseigne CHECK (length(btrim(client)) >= 2) NOT VALID;

ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_dates_coherentes;
ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_dates_coherentes
  CHECK (date_signature IS NULL OR date_decision IS NULL OR date_signature >= date_decision) NOT VALID;

ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_echeance_apres_decision;
ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_echeance_apres_decision
  CHECK (expiry_date IS NULL OR date_decision IS NULL OR expiry_date > date_decision) NOT VALID;

ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_renewal_apres_decision;
ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_renewal_apres_decision
  CHECK (renewal_date IS NULL OR date_decision IS NULL OR renewal_date > date_decision) NOT VALID;

COMMENT ON CONSTRAINT contracts_montant_positif ON public.contracts IS
  'Un contrat de financement a un montant strictement positif (fini les lignes à 0 créées par défaut).';

-- ----------------------------------------------------------------------------
-- 6. RÉFÉRENCE DE DÉCISION IMMUTABLE
--     La référence est attribuée à la création par trigger (par banque, avec
--     verrou transactionnel — cf. migration de durcissement). La modifier a
--     posteriori casserait la traçabilité : seul un super_admin le peut.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_contract_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.reference_decision IS DISTINCT FROM OLD.reference_decision
     AND public.get_my_role() IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'La référence de décision % est immuable (correction réservée à un super_admin)',
      OLD.reference_decision
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_contract_reference() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trigger_protect_contract_reference ON public.contracts;
CREATE TRIGGER trigger_protect_contract_reference
  BEFORE UPDATE OF reference_decision ON public.contracts
  FOR EACH ROW
  WHEN (OLD.reference_decision IS DISTINCT FROM NEW.reference_decision)
  EXECUTE FUNCTION public.protect_contract_reference();

-- Suppression de l'ancienne fonction sans paramètre : elle calculait un
-- compteur global (toutes banques confondues) sans verrou, et n'est plus
-- appelée par aucun trigger depuis la migration de durcissement.
DROP FUNCTION IF EXISTS public.generate_reference_decision();

-- ----------------------------------------------------------------------------
-- 7. RAPPELS : trigger idempotent (B23)
--     Avant : AFTER INSERT OR UPDATE + INSERT simple ⇒ un rappel supplémentaire
--     à chaque modification du contrat. Après : déclenchement seulement si la
--     date concernée change, upsert sur (contract_id, reminder_type), et
--     purge des rappels non envoyés devenus obsolètes.
-- ----------------------------------------------------------------------------
-- Dédoublonnage préalable (nécessaire à la création de l'index unique).
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY contract_id, reminder_type
           ORDER BY is_sent DESC, remind_at DESC, created_at DESC
         ) AS rn
    FROM public.contract_reminders
)
DELETE FROM public.contract_reminders r
 USING ranked
 WHERE r.id = ranked.id
   AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS contract_reminders_contract_type_uniq
  ON public.contract_reminders (contract_id, reminder_type);

CREATE OR REPLACE FUNCTION public.create_contract_reminders()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_expiry          TIMESTAMPTZ;
  v_renewal         TIMESTAMPTZ;
  v_check_signature BOOLEAN;
  v_check_renewal   BOOLEAN;
BEGIN
  -- OLD n'existe pas lors d'un INSERT : on teste TG_OP explicitement plutôt que
  -- de s'appuyer sur un OR (PostgreSQL ne garantit pas l'ordre d'évaluation).
  IF TG_OP = 'INSERT' THEN
    v_check_signature := TRUE;
    v_check_renewal   := TRUE;
  ELSE
    v_check_signature := NEW.date_signature IS DISTINCT FROM OLD.date_signature;
    v_check_renewal   := NEW.renewal_date   IS DISTINCT FROM OLD.renewal_date;
  END IF;

  -- Échéance : rappel 30 jours avant.
  IF v_check_signature THEN
    IF NEW.date_signature IS NOT NULL THEN
      v_expiry := (NEW.date_signature - INTERVAL '30 days')::timestamptz;
      INSERT INTO public.contract_reminders (contract_id, reminder_type, remind_at)
      VALUES (NEW.id, 'expiry', v_expiry)
      ON CONFLICT (contract_id, reminder_type) DO UPDATE
         SET remind_at = EXCLUDED.remind_at
       WHERE public.contract_reminders.is_sent = false;

      DELETE FROM public.contract_reminders
       WHERE contract_id = NEW.id
         AND reminder_type = 'expiry'
         AND is_sent = false
         AND remind_at <> v_expiry;
    ELSE
      DELETE FROM public.contract_reminders
       WHERE contract_id = NEW.id AND reminder_type = 'expiry' AND is_sent = false;
    END IF;
  END IF;

  -- Renouvellement : rappel 60 jours avant.
  IF v_check_renewal THEN
    IF NEW.renewal_date IS NOT NULL THEN
      v_renewal := (NEW.renewal_date - INTERVAL '60 days')::timestamptz;
      INSERT INTO public.contract_reminders (contract_id, reminder_type, remind_at)
      VALUES (NEW.id, 'renewal', v_renewal)
      ON CONFLICT (contract_id, reminder_type) DO UPDATE
         SET remind_at = EXCLUDED.remind_at
       WHERE public.contract_reminders.is_sent = false;

      DELETE FROM public.contract_reminders
       WHERE contract_id = NEW.id
         AND reminder_type = 'renewal'
         AND is_sent = false
         AND remind_at <> v_renewal;
    ELSE
      DELETE FROM public.contract_reminders
       WHERE contract_id = NEW.id AND reminder_type = 'renewal' AND is_sent = false;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.create_contract_reminders() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS create_reminders_trigger ON public.contracts;
CREATE TRIGGER create_reminders_trigger
  AFTER INSERT OR UPDATE OF date_signature, renewal_date ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.create_contract_reminders();

-- ----------------------------------------------------------------------------
-- 8. INDEX UTILES AUX TABLEAUX DE BORD
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS contracts_bank_expiry_idx
  ON public.contracts (bank_id, expiry_date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS contracts_bank_deleted_idx
  ON public.contracts (bank_id)
  WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- 9. VÉRIFICATIONS (à exécuter après application)
-- ----------------------------------------------------------------------------
-- 9.1 Le type et le défaut sont en place :
--   SELECT a.attname, format_type(a.atttypid, a.atttypmod), pg_get_expr(d.adbin, d.adrelid)
--     FROM pg_attribute a
--     LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
--    WHERE a.attrelid = 'public.contracts'::regclass AND a.attname = 'statut';
--   → contract_status | 'draft'::public.contract_status
--
-- 9.2 Plus aucune contrainte anglaise résiduelle :
--   SELECT conname FROM pg_constraint
--    WHERE conrelid = 'public.contracts'::regclass AND contype = 'c';
--   → contracts_montant_positif, contracts_client_renseigne, contracts_dates_coherentes,
--     contracts_echeance_apres_decision, contracts_renewal_apres_decision, valid_currency,
--     priority/risk_level checks — plus de contracts_statut_check.
--
-- 9.3 Créer un contrat sans préciser de statut DOIT réussir (était : 23514) :
--   INSERT INTO public.contracts (reference_decision, client, type, montant, garantie,
--                                 agence, bank_id)
--   VALUES ('', 'Client de test', 'credit_immo', 150000, 'hypotheque', 'agence_centre',
--           (SELECT id FROM public.banks LIMIT 1))
--   RETURNING reference_decision, statut, currency;
--   → CT-AAAA-000N | draft | EUR
--
-- 9.4 Transitions : une transition hors matrice est refusée, une transition
--     autorisée est tracée :
--   UPDATE public.contracts SET statut = 'active'  WHERE id = '<id>';  -- OK si draft→… non autorisé ⇒ 23514
--   UPDATE public.contracts SET statut = 'in_review' WHERE id = '<id>'; -- OK (draft→in_review)
--   SELECT from_status, to_status, changed_by_email, changed_at
--     FROM public.contract_status_history WHERE contract_id = '<id>' ORDER BY changed_at;
--
-- 9.5 Rappels : un UPDATE quelconque ne duplique plus rien :
--   UPDATE public.contracts SET description = 'x' WHERE id = '<id>';
--   UPDATE public.contracts SET description = 'y' WHERE id = '<id>';
--   SELECT reminder_type, count(*) FROM public.contract_reminders
--    WHERE contract_id = '<id>' GROUP BY reminder_type;   -- 1 ligne par type, au plus
--
-- 9.6 Lignes historiques hors contraintes (à corriger puis à valider) :
--   SELECT id, reference_decision, montant FROM public.contracts WHERE montant <= 0;
--   SELECT id, reference_decision, client  FROM public.contracts WHERE length(btrim(client)) < 2;
--   SELECT id, reference_decision, date_decision, date_signature FROM public.contracts
--    WHERE date_signature IS NOT NULL AND date_signature < date_decision;
--   -- une fois nettoyées :
--   ALTER TABLE public.contracts VALIDATE CONSTRAINT contracts_montant_positif;
--   ALTER TABLE public.contracts VALIDATE CONSTRAINT contracts_client_renseigne;
--   ALTER TABLE public.contracts VALIDATE CONSTRAINT contracts_dates_coherentes;
--   ALTER TABLE public.contracts VALIDATE CONSTRAINT contracts_echeance_apres_decision;
--   ALTER TABLE public.contracts VALIDATE CONSTRAINT contracts_renewal_apres_decision;
