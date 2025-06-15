
-- Create a new bucket for contract files
INSERT INTO storage.buckets
  (id, name, public)
VALUES
  ('contract_files', 'contract_files', true);

-- Create RLS policies for the new bucket
-- Allow public read access to files
CREATE POLICY "Public read access for contract files"
ON storage.objects FOR SELECT
USING ( bucket_id = 'contract_files' );

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'contract_files' );

-- Allow authenticated users to update files
CREATE POLICY "Allow authenticated users to update files"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'contract_files' );

-- Allow authenticated users to delete files
CREATE POLICY "Allow authenticated users to delete files"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'contract_files' );

-- Add a column to the contracts table to store the file path
ALTER TABLE public.contracts
ADD COLUMN file_path TEXT;
