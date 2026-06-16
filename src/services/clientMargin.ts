import { Client, Transaction, TransactionStatus, TransactionType } from '../../types';
import { getTransactionCashDate } from './transactionDates';
import { isClientPaymentCategory } from './categories';

export interface ClientMarginRow {
  client: Client;
  revenue: number;
  expenses: number;
  margin: number;
  marginPct: number;
}

export function computeClientMargins(
  clients: Client[],
  transactions: Transaction[],
  range?: { startDate: string; endDate: string },
): ClientMarginRow[] {
  const inRange = (date: string): boolean => {
    if (!range) return true;
    const d = date.split('T')[0];
    return d >= range.startDate && d <= range.endDate;
  };

  const active = clients.filter((c) => c.contractStatus === 'Ativo' || c.contractStatus === 'Pendente');

  return active
    .map((client) => {
      let revenue = 0;
      let expenses = 0;

      for (const t of transactions) {
        if (t.clientId !== client.id) continue;
        const date =
          t.status === TransactionStatus.PAID ? getTransactionCashDate(t) : t.date.split('T')[0];
        if (!inRange(date)) continue;

        if (t.type === TransactionType.INCOME && t.status === TransactionStatus.PAID) {
          if (isClientPaymentCategory(t.category) || t.description.toLowerCase().includes('mensalidade')) {
            revenue += t.amount;
          }
        } else if (t.type === TransactionType.EXPENSE) {
          expenses += t.amount;
        }
      }

      const margin = revenue - expenses;
      const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;
      return { client, revenue, expenses, margin, marginPct };
    })
    .filter((r) => r.revenue > 0 || r.expenses > 0)
    .sort((a, b) => b.margin - a.margin);
}
