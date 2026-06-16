import { Transaction } from '../../types';
import { getTransactionFilterDate } from './transactionDates';

export interface PeriodClosure {
  id: string;
  monthKey: string;
  closedAt: string;
  closedByEmail?: string;
  notes?: string;
}

export function monthKeyFromDate(date: string): string {
  return date.split('T')[0].slice(0, 7);
}

export function isMonthClosed(monthKey: string, closures: PeriodClosure[]): boolean {
  return closures.some((c) => c.monthKey === monthKey);
}

export function isTransactionInClosedPeriod(
  transaction: Transaction,
  closures: PeriodClosure[],
): boolean {
  const key = monthKeyFromDate(getTransactionFilterDate(transaction));
  return isMonthClosed(key, closures);
}

export function countPendingInMonth(
  transactions: Transaction[],
  monthKey: string,
): number {
  return transactions.filter((t) => {
    const d = getTransactionFilterDate(t);
    return d.startsWith(monthKey) && t.status === 'PENDING';
  }).length;
}
