-- Vybe Finanças — schema alinhado com src/services/api.ts (snake_case)
-- Execute no Supabase: SQL Editor → New query → Run

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL,
  client_id UUID,
  payment_method TEXT,
  receipt_url TEXT,
  bank_account_id UUID
);

-- Contas bancárias
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  institution TEXT DEFAULT '',
  initial_balance NUMERIC DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FK opcional (se a coluna já existir sem FK):
-- ALTER TABLE transactions ADD CONSTRAINT transactions_bank_account_fkey
--   FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL;

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cnpj TEXT,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  active_plan TEXT,
  monthly_fee NUMERIC,
  due_day INTEGER,
  contract_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Se a tabela já existir:
-- ALTER TABLE clients ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  salary NUMERIC NOT NULL,
  pix_key TEXT,
  payment_day INTEGER,
  observations TEXT
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cost NUMERIC NOT NULL,
  renewal_day INTEGER,
  payment_method TEXT,
  active BOOLEAN DEFAULT true
);

-- Configurações da empresa (substitui user_metadata para planos/templates)
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
  transaction_categories JSONB DEFAULT '[]'::jsonb,
  integrations JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS transaction_categories JSONB DEFAULT '[]'::jsonb;

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_settings_own" ON company_settings;
CREATE POLICY "company_settings_own" ON company_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Log de geração de recorrência mensal (cliente + Edge Function)
CREATE TABLE IF NOT EXISTS recurring_generation_log (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL,
  transactions_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, month_key)
);

ALTER TABLE recurring_generation_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recurring_log_own" ON recurring_generation_log;
CREATE POLICY "recurring_log_own" ON recurring_generation_log
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- Policies (per authenticated user)
DROP POLICY IF EXISTS "transactions_own" ON transactions;
CREATE POLICY "transactions_own" ON transactions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "clients_own" ON clients;
CREATE POLICY "clients_own" ON clients
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "employees_own" ON employees;
CREATE POLICY "employees_own" ON employees
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "subscriptions_own" ON subscriptions;
CREATE POLICY "subscriptions_own" ON subscriptions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "bank_accounts_own" ON bank_accounts;
CREATE POLICY "bank_accounts_own" ON bank_accounts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Storage buckets (públicos para URL direta; arquivos em pasta por usuário)
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas: cada usuário só acessa arquivos em storage.objects.name começando com seu user_id/
DROP POLICY IF EXISTS "receipts_select" ON storage.objects;
DROP POLICY IF EXISTS "receipts_insert" ON storage.objects;
DROP POLICY IF EXISTS "receipts_update" ON storage.objects;
DROP POLICY IF EXISTS "receipts_delete" ON storage.objects;
CREATE POLICY "receipts_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "receipts_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "receipts_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "receipts_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "logos_select" ON storage.objects;
DROP POLICY IF EXISTS "logos_insert" ON storage.objects;
DROP POLICY IF EXISTS "logos_update" ON storage.objects;
DROP POLICY IF EXISTS "logos_delete" ON storage.objects;
CREATE POLICY "logos_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "logos_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "logos_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "logos_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ========== Workspace + equipe + log de ações (ver migration 20260520000005) ==========
-- Conta compartilhada: migrations em supabase/migrations/ (005–011)
-- Se convite falhar com "infinite recursion": rode 20260520000011_fix_members_rls_recursion.sql

CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Minha empresa',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS workspaces_owner_id_idx ON workspaces(owner_id);

CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  UNIQUE(workspace_id, email)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  summary TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
