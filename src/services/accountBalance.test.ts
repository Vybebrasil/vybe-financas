import { describe, expect, it } from 'vitest';
import { computeAccountBalance } from './accountBalance';
import {
  BankAccount,
  TransactionStatus,
  TransactionType,
} from '../../types';

const checking: BankAccount = {
  id: 'checking',
  name: 'Corrente',
  institution: 'Nubank',
  initialBalance: 1000,
  isDefault: true,
  accountType: 'checking',
};

const card: BankAccount = {
  id: 'card',
  name: 'Cartão',
  institution: 'Nubank',
  initialBalance: 0,
  isDefault: false,
  accountType: 'credit_card',
};

describe('computeAccountBalance', () => {
  it('aplica transferência nas duas contas', () => {
    const txs = [
      {
        id: '1',
        description: 'Adobe',
        amount: 100,
        type: TransactionType.EXPENSE,
        category: 'Ferramentas/Software',
        date: '2026-06-01',
        status: TransactionStatus.PAID,
        bankAccountId: 'card',
        paymentMethod: 'CARTAO' as const,
      },
      {
        id: '2',
        description: 'Fatura',
        amount: 100,
        type: TransactionType.TRANSFER,
        category: 'Transferência entre contas',
        date: '2026-06-10',
        status: TransactionStatus.PAID,
        bankAccountId: 'checking',
        transferToAccountId: 'card',
        paymentMethod: 'OUTRO' as const,
      },
    ];

    expect(computeAccountBalance(checking, txs)).toBe(900);
    expect(computeAccountBalance(card, txs)).toBe(0);
  });
});
