import { describe, expect, it } from 'vitest';
import {
  TransactionStatus,
  TransactionType,
  Category,
  Employee,
  Subscription,
} from '../../types';
import {
  computePeriodKpis,
  filterTransactionsByRange,
  getPeriodRange,
  getYearRange,
  getTransactionYears,
  computePeriodComparison,
  computeMrrVsReceived,
  computePayrollMonthStatus,
  computeSubscriptionsMonthStatus,
  computeMonthlyForecastMetrics,
  expectedIncomeForMonth,
  costsInReferenceMonth,
} from './dashboardMetrics';
import { salaryDescriptionForEmployee, subscriptionDescriptionFor } from './recurringLogic';

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

  it('getPeriodRange calendar_year usa ano informado', () => {
    const range = getPeriodRange('calendar_year', new Date('2026-05-15'), 2024);
    expect(range.startDate).toBe('2024-01-01');
    expect(range.endDate).toBe('2024-12-31');
    expect(range.label).toBe('2024');
  });

  it('getTransactionYears inclui anos das transações', () => {
    const years = getTransactionYears(
      [
        {
          id: '1',
          description: 'A',
          amount: 1,
          type: TransactionType.INCOME,
          category: Category.CLIENT_PAYMENT,
          date: '2023-06-01',
          status: TransactionStatus.PAID,
          paymentMethod: 'PIX',
        },
      ],
      new Date('2026-05-15'),
    );
    expect(years).toContain(2023);
    expect(years).toContain(2026);
  });

  it('MRR vs recebido soma o ano inteiro quando período é anual', () => {
    const clients = [
      {
        id: 'c1',
        name: 'Cliente',
        cnpj: '',
        contactPerson: 'A',
        email: '',
        phone: '',
        activePlan: 'Plano',
        monthlyFee: 1000,
        dueDay: 10,
        contractStatus: 'Ativo' as const,
      },
    ];
    const range = getYearRange(2024);
    const mrr = computeMrrVsReceived(
      clients,
      [
        {
          id: '1',
          description: 'Mensalidade - Cliente',
          amount: 1000,
          type: TransactionType.INCOME,
          category: Category.CLIENT_PAYMENT,
          date: '2024-03-01',
          status: TransactionStatus.PAID,
          paymentMethod: 'PIX',
          clientId: 'c1',
        },
        {
          id: '2',
          description: 'Mensalidade - Cliente',
          amount: 1000,
          type: TransactionType.INCOME,
          category: Category.CLIENT_PAYMENT,
          date: '2024-08-01',
          status: TransactionStatus.PAID,
          paymentMethod: 'PIX',
          clientId: 'c1',
        },
      ],
      range,
    );
    expect(mrr.receivedPaid).toBe(2000);
    expect(mrr.expectedMrr).toBe(12000);
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
          employeeId: 'e1',
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
          employeeId: 'e2',
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

  it('calcula entrada prevista com pendente e cliente sem lançamento', () => {
    const clients = [
      {
        id: 'c1',
        name: 'Empresa A',
        cnpj: '',
        contactPerson: 'A',
        email: '',
        phone: '',
        activePlan: 'Plano',
        monthlyFee: 2000,
        dueDay: 10,
        contractStatus: 'Ativo' as const,
      },
    ];
    const monthKey = '2026-05';
    const total = expectedIncomeForMonth(
      clients,
      [
        {
          id: 't1',
          description: 'Outra entrada',
          amount: 500,
          type: TransactionType.INCOME,
          category: Category.CLIENT_PAYMENT,
          date: '2026-05-05',
          status: TransactionStatus.PENDING,
          paymentMethod: 'PIX',
        },
      ],
      monthKey,
    );
    expect(total).toBe(2500);
  });

  it('separa custo fixo e variável no mês', () => {
    const { fixed, variable } = costsInReferenceMonth(
      [
        {
          id: '1',
          description: 'Sal',
          amount: 3000,
          type: TransactionType.EXPENSE,
          category: Category.SALARY,
          date: '2026-05-05',
          status: TransactionStatus.PAID,
          paymentMethod: 'PIX',
        },
        {
          id: '2',
          description: 'Ads',
          amount: 800,
          type: TransactionType.EXPENSE,
          category: Category.ADS,
          date: '2026-05-10',
          status: TransactionStatus.PENDING,
          paymentMethod: 'PIX',
        },
      ],
      '2026-05',
    );
    expect(fixed).toBe(3000);
    expect(variable).toBe(800);
  });

  it('computeMonthlyForecastMetrics projeta próximos meses', () => {
    const clients = [
      {
        id: 'c1',
        name: 'Cliente',
        cnpj: '',
        contactPerson: 'A',
        email: '',
        phone: '',
        activePlan: 'P',
        monthlyFee: 1000,
        dueDay: 5,
        contractStatus: 'Ativo' as const,
      },
    ];
    const range = getPeriodRange('this_month', new Date('2026-05-15'));
    const f = computeMonthlyForecastMetrics({
      clients,
      employees: [],
      subscriptions: [],
      transactions: [],
      range,
      projectionMonths: 2,
      ref: new Date('2026-05-15'),
    });
    expect(f.expectedIncomeTotal).toBe(1000);
    expect(f.projectedIncomeTotal).toBe(2000);
    expect(f.projectionMonthCount).toBe(2);
  });

  it('classifica assinaturas de apps pagas e pendentes no mês', () => {
    const subs: Subscription[] = [
      {
        id: 's1',
        name: 'Figma',
        cost: 120,
        renewalDay: 5,
        paymentMethod: 'CARTAO',
        active: true,
      },
      {
        id: 's2',
        name: 'Notion',
        cost: 80,
        renewalDay: 12,
        paymentMethod: 'PIX',
        active: true,
      },
      {
        id: 's3',
        name: 'App inativo',
        cost: 50,
        renewalDay: 1,
        paymentMethod: 'PIX',
        active: false,
      },
    ];
    const range = getPeriodRange('this_month', new Date('2026-05-15'));
    const summary = computeSubscriptionsMonthStatus(
      subs,
      [
        {
          id: 't1',
          description: subscriptionDescriptionFor('Figma'),
          amount: 120,
          type: TransactionType.EXPENSE,
          category: Category.TOOLS,
          date: '2026-05-05',
          status: TransactionStatus.PAID,
          paymentMethod: 'CARTAO',
        },
        {
          id: 't2',
          description: subscriptionDescriptionFor('Notion'),
          amount: 80,
          type: TransactionType.EXPENSE,
          category: Category.TOOLS,
          date: '2026-05-12',
          status: TransactionStatus.PENDING,
          paymentMethod: 'PIX',
        },
      ],
      range,
    );

    expect(summary.entries).toHaveLength(2);
    expect(summary.paidCount).toBe(1);
    expect(summary.pendingCount).toBe(1);
    expect(summary.entries.find((e) => e.subscription.name === 'Figma')?.status).toBe('paid');
    expect(summary.entries.find((e) => e.subscription.name === 'Notion')?.status).toBe('pending');
  });
});
