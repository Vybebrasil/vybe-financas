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
import { isClientPaymentCategory } from './categories';
import {
  buildMonthlyRecurringPayloads,
  getCurrentMonthKey,
  shiftMonthKey,
  subscriptionDescriptionFor,
} from './recurringLogic';
import { getTransactionCashDate, getTransactionFilterDate } from './transactionDates';

export type DashboardPeriodPreset = 'this_month' | 'last_month' | 'calendar_year';

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

export function getYearRange(year: number): DateRange {
  return {
    startDate: isoDate(year, 1, 1),
    endDate: isoDate(year, 12, 31),
    label: String(year),
  };
}

export function getPeriodRange(
  preset: DashboardPeriodPreset,
  ref = new Date(),
  calendarYear?: number,
): DateRange {
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

  return getYearRange(calendarYear ?? y);
}

/** Anos com lançamentos + ano atual, do mais recente ao mais antigo. */
export function getTransactionYears(transactions: Transaction[], ref = new Date()): number[] {
  const years = new Set<number>([ref.getFullYear()]);
  for (const t of transactions) {
    const y = parseInt(getTransactionFilterDate(t).slice(0, 4), 10);
    if (!Number.isNaN(y)) years.add(y);
    if (t.paidDate) {
      const py = parseInt(t.paidDate.slice(0, 4), 10);
      if (!Number.isNaN(py)) years.add(py);
    }
  }
  return [...years].sort((a, b) => b - a);
}

function monthsInRange(range: DateRange): number {
  const [sy, sm] = range.startDate.split('-').map(Number);
  const [ey, em] = range.endDate.split('-').map(Number);
  return Math.max(1, (ey - sy) * 12 + (em - sm) + 1);
}

export function isSingleCalendarMonth(range: DateRange): boolean {
  return range.startDate.slice(0, 7) === range.endDate.slice(0, 7);
}

export interface MonthlyForecastMetrics {
  referenceMonthKey: string;
  referenceMonthLabel: string;
  expectedIncomeTotal: number;
  expectedExpenseTotal: number;
  fixedCostMonth: number;
  variableCostMonth: number;
  projectedIncomeTotal: number;
  projectedExpenseTotal: number;
  projectionMonthCount: number;
}

export function getReferenceMonthKey(range: DateRange, ref = new Date()): string {
  if (isSingleCalendarMonth(range)) return range.startDate.slice(0, 7);
  const nowKey = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`;
  const year = range.startDate.slice(0, 4);
  if (nowKey.startsWith(year)) return nowKey;
  return range.endDate.slice(0, 7);
}

export function formatMonthKeyLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
}

export function isFixedCostCategory(category: string): boolean {
  return (
    category === Category.SALARY ||
    category === Category.FIXED_EXPENSE ||
    category === Category.TOOLS
  );
}

export function isVariableCostCategory(category: string): boolean {
  return (
    category === Category.VARIABLE_EXPENSE ||
    category === Category.ADS ||
    category === Category.SUPPLIES ||
    category === Category.OTHER
  );
}

function transactionsInMonth(transactions: Transaction[], monthKey: string): Transaction[] {
  return transactions.filter((t) => t.date.split('T')[0].startsWith(monthKey));
}

/** Soma todas as entradas do mês (pagas + pendentes). */
export function totalIncomeInMonth(
  transactions: Transaction[],
  monthKey: string,
): number {
  return transactionsInMonth(transactions, monthKey)
    .filter((t) => t.type === TransactionType.INCOME)
    .reduce((s, t) => s + t.amount, 0);
}

/** Soma todas as saídas do mês (pagas + pendentes). */
export function totalExpenseInMonth(
  transactions: Transaction[],
  monthKey: string,
): number {
  return transactionsInMonth(transactions, monthKey)
    .filter((t) => t.type === TransactionType.EXPENSE)
    .reduce((s, t) => s + t.amount, 0);
}

function clientHasIncomeInMonth(
  client: Client,
  monthTxs: Transaction[],
): boolean {
  const description = `Mensalidade - ${client.name}`;
  return monthTxs.some(
    (t) =>
      t.type === TransactionType.INCOME &&
      (t.description === description || t.clientId === client.id),
  );
}

/** Projeção futura: pendentes + recorrências ainda não lançadas no extrato. */
export function projectedIncomeForMonth(
  clients: Client[],
  transactions: Transaction[],
  monthKey: string,
): number {
  const monthTxs = transactionsInMonth(transactions, monthKey);
  const pending = monthTxs
    .filter(
      (t) =>
        t.type === TransactionType.INCOME && t.status === TransactionStatus.PENDING,
    )
    .reduce((s, t) => s + t.amount, 0);

  let fromActiveClients = 0;
  for (const client of clients) {
    if (client.contractStatus !== 'Ativo') continue;
    if (!clientHasIncomeInMonth(client, monthTxs)) {
      fromActiveClients += Number(client.monthlyFee) || 0;
    }
  }
  return pending + fromActiveClients;
}

/** Projeção futura: pendentes + recorrências ainda não lançadas no extrato. */
export function projectedExpenseForMonth(
  clients: Client[],
  employees: Employee[],
  subscriptions: Subscription[],
  transactions: Transaction[],
  monthKey: string,
): number {
  const monthTxs = transactionsInMonth(transactions, monthKey);
  const pending = monthTxs
    .filter(
      (t) =>
        t.type === TransactionType.EXPENSE && t.status === TransactionStatus.PENDING,
    )
    .reduce((s, t) => s + t.amount, 0);

  const recurring = buildMonthlyRecurringPayloads(
    { transactions, clients, employees, subscriptions },
    monthKey,
  );
  const recurringTotal = recurring.reduce((s, t) => s + t.amount, 0);
  return pending + recurringTotal;
}

export function costsInReferenceMonth(
  transactions: Transaction[],
  monthKey: string,
): { fixed: number; variable: number } {
  const expenses = transactionsInMonth(transactions, monthKey).filter(
    (t) => t.type === TransactionType.EXPENSE,
  );
  let fixed = 0;
  let variable = 0;
  for (const t of expenses) {
    if (isFixedCostCategory(t.category)) fixed += t.amount;
    else if (isVariableCostCategory(t.category)) variable += t.amount;
    else variable += t.amount;
  }
  return { fixed, variable };
}

export function computeMonthlyForecastMetrics(params: {
  clients: Client[];
  employees: Employee[];
  subscriptions: Subscription[];
  transactions: Transaction[];
  range: DateRange;
  projectionMonths?: number;
  ref?: Date;
}): MonthlyForecastMetrics {
  const {
    clients,
    employees,
    subscriptions,
    transactions,
    range,
    projectionMonths = 3,
    ref = new Date(),
  } = params;

  const referenceMonthKey = getReferenceMonthKey(range, ref);
  const referenceMonthLabel = formatMonthKeyLabel(referenceMonthKey);

  const expectedIncomeTotal = totalIncomeInMonth(transactions, referenceMonthKey);
  const expectedExpenseTotal = totalExpenseInMonth(transactions, referenceMonthKey);
  const { fixed: fixedCostMonth, variable: variableCostMonth } = costsInReferenceMonth(
    transactions,
    referenceMonthKey,
  );

  let projectedIncomeTotal = 0;
  let projectedExpenseTotal = 0;
  for (let i = 1; i <= projectionMonths; i++) {
    const mk = shiftMonthKey(referenceMonthKey, i);
    projectedIncomeTotal += projectedIncomeForMonth(clients, transactions, mk);
    projectedExpenseTotal += projectedExpenseForMonth(
      clients,
      employees,
      subscriptions,
      transactions,
      mk,
    );
  }

  return {
    referenceMonthKey,
    referenceMonthLabel,
    expectedIncomeTotal,
    expectedExpenseTotal,
    fixedCostMonth,
    variableCostMonth,
    projectedIncomeTotal,
    projectedExpenseTotal,
    projectionMonthCount: projectionMonths,
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
    const d = getTransactionFilterDate(t);
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
  const singleMonth = isSingleCalendarMonth(range);
  const monthKey = range.startDate.slice(0, 7);

  const receivedPaid = transactions
    .filter((t) => {
      if (t.type !== TransactionType.INCOME) return false;
      if (t.status !== TransactionStatus.PAID) return false;
      if (!isClientPaymentCategory(t.category)) return false;
      const d = getTransactionCashDate(t);
      if (singleMonth) return d.startsWith(monthKey);
      return d >= range.startDate && d <= range.endDate;
    })
    .reduce((s, t) => s + t.amount, 0);

  const expectedMrr = singleMonth
    ? portfolio.mrr
    : portfolio.mrr * monthsInRange(range);

  return {
    expectedMrr,
    receivedPaid,
    gap: expectedMrr - receivedPaid,
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

export type RecurringExpenseStatus = 'paid' | 'pending' | 'missing';

/** @deprecated Use RecurringExpenseStatus */
export type PayrollEntryStatus = RecurringExpenseStatus;

export interface PayrollEmployeeStatus {
  employee: Employee;
  status: PayrollEntryStatus;
  amount: number;
  transactionId?: string;
  paymentDate?: string;
  scheduledDate?: string;
}

export interface PayrollMonthSummary {
  periodLabel: string;
  entries: PayrollEmployeeStatus[];
  paidCount: number;
  pendingCount: number;
  missingCount: number;
  totalPaid: number;
  totalPending: number;
  totalExpected: number;
}

function isSalaryTransactionForEmployee(
  transaction: Transaction,
  employee: Employee,
): boolean {
  if (transaction.type !== TransactionType.EXPENSE) return false;
  return (
    transaction.employeeId === employee.id &&
    transaction.category === Category.SALARY
  );
}

export function computePayrollMonthStatus(
  employees: Employee[],
  transactions: Transaction[],
  range: DateRange,
): PayrollMonthSummary {
  const inRange = filterTransactionsByRange(
    transactions,
    range.startDate,
    range.endDate,
  );

  const raw = buildRecurringExpenseEntries({
    items: employees,
    inRange,
    getAmount: (e) => e.salary,
    matchTransaction: isSalaryTransactionForEmployee,
  });

  const entries: PayrollEmployeeStatus[] = raw.map((r) => ({
    employee: r.item,
    status: r.status,
    amount: r.amount,
    transactionId: r.transactionId,
    paymentDate: r.paymentDate,
    scheduledDate: r.scheduledDate,
  }));

  return summarizeRecurringEntries(
    entries,
    range.label,
    employees.reduce((s, e) => s + e.salary, 0),
    (a, b) => a.employee.name.localeCompare(b.employee.name, 'pt-BR'),
  ) as PayrollMonthSummary;
}

export interface SubscriptionAppStatus {
  subscription: Subscription;
  status: RecurringExpenseStatus;
  amount: number;
  transactionId?: string;
  paymentDate?: string;
  scheduledDate?: string;
}

export interface SubscriptionsMonthSummary {
  periodLabel: string;
  entries: SubscriptionAppStatus[];
  paidCount: number;
  pendingCount: number;
  missingCount: number;
  totalPaid: number;
  totalPending: number;
  totalExpected: number;
}

function isSubscriptionTransaction(
  transaction: Transaction,
  subscription: Subscription,
): boolean {
  if (transaction.type !== TransactionType.EXPENSE) return false;
  const expected = subscriptionDescriptionFor(subscription.name);
  if (transaction.description === expected) return true;
  const name = subscription.name.trim().toLowerCase();
  if (!name) return false;
  const desc = transaction.description.toLowerCase();
  return desc.includes(name) && desc.includes('assinatura');
}

function buildRecurringExpenseEntries<T>(params: {
  items: T[];
  inRange: Transaction[];
  getAmount: (item: T) => number;
  matchTransaction: (tx: Transaction, item: T) => boolean;
}): Array<{
  item: T;
  status: RecurringExpenseStatus;
  amount: number;
  transactionId?: string;
  paymentDate?: string;
  scheduledDate?: string;
}> {
  return params.items.map((item) => {
    const txs = params.inRange
      .filter((t) => params.matchTransaction(t, item))
      .sort((a, b) => b.date.localeCompare(a.date));

    const paidTx = txs.find((t) => t.status === TransactionStatus.PAID);
    if (paidTx) {
      return {
        item,
        status: 'paid' as const,
        amount: paidTx.amount,
        transactionId: paidTx.id,
        paymentDate: getTransactionCashDate(paidTx),
      };
    }

    const pendingTx = txs.find((t) => t.status === TransactionStatus.PENDING);
    if (pendingTx) {
      return {
        item,
        status: 'pending' as const,
        amount: pendingTx.amount,
        transactionId: pendingTx.id,
        scheduledDate: pendingTx.date.split('T')[0],
      };
    }

    return {
      item,
      status: 'missing' as const,
      amount: params.getAmount(item),
    };
  });
}

function summarizeRecurringEntries<T>(
  entries: Array<{ status: RecurringExpenseStatus; amount: number } & T>,
  periodLabel: string,
  totalExpected: number,
  sortKey: (a: T, b: T) => number,
): {
  periodLabel: string;
  entries: typeof entries;
  paidCount: number;
  pendingCount: number;
  missingCount: number;
  totalPaid: number;
  totalPending: number;
  totalExpected: number;
} {
  const paid = entries.filter((e) => e.status === 'paid');
  const pending = entries.filter((e) => e.status === 'pending');
  const missing = entries.filter((e) => e.status === 'missing');
  const order: Record<RecurringExpenseStatus, number> = {
    pending: 0,
    missing: 1,
    paid: 2,
  };

  return {
    periodLabel,
    entries: [...entries].sort((a, b) => {
      const diff = order[a.status] - order[b.status];
      if (diff !== 0) return diff;
      return sortKey(a, b);
    }),
    paidCount: paid.length,
    pendingCount: pending.length,
    missingCount: missing.length,
    totalPaid: paid.reduce((s, e) => s + e.amount, 0),
    totalPending: pending.reduce((s, e) => s + e.amount, 0),
    totalExpected,
  };
}

export function computeSubscriptionsMonthStatus(
  subscriptions: Subscription[],
  transactions: Transaction[],
  range: DateRange,
): SubscriptionsMonthSummary {
  const active = subscriptions.filter((s) => s.active);
  const inRange = filterTransactionsByRange(
    transactions,
    range.startDate,
    range.endDate,
  );

  const raw = buildRecurringExpenseEntries({
    items: active,
    inRange,
    getAmount: (s) => s.cost,
    matchTransaction: isSubscriptionTransaction,
  });

  const entries: SubscriptionAppStatus[] = raw.map((r) => ({
    subscription: r.item,
    status: r.status,
    amount: r.amount,
    transactionId: r.transactionId,
    paymentDate: r.paymentDate,
    scheduledDate: r.scheduledDate,
  }));

  const summary = summarizeRecurringEntries(
    entries,
    range.label,
    active.reduce((s, sub) => s + sub.cost, 0),
    (a, b) => a.subscription.name.localeCompare(b.subscription.name, 'pt-BR'),
  );

  return summary as SubscriptionsMonthSummary;
}
