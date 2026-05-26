ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_employee_id ON transactions(employee_id);
