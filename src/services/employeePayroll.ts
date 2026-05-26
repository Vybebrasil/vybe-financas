import { Employee, Transaction, TransactionType } from '../../types';
import { getCurrentMonthKey, salaryDescriptionForEmployee } from './recurringLogic';

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
  const name = employee.name.trim().toLowerCase();
  if (!name) return [];

  const salaryDesc = salaryDescriptionForEmployee(employee.name).toLowerCase();

  return transactions.filter((t) => {
    if (t.type !== TransactionType.EXPENSE) return false;
    if (!t.date.startsWith(monthKey)) return false;
    if (t.employeeId === employee.id) {
      const desc = t.description.toLowerCase();
      return desc !== salaryDesc;
    }
    const desc = t.description.toLowerCase();
    if (!desc.includes(name)) return false;
    if (desc === salaryDesc) return false;
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
