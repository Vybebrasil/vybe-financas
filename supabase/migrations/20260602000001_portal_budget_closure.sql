-- Portal do cliente, orçamento mensal e fechamento de período

CREATE TABLE IF NOT EXISTS client_portal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id)
);

CREATE INDEX IF NOT EXISTS idx_client_portal_tokens_token ON client_portal_tokens (token);

ALTER TABLE client_portal_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_portal_tokens_workspace" ON client_portal_tokens;
CREATE POLICY "client_portal_tokens_workspace" ON client_portal_tokens
  FOR ALL
  USING (user_id IN (SELECT public.user_data_owner_ids()))
  WITH CHECK (user_id IN (SELECT public.user_data_owner_ids()));

CREATE TABLE IF NOT EXISTS monthly_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, month_key, category)
);

CREATE INDEX IF NOT EXISTS idx_monthly_budgets_user_month ON monthly_budgets (user_id, month_key);

ALTER TABLE monthly_budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "monthly_budgets_workspace" ON monthly_budgets;
CREATE POLICY "monthly_budgets_workspace" ON monthly_budgets
  FOR ALL
  USING (user_id IN (SELECT public.user_data_owner_ids()))
  WITH CHECK (user_id IN (SELECT public.user_data_owner_ids()));

CREATE TABLE IF NOT EXISTS period_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_by_email TEXT,
  notes TEXT,
  UNIQUE (user_id, month_key)
);

CREATE INDEX IF NOT EXISTS idx_period_closures_user ON period_closures (user_id, month_key);

ALTER TABLE period_closures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "period_closures_workspace" ON period_closures;
CREATE POLICY "period_closures_workspace" ON period_closures
  FOR ALL
  USING (user_id IN (SELECT public.user_data_owner_ids()))
  WITH CHECK (user_id IN (SELECT public.user_data_owner_ids()));
