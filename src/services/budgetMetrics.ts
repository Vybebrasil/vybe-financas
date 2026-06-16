import { Transaction, TransactionStatus, TransactionType } from '../../types';
import { getTransactionCashDate } from './transactionDates';

export interface MonthlyBudget {
  id?: string;
  monthKey: string;
  category: string;
  amount: number;
}

export interface BudgetVsActualRow {
  category: string;
  budget: number;
  actual: number;
  variance: number;
  pctUsed: number;
}

export function computeBudgetVsActual(
  budgets: MonthlyBudget[],
  transactions: Transaction[],
  monthKey: string,
): BudgetVsActualRow[] {
  const expenses = transactions.filter((t) => {
    if (t.type !== TransactionType.EXPENSE) return false;
    if (t.status !== TransactionStatus.PAID) return false;
    const d = getTransactionCashDate(t);
    return d.startsWith(monthKey);
  });

  const actualByCategory = new Map<string, number>();
  for (const t of expenses) {
    actualByCategory.set(t.category, (actualByCategory.get(t.category) ?? 0) + t.amount);
  }

  const categories = new Set([
    ...budgets.filter((b) => b.monthKey === monthKey).map((b) => b.category),
    ...actualByCategory.keys(),
  ]);

  return [...categories].map((category) => {
    const budget = budgets.find((b) => b.monthKey === monthKey && b.category === category)?.amount ?? 0;
    const actual = actualByCategory.get(category) ?? 0;
    const variance = budget - actual;
    const pctUsed = budget > 0 ? (actual / budget) * 100 : actual > 0 ? 100 : 0;
    return { category, budget, actual, variance, pctUsed };
  }).sort((a, b) => b.actual - a.actual);
}
