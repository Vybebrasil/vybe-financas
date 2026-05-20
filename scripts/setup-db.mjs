/**
 * Aplica supabase_schema.sql no banco remoto.
 * Uso: set DATABASE_URL=postgresql://postgres.[ref]:[senha]@...pooler.supabase.com:6543/postgres
 *      node scripts/setup-db.mjs
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const { Client } = pg;
const root = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(root, '..', 'supabase_schema.sql'), 'utf8');
const url = process.env.DATABASE_URL;

if (!url) {
  console.error('Defina DATABASE_URL (Connection string do Supabase → Settings → Database).');
  process.exit(1);
}

const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(sql);
  console.log('Schema aplicado com sucesso.');
} catch (err) {
  console.error('Erro:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
