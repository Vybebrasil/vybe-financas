-- Cron: régua de cobrança automática (diário 09:00 UTC = 06:00 Brasília)
SELECT cron.unschedule('vybe-billing-dispatch')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'vybe-billing-dispatch');

SELECT cron.schedule(
  'vybe-billing-dispatch',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'vybe_project_url') || '/functions/v1/billing-dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'vybe_anon_key'),
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'vybe_cron_secret')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
