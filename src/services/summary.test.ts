import { describe, expect, it } from 'vitest';
import { TransactionStatus, TransactionType, Category } from '../../types';
import { computeDashboardSummary } from './summary';

describe('computeDashboardSummary', () => {
  it('soma apenas transações pagas no saldo', () => {
    const summary = computeDashboardSummary([
      {
        id: '1',
        description: 'Receita',
        amount: 1000,
        type: TransactionType.INCOME,
        category: Category.CLIENT_PAYMENT,
        date: '2026-05-01',
        status: TransactionStatus.PAID,
      },
      {
        id: '2',
        description: 'Despesa',
        amount: 300,
        type: TransactionType.EXPENSE,
        category: Category.TOOLS,
        date: '2026-05-02',
        status: TransactionStatus.PAID,
      },
    ]);

    expect(summary.totalIncome).toBe(1000);
    expect(summary.totalExpense).toBe(300);
    expect(summary.balance).toBe(700);
  });

  it('pendentes entram em pending* e no saldo projetado', () => {
    const summary = computeDashboardSummary([
      {
        id: '1',
        description: 'A receber',
        amount: 500,
        type: TransactionType.INCOME,
        category: Category.CLIENT_PAYMENT,
        date: '2026-05-10',
        status: TransactionStatus.PENDING,
      },
    ]);

    expect(summary.balance).toBe(0);
    expect(summary.pendingIncome).toBe(500);
    expect(summary.projectedBalance).toBe(500);
  });
});
