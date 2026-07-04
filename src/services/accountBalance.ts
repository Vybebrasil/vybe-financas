import {
  BankAccount,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../../types';

export function computeAccountBalance(
  account: BankAccount,
  transactions: Transaction[],
): number {
  let balance = account.initialBalance;

  for (const t of transactions) {
    if (t.status !== TransactionStatus.PAID) continue;

    if (t.type === TransactionType.TRANSFER) {
      if (t.bankAccountId === account.id) balance -= t.amount;
      else if (t.transferToAccountId === account.id) balance += t.amount;
      continue;
    }

    if (t.bankAccountId !== account.id) continue;
    const sign = t.type === TransactionType.INCOME ? 1 : -1;
    balance += t.amount * sign;
  }

  return balance;
}
