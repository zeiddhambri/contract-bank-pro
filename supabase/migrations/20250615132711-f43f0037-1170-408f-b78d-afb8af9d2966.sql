
-- Add the new 'garanties' column to store multiple guarantees as a JSON array
ALTER TABLE public.contracts ADD COLUMN garanties jsonb NOT NULL DEFAULT '[]'::jsonb;
