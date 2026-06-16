import { BillingStage, BillingAutomationSettings, Client, MessageTemplate, Transaction, TransactionStatus, TransactionType } from '../../types';
import { isClientPaymentCategory } from './categories';
import { ClientBillingSnapshot, getClientBillingSnapshot } from './delinquency';
import { getCurrentMonthKey, todayIsoDate } from './recurringLogic';
import { buildTemplateContext, renderMessageTemplate } from '../../messageTemplates';

export const defaultBillingAutomation = (): BillingAutomationSettings => ({
  autoEnabled: false,
  preDueDays: 3,
  whatsappChannel: true,
  emailChannel: false,
  dispatchHourLocal: 9,
});

export function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(`${isoA}T12:00:00`).getTime();
  const b = new Date(`${isoB}T12:00:00`).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

/** Estágio da régua para disparo automático hoje, ou null se não deve enviar. */
export function resolveBillingStage(
  snapshot: ClientBillingSnapshot,
  today = todayIsoDate(),
  preDueDays = 3,
): BillingStage | null {
  if (snapshot.status === 'paid' || snapshot.status === 'no_charge') return null;

  if (snapshot.status === 'overdue') return 'overdue';

  const daysUntilDue = daysBetween(today, snapshot.dueDate);
  if (daysUntilDue === 0 && (snapshot.status === 'pending' || snapshot.status === 'upcoming')) {
    return 'on_due';
  }

  if (
    daysUntilDue > 0 &&
    daysUntilDue <= preDueDays &&
    (snapshot.status === 'pending' || snapshot.status === 'upcoming')
  ) {
    return 'pre_due';
  }

  return null;
}

export function getClientsForBillingDispatch(
  clients: Client[],
  transactions: Transaction[],
  templates: MessageTemplate[],
  settings: BillingAutomationSettings,
  monthKey = getCurrentMonthKey(),
  today = todayIsoDate(),
): Array<{
  snapshot: ClientBillingSnapshot;
  stage: BillingStage;
  template: MessageTemplate;
  message: string;
}> {
  if (!settings.autoEnabled) return [];

  const active = clients.filter((c) => c.contractStatus === 'Ativo');
  const result: Array<{
    snapshot: ClientBillingSnapshot;
    stage: BillingStage;
    template: MessageTemplate;
    message: string;
  }> = [];

  for (const client of active) {
    const snapshot = getClientBillingSnapshot(client, transactions, monthKey, today);
    const stage = resolveBillingStage(snapshot, today, settings.preDueDays);
    if (!stage) continue;

    const template =
      templates.find((t) => t.stage === stage && t.channel === 'whatsapp') ??
      templates.find((t) => t.stage === stage) ??
      templates.find((t) => t.channel === 'whatsapp');

    if (!template) continue;

    const ctx = buildTemplateContext(client, 'Agência');
    const message = renderMessageTemplate(template.body, ctx);
    result.push({ snapshot, stage, template, message });
  }

  return result;
}

export interface BillingDispatchLogEntry {
  id: string;
  clientId: string;
  channel: 'whatsapp' | 'email';
  stage: string;
  dispatchDate: string;
  status: 'sent' | 'failed' | 'skipped';
  errorMessage?: string;
  templateId?: string;
  createdAt: string;
}

const matchesClientPayment = (client: Client, t: Transaction, monthKey: string): boolean => {
  if (t.type !== TransactionType.INCOME) return false;
  if (!t.date.startsWith(monthKey)) return false;
  const namePattern = `mensalidade - ${client.name}`.toLowerCase();
  return (
    t.clientId === client.id ||
    (isClientPaymentCategory(t.category) &&
      t.description.toLowerCase().includes(namePattern))
  );
};

/** Localiza transação pendente para baixa automática via webhook. */
export function findPendingTransactionForPayment(
  client: Client,
  transactions: Transaction[],
  amount: number,
  paymentDate: string,
  monthKey = getCurrentMonthKey(),
): Transaction | undefined {
  const tolerance = 0.02;
  const monthTx = transactions.filter((t) => matchesClientPayment(client, t, monthKey));
  const pending = monthTx.filter((t) => t.status === TransactionStatus.PENDING);

  const exact = pending.find((t) => Math.abs(t.amount - amount) < tolerance);
  if (exact) return exact;

  return pending.find((t) => Math.abs(t.amount - amount) < tolerance * Math.max(t.amount, 1));
}
