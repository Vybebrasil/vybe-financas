import { describe, expect, it } from 'vitest';
import { TransactionStatus, TransactionType, Category, Employee } from '../../types';
import {
  computePeriodKpis,
  filterTransactionsByRange,
  getPeriodRange,
  computePeriodComparison,
  computePayrollMonthStatus,
} from './dashboardMetrics';
import { salaryDescriptionForEmployee } from './recurringLogic';

describe('dashboardMetrics', () => {
  it('filtra transações por intervalo', () => {
    const txs = [
      {
        id: '1',
        description: 'A',
        amount: 100,
        type: TransactionType.INCOME,
        category: Category.CLIENT_PAYMENT,
        date: '2026-05-10',
        status: TransactionStatus.PAID,
        paymentMethod: 'PIX' as const,
      },
      {
        id: '2',
        description: 'B',
        amount: 50,
        type: TransactionType.EXPENSE,
        category: Category.TOOLS,
        date: '2026-04-10',
        status: TransactionStatus.PAID,
        paymentMethod: 'PIX' as const,
      },
    ];
    const filtered = filterTransactionsByRange(txs, '2026-05-01', '2026-05-31');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('1');
  });

  it('calcula lucro e margem no período', () => {
    const kpis = computePeriodKpis([
      {
        id: '1',
        description: 'R',
        amount: 1000,
        type: TransactionType.INCOME,
        category: Category.CLIENT_PAYMENT,
        date: '2026-05-01',
        status: TransactionStatus.PAID,
        paymentMethod: 'PIX',
      },
      {
        id: '2',
        description: 'D',
        amount: 400,
        type: TransactionType.EXPENSE,
        category: Category.TOOLS,
        date: '2026-05-02',
        status: TransactionStatus.PAID,
        paymentMethod: 'PIX',
      },
    ]);
    expect(kpis.profit).toBe(600);
    expect(kpis.margin).toBe(60);
  });

  it('getPeriodRange retorna mês atual', () => {
    const range = getPeriodRange('this_month', new Date('2026-05-15'));
    expect(range.startDate).toBe('2026-05-01');
    expect(range.endDate).toBe('2026-05-31');
  });

  it('compara com período anterior', () => {
    const txs = [
      {
        id: '1',
        description: 'R',
        amount: 200,
        type: TransactionType.INCOME,
        category: Category.CLIENT_PAYMENT,
        date: '2026-05-01',
        status: TransactionStatus.PAID,
        paymentMethod: 'PIX',
      },
      {
        id: '2',
        description: 'R2',
        amount: 100,
        type: TransactionType.INCOME,
        category: Category.CLIENT_PAYMENT,
        date: '2026-04-01',
        status: TransactionStatus.PAID,
        paymentMethod: 'PIX',
      },
    ];
    const range = getPeriodRange('this_month', new Date('2026-05-15'));
    const cmp = computePeriodComparison(txs, range);
    expect(cmp.current.totalIncome).toBe(200);
    expect(cmp.previous.totalIncome).toBe(100);
    expect(cmp.deltaIncomePct).toBe(100);
  });

  it('classifica salários pagos e pendentes no mês', () => {
    const employees: Employee[] = [
      {
        id: 'e1',
        name: 'Ana',
        role: 'Designer',
        salary: 3000,
        pixKey: '',
        paymentDay: 5,
      },
      {
        id: 'e2',
        name: 'Bruno',
        role: 'Dev',
        salary: 5000,
        pixKey: '',
        paymentDay: 10,
      },
    ];
    const range = getPeriodRange('this_month', new Date('2026-05-15'));
    const summary = computePayrollMonthStatus(
      employees,
      [
        {
          id: 't1',
          description: salaryDescriptionForEmployee('Ana'),
          amount: 3000,
          type: TransactionType.EXPENSE,
          category: Category.SALARY,
          date: '2026-05-05',
          status: TransactionStatus.PAID,
          paymentMethod: 'PIX',
        },
        {
          id: 't2',
          description: salaryDescriptionForEmployee('Bruno'),
          amount: 5000,
          type: TransactionType.EXPENSE,
          category: Category.SALARY,
          date: '2026-05-10',
          status: TransactionStatus.PENDING,
          paymentMethod: 'PIX',
        },
      ],
      range,
    );

    expect(summary.paidCount).toBe(1);
    expect(summary.pendingCount).toBe(1);
    expect(summary.totalPaid).toBe(3000);
    expect(summary.totalPending).toBe(5000);
    expect(summary.entries.find((e) => e.employee.name === 'Ana')?.status).toBe('paid');
    expect(summary.entries.find((e) => e.employee.name === 'Bruno')?.status).toBe('pending');
  });
});
