ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS transaction_categories JSONB DEFAULT '[]'::jsonb;
