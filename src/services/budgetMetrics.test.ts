import { describe, expect, it } from 'vitest';
import { TransactionStatus, TransactionType } from '../../types';
import { computeBudgetVsActual, MonthlyBudget } from './budgetMetrics';

describe('computeBudgetVsActual', () => {
  const monthKey = '2026-05';

  it('calcula realizado e variância por categoria', () => {
    const budgets: MonthlyBudget[] = [
      { monthKey, category: 'Tráfego Pago', amount: 1000 },
    ];
    const transactions = [
      {
        id: '1',
        description: 'Meta Ads',
        amount: 600,
        type: TransactionType.EXPENSE,
        category: 'Tráfego Pago',
        date: '2026-05-10',
        status: TransactionStatus.PAID,
        paymentMethod: 'PIX' as const,
      },
    ];
    const rows = computeBudgetVsActual(budgets, transactions, monthKey);
    expect(rows).toHaveLength(1);
    expect(rows[0].actual).toBe(600);
    expect(rows[0].variance).toBe(400);
    expect(rows[0].pctUsed).toBe(60);
  });
});
