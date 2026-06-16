// Portal público do cliente — GET ?token=...
// Deploy: supabase functions deploy client-portal --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  const url = new URL(req.url);
  const token = url.searchParams.get('token')?.trim();
  if (!token) return json({ error: 'token obrigatório' }, 400);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: portalRow, error: tokenError } = await supabase
    .from('client_portal_tokens')
    .select('client_id, user_id, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (tokenError || !portalRow) return json({ error: 'Link inválido ou expirado' }, 404);

  if (portalRow.expires_at && new Date(String(portalRow.expires_at)) < new Date()) {
    return json({ error: 'Link expirado' }, 410);
  }

  const ownerId = portalRow.user_id as string;
  const clientId = portalRow.client_id as string;

  const [{ data: client }, { data: settings }, { data: txs }, { data: contracts }] =
    await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).eq('user_id', ownerId).maybeSingle(),
      supabase.from('company_settings').select('name, integrations').eq('user_id', ownerId).maybeSingle(),
      supabase
        .from('transactions')
        .select('id, description, amount, date, status, type, category, paid_date')
        .eq('user_id', ownerId)
        .eq('client_id', clientId)
        .order('date', { ascending: false })
        .limit(24),
      supabase
        .from('contracts')
        .select('id, title, status, pdf_url, pdf_file_name, start_date, end_date')
        .eq('user_id', ownerId)
        .eq('client_id', clientId)
        .order('start_date', { ascending: false })
        .limit(5),
    ]);

  if (!client) return json({ error: 'Cliente não encontrado' }, 404);

  const integrations = (settings?.integrations ?? {}) as {
    payment?: { pix_key?: string; payment_link?: string; instructions?: string };
  };

  const monthKey = new Date().toISOString().slice(0, 7);
  const pending = (txs ?? []).find(
    (t) => t.status === 'PENDING' && String(t.date).startsWith(monthKey) && t.type === 'INCOME',
  );

  return json({
    companyName: settings?.name ?? 'Agência',
    client: {
      name: client.name,
      contactPerson: client.contact_person,
      activePlan: client.active_plan,
      monthlyFee: Number(client.monthly_fee),
      dueDay: Number(client.due_day),
    },
    payment: {
      pixKey: integrations.payment?.pix_key ?? null,
      paymentLink: integrations.payment?.payment_link ?? null,
      instructions: integrations.payment?.instructions ?? null,
    },
    pendingCharge: pending
      ? {
          description: pending.description,
          amount: Number(pending.amount),
          dueDate: String(pending.date).slice(0, 10),
        }
      : null,
    transactions: (txs ?? []).map((t) => ({
      description: t.description,
      amount: Number(t.amount),
      date: String(t.paid_date ?? t.date).slice(0, 10),
      status: t.status,
      type: t.type,
    })),
    contracts: (contracts ?? []).map((c) => ({
      title: c.title,
      status: c.status,
      pdfUrl: c.pdf_url,
      pdfFileName: c.pdf_file_name,
      startDate: String(c.start_date).slice(0, 10),
      endDate: c.end_date ? String(c.end_date).slice(0, 10) : null,
    })),
  });
});
