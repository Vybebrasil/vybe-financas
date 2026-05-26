import { Client, MessageTemplate, TemplateContext } from './types';
import { formatCurrency } from './utils';

export const TEMPLATE_VARIABLES = [
  { key: '{{contactPerson}}', label: 'Nome do contato' },
  { key: '{{clientName}}', label: 'Nome do cliente' },
  { key: '{{activePlan}}', label: 'Plano ativo' },
  { key: '{{amount}}', label: 'Valor formatado' },
  { key: '{{dueDay}}', label: 'Dia de vencimento' },
  { key: '{{companyName}}', label: 'Nome da empresa' },
] as const;

export const BILLING_STAGE_LABELS: Record<MessageTemplate['stage'], string> = {
  pre_due: 'Lembrete (antes do vencimento)',
  on_due: 'Dia do vencimento',
  overdue: 'Em atraso',
  custom: 'Personalizado',
};

export function buildTemplateContext(
  client: Client,
  companyName: string,
): TemplateContext {
  return {
    contactPerson: client.contactPerson || client.name,
    clientName: client.name,
    activePlan: client.activePlan,
    amount: formatCurrency(client.monthlyFee),
    dueDay: String(client.dueDay),
    companyName: companyName || 'Agência',
  };
}

export function renderMessageTemplate(body: string, context: TemplateContext): string {
  return body
    .replace(/\{\{contactPerson\}\}/g, context.contactPerson)
    .replace(/\{\{clientName\}\}/g, context.clientName)
    .replace(/\{\{activePlan\}\}/g, context.activePlan)
    .replace(/\{\{amount\}\}/g, context.amount)
    .replace(/\{\{dueDay\}\}/g, context.dueDay)
    .replace(/\{\{companyName\}\}/g, context.companyName);
}

/** Dígitos com DDI 55 para Evolution / wa.me */
export function normalizeWhatsAppPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10) return '';
  if (digits.startsWith('55')) return digits;
  return `55${digits}`;
}

export function generateWhatsAppLink(
  client: Client,
  message: string,
): string {
  const phone = normalizeWhatsAppPhone(client.phone);
  if (!phone) return '';
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function generateMailtoLink(
  client: Client,
  subject: string,
  body: string,
): string {
  const to = client.email?.trim() || '';
  const params = new URLSearchParams();
  if (subject) params.set('subject', subject);
  if (body) params.set('body', body);
  const query = params.toString();
  return `mailto:${encodeURIComponent(to)}${query ? `?${query}` : ''}`;
}
