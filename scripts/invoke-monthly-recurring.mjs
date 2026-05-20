/**
 * Invoca a Edge Function monthly-recurring já publicada no Supabase.
 * Uso: npm run recurring:invoke
 * Opcional no .env.local: CRON_SECRET (header x-cron-secret)
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnvLocal() {
  const path = resolve(root, '.env.local');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const cronSecret = process.env.CRON_SECRET;

if (!url || !anonKey) {
  console.error('Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local');
  process.exit(1);
}

const invokeUrl = `${url}/functions/v1/monthly-recurring`;
const headers = {
  Authorization: `Bearer ${anonKey}`,
  'Content-Type': 'application/json',
};
if (cronSecret) headers['x-cron-secret'] = cronSecret;

console.log('Invocando:', invokeUrl);

const res = await fetch(invokeUrl, { method: 'POST', headers });
const text = await res.text();

if (!res.ok) {
  console.error(`HTTP ${res.status}:`, text);
  if (res.status === 404) {
    console.error('\nA função ainda não foi publicada. Execute:');
    console.error('  1. supabase login');
    console.error('  2. npm run recurring:deploy');
    console.error('  Ou use a execução local: npm run recurring:run (com SUPABASE_SERVICE_ROLE_KEY)');
  }
  process.exit(1);
}

console.log(text);
