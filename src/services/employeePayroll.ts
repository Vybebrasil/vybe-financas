import {
  Category,
  Employee,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../../types';
import { getCurrentMonthKey } from './recurringLogic';

export interface EmployeePayrollBreakdown {
  salary: number;
  bonus: number;
  linkedExpenses: number;
  salaryPaid: number;
  amountToPay: number;
}

export function getEmployeeLinkedTransactions(
  employee: Employee,
  transactions: Transaction[],
  monthKey = getCurrentMonthKey(),
): Transaction[] {
  return transactions.filter((t) => {
    if (t.type !== TransactionType.EXPENSE) return false;
    if (!t.date.startsWith(monthKey)) return false;
    if (t.employeeId !== employee.id) return false;
    if (t.category === Category.SALARY) return false;
    return true;
  });
}

export function getEmployeeSalaryPaidInMonth(
  employee: Employee,
  transactions: Transaction[],
  monthKey = getCurrentMonthKey(),
): number {
  return transactions
    .filter((t) => {
      if (t.type !== TransactionType.EXPENSE) return false;
      if (!t.date.startsWith(monthKey)) return false;
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
  const linked = getEmployeeLinkedTransactions(employee, transactions, monthKey);
  const linkedExpenses = linked.reduce((sum, t) => sum + t.amount, 0);
  const salaryPaid = getEmployeeSalaryPaidInMonth(
    employee,
    transactions,
    monthKey,
  );
  const grossOwed = salary + bonus - linkedExpenses;
  const amountToPay = Math.max(0, grossOwed - salaryPaid);

  return { salary, bonus, linkedExpenses, salaryPaid, amountToPay };
}
