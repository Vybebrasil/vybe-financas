-- Data de assinatura do contrato (vigência calculada a partir dela + prazo em meses → end_date)
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS signed_date DATE;

COMMENT ON COLUMN contracts.signed_date IS 'Data de assinatura; com prazo em meses define end_date';
