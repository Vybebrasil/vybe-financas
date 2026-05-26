import { describe, expect, it } from 'vitest';
import { Category, Employee, TransactionStatus, TransactionType } from '../../types';
import {
  computeEmployeeAmountToPay,
  getEmployeeLinkedTransactions,
} from './employeePayroll';
import { salaryDescriptionForEmployee } from './recurringLogic';

const employee: Employee = {
  id: 'e1',
  name: 'Ana Silva',
  role: 'Designer',
  salary: 3000,
  bonus: 500,
  pixKey: '',
  paymentDay: 5,
};

describe('employeePayroll', () => {
  it('calcula A pagar = salário + bônus − despesas vinculadas por employeeId', () => {
    const month = '2026-05';
    const result = computeEmployeeAmountToPay(
      employee,
      [
        {
          id: '1',
          description: 'Vale transporte',
          amount: 200,
          type: TransactionType.EXPENSE,
          category: Category.OTHER,
          date: '2026-05-10',
          status: TransactionStatus.PAID,
          paymentMethod: 'PIX',
          employeeId: 'e1',
        },
        {
          id: '2',
          description: salaryDescriptionForEmployee('Ana Silva'),
          amount: 3000,
          type: TransactionType.EXPENSE,
          category: Category.SALARY,
          date: '2026-05-05',
          status: TransactionStatus.PAID,
          paymentMethod: 'PIX',
          employeeId: 'e1',
        },
      ],
      month,
    );
    expect(result.linkedExpenses).toBe(200);
    expect(result.amountToPay).toBe(3300);
  });

  it('ignora despesas sem employeeId mesmo com nome na descrição', () => {
    const result = computeEmployeeAmountToPay(
      employee,
      [
        {
          id: '1',
          description: 'Vale transporte - Ana Silva',
          amount: 200,
          type: TransactionType.EXPENSE,
          category: Category.OTHER,
          date: '2026-05-10',
          status: TransactionStatus.PAID,
          paymentMethod: 'PIX',
        },
      ],
      '2026-05',
    );
    expect(result.linkedExpenses).toBe(0);
    expect(result.amountToPay).toBe(3500);
  });

  it('não conta lançamento de salário como despesa vinculada', () => {
    const linked = getEmployeeLinkedTransactions(
      employee,
      [
        {
          id: '1',
          description: salaryDescriptionForEmployee('Ana Silva'),
          amount: 3000,
          type: TransactionType.EXPENSE,
          category: Category.SALARY,
          date: '2026-05-05',
          status: TransactionStatus.PAID,
          paymentMethod: 'PIX',
          employeeId: 'e1',
        },
      ],
      '2026-05',
    );
    expect(linked).toHaveLength(0);
  });
});
