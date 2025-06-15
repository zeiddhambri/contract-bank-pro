
-- ### MIGRATION VERS UNE ARCHITECTURE MULTI-TENANT ###

-- Étape 1: Créer les nouvelles tables et les types de données nécessaires.
CREATE TYPE public.app_role AS ENUM ('super_admin', 'bank_admin', 'user');

CREATE TABLE public.banks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_id UUID REFERENCES public.banks(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  full_name TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Étape 2: Mettre à jour la table des contrats.
ALTER TABLE public.contracts ADD COLUMN bank_id UUID REFERENCES public.banks(id) ON DELETE SET NULL;

-- Étape 3: Gérer la création automatique des profils pour les nouveaux utilisateurs.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (new.id);
  RETURN new;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Étape 4: Migrer les données existantes.
-- Créer des profils pour les utilisateurs existants qui n'en ont pas.
INSERT INTO public.profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Créer une "Banque par défaut" pour les contrats existants.
INSERT INTO public.banks (name)
VALUES ('Banque par défaut')
ON CONFLICT (name) DO NOTHING;

-- Assigner tous les contrats existants à la "Banque par défaut".
UPDATE public.contracts
SET bank_id = (SELECT id FROM public.banks WHERE name = 'Banque par défaut')
WHERE bank_id IS NULL;

-- Maintenant que tous les contrats ont une banque, rendre la colonne non-nullable.
ALTER TABLE public.contracts ALTER COLUMN bank_id SET NOT NULL;

-- Assigner le rôle de super_admin à votre compte et vous lier à la banque par défaut.
UPDATE public.profiles
SET
  role = 'super_admin',
  bank_id = (SELECT id FROM public.banks WHERE name = 'Banque par défaut')
WHERE id = (SELECT id FROM auth.users WHERE email = 'zeid.dhambri@gmail.com');


-- Étape 5: Créer des fonctions d'aide pour la sécurité.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_bank_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT bank_id FROM public.profiles WHERE id = auth.uid();
$$;


-- Étape 6: Mettre en place les politiques de sécurité au niveau des lignes (RLS).
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Politiques pour la table 'banks'
CREATE POLICY "Les super admins peuvent tout gérer" ON public.banks FOR ALL USING (get_my_role() = 'super_admin');
CREATE POLICY "Les membres d'une banque peuvent voir leur banque" ON public.banks FOR SELECT USING (id = get_my_bank_id());

-- Politiques pour la table 'profiles'
CREATE POLICY "Les utilisateurs peuvent gérer leur propre profil" ON public.profiles FOR ALL USING (id = auth.uid());
CREATE POLICY "Les admins peuvent voir les profils" ON public.profiles FOR SELECT USING (get_my_role() = 'super_admin' OR (get_my_role() = 'bank_admin' AND bank_id = get_my_bank_id()));

-- Politiques pour la table 'contracts'
CREATE POLICY "Accès complet pour les super admins" ON public.contracts FOR ALL USING (get_my_role() = 'super_admin');
CREATE POLICY "Les membres d'une banque peuvent voir les contrats" ON public.contracts FOR SELECT USING (bank_id = get_my_bank_id());
CREATE POLICY "Les membres d'une banque peuvent insérer des contrats" ON public.contracts FOR INSERT WITH CHECK (bank_id = get_my_bank_id());
CREATE POLICY "Les membres d'une banque peuvent mettre à jour les contrats" ON public.contracts FOR UPDATE USING (bank_id = get_my_bank_id());
CREATE POLICY "Les membres d'une banque peuvent supprimer les contrats" ON public.contracts FOR DELETE USING (bank_id = get_my_bank_id());
