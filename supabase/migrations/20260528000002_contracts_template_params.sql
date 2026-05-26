ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS template_key TEXT NOT NULL DEFAULT 'vybe-os-marketing',
  ADD COLUMN IF NOT EXISTS parameters JSONB NOT NULL DEFAULT '{}'::jsonb;
