import { Transaction } from '../../types';
import { api } from './api';
import {
  buildMonthlyRecurringPayloads,
  getCurrentMonthKey,
  RecurringData,
} from './recurringLogic';

export { getCurrentMonthKey, dateInMonth } from './recurringLogic';
export type { RecurringData } from './recurringLogic';

/** Gera lançamentos pendentes do mês atual (cliente; servidor usa Edge Function + cron). */
export async function ensureMonthlyRecurringTransactions(
  data: RecurringData,
): Promise<Transaction[]> {
  const monthKey = getCurrentMonthKey();

  const alreadyGenerated = await api.recurring.hasGenerated(monthKey);
  if (alreadyGenerated) return [];

  const payloads = buildMonthlyRecurringPayloads(data, monthKey);
  if (payloads.length === 0) {
    await api.recurring.markGenerated(monthKey, 0);
    return [];
  }

  const created: Transaction[] = [];
  for (const payload of payloads) {
    created.push(await api.transactions.create(payload));
  }

  await api.recurring.markGenerated(monthKey, created.length);
  return created;
}
