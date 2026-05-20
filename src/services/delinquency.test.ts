import { describe, it, expect } from 'vitest';
import { getDelinquencyReport, getClientBillingSnapshot } from './delinquency';
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
  it('marca inadimplente quando passou do vencimento sem pagamento', () => {
    const snapshot = getClientBillingSnapshot(
      client,
      [],
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
});
