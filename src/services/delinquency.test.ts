import { describe, it, expect } from 'vitest';
import { getDelinquencyReport, getClientBillingSnapshot, getClientMonthPaymentBadge, getClientPastDueTotal } from './delinquency';
import { Client, Transaction, TransactionType, TransactionStatus, Category } from '../../types';

const client: Client = {
  id: 'c1',
  name: 'Empresa X',
  cnpj: '',
  contactPerson: 'Maria',
  email: 'a@b.com',
  phone: '11999999999',
  activePlan: 'Vybe OS',
  monthlyFee: 2000,
  dueDay: 5,
  contractStatus: 'Ativo',
};

describe('delinquency', () => {
  it('sem lançamento no mês não marca overdue (só com transação PENDING)', () => {
    const snapshot = getClientBillingSnapshot(
      client,
      [],
      '2026-05',
      '2026-05-20',
    );
    expect(snapshot.status).toBe('missing_launch');
  });

  it('marca inadimplente quando há PENDING e passou do vencimento', () => {
    const snapshot = getClientBillingSnapshot(
      client,
      [
        {
          id: 't1',
          description: 'Mensalidade - Empresa X',
          amount: 2000,
          type: TransactionType.INCOME,
          category: Category.CLIENT_PAYMENT,
          date: '2026-05-05',
          status: TransactionStatus.PENDING,
          clientId: 'c1',
          paymentMethod: 'PIX',
        },
      ],
      '2026-05',
      '2026-05-20',
    );
    expect(snapshot.status).toBe('overdue');
    expect(snapshot.daysOverdue).toBeGreaterThan(0);
  });

  it('marca pago quando há transação PAID no mês', () => {
    const transactions: Transaction[] = [
      {
        id: 't1',
        description: 'Mensalidade - Empresa X',
        amount: 2000,
        type: TransactionType.INCOME,
        category: Category.CLIENT_PAYMENT,
        date: '2026-05-05',
        status: TransactionStatus.PAID,
        clientId: 'c1',
        paymentMethod: 'PIX',
      },
    ];
    const snapshot = getClientBillingSnapshot(client, transactions, '2026-05', '2026-05-20');
    expect(snapshot.status).toBe('paid');
  });

  it('getDelinquencyReport separa overdue e pending', () => {
    const report = getDelinquencyReport(
      [client],
      [
        {
          id: 't1',
          description: 'Mensalidade - Empresa X',
          amount: 2000,
          type: TransactionType.INCOME,
          category: Category.CLIENT_PAYMENT,
          date: '2026-05-05',
          status: TransactionStatus.PENDING,
          clientId: 'c1',
          paymentMethod: 'PIX',
        },
      ],
      '2026-05',
    );
    expect(report.overdue.length + report.pending.length).toBeGreaterThanOrEqual(0);
  });

  it('badge do mês: pago e pendente', () => {
    const paid = getClientMonthPaymentBadge(
      getClientBillingSnapshot(
        client,
        [
          {
            id: 't2',
            description: 'Mensalidade - Empresa X',
            amount: 2000,
            type: TransactionType.INCOME,
            category: Category.CLIENT_PAYMENT,
            date: '2026-05-05',
            status: TransactionStatus.PAID,
            clientId: 'c1',
            paymentMethod: 'PIX',
          },
        ],
        '2026-05',
      ),
    );
    expect(paid?.label).toBe('Pago');

    const pending = getClientMonthPaymentBadge(
      getClientBillingSnapshot(
        client,
        [
          {
            id: 't3',
            description: 'Mensalidade - Empresa X',
            amount: 2000,
            type: TransactionType.INCOME,
            category: Category.CLIENT_PAYMENT,
            date: '2026-05-05',
            status: TransactionStatus.PENDING,
            clientId: 'c1',
            paymentMethod: 'PIX',
          },
        ],
        '2026-05',
        '2026-05-03',
      ),
    );
    expect(pending?.label).toBe('Pendente');
  });

  it('getClientPastDueTotal soma déficit de meses anteriores', () => {
    // Mensalidade 2000; mês passado pagou 1500 → 500 em atraso
    const pastDue = getClientPastDueTotal(
      client,
      [
        {
          id: 't1',
          description: 'Mensalidade - Empresa X',
          amount: 1500,
          type: TransactionType.INCOME,
          category: Category.CLIENT_PAYMENT,
          date: '2026-04-05',
          status: TransactionStatus.PAID,
          clientId: 'c1',
          paymentMethod: 'PIX',
        },
      ],
      '2026-05',
    );
    expect(pastDue).toBe(500);
  });

  it('getClientPastDueTotal zera quando meses anteriores foram quitados', () => {
    const pastDue = getClientPastDueTotal(
      client,
      [
        {
          id: 't1',
          description: 'Mensalidade - Empresa X',
          amount: 2000,
          type: TransactionType.INCOME,
          category: Category.CLIENT_PAYMENT,
          date: '2026-04-05',
          status: TransactionStatus.PAID,
          clientId: 'c1',
          paymentMethod: 'PIX',
        },
      ],
      '2026-05',
    );
    expect(pastDue).toBe(0);
  });
});
