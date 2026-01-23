-- Create Transactions Table
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL,
  "clientId" UUID,
  "paymentMethod" TEXT,
  "receiptUrl" TEXT
);

-- ADD COLUMN IF NOT EXISTS (Run this if table already exists)
-- ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "receiptUrl" TEXT;

-- Create Clients Table
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT,
  "contactPerson" TEXT,
  email TEXT,
  phone TEXT,
  "activePlan" TEXT,
  "monthlyFee" NUMERIC,
  "dueDay" INTEGER,
  "contractStatus" TEXT
);

-- Create Employees Table
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  salary NUMERIC NOT NULL,
  "pixKey" TEXT,
  "paymentDay" INTEGER,
  observations TEXT
);

-- Create Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cost NUMERIC NOT NULL,
  "renewalDay" INTEGER,
  "paymentMethod" TEXT,
  active BOOLEAN DEFAULT true
);

-- Enable Row Level Security (RLS)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create Policies (Allow Public Access for Dev)
-- Drop existing to avoid conflicts if re-running
DROP POLICY IF EXISTS "Public Transactions" ON transactions;
DROP POLICY IF EXISTS "Public Clients" ON clients;
DROP POLICY IF EXISTS "Public Employees" ON employees;
DROP POLICY IF EXISTS "Public Subscriptions" ON subscriptions;

CREATE POLICY "Public Transactions" ON transactions FOR ALL USING (true);
CREATE POLICY "Public Clients" ON clients FOR ALL USING (true);
CREATE POLICY "Public Employees" ON employees FOR ALL USING (true);
CREATE POLICY "Public Subscriptions" ON subscriptions FOR ALL USING (true);

-- STORAGE SETUP
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "Public Receipts Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Receipts Select" ON storage.objects;

CREATE POLICY "Public Receipts Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts');
CREATE POLICY "Public Receipts Select" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');

-- LOGOS BUCKET SETUP
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Logos Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Logos Select" ON storage.objects;

CREATE POLICY "Public Logos Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos');
CREATE POLICY "Public Logos Select" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "Public Logos Update" ON storage.objects FOR UPDATE USING (bucket_id = 'logos');
CREATE POLICY "Public Logos Delete" ON storage.objects FOR DELETE USING (bucket_id = 'logos');
