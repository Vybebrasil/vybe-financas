ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS paid_date DATE;

COMMENT ON COLUMN transactions.paid_date IS 'Data real do pagamento/recebimento ao dar baixa em lançamento pendente';
