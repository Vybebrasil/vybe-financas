CREATE TABLE IF NOT EXISTS employee_compensation_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  effective_month TEXT NOT NULL CHECK (effective_month ~ '^\d{4}-\d{2}$'),
  salary NUMERIC NOT NULL CHECK (salary >= 0),
  bonus NUMERIC NOT NULL DEFAULT 0 CHECK (bonus >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, effective_month)
);

CREATE INDEX IF NOT EXISTS idx_employee_compensation_history_employee
  ON employee_compensation_history (employee_id, effective_month DESC);

ALTER TABLE employee_compensation_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employee_compensation_history_workspace" ON employee_compensation_history;
CREATE POLICY "employee_compensation_history_workspace" ON employee_compensation_history
  FOR ALL USING (user_id IN (SELECT public.user_data_owner_ids()))
  WITH CHECK (user_id IN (SELECT public.user_data_owner_ids()));

-- Baseline: salário atual vale desde sempre, até haver registro mais específico.
INSERT INTO employee_compensation_history (employee_id, user_id, effective_month, salary, bonus)
SELECT id, user_id, '1970-01', salary, COALESCE(bonus, 0)
FROM employees
ON CONFLICT (employee_id, effective_month) DO NOTHING;

-- Inferir salário histórico em meses em que o pagamento de salário cobriu quase todo o total pago.
WITH monthly AS (
  SELECT
    t.employee_id,
    e.user_id,
    to_char(
      COALESCE(t.paid_date::date, t.date::date),
      'YYYY-MM'
    ) AS month_key,
    SUM(
      CASE
        WHEN t.category = 'Salário/Prolabore' AND t.status = 'PAID' THEN t.amount
        ELSE 0
      END
    ) AS salary_paid,
    SUM(CASE WHEN t.status = 'PAID' THEN t.amount ELSE 0 END) AS total_paid
  FROM transactions t
  JOIN employees e ON e.id = t.employee_id
  WHERE t.type = 'EXPENSE'
    AND t.employee_id IS NOT NULL
  GROUP BY t.employee_id, e.user_id, month_key
)
INSERT INTO employee_compensation_history (employee_id, user_id, effective_month, salary, bonus)
SELECT
  m.employee_id,
  m.user_id,
  m.month_key,
  m.salary_paid,
  0
FROM monthly m
JOIN employees e ON e.id = m.employee_id
WHERE m.salary_paid > 0
  AND (m.total_paid - m.salary_paid) <= m.salary_paid * 0.25
  AND m.salary_paid < e.salary
ON CONFLICT (employee_id, effective_month) DO UPDATE
  SET salary = EXCLUDED.salary,
      bonus = EXCLUDED.bonus;

-- Quando há salário histórico menor que o atual, registra reajuste no mês seguinte.
INSERT INTO employee_compensation_history (employee_id, user_id, effective_month, salary, bonus)
SELECT
  e.id,
  e.user_id,
  to_char(
    (date_trunc('month', (h.effective_month || '-01')::date) + interval '1 month')::date,
    'YYYY-MM'
  ),
  e.salary,
  COALESCE(e.bonus, 0)
FROM employees e
JOIN LATERAL (
  SELECT h2.effective_month, h2.salary
  FROM employee_compensation_history h2
  WHERE h2.employee_id = e.id
    AND h2.effective_month <> '1970-01'
    AND h2.salary < e.salary
  ORDER BY h2.effective_month DESC
  LIMIT 1
) h ON true
ON CONFLICT (employee_id, effective_month) DO UPDATE
  SET salary = EXCLUDED.salary,
      bonus = EXCLUDED.bonus;
