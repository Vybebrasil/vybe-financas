// Edge Function: régua de cobrança automática (cron diário)
// Deploy: supabase functions deploy billing-dispatch

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  buildCobrancaN8nPayloadFromContext,
  buildWhatsAppVybeContext,
  type ClientRow,
  type CompanySettingsRow,
  type ContractRow,
  type IntegrationsDb,
  type TransactionRow,
} from '../_shared/whatsappContext.ts';
import {
  getClientBillingStatus,
  getCurrentMonthKey,
  normalizePhone,
  renderTemplate,
  resolveBillingStage,
  todayIsoDate,
} from '../_shared/billingStages.ts';

const DEFAULT_WEBHOOK_URL =
  'https://n8n.srv1704092.hstgr.cloud/webhook/cobranca-whatsapp';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

function json(body: Record<string, unknown>, status = 200) {
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

interface MessageTemplateRow {
  id: string;
  name: string;
  channel: string;
  stage: string;
  subject?: string;
  body: string;
}

async function sendWhatsApp(
  webhookUrl: string,
  webhookToken: string,
  client: ClientRow,
  message: string,
  settings: CompanySettingsRow | null,
  txs: TransactionRow[],
  ctrs: ContractRow[],
): Promise<{ ok: boolean; error?: string }> {
  const phone = normalizePhone(String(client.phone ?? ''));
  if (!phone) return { ok: false, error: 'Telefone inválido' };

  const ctx = buildWhatsAppVybeContext({
    telefone: phone,
    client: client as ClientRow,
    settings,
    transactions: txs,
    contracts: ctrs,
    identificacao: { metodo: 'telefone', confianca: 'alta' },
  });

  const n8nPayload = buildCobrancaN8nPayloadFromContext(ctx, message, false);

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Cobranca-Token': webhookToken,
      },
      body: JSON.stringify(n8nPayload),
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, error: text.slice(0, 200) };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function sendEmail(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  body: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, text: body }),
    });
    if (!res.ok) {
      const t = await res.text();
      return { ok: false, error: t.slice(0, 200) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const cronSecret = Deno.env.get('CRON_SECRET');
  const headerSecret = req.headers.get('x-cron-secret');
  if (cronSecret && headerSecret !== cronSecret) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const webhookToken = getWebhookToken();
  const resendKey = Deno.env.get('RESEND_API_KEY')?.trim() ?? '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const today = todayIsoDate();
  const monthKey = getCurrentMonthKey();
  const summary: Record<string, number> = { sent: 0, failed: 0, skipped: 0 };

  const { data: settingsRows, error: settingsError } = await supabase
    .from('company_settings')
    .select(
      'user_id, name, integrations, message_templates, email',
    );

  if (settingsError) return json({ error: settingsError.message }, 500);

  for (const row of settingsRows ?? []) {
    const ownerId = row.user_id as string;
    const integrations = (row.integrations ?? {}) as IntegrationsDb & {
      billing?: {
        auto_enabled?: boolean;
        pre_due_days?: number;
        whatsapp_channel?: boolean;
        email_channel?: boolean;
      };
    };
    const billing = integrations.billing;
    if (!billing?.auto_enabled) continue;

    const preDueDays = billing.pre_due_days ?? 3;
    const whatsappOn = billing.whatsapp_channel !== false;
    const emailOn = Boolean(billing.email_channel);
    const templates = (row.message_templates ?? []) as MessageTemplateRow[];
    const companyName = (row.name as string) || 'Agência';

    const [{ data: clients }, { data: transactions }] = await Promise.all([
      supabase.from('clients').select('*').eq('user_id', ownerId),
      supabase
        .from('transactions')
        .select('id, client_id, type, category, description, amount, date, status')
        .eq('user_id', ownerId)
        .gte('date', `${monthKey}-01`),
    ]);

    const whatsapp = integrations.whatsapp;
    if (whatsapp?.enabled === false) continue;

    const webhookUrl =
      whatsapp?.n8n_webhook_url?.trim() ||
      Deno.env.get('N8N_WHATSAPP_WEBHOOK_URL')?.trim() ||
      DEFAULT_WEBHOOK_URL;

    const emailFrom =
      (integrations as { payment_provider?: { email_from?: string } }).payment_provider
        ?.email_from?.trim() ||
      Deno.env.get('RESEND_FROM_EMAIL')?.trim() ||
      '';

    for (const client of clients ?? []) {
      if (client.contract_status !== 'Ativo') continue;

      const { status, dueDate } = getClientBillingStatus(
        client as ClientRow,
        (transactions ?? []) as TransactionRow[],
        monthKey,
        today,
      );
      const stage = resolveBillingStage(status, dueDate, today, preDueDays);
      if (!stage) continue;

      const template =
        templates.find((t) => t.stage === stage && t.channel === 'whatsapp') ??
        templates.find((t) => t.stage === stage) ??
        templates[0];
      if (!template) continue;

      const vars = {
        contactPerson: String(client.contact_person || client.name),
        clientName: String(client.name),
        activePlan: String(client.active_plan || ''),
        amount: `R$ ${Number(client.monthly_fee || 0).toFixed(2).replace('.', ',')}`,
        dueDay: String(client.due_day || ''),
        companyName,
        pixKey: integrations.payment?.pix_key ?? '',
        paymentLink: integrations.payment?.payment_link ?? '',
      };
      const message = renderTemplate(template.body, vars);

      const channels: Array<'whatsapp' | 'email'> = [];
      if (whatsappOn) channels.push('whatsapp');
      if (emailOn && resendKey && emailFrom) channels.push('email');

      for (const channel of channels) {
        const { data: existing } = await supabase
          .from('billing_dispatch_log')
          .select('id')
          .eq('user_id', ownerId)
          .eq('client_id', client.id)
          .eq('channel', channel)
          .eq('stage', stage)
          .eq('dispatch_date', today)
          .maybeSingle();

        if (existing) {
          summary.skipped++;
          continue;
        }

        let sendResult: { ok: boolean; error?: string } = { ok: false, error: 'Canal desativado' };

        if (channel === 'whatsapp' && webhookToken) {
          const clientTxs = ((transactions ?? []) as TransactionRow[]).filter(
            (t) => t.client_id === client.id,
          );
          const { data: ctrs } = await supabase
            .from('contracts')
            .select('*')
            .eq('client_id', client.id)
            .limit(5);
          sendResult = await sendWhatsApp(
            webhookUrl,
            webhookToken,
            client as ClientRow,
            message,
            row as CompanySettingsRow,
            clientTxs,
            (ctrs ?? []) as ContractRow[],
          );
        } else if (channel === 'email') {
          const emailTemplate =
            templates.find((t) => t.stage === stage && t.channel === 'email') ?? template;
          const emailBody = renderTemplate(emailTemplate.body, vars);
          const subject =
            emailTemplate.subject?.trim() ||
            `Cobrança — ${companyName}`;
          const to = String(client.email ?? '').trim();
          if (!to) {
            sendResult = { ok: false, error: 'E-mail do cliente ausente' };
          } else {
            sendResult = await sendEmail(resendKey, emailFrom, to, subject, emailBody);
          }
        }

        await supabase.from('billing_dispatch_log').insert({
          user_id: ownerId,
          client_id: client.id,
          channel,
          stage,
          dispatch_date: today,
          status: sendResult.ok ? 'sent' : 'failed',
          error_message: sendResult.error ?? null,
          template_id: template.id,
        });

        if (sendResult.ok) summary.sent++;
        else summary.failed++;
      }
    }
  }

  return json({ ok: true, date: today, summary });
});
