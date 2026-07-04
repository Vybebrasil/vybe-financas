-- Transferências entre contas (evita duplicar despesa ao pagar fatura do cartão)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS transfer_to_account_id UUID
  REFERENCES bank_accounts(id) ON DELETE SET NULL;

ALTER TABLE bank_accounts
  ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'checking';

COMMENT ON COLUMN transactions.transfer_to_account_id IS
  'Conta destino quando type = TRANSFER';

COMMENT ON COLUMN bank_accounts.account_type IS
  'checking | credit_card | cash | other';
