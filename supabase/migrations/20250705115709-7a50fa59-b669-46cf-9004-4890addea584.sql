
-- Amélioration de la structure de base de données pour la gestion complète des contrats

-- Table pour les notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
  is_read BOOLEAN DEFAULT false,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour les commentaires collaboratifs
CREATE TABLE IF NOT EXISTS public.contract_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  tagged_users UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour les versions de documents
CREATE TABLE IF NOT EXISTS public.contract_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  file_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id),
  changes_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour les rappels automatiques
CREATE TABLE IF NOT EXISTS public.contract_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('expiry', 'renewal', 'payment', 'review')),
  remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour les intégrations
CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID REFERENCES public.banks(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL CHECK (integration_type IN ('crm', 'accounting', 'storage', 'esignature')),
  provider_name TEXT NOT NULL,
  api_credentials JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour les widgets de dashboard personnalisables
CREATE TABLE IF NOT EXISTS public.dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL,
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  width INTEGER DEFAULT 1,
  height INTEGER DEFAULT 1,
  config JSONB DEFAULT '{}',
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour les extractions AI de données contractuelles
CREATE TABLE IF NOT EXISTS public.contract_ai_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
  extracted_data JSONB NOT NULL,
  confidence_score DECIMAL(3,2),
  extraction_type TEXT NOT NULL CHECK (extraction_type IN ('dates', 'penalties', 'payments', 'parties', 'terms')),
  reviewed_by UUID REFERENCES public.profiles(id),
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Amélioration de la table contracts avec nouveaux champs
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS contract_value DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR',
ADD COLUMN IF NOT EXISTS payment_terms TEXT,
ADD COLUMN IF NOT EXISTS renewal_date DATE,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Mise à jour du statut pour inclure plus d'états
ALTER TABLE public.contracts 
DROP CONSTRAINT IF EXISTS contracts_statut_check;

ALTER TABLE public.contracts 
ADD CONSTRAINT contracts_statut_check 
CHECK (statut IN ('draft', 'review', 'approval', 'active', 'expired', 'renewed', 'cancelled', 'pending_signature', 'signed'));

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(statut);
CREATE INDEX IF NOT EXISTS idx_contracts_expiry ON public.contracts(date_signature);
CREATE INDEX IF NOT EXISTS idx_contracts_assigned ON public.contracts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_contract_comments_contract ON public.contract_comments(contract_id);

-- Politiques RLS pour les nouvelles tables
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_ai_extractions ENABLE ROW LEVEL SECURITY;

-- Politiques pour notifications
CREATE POLICY "Users can view their own notifications" 
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" 
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" 
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Politiques pour commentaires
CREATE POLICY "Users can view comments from their bank contracts" 
  ON public.contract_comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.contracts c 
    WHERE c.id = contract_id AND c.bank_id = get_my_bank_id()
  ));

CREATE POLICY "Users can create comments on their bank contracts" 
  ON public.contract_comments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.contracts c 
    WHERE c.id = contract_id AND c.bank_id = get_my_bank_id()
  ) AND user_id = auth.uid());

-- Politiques pour versions
CREATE POLICY "Users can view versions from their bank contracts" 
  ON public.contract_versions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.contracts c 
    WHERE c.id = contract_id AND c.bank_id = get_my_bank_id()
  ));

CREATE POLICY "Users can create versions for their bank contracts" 
  ON public.contract_versions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.contracts c 
    WHERE c.id = contract_id AND c.bank_id = get_my_bank_id()
  ));

-- Politiques pour rappels
CREATE POLICY "Users can manage reminders from their bank contracts" 
  ON public.contract_reminders FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.contracts c 
    WHERE c.id = contract_id AND c.bank_id = get_my_bank_id()
  ));

-- Politiques pour intégrations
CREATE POLICY "Bank admins can manage integrations" 
  ON public.integrations FOR ALL
  USING (get_my_role() IN ('super_admin', 'bank_admin') AND bank_id = get_my_bank_id());

-- Politiques pour widgets de dashboard
CREATE POLICY "Users can manage their own dashboard widgets" 
  ON public.dashboard_widgets FOR ALL
  USING (user_id = auth.uid());

-- Politiques pour extractions AI
CREATE POLICY "Users can view AI extractions from their bank contracts" 
  ON public.contract_ai_extractions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.contracts c 
    WHERE c.id = contract_id AND c.bank_id = get_my_bank_id()
  ));

CREATE POLICY "System can create AI extractions" 
  ON public.contract_ai_extractions FOR INSERT
  WITH CHECK (true);

-- Fonction pour automatiser les rappels
CREATE OR REPLACE FUNCTION public.create_contract_reminders()
RETURNS TRIGGER AS $$
BEGIN
  -- Créer rappel d'expiration (30 jours avant)
  IF NEW.date_signature IS NOT NULL THEN
    INSERT INTO public.contract_reminders (contract_id, reminder_type, remind_at)
    VALUES (NEW.id, 'expiry', NEW.date_signature - INTERVAL '30 days');
  END IF;
  
  -- Créer rappel de renouvellement si applicable
  IF NEW.renewal_date IS NOT NULL THEN
    INSERT INTO public.contract_reminders (contract_id, reminder_type, remind_at)
    VALUES (NEW.id, 'renewal', NEW.renewal_date - INTERVAL '60 days');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour créer automatiquement les rappels
DROP TRIGGER IF EXISTS create_reminders_trigger ON public.contracts;
CREATE TRIGGER create_reminders_trigger
  AFTER INSERT OR UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.create_contract_reminders();
