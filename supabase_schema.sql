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
  receipt_url TEXT
);

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
  contract_status TEXT
);

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

-- RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

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

-- Storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "receipts_select" ON storage.objects;
DROP POLICY IF EXISTS "receipts_insert" ON storage.objects;
CREATE POLICY "receipts_select" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
CREATE POLICY "receipts_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts');

DROP POLICY IF EXISTS "logos_select" ON storage.objects;
DROP POLICY IF EXISTS "logos_insert" ON storage.objects;
DROP POLICY IF EXISTS "logos_update" ON storage.objects;
DROP POLICY IF EXISTS "logos_delete" ON storage.objects;
CREATE POLICY "logos_select" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "logos_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos');
CREATE POLICY "logos_update" ON storage.objects FOR UPDATE USING (bucket_id = 'logos');
CREATE POLICY "logos_delete" ON storage.objects FOR DELETE USING (bucket_id = 'logos');
