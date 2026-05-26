-- Contratos de clientes (aba Contratos)
CREATE TABLE IF NOT EXISTS contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Ativo',
  start_date DATE NOT NULL,
  end_date DATE,
  due_day INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS contracts_user_id_idx ON contracts(user_id);
CREATE INDEX IF NOT EXISTS contracts_client_id_idx ON contracts(client_id);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contracts_own" ON contracts;
CREATE POLICY "contracts_own" ON contracts
  FOR ALL
  USING (user_id IN (SELECT public.user_data_owner_ids()))
  WITH CHECK (user_id IN (SELECT public.user_data_owner_ids()));
