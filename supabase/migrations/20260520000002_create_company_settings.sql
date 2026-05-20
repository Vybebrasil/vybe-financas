CREATE TABLE IF NOT EXISTS company_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Minha Agência',
  cnpj TEXT DEFAULT '',
  logo_url TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  service_plans JSONB DEFAULT '[]'::jsonb,
  message_templates JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_settings_own" ON company_settings;
CREATE POLICY "company_settings_own" ON company_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
