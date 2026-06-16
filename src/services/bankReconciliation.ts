import { Transaction, TransactionStatus, TransactionType } from '../../types';
import { ParsedStatementLine } from './bankStatementParser';
import { getTransactionScheduledDate } from './transactionDates';

export interface ReconciliationSuggestion {
  line: ParsedStatementLine;
  transaction: Transaction;
  score: number;
}

function amountMatch(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.02;
}

function dateProximity(lineDate: string, txDate: string): number {
  const diff = Math.abs(
    new Date(`${lineDate}T12:00:00`).getTime() -
      new Date(`${getTransactionScheduledDate({ date: txDate } as Transaction)}T12:00:00`).getTime(),
  );
  const days = diff / (1000 * 60 * 60 * 24);
  if (days === 0) return 30;
  if (days <= 3) return 20;
  if (days <= 7) return 10;
  return 0;
}

export function suggestReconciliationMatches(
  lines: ParsedStatementLine[],
  transactions: Transaction[],
): ReconciliationSuggestion[] {
  const pending = transactions.filter((t) => t.status === TransactionStatus.PENDING);
  const suggestions: ReconciliationSuggestion[] = [];

  for (const line of lines) {
    let best: ReconciliationSuggestion | null = null;

    for (const tx of pending) {
      const txIsIncome = tx.type === TransactionType.INCOME;
      const lineIsCredit = line.type === 'credit';
      if (txIsIncome !== lineIsCredit) continue;
      if (!amountMatch(line.amount, tx.amount)) continue;

      const score =
        50 +
        dateProximity(line.lineDate, tx.date) +
        (line.description.toLowerCase().includes(tx.description.toLowerCase().slice(0, 8)) ? 15 : 0);

      if (!best || score > best.score) {
        best = { line, transaction: tx, score };
      }
    }

    if (best && best.score >= 50) suggestions.push(best);
  }

  return suggestions.sort((a, b) => b.score - a.score);
}
