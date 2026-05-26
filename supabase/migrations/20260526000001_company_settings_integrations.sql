-- Integrações externas (WhatsApp via n8n + Evolution)
ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS integrations JSONB NOT NULL DEFAULT '{}'::jsonb;
