// Edge Function: webhook de pagamento (Asaas / Mercado Pago / genérico)
// POST /functions/v1/payment-webhook?user_id=UUID
// Header: X-Webhook-Secret (opcional, validado contra company_settings)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { getCurrentMonthKey } from '../_shared/billingStages.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface GenericPaymentPayload {
  event?: string;
  clientId?: string;
  client_id?: string;
  value?: number;
  amount?: number;
  paymentDate?: string;
  payment_date?: string;
  externalReference?: string;
  external_reference?: string;
  payment?: {
    value?: number;
    amount?: number;
    paymentDate?: string;
    payment_date?: string;
    externalReference?: string;
    external_reference?: string;
    customer?: string;
  };
}

function parsePayment(body: GenericPaymentPayload): {
  clientId?: string;
  amount?: number;
  paymentDate: string;
} {
  const p = body.payment ?? body;
  const amount = Number(p.value ?? p.amount ?? body.value ?? body.amount);
  let clientId = body.clientId ?? body.client_id ?? p.externalReference ?? p.external_reference ?? body.externalReference ?? body.external_reference;
  if (clientId && clientId.includes(':')) {
    clientId = clientId.split(':')[0];
  }
  const rawDate = p.paymentDate ?? p.payment_date ?? body.paymentDate ?? body.payment_date;
  const paymentDate = rawDate
    ? String(rawDate).slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  return { clientId, amount: Number.isFinite(amount) ? amount : undefined, paymentDate };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = new URL(req.url);
  const ownerId = url.searchParams.get('user_id');
  if (!ownerId) return json({ error: 'user_id query param obrigatório' }, 400);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: settingsRow } = await supabase
    .from('company_settings')
    .select('integrations')
    .eq('user_id', ownerId)
    .maybeSingle();

  const integrations = (settingsRow?.integrations ?? {}) as {
    payment_provider?: { enabled?: boolean; webhook_secret?: string };
  };
  const provider = integrations.payment_provider;
  if (provider?.enabled === false) {
    return json({ error: 'Webhook de pagamento desativado' }, 403);
  }

  const secretHeader = req.headers.get('x-webhook-secret')?.trim();
  const expectedSecret = provider?.webhook_secret?.trim();
  if (expectedSecret && secretHeader !== expectedSecret) {
    return json({ error: 'Webhook secret inválido' }, 401);
  }

  let body: GenericPaymentPayload;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }

  const { clientId, amount, paymentDate } = parsePayment(body);
  if (!clientId || amount === undefined) {
    await supabase.from('payment_webhook_log').insert({
      user_id: ownerId,
      provider: 'generic',
      event_type: body.event ?? null,
      payload: body,
      status: 'ignored',
      error_message: 'clientId ou amount ausente',
    });
    return json({ ok: true, ignored: true });
  }

  const monthKey = getCurrentMonthKey(new Date(`${paymentDate}T12:00:00`));

  const { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('id', clientId)
    .eq('user_id', ownerId)
    .maybeSingle();

  if (!client) {
    await supabase.from('payment_webhook_log').insert({
      user_id: ownerId,
      provider: provider?.enabled ? 'configured' : 'generic',
      event_type: body.event ?? null,
      payload: body,
      status: 'failed',
      error_message: 'Cliente não encontrado',
    });
    return json({ error: 'Cliente não encontrado' }, 404);
  }

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', ownerId)
    .eq('client_id', clientId)
    .eq('status', 'PENDING')
    .gte('date', `${monthKey}-01`)
    .lte('date', `${monthKey}-31`);

  const tolerance = 0.02;
  const match = (transactions ?? []).find((t) => Math.abs(Number(t.amount) - amount) < tolerance);

  if (!match) {
    await supabase.from('payment_webhook_log').insert({
      user_id: ownerId,
      provider: 'generic',
      event_type: body.event ?? null,
      payload: body,
      status: 'ignored',
      error_message: 'Nenhuma transação pendente compatível',
    });
    return json({ ok: true, ignored: true, reason: 'no_matching_transaction' });
  }

  const { error: updateError } = await supabase
    .from('transactions')
    .update({ status: 'PAID', paid_date: paymentDate })
    .eq('id', match.id)
    .eq('user_id', ownerId);

  if (updateError) {
    await supabase.from('payment_webhook_log').insert({
      user_id: ownerId,
      provider: 'generic',
      event_type: body.event ?? null,
      payload: body,
      status: 'failed',
      error_message: updateError.message,
    });
    return json({ error: updateError.message }, 500);
  }

  await supabase.from('payment_webhook_log').insert({
    user_id: ownerId,
    provider: 'generic',
    event_type: body.event ?? null,
    payload: body,
    transaction_id: match.id,
    status: 'processed',
  });

  return json({ ok: true, transactionId: match.id, paidDate: paymentDate });
});
