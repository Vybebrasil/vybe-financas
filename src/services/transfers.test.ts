import { describe, expect, it } from 'vitest';
import { validateTransferTransaction } from './transfers';
import { TransactionType } from '../../types';

describe('validateTransferTransaction', () => {
  it('exige contas distintas', () => {
    expect(() =>
      validateTransferTransaction({
        type: TransactionType.TRANSFER,
        amount: 100,
        bankAccountId: 'a',
        transferToAccountId: 'a',
      }),
    ).toThrow(/diferentes/);
  });

  it('aceita transferência válida', () => {
    expect(() =>
      validateTransferTransaction({
        type: TransactionType.TRANSFER,
        amount: 100,
        bankAccountId: 'a',
        transferToAccountId: 'b',
      }),
    ).not.toThrow();
  });
});
