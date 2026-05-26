// Contexto completo Vybe por telefone (+ texto da mensagem para busca)
// Auth: X-Cobranca-Token

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  buildWhatsAppVybeContext,
  findClientByPhone,
  findClientByTextHint,
  normalizePhone,
  type ClientRow,
  type CompanySettingsRow,
  type ContractRow,
  type TransactionRow,
} from '../_shared/whatsappContext.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cobranca-token',
};

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

function getMonthRange(monthsBack = 6): { from: string; to: string } {
  const now = new Date();
  const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
  const past = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  const from = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-01`;
  return { from, to };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const token = getWebhookToken();
  const headerToken =
    req.headers.get('X-Cobranca-Token')?.trim() ||
    req.headers.get('x-cobranca-token')?.trim() ||
    '';

  if (!token || headerToken !== token) {
    return jsonResponse({ error: 'Não autorizado' }, 401);
  }

  let body: { telefone?: string; phone?: string; texto?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'JSON inválido' }, 400);
  }

  const telefone = normalizePhone(String(body.telefone || body.phone || ''));
  const textoMensagem = String(body.texto || body.message || '').trim();

  if (!telefone && !textoMensagem) {
    return jsonResponse({ error: 'telefone ou texto obrigatório' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: clients, error: clientsError } = await admin
    .from('clients')
    .select(
      'id, user_id, name, cnpj, contact_person, email, phone, active_plan, monthly_fee, due_day, contract_status',
    );

  if (clientsError) {
    return jsonResponse(
      { error: 'Erro ao buscar clientes', detail: clientsError.message },
      500,
    );
  }

  const clientList = (clients as ClientRow[]) ?? [];
  let client: ClientRow | null = telefone
    ? findClientByPhone(clientList, telefone)
    : null;

  let identificacao: {
    metodo: 'telefone' | 'cnpj' | 'nome' | 'nenhum';
    confianca: 'alta' | 'media' | 'baixa';
  } = {
    metodo: client ? 'telefone' : 'nenhum',
    confianca: client ? 'alta' : 'baixa',
  };

  if (!client && textoMensagem) {
    const hint = findClientByTextHint(clientList, textoMensagem);
    if (hint) {
      client = hint.client;
      identificacao = { metodo: hint.metodo, confianca: hint.confianca };
    }
  }

  let settingsRow: CompanySettingsRow | null = null;
  let transactions: TransactionRow[] = [];
  let contracts: ContractRow[] = [];

  if (client) {
    const range = getMonthRange(8);
    const [{ data: settings }, { data: txs }, { data: ctrs }] = await Promise.all([
      admin
        .from('company_settings')
        .select(
          'name, cnpj, email, phone, address, integrations, service_plans, message_templates',
        )
        .eq('user_id', client.user_id)
        .maybeSingle(),
      admin
        .from('transactions')
        .select('id, client_id, type, category, description, amount, date, status')
        .eq('client_id', client.id)
        .gte('date', range.from)
        .lte('date', range.to),
      admin
        .from('contracts')
        .select(
          'id, title, amount, status, start_date, end_date, due_day, notes, template_key, pdf_url, pdf_file_name',
        )
        .eq('client_id', client.id)
        .order('start_date', { ascending: false })
        .limit(10),
    ]);

    settingsRow = settings as CompanySettingsRow | null;
    transactions = (txs as TransactionRow[]) ?? [];
    contracts = (ctrs as ContractRow[]) ?? [];
  } else {
    const { data: allSettings } = await admin
      .from('company_settings')
      .select(
        'name, cnpj, email, phone, address, integrations, service_plans, message_templates',
      )
      .limit(1);
    settingsRow = (allSettings?.[0] as CompanySettingsRow) ?? null;
  }

  const contexto = buildWhatsAppVybeContext({
    telefone: telefone || normalizePhone(String(client?.phone ?? '')),
    client,
    settings: settingsRow,
    transactions,
    contracts,
    textoMensagem,
    identificacao,
  });

  return jsonResponse({ ok: true, ...contexto }, 200);
});
