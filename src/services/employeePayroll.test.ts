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
  it('calcula A pagar = salário + bônus − despesas vinculadas do mês', () => {
    const month = '2026-05';
    const txs = [
      {
        id: '1',
        description: 'Vale transporte - Ana Silva',
        amount: 200,
        type: TransactionType.EXPENSE,
        category: Category.OTHER,
        date: '2026-05-10',
        status: TransactionStatus.PAID,
        paymentMethod: 'PIX' as const,
      },
      {
        id: '2',
        description: salaryDescriptionForEmployee('Ana Silva'),
        amount: 3000,
        type: TransactionType.EXPENSE,
        category: Category.SALARY,
        date: '2026-05-05',
        status: TransactionStatus.PAID,
        paymentMethod: 'PIX' as const,
      },
    ];

    const result = computeEmployeeAmountToPay(employee, txs, month);
    expect(result.salary).toBe(3000);
    expect(result.bonus).toBe(500);
    expect(result.linkedExpenses).toBe(200);
    expect(result.amountToPay).toBe(3300);
  });

  it('vincula por employeeId quando informado', () => {
    const result = computeEmployeeAmountToPay(
      employee,
      [
        {
          id: '1',
          description: 'Reembolso',
          amount: 150,
          type: TransactionType.EXPENSE,
          category: Category.OTHER,
          date: '2026-05-12',
          status: TransactionStatus.PAID,
          paymentMethod: 'PIX',
          employeeId: 'e1',
        },
      ],
      '2026-05',
    );
    expect(result.linkedExpenses).toBe(150);
    expect(result.amountToPay).toBe(3350);
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
        },
      ],
      '2026-05',
    );
    expect(linked).toHaveLength(0);
  });
});
