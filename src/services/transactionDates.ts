import { Transaction, TransactionStatus } from '../../types';

export const normalizeTransactionDate = (date: string): string =>
  date.split('T')[0];

/** Data prevista / vencimento (mantida ao dar baixa). */
export const getTransactionScheduledDate = (t: Transaction): string =>
  normalizeTransactionDate(t.date);

/** Data em que o valor entrou ou saiu (baixa). */
export const getTransactionCashDate = (t: Transaction): string => {
  if (t.status === TransactionStatus.PAID && t.paidDate) {
    return normalizeTransactionDate(t.paidDate);
  }
  return normalizeTransactionDate(t.date);
};

/** Data usada em listagens, filtros e gráficos de caixa. */
export const getTransactionFilterDate = (t: Transaction): string =>
  t.status === TransactionStatus.PAID
    ? getTransactionCashDate(t)
    : getTransactionScheduledDate(t);
