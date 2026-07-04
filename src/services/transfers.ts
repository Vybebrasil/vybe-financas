import { Transaction, TransactionType } from '../../types';

export const TRANSFER_CATEGORY_LABEL = 'Transferência entre contas';

export function isTransferTransaction(
  transaction: Pick<Transaction, 'type'>,
): boolean {
  return transaction.type === TransactionType.TRANSFER;
}

export function validateTransferTransaction(
  transaction: Pick<
    Transaction,
    'type' | 'amount' | 'bankAccountId' | 'transferToAccountId'
  >,
): void {
  if (transaction.type !== TransactionType.TRANSFER) return;

  if (!transaction.bankAccountId || !transaction.transferToAccountId) {
    throw new Error('Transferência exige conta de origem e destino.');
  }
  if (transaction.bankAccountId === transaction.transferToAccountId) {
    throw new Error('Conta de origem e destino devem ser diferentes.');
  }
  if (transaction.amount <= 0) {
    throw new Error('O valor da transferência deve ser maior que zero.');
  }
}
