import {
  Category,
  Client,
  Employee,
  Subscription,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../../types';
import { DashboardSummary } from '../../types';
import { computeDashboardSummary } from './summary';
import { getDelinquencyReport } from './delinquency';
import { getCurrentMonthKey } from './recurringLogic';

export type DashboardPeriodPreset = 'this_month' | 'last_month' | 'this_year';

export interface DateRange {
  startDate: string;
  endDate: string;
  label: string;
}

export interface PeriodKpis extends DashboardSummary {
  profit: number;
  margin: number;
}

export interface PeriodComparison {
  current: PeriodKpis;
  previous: PeriodKpis;
  deltaIncomePct: number | null;
  deltaExpensePct: number | null;
  deltaProfitPct: number | null;
}

export interface ClientPortfolioMetrics {
  activeCount: number;
  mrr: number;
  ticketMedio: number;
}

export interface FixedCostsMetrics {
  payroll: number;
  subscriptions: number;
  total: number;
}

export interface MrrVsReceived {
  expectedMrr: number;
  receivedPaid: number;
  gap: number;
}

export interface ExpenseByCategory {
  category: string;
  amount: number;
  percent: number;
}

export interface DueSoonClient {
  client: Client;
  daysUntilDue: number;
}

const isoDate = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const lastDayOfMonth = (y: number, m: number) => new Date(y, m, 0).getDate();

export function getPeriodRange(preset: DashboardPeriodPreset, ref = new Date()): DateRange {
  const y = ref.getFullYear();
  const m = ref.getMonth() + 1;

  if (preset === 'this_month') {
    return {
      startDate: isoDate(y, m, 1),
      endDate: isoDate(y, m, lastDayOfMonth(y, m)),
      label: ref.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    };
  }

  if (preset === 'last_month') {
    const prev = new Date(y, ref.getMonth() - 1, 1);
    const py = prev.getFullYear();
    const pm = prev.getMonth() + 1;
    return {
      startDate: isoDate(py, pm, 1),
      endDate: isoDate(py, pm, lastDayOfMonth(py, pm)),
      label: prev.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    };
  }

  return {
    startDate: isoDate(y, 1, 1),
    endDate: isoDate(y, 12, 31),
    label: String(y),
  };
}

export function getPreviousPeriodRange(range: DateRange): DateRange {
  const start = new Date(range.startDate + 'T12:00:00');
  const end = new Date(range.endDate + 'T12:00:00');
  const days =
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - days + 1);

  return {
    startDate: isoDate(prevStart.getFullYear(), prevStart.getMonth() + 1, prevStart.getDate()),
    endDate: isoDate(prevEnd.getFullYear(), prevEnd.getMonth() + 1, prevEnd.getDate()),
    label: 'período anterior',
  };
}

export function filterTransactionsByRange(
  transactions: Transaction[],
  startDate: string,
  endDate: string,
): Transaction[] {
  return transactions.filter((t) => {
    const d = t.date.split('T')[0];
    return d >= startDate && d <= endDate;
  });
}

export function computePeriodKpis(transactions: Transaction[]): PeriodKpis {
  const base = computeDashboardSummary(transactions);
  const profit = base.totalIncome - base.totalExpense;
  const margin = base.totalIncome > 0 ? (profit / base.totalIncome) * 100 : 0;
  return { ...base, profit, margin };
}

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function computePeriodComparison(
  allTransactions: Transaction[],
  range: DateRange,
): PeriodComparison {
  const currentTx = filterTransactionsByRange(
    allTransactions,
    range.startDate,
    range.endDate,
  );
  const prevRange = getPreviousPeriodRange(range);
  const previousTx = filterTransactionsByRange(
    allTransactions,
    prevRange.startDate,
    prevRange.endDate,
  );

  const current = computePeriodKpis(currentTx);
  const previous = computePeriodKpis(previousTx);

  return {
    current,
    previous,
    deltaIncomePct: pctDelta(current.totalIncome, previous.totalIncome),
    deltaExpensePct: pctDelta(current.totalExpense, previous.totalExpense),
    deltaProfitPct: pctDelta(current.profit, previous.profit),
  };
}

export function computeClientPortfolio(clients: Client[]): ClientPortfolioMetrics {
  const active = clients.filter((c) => c.contractStatus === 'Ativo');
  const mrr = active.reduce((s, c) => s + c.monthlyFee, 0);
  return {
    activeCount: active.length,
    mrr,
    ticketMedio: active.length > 0 ? mrr / active.length : 0,
  };
}

export function computeFixedCosts(
  employees: Employee[],
  subscriptions: Subscription[],
): FixedCostsMetrics {
  const payroll = employees.reduce((s, e) => s + e.salary, 0);
  const subs = subscriptions
    .filter((s) => s.active)
    .reduce((sum, s) => sum + s.cost, 0);
  return { payroll, subscriptions: subs, total: payroll + subs };
}

export function computeMrrVsReceived(
  clients: Client[],
  transactions: Transaction[],
  range: DateRange,
): MrrVsReceived {
  const portfolio = computeClientPortfolio(clients);
  const monthKey = range.startDate.slice(0, 7);
  const receivedPaid = transactions
    .filter(
      (t) =>
        t.type === TransactionType.INCOME &&
        t.status === TransactionStatus.PAID &&
        t.category === Category.CLIENT_PAYMENT &&
        t.date.startsWith(monthKey),
    )
    .reduce((s, t) => s + t.amount, 0);

  return {
    expectedMrr: portfolio.mrr,
    receivedPaid,
    gap: portfolio.mrr - receivedPaid,
  };
}

export function computeExpensesByCategory(
  transactions: Transaction[],
  range: DateRange,
): ExpenseByCategory[] {
  const tx = filterTransactionsByRange(transactions, range.startDate, range.endDate).filter(
    (t) => t.type === TransactionType.EXPENSE && t.status === TransactionStatus.PAID,
  );
  const map = new Map<string, number>();
  for (const t of tx) {
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  }
  const total = [...map.values()].reduce((a, b) => a + b, 0);
  return [...map.entries()]
    .map(([category, amount]) => ({
      category,
      amount,
      percent: total > 0 ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function getClientsDueSoon(clients: Client[], withinDays = 7): DueSoonClient[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const result: DueSoonClient[] = [];

  for (const client of clients) {
    if (client.contractStatus !== 'Ativo') continue;
    const y = today.getFullYear();
    const m = today.getMonth();
    let target = new Date(y, m, client.dueDay);
    if (target < today) target = new Date(y, m + 1, client.dueDay);
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays <= withinDays) {
      result.push({ client, daysUntilDue: diffDays });
    }
  }

  return result.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

export function getPendingToReconcile(transactions: Transaction[], limit = 5): Transaction[] {
  return [...transactions]
    .filter((t) => t.status === TransactionStatus.PENDING)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

export function getDelinquencySnapshot(clients: Client[], transactions: Transaction[]) {
  return getDelinquencyReport(clients, transactions, getCurrentMonthKey());
}
