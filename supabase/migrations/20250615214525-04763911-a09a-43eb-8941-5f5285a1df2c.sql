
-- Create contract templates table
CREATE TABLE public.contract_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- same as contract types (pret_auto, pret_immobilier, etc.)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create template fields table for dynamic fields
CREATE TABLE public.template_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.contract_templates(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL, -- text, number, date, select, textarea, checkbox
  field_options JSONB, -- for select fields, validation rules, etc.
  is_required BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workflow steps table
CREATE TABLE public.template_workflow_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.contract_templates(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  step_description TEXT,
  required_role TEXT, -- which role can execute this step
  step_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for contract templates
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view templates from their bank"
  ON public.contract_templates
  FOR SELECT
  USING (bank_id = get_my_bank_id());

CREATE POLICY "Bank admins can manage templates"
  ON public.contract_templates
  FOR ALL
  USING (bank_id = get_my_bank_id() AND get_my_role() IN ('bank_admin', 'super_admin'));

-- Add RLS policies for template fields
ALTER TABLE public.template_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view template fields from their bank"
  ON public.template_fields
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.contract_templates ct 
    WHERE ct.id = template_id AND ct.bank_id = get_my_bank_id()
  ));

CREATE POLICY "Bank admins can manage template fields"
  ON public.template_fields
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.contract_templates ct 
    WHERE ct.id = template_id AND ct.bank_id = get_my_bank_id() AND get_my_role() IN ('bank_admin', 'super_admin')
  ));

-- Add RLS policies for workflow steps
ALTER TABLE public.template_workflow_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workflow steps from their bank"
  ON public.template_workflow_steps
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.contract_templates ct 
    WHERE ct.id = template_id AND ct.bank_id = get_my_bank_id()
  ));

CREATE POLICY "Bank admins can manage workflow steps"
  ON public.template_workflow_steps
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.contract_templates ct 
    WHERE ct.id = template_id AND ct.bank_id = get_my_bank_id() AND get_my_role() IN ('bank_admin', 'super_admin')
  ));

-- Create indexes for better performance
CREATE INDEX idx_contract_templates_bank_id ON public.contract_templates(bank_id);
CREATE INDEX idx_template_fields_template_id ON public.template_fields(template_id);
CREATE INDEX idx_template_workflow_steps_template_id ON public.template_workflow_steps(template_id);
