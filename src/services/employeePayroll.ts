import {
  Category,
  Employee,
  EmployeeCompensationHistory,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../../types';
import { getCurrentMonthKey } from './recurringLogic';
import { getTransactionFilterDate } from './transactionDates';

export interface EmployeePayrollBreakdown {
  salary: number;
  bonus: number;
  /** Vales e descontos já pagos no mês (abatidos do salário) */
  linkedExpenses: number;
  vales: Transaction[];
  salaryPaid: number;
  amountToPay: number;
}

export function isPayrollDeduction(
  transaction: Transaction,
  employeeId: string,
  monthKey?: string,
): boolean {
  if (transaction.type !== TransactionType.EXPENSE) return false;
  if (transaction.employeeId !== employeeId) return false;
  if (transaction.category === Category.SALARY) return false;
  if (transaction.status !== TransactionStatus.PAID) return false;
  if (monthKey && !getTransactionFilterDate(transaction).startsWith(monthKey)) return false;
  return true;
}

/** Lançamento que conta como pagamento ao colaborador (exclui abatimentos de vale). */
export function isEmployeeCashOutflow(transaction: Transaction, employeeId: string): boolean {
  if (transaction.type !== TransactionType.EXPENSE) return false;
  if (transaction.employeeId !== employeeId) return false;
  if (transaction.category === Category.EMPLOYEE_VALE_SETTLEMENT) return false;
  if (transaction.status !== TransactionStatus.PAID) return false;
  return true;
}

export function getEmployeeValeSettlementsTotal(
  employee: Employee,
  transactions: Transaction[],
): number {
  return transactions
    .filter(
      (t) =>
        t.employeeId === employee.id &&
        t.status === TransactionStatus.PAID &&
        t.category === Category.EMPLOYEE_VALE_SETTLEMENT,
    )
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getEmployeeLinkedTransactions(
  employee: Employee,
  transactions: Transaction[],
  monthKey = getCurrentMonthKey(),
): Transaction[] {
  return transactions.filter((t) => isPayrollDeduction(t, employee.id, monthKey));
}

export function getEmployeeSalaryPaidInMonth(
  employee: Employee,
  transactions: Transaction[],
  monthKey = getCurrentMonthKey(),
): number {
  return transactions
    .filter((t) => {
      if (t.type !== TransactionType.EXPENSE) return false;
      if (!getTransactionFilterDate(t).startsWith(monthKey)) return false;
      if (t.employeeId !== employee.id) return false;
      if (t.category !== Category.SALARY) return false;
      if (t.status !== TransactionStatus.PAID) return false;
      return true;
    })
    .reduce((sum, t) => sum + t.amount, 0);
}

export function computeEmployeeAmountToPay(
  employee: Employee,
  transactions: Transaction[],
  monthKey = getCurrentMonthKey(),
): EmployeePayrollBreakdown {
  const salary = Number(employee.salary) || 0;
  const bonus = Number(employee.bonus) || 0;
  const vales = getEmployeeLinkedTransactions(employee, transactions, monthKey);
  const linkedExpenses = vales.reduce((sum, t) => sum + t.amount, 0);
  const salaryPaid = getEmployeeSalaryPaidInMonth(employee, transactions, monthKey);
  const grossOwed = salary + bonus - linkedExpenses;
  const amountToPay = Math.max(0, grossOwed - salaryPaid);

  return { salary, bonus, linkedExpenses, vales, salaryPaid, amountToPay };
}

export const EMPLOYEE_VALE_PRESETS = [
  'Vale transporte',
  'Vale refeição',
  'Vale alimentação',
  'Adiantamento',
] as const;

export type EmployeeValePreset = (typeof EMPLOYEE_VALE_PRESETS)[number];

/** Salário + bônus vigentes em um mês, usando histórico quando existir. */
export function getEmployeeCompensationForMonth(
  employee: Employee,
  history: EmployeeCompensationHistory[],
  monthKey: string,
): { salary: number; bonus: number } {
  const employeeHistory = history
    .filter((entry) => entry.employeeId === employee.id)
    .sort((a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth));

  const match = employeeHistory.find((entry) => entry.effectiveMonth <= monthKey);
  if (match) {
    return { salary: match.salary, bonus: match.bonus };
  }

  return {
    salary: Number(employee.salary) || 0,
    bonus: Number(employee.bonus) || 0,
  };
}

/** Excesso pago no mês acima de salário + bônus (vale = quanto foi pago a mais). */
export function computeEmployeeMonthlyOverpaymentVales(
  employee: Employee,
  transactions: Transaction[],
  compensationHistory: EmployeeCompensationHistory[] = [],
): { byMonth: Map<string, number>; total: number } {
  const paidByMonth = new Map<string, number>();

  for (const t of transactions) {
    if (!isEmployeeCashOutflow(t, employee.id)) continue;
    const key = getTransactionFilterDate(t).slice(0, 7);
    paidByMonth.set(key, (paidByMonth.get(key) ?? 0) + t.amount);
  }

  const byMonth = new Map<string, number>();
  let grossTotal = 0;
  for (const [monthKey, paid] of paidByMonth) {
    const { salary, bonus } = getEmployeeCompensationForMonth(
      employee,
      compensationHistory,
      monthKey,
    );
    const entitlement = salary + bonus;
    const excess = Math.max(0, paid - entitlement);
    if (excess > 0) {
      byMonth.set(monthKey, excess);
      grossTotal += excess;
    }
  }

  const settled = getEmployeeValeSettlementsTotal(employee, transactions);
  const total = Math.max(0, grossTotal - settled);

  return { byMonth, total, grossTotal, settled };
}

export function getEmployeeTotalOverpaymentVales(
  employee: Employee,
  transactions: Transaction[],
  compensationHistory: EmployeeCompensationHistory[] = [],
): number {
  return computeEmployeeMonthlyOverpaymentVales(
    employee,
    transactions,
    compensationHistory,
  ).total;
}

export function buildValeSettlementDescription(employeeName: string): string {
  return `Abatimento de vale - ${employeeName}`;
}

export function buildValeDescription(preset: string, employeeName: string, custom?: string): string {
  const base = custom?.trim() || preset.trim();
  if (!base) return `Vale - ${employeeName}`;
  if (base.toLowerCase().startsWith('vale') || base.toLowerCase().startsWith('adiantamento')) {
    return `${base} - ${employeeName}`;
  }
  return `Vale - ${base} - ${employeeName}`;
}
