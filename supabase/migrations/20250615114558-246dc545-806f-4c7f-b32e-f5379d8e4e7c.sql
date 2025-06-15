
-- Enable RLS on contracts table if not already enabled
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow anyone to insert contracts (since there's no authentication system)
CREATE POLICY "Allow public insert on contracts" ON public.contracts
FOR INSERT 
TO public
WITH CHECK (true);

-- Create a policy to allow anyone to select contracts
CREATE POLICY "Allow public select on contracts" ON public.contracts
FOR SELECT 
TO public
USING (true);

-- Create a policy to allow anyone to update contracts
CREATE POLICY "Allow public update on contracts" ON public.contracts
FOR UPDATE 
TO public
USING (true);

-- Create a policy to allow anyone to delete contracts
CREATE POLICY "Allow public delete on contracts" ON public.contracts
FOR DELETE 
TO public
USING (true);
