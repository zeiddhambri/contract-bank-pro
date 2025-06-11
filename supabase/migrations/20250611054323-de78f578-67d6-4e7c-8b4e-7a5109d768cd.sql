
-- Create a table for contracts
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_decision TEXT NOT NULL UNIQUE,
  client TEXT NOT NULL,
  type TEXT NOT NULL,
  montant DECIMAL(15,2) NOT NULL,
  garantie TEXT NOT NULL,
  agence TEXT NOT NULL,
  description TEXT,
  statut TEXT NOT NULL DEFAULT 'en_cours',
  date_decision DATE NOT NULL DEFAULT CURRENT_DATE,
  date_signature DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Create policy that allows authenticated users to view all contracts
CREATE POLICY "Authenticated users can view contracts" 
  ON public.contracts 
  FOR SELECT 
  TO authenticated
  USING (true);

-- Create policy that allows authenticated users to insert contracts
CREATE POLICY "Authenticated users can create contracts" 
  ON public.contracts 
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- Create policy that allows authenticated users to update contracts
CREATE POLICY "Authenticated users can update contracts" 
  ON public.contracts 
  FOR UPDATE 
  TO authenticated
  USING (true);

-- Create policy that allows authenticated users to delete contracts
CREATE POLICY "Authenticated users can delete contracts" 
  ON public.contracts 
  FOR DELETE 
  TO authenticated
  USING (true);

-- Create function to auto-generate reference decision
CREATE OR REPLACE FUNCTION generate_reference_decision()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  counter INTEGER;
  new_reference TEXT;
BEGIN
  year_part := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  -- Get the next counter for this year
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference_decision FROM 'CT-' || year_part || '-(\d+)') AS INTEGER)), 0) + 1
  INTO counter
  FROM public.contracts
  WHERE reference_decision LIKE 'CT-' || year_part || '-%';
  
  new_reference := 'CT-' || year_part || '-' || LPAD(counter::TEXT, 3, '0');
  
  RETURN new_reference;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate reference_decision if not provided
CREATE OR REPLACE FUNCTION set_reference_decision()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_decision IS NULL OR NEW.reference_decision = '' THEN
    NEW.reference_decision := generate_reference_decision();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_reference_decision
  BEFORE INSERT ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION set_reference_decision();
