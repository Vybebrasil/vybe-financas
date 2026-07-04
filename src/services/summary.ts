import {
  DashboardSummary,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../../types';

export function computeDashboardSummary(transactions: Transaction[]): DashboardSummary {
  const base = transactions.reduce(
    (acc, curr) => {
      if (curr.type === TransactionType.TRANSFER) return acc;

      if (curr.status === TransactionStatus.PAID) {
        if (curr.type === TransactionType.INCOME) {
          acc.totalIncome += curr.amount;
          acc.balance += curr.amount;
        } else {
          acc.totalExpense += curr.amount;
          acc.balance -= curr.amount;
        }
      } else if (curr.status === TransactionStatus.PENDING) {
        if (curr.type === TransactionType.INCOME) {
          acc.pendingIncome += curr.amount;
        } else {
          acc.pendingExpense += curr.amount;
        }
      }
      return acc;
    },
    {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      pendingIncome: 0,
      pendingExpense: 0,
      projectedBalance: 0,
    },
  );

  return {
    ...base,
    projectedBalance: base.balance + base.pendingIncome - base.pendingExpense,
  };
}
