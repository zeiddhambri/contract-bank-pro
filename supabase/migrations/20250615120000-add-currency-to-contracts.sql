
-- Add currency column to contracts table
ALTER TABLE public.contracts 
ADD COLUMN currency TEXT NOT NULL DEFAULT 'EUR';

-- Add a check constraint to ensure only valid currencies
ALTER TABLE public.contracts 
ADD CONSTRAINT valid_currency CHECK (currency IN ('EUR', 'USD', 'TND'));
