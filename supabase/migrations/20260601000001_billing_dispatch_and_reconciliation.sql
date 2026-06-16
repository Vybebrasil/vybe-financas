-- Régua automática: log de disparos
CREATE TABLE IF NOT EXISTS billing_dispatch_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email')),
  stage TEXT NOT NULL,
  dispatch_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  error_message TEXT,
  template_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_id, channel, stage, dispatch_date)
);

CREATE INDEX IF NOT EXISTS idx_billing_dispatch_user_date
  ON billing_dispatch_log (user_id, dispatch_date DESC);

ALTER TABLE billing_dispatch_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_dispatch_workspace" ON billing_dispatch_log
  FOR ALL
  USING (user_id IN (SELECT public.user_data_owner_ids()))
  WITH CHECK (user_id IN (SELECT public.user_data_owner_ids()));

-- Conciliação bancária: linhas importadas
CREATE TABLE IF NOT EXISTS bank_statement_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  import_batch_id UUID NOT NULL,
  line_date DATE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  amount NUMERIC(12, 2) NOT NULL,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  reconciled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_statement_lines_user_batch
  ON bank_statement_lines (user_id, import_batch_id);

CREATE INDEX IF NOT EXISTS idx_bank_statement_lines_unreconciled
  ON bank_statement_lines (user_id)
  WHERE transaction_id IS NULL;

ALTER TABLE bank_statement_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_statement_lines_workspace" ON bank_statement_lines
  FOR ALL
  USING (user_id IN (SELECT public.user_data_owner_ids()))
  WITH CHECK (user_id IN (SELECT public.user_data_owner_ids()));

-- Log de webhooks de pagamento
CREATE TABLE IF NOT EXISTS payment_webhook_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'generic',
  event_type TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('processed', 'ignored', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_log_user_created
  ON payment_webhook_log (user_id, created_at DESC);

ALTER TABLE payment_webhook_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_webhook_log_workspace" ON payment_webhook_log
  FOR ALL
  USING (user_id IN (SELECT public.user_data_owner_ids()))
  WITH CHECK (user_id IN (SELECT public.user_data_owner_ids()));
