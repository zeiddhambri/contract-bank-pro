
-- Create a table for audit logs
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  bank_id UUID REFERENCES public.banks(id) ON DELETE CASCADE
);

-- Add comments to columns for clarity
COMMENT ON COLUMN public.audit_logs.user_id IS 'The user who performed the action. Null for system actions or if user is deleted.';
COMMENT ON COLUMN public.audit_logs.user_email IS 'Denormalized user email for easier display.';
COMMENT ON COLUMN public.audit_logs.action IS 'A key describing the action, e.g., ''contract.create''.';
COMMENT ON COLUMN public.audit_logs.details IS 'Extra details about the action, e.g., which contract was created.';

-- Enable Row Level Security
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins and bank admins of the concerned bank can view logs.
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (get_my_role() = 'super_admin' OR (get_my_role() = 'bank_admin' AND bank_id = get_my_bank_id()));

-- Policy: Authenticated users can insert logs.
-- The application logic will be responsible for creating the log entries correctly.
CREATE POLICY "Authenticated users can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- No one can update or delete audit logs to ensure integrity.
