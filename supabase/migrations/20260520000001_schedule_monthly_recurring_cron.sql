-- Cron: recorrência mensal via Edge Function monthly-recurring
-- Requer: pg_cron, pg_net e secrets no Vault (vybe_project_url, vybe_anon_key, vybe_cron_secret)
-- Horário: dia 1 de cada mês às 08:00 UTC (05:00 em Brasília, horário padrão)

SELECT cron.schedule(
  'vybe-monthly-recurring',
  '0 8 1 * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'vybe_project_url') || '/functions/v1/monthly-recurring',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'vybe_anon_key'),
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'vybe_cron_secret')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
