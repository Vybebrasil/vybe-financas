/**
 * Executa a mesma lógica da Edge Function monthly-recurring localmente.
 * Requer SUPABASE_SERVICE_ROLE_KEY no .env.local (Settings → API no Supabase).
 *
 * Uso: npm run recurring:run
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnvLocal() {
  const path = resolve(root, '.env.local');
  if (!existsSync(path)) return;
  const content = readFileSync(path, 'utf8');
  for (const line of content.split('\n')) {
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

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error(
    'Defina VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local\n' +
      'Service role: Supabase Dashboard → Project Settings → API → service_role (secret)',
  );
  process.exit(1);
}

const getCurrentMonthKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

const dateInMonth = (monthKey, day) => {
  const [y, m] = monthKey.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const d = Math.min(Math.max(day, 1), lastDay);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

const isSameMonth = (dateStr, monthKey) => dateStr.slice(0, 7) === monthKey;

const alreadyScheduled = (transactions, description, monthKey) =>
  transactions.some((t) => t.description === description && isSameMonth(t.date, monthKey));

const supabase = createClient(supabaseUrl, serviceKey);
const monthKey = getCurrentMonthKey();

console.log(`Vybe Finanças — recorrência mensal (${monthKey})`);
console.log(`Projeto: ${supabaseUrl}\n`);

const { data: clientRows, error: usersError } = await supabase.from('clients').select('user_id');
if (usersError) {
  console.error('Erro ao listar usuários:', usersError.message);
  process.exit(1);
}

const userIds = [...new Set((clientRows ?? []).map((r) => r.user_id))];
const results = [];

for (const userId of userIds) {
  const { data: logRow } = await supabase
    .from('recurring_generation_log')
    .select('month_key')
    .eq('user_id', userId)
    .eq('month_key', monthKey)
    .maybeSingle();

  if (logRow) {
    results.push({ user_id: userId, created: 0, skipped: true });
    continue;
  }

  const [clientsRes, employeesRes, subsRes, transRes] = await Promise.all([
    supabase.from('clients').select('*').eq('user_id', userId),
    supabase.from('employees').select('*').eq('user_id', userId),
    supabase.from('subscriptions').select('*').eq('user_id', userId),
    supabase.from('transactions').select('description, date').eq('user_id', userId),
  ]);

  const clients = clientsRes.data ?? [];
  const employees = employeesRes.data ?? [];
  const subscriptions = subsRes.data ?? [];
  const transactions = transRes.data ?? [];
  const inserts = [];

  for (const c of clients) {
    if (c.contract_status !== 'Ativo') continue;
    const description = `Mensalidade - ${c.name}`;
    if (alreadyScheduled(transactions, description, monthKey)) continue;
    inserts.push({
      user_id: userId,
      description,
      amount: c.monthly_fee,
      type: 'INCOME',
      category: 'Pagamento de Cliente',
      date: dateInMonth(monthKey, c.due_day),
      status: 'PENDING',
      client_id: c.id,
      payment_method: 'PIX',
    });
  }

  for (const e of employees) {
    const description = `Salário - ${e.name}`;
    if (alreadyScheduled(transactions, description, monthKey)) continue;
    inserts.push({
      user_id: userId,
      description,
      amount: e.salary,
      type: 'EXPENSE',
      category: 'Salário/Prolabore',
      date: dateInMonth(monthKey, e.payment_day),
      status: 'PENDING',
      payment_method: 'PIX',
    });
  }

  for (const s of subscriptions) {
    if (!s.active) continue;
    const description = `Assinatura - ${s.name}`;
    if (alreadyScheduled(transactions, description, monthKey)) continue;
    inserts.push({
      user_id: userId,
      description,
      amount: s.cost,
      type: 'EXPENSE',
      category: 'Ferramentas/Software',
      date: dateInMonth(monthKey, s.renewal_day),
      status: 'PENDING',
      payment_method: s.payment_method ?? 'OUTRO',
    });
  }

  let created = 0;
  if (inserts.length > 0) {
    const { error: insertError } = await supabase.from('transactions').insert(inserts);
    if (insertError) {
      console.error(`Usuário ${userId}:`, insertError.message);
      results.push({ user_id: userId, created: 0, error: insertError.message });
      continue;
    }
    created = inserts.length;
  }

  const { error: logError } = await supabase.from('recurring_generation_log').upsert(
    { user_id: userId, month_key: monthKey, transactions_count: created },
    { onConflict: 'user_id,month_key' },
  );

  if (logError && !logError.message?.includes('does not exist')) {
    console.warn(`Log não gravado para ${userId}:`, logError.message);
  }

  results.push({ user_id: userId, created });
}

console.log(JSON.stringify({ monthKey, usersProcessed: userIds.length, results }, null, 2));

const totalCreated = results.reduce((s, r) => s + (r.created || 0), 0);
console.log(`\nConcluído: ${totalCreated} lançamento(s) criado(s).`);
