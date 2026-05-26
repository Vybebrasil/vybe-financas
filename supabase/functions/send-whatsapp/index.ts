// Edge Function: Vybe → n8n webhook cobranca-whatsapp → Evolution API
// Secrets: N8N_WHATSAPP_WEBHOOK_URL, COBRANCA_WEBHOOK_TOKEN (ou N8N_WEBHOOK_SECRET)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  buildCobrancaN8nPayloadFromContext,
  buildWhatsAppVybeContext,
  normalizePhone,
  type ClientRow,
  type CompanySettingsRow,
  type ContractRow,
  type IntegrationsDb,
  type TransactionRow,
} from '../_shared/whatsappContext.ts';

const DEFAULT_WEBHOOK_URL =
  'https://n8n.srv1704092.hstgr.cloud/webhook/cobranca-whatsapp';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface SendBody {
  clientId: string;
  message: string;
  stage?: string;
  templateId?: string;
  templateName?: string;
  companyName?: string;
  usarIa?: boolean;
  paymentLink?: string;
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getWebhookToken(): string {
  return (
    Deno.env.get('COBRANCA_WEBHOOK_TOKEN')?.trim() ||
    Deno.env.get('N8N_WEBHOOK_SECRET')?.trim() ||
    ''
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Não autenticado' }, 401);
  }

  const webhookToken = getWebhookToken();
  if (!webhookToken) {
    return jsonResponse(
      {
        error:
          'COBRANCA_WEBHOOK_TOKEN não configurado nos secrets da Edge Function.',
      },
      503,
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabaseUser.auth.getUser();

  if (authError || !user) {
    return jsonResponse({ error: 'Não autenticado' }, 401);
  }

  let body: SendBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'JSON inválido' }, 400);
  }

  if (!body.clientId || !body.message?.trim()) {
    return jsonResponse({ error: 'clientId e message são obrigatórios' }, 400);
  }

  const { data: client, error: clientError } = await supabaseUser
    .from('clients')
    .select(
      'id, name, phone, email, contact_person, user_id, active_plan, monthly_fee, due_day, cnpj, contract_status',
    )
    .eq('id', body.clientId)
    .maybeSingle();

  if (clientError || !client) {
    return jsonResponse(
      { error: 'Cliente não encontrado ou sem permissão' },
      404,
    );
  }

  const phone = normalizePhone(String(client.phone ?? ''));
  if (!phone) {
    return jsonResponse({ error: 'Telefone do cliente inválido' }, 400);
  }

  const ownerId = client.user_id as string;
  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  const now = new Date();
  const from = `${now.getFullYear()}-${String(now.getMonth() - 5).padStart(2, '0')}-01`;
  const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;

  const [{ data: settingsRow }, { data: txs }, { data: ctrs }] = await Promise.all([
    supabaseAdmin
      .from('company_settings')
      .select(
        'integrations, name, cnpj, email, phone, address, service_plans, message_templates',
      )
      .eq('user_id', ownerId)
      .maybeSingle(),
    supabaseAdmin
      .from('transactions')
      .select('id, client_id, type, category, description, amount, date, status')
      .eq('client_id', client.id)
      .gte('date', from)
      .lte('date', to),
    supabaseAdmin
      .from('contracts')
      .select(
        'id, title, amount, status, start_date, end_date, due_day, notes, template_key, pdf_url, pdf_file_name',
      )
      .eq('client_id', client.id)
      .order('start_date', { ascending: false })
      .limit(10),
  ]);

  const integrations = (settingsRow?.integrations ?? {}) as IntegrationsDb;
  const whatsapp = integrations.whatsapp;

  if (whatsapp?.enabled === false) {
    return jsonResponse(
      {
        error:
          'Envio WhatsApp desativado em Configurações do Sistema. Ative em WhatsApp (n8n + Evolution).',
      },
      403,
    );
  }

  const webhookUrl =
    whatsapp?.n8n_webhook_url?.trim() ||
    Deno.env.get('N8N_WHATSAPP_WEBHOOK_URL')?.trim() ||
    DEFAULT_WEBHOOK_URL;

  const settings = settingsRow as CompanySettingsRow | null;
  if (body.companyName?.trim() && settings) {
    settings.name = body.companyName.trim();
  }

  const ctx = buildWhatsAppVybeContext({
    telefone: phone,
    client: client as ClientRow,
    settings,
    transactions: (txs as TransactionRow[]) ?? [],
    contracts: (ctrs as ContractRow[]) ?? [],
    identificacao: { metodo: 'telefone', confianca: 'alta' },
  });

  if (body.paymentLink?.trim() && ctx.pagamento) {
    ctx.pagamento.link_pagamento = body.paymentLink.trim();
  }

  const n8nPayload = buildCobrancaN8nPayloadFromContext(
    ctx,
    body.message.trim(),
    body.usarIa !== false,
  );

  const n8nHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Cobranca-Token': webhookToken,
  };

  let n8nRes: Response;
  try {
    n8nRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: n8nHeaders,
      body: JSON.stringify(n8nPayload),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: 'Falha ao contactar n8n', detail }, 502);
  }

  const n8nText = await n8nRes.text();
  let parsed: { success?: boolean; error?: string; message?: string } | null =
    null;
  if (n8nText) {
    try {
      parsed = JSON.parse(n8nText);
    } catch {
      parsed = null;
    }
  }

  if (!n8nRes.ok || parsed?.success === false) {
    return jsonResponse(
      {
        error: parsed?.error ?? 'n8n retornou erro',
        detail: n8nText.slice(0, 500),
      },
      n8nRes.ok ? 502 : n8nRes.status >= 400 ? n8nRes.status : 502,
    );
  }

  return jsonResponse(
    {
      ok: true,
      phone,
      message: parsed?.message ?? 'Cobrança enviada',
    },
    200,
  );
});
