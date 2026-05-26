// Edge Function: gera lançamentos recorrentes para todos os usuários no início do mês.
// Deploy: supabase functions deploy monthly-recurring
// Cron (Dashboard → Edge Functions → Schedules): 0 8 1 * *  (08:00 UTC, dia 1)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const getCurrentMonthKey = (date = new Date()): string => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

const dateInMonth = (monthKey: string, day: number): string => {
  const [y, m] = monthKey.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const d = Math.min(Math.max(day, 1), lastDay);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

const isSameMonth = (dateStr: string, monthKey: string) => dateStr.slice(0, 7) === monthKey;

const alreadyScheduled = (
  transactions: { description: string; date: string }[],
  description: string,
  monthKey: string,
) => transactions.some((t) => t.description === description && isSameMonth(t.date, monthKey));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const cronSecret = Deno.env.get('CRON_SECRET');
  const headerSecret = req.headers.get('x-cron-secret');
  if (cronSecret && headerSecret !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const monthKey = getCurrentMonthKey();
  const results: { user_id: string; created: number; skipped?: boolean }[] = [];

  const { data: clientRows, error: usersError } = await supabase.from('clients').select('user_id');
  if (usersError) {
    return new Response(JSON.stringify({ error: usersError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const userIds = [...new Set((clientRows ?? []).map((r) => r.user_id as string))];

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

    const inserts: Record<string, unknown>[] = [];

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
        employee_id: e.id,
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
        results.push({ user_id: userId, created: 0 });
        continue;
      }
      created = inserts.length;
    }

    await supabase.from('recurring_generation_log').upsert(
      {
        user_id: userId,
        month_key: monthKey,
        transactions_count: created,
      },
      { onConflict: 'user_id,month_key' },
    );

    results.push({ user_id: userId, created });
  }

  return new Response(
    JSON.stringify({ monthKey, usersProcessed: userIds.length, results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
