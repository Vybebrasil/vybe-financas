-- PDF assinado / anexo do contrato
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS pdf_file_name TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "contracts_select" ON storage.objects;
DROP POLICY IF EXISTS "contracts_insert" ON storage.objects;
DROP POLICY IF EXISTS "contracts_update" ON storage.objects;
DROP POLICY IF EXISTS "contracts_delete" ON storage.objects;

CREATE POLICY "contracts_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'contracts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "contracts_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'contracts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "contracts_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'contracts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "contracts_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'contracts' AND (storage.foldername(name))[1] = auth.uid()::text);
