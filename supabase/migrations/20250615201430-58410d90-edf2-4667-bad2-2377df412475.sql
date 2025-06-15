
-- Add branding columns to the banks table for customization
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#009688';

-- Add a policy to allow bank admins to update user profiles within their bank
-- This complements the existing policy that allows them to view profiles.
DROP POLICY IF EXISTS "Les admins peuvent modifier les profils" ON public.profiles;

CREATE POLICY "Les admins peuvent modifier les profils" 
  ON public.profiles 
  FOR UPDATE
  USING (get_my_role() = 'super_admin' OR (get_my_role() = 'bank_admin' AND bank_id = get_my_bank_id()))
  WITH CHECK (get_my_role() = 'super_admin' OR (get_my_role() = 'bank_admin' AND bank_id = get_my_bank_id()));
