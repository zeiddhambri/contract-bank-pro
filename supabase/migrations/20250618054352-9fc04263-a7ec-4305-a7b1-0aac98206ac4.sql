
-- Migration pour ajouter les fonctionnalités multi-tenancy et agent IA

-- Étendre la table banks pour le branding personnalisé
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS theme_config JSONB DEFAULT '{}';
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS domain_config JSONB DEFAULT '{}';
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'basic';
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS ai_features_enabled BOOLEAN DEFAULT false;

-- Table pour les templates de contrats IA
CREATE TABLE IF NOT EXISTS public.ai_contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID REFERENCES public.banks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'banking', 'insurance', 'real_estate', 'commercial', 'services'
  template_content JSONB NOT NULL, -- Structure du template IA
  prompt_template TEXT NOT NULL, -- Template pour l'IA
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour l'historique des générations IA
CREATE TABLE IF NOT EXISTS public.ai_contract_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.ai_contract_templates(id),
  user_id UUID REFERENCES public.profiles(id),
  generation_type TEXT NOT NULL, -- 'draft', 'improvement', 'analysis', 'summary'
  input_parameters JSONB,
  generated_content TEXT,
  ai_suggestions JSONB,
  quality_score DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour les paramètres de branding par organisation
CREATE TABLE IF NOT EXISTS public.organization_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID REFERENCES public.banks(id) ON DELETE CASCADE UNIQUE,
  logo_primary_url TEXT,
  logo_secondary_url TEXT,
  primary_color TEXT DEFAULT '#009688',
  secondary_color TEXT DEFAULT '#ff5722',
  accent_color TEXT DEFAULT '#ffc107',
  custom_css TEXT,
  email_template_config JSONB DEFAULT '{}',
  document_template_config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_ai_contract_templates_bank_category ON public.ai_contract_templates(bank_id, category);
CREATE INDEX IF NOT EXISTS idx_ai_contract_generations_contract ON public.ai_contract_generations(contract_id);
CREATE INDEX IF NOT EXISTS idx_organization_branding_bank ON public.organization_branding(bank_id);

-- Politiques RLS pour les nouvelles tables
ALTER TABLE public.ai_contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_contract_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_branding ENABLE ROW LEVEL SECURITY;

-- Politiques pour ai_contract_templates
CREATE POLICY "Les utilisateurs peuvent voir les templates de leur banque" 
  ON public.ai_contract_templates FOR SELECT
  USING (bank_id = get_my_bank_id());

CREATE POLICY "Les admins peuvent gérer les templates" 
  ON public.ai_contract_templates FOR ALL
  USING (get_my_role() IN ('super_admin', 'bank_admin') AND bank_id = get_my_bank_id());

-- Politiques pour ai_contract_generations
CREATE POLICY "Les utilisateurs peuvent voir leurs générations" 
  ON public.ai_contract_generations FOR SELECT
  USING (user_id = auth.uid() OR get_my_role() IN ('super_admin', 'bank_admin'));

CREATE POLICY "Les utilisateurs peuvent créer des générations" 
  ON public.ai_contract_generations FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Politiques pour organization_branding
CREATE POLICY "Les utilisateurs peuvent voir le branding de leur banque" 
  ON public.organization_branding FOR SELECT
  USING (bank_id = get_my_bank_id());

CREATE POLICY "Les admins peuvent gérer le branding" 
  ON public.organization_branding FOR ALL
  USING (get_my_role() IN ('super_admin', 'bank_admin') AND bank_id = get_my_bank_id());
