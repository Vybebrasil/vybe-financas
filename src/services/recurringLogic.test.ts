import { describe, it, expect } from 'vitest';
import {
  buildMonthlyRecurringPayloads,
  getCurrentMonthKey,
  dateInMonth,
  alreadyScheduled,
} from './recurringLogic';
import { TransactionType, TransactionStatus, Category } from '../../types';

describe('recurringLogic', () => {
  it('getCurrentMonthKey retorna YYYY-MM', () => {
    const key = getCurrentMonthKey(new Date('2026-05-15'));
    expect(key).toBe('2026-05');
  });

  it('dateInMonth ajusta dia ao último do mês', () => {
    expect(dateInMonth('2026-02', 31)).toBe('2026-02-28');
  });

  it('buildMonthlyRecurringPayloads cria mensalidade para cliente ativo', () => {
    const payloads = buildMonthlyRecurringPayloads(
      {
        transactions: [],
        clients: [
          {
            id: 'c1',
            name: 'Cliente A',
            cnpj: '',
            contactPerson: 'João',
            email: '',
            phone: '',
            activePlan: 'Vybe OS',
            monthlyFee: 1500,
            dueDay: 10,
            contractStatus: 'Ativo',
          },
        ],
        employees: [],
        subscriptions: [],
      },
      '2026-05',
    );

    expect(payloads).toHaveLength(1);
    expect(payloads[0].description).toBe('Mensalidade - Cliente A');
    expect(payloads[0].type).toBe(TransactionType.INCOME);
    expect(payloads[0].status).toBe(TransactionStatus.PENDING);
  });

  it('alreadyScheduled evita duplicata no mesmo mês', () => {
    const scheduled = alreadyScheduled(
      [
        {
          id: '1',
          description: 'Mensalidade - Cliente A',
          amount: 1500,
          type: TransactionType.INCOME,
          category: Category.CLIENT_PAYMENT,
          date: '2026-05-10',
          status: TransactionStatus.PENDING,
          paymentMethod: 'PIX',
        },
      ],
      'Mensalidade - Cliente A',
      '2026-05',
    );
    expect(scheduled).toBe(true);
  });
});
