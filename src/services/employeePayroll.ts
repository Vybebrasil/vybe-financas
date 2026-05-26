import { Category, Employee, Transaction, TransactionType } from '../../types';
import { getCurrentMonthKey } from './recurringLogic';

export interface EmployeePayrollBreakdown {
  salary: number;
  bonus: number;
  linkedExpenses: number;
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

export function computeEmployeeAmountToPay(
  employee: Employee,
  transactions: Transaction[],
  monthKey = getCurrentMonthKey(),
): EmployeePayrollBreakdown {
  const salary = Number(employee.salary) || 0;
  const bonus = Number(employee.bonus) || 0;
  const linked = getEmployeeLinkedTransactions(employee, transactions, monthKey);
  const linkedExpenses = linked.reduce((sum, t) => sum + t.amount, 0);
  const amountToPay = Math.max(0, salary + bonus - linkedExpenses);

  return { salary, bonus, linkedExpenses, amountToPay };
}
