import { describe, expect, it } from 'vitest';
import { Category, Employee, EmployeeCompensationHistory, TransactionStatus, TransactionType } from '../../types';
import {
  computeEmployeeAmountToPay,
  computeEmployeeMonthlyOverpaymentVales,
  getEmployeeCompensationForMonth,
  getEmployeeLinkedTransactions,
  getEmployeeTotalOverpaymentVales,
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
  it('calcula A pagar = salário + bônus − despesas vinculadas − salário já pago', () => {
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
    expect(result.salaryPaid).toBe(3000);
    expect(result.amountToPay).toBe(300);
  });

  it('retorna zero quando salário do mês já foi pago integralmente', () => {
    const result = computeEmployeeAmountToPay(
      { ...employee, salary: 1000, bonus: 0 },
      [
        {
          id: '1',
          description: salaryDescriptionForEmployee('Ana Silva'),
          amount: 1000,
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
    expect(result.amountToPay).toBe(0);
    expect(result.salaryPaid).toBe(1000);
  });

  it('não desconta salário pendente, apenas pago', () => {
    const result = computeEmployeeAmountToPay(
      { ...employee, salary: 1000, bonus: 0 },
      [
        {
          id: '1',
          description: salaryDescriptionForEmployee('Ana Silva'),
          amount: 1000,
          type: TransactionType.EXPENSE,
          category: Category.SALARY,
          date: '2026-05-05',
          status: TransactionStatus.PENDING,
          paymentMethod: 'PIX',
          employeeId: 'e1',
        },
      ],
      '2026-05',
    );
    expect(result.salaryPaid).toBe(0);
    expect(result.amountToPay).toBe(1000);
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

  it('não desconta vale pendente da folha', () => {
    const result = computeEmployeeAmountToPay(
      employee,
      [
        {
          id: '1',
          description: 'Vale transporte - Ana Silva',
          amount: 200,
          type: TransactionType.EXPENSE,
          category: Category.EMPLOYEE_VOUCHER,
          date: '2026-05-10',
          status: TransactionStatus.PENDING,
          paymentMethod: 'PIX',
          employeeId: 'e1',
        },
      ],
      '2026-05',
    );
    expect(result.linkedExpenses).toBe(0);
    expect(result.amountToPay).toBe(3500);
  });

  it('suporta pagamentos parciais de salário', () => {
    const month = '2026-05';
    const afterPartial = computeEmployeeAmountToPay(
      { ...employee, salary: 3000, bonus: 0 },
      [
        {
          id: '1',
          description: 'Salário (parcial) - Ana Silva',
          amount: 1200,
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
    expect(afterPartial.salaryPaid).toBe(1200);
    expect(afterPartial.amountToPay).toBe(1800);
  });

  it('soma vales como excesso pago acima de salário + bônus por mês', () => {
    const vini: Employee = {
      id: 'v1',
      name: 'Vinicius Damascena',
      role: 'COO',
      salary: 3000,
      bonus: 0,
      pixKey: '',
      paymentDay: 5,
    };
    const txs = [
      // Maio: pago 2600 com salário vigente 2500 — usa salário atual 3000 → sem excesso
      {
        id: 'm1',
        description: 'Salário - Vinicius Damascena',
        amount: 2500,
        type: TransactionType.EXPENSE,
        category: Category.SALARY,
        date: '2026-05-20',
        status: TransactionStatus.PAID,
        paymentMethod: 'PIX',
        employeeId: 'v1',
      },
      {
        id: 'm2',
        description: 'vale',
        amount: 100,
        type: TransactionType.EXPENSE,
        category: Category.EMPLOYEE_VOUCHER,
        date: '2026-05-05',
        status: TransactionStatus.PAID,
        paymentMethod: 'PIX',
        employeeId: 'v1',
      },
      // Junho: 3600 pago, salário 3000 → 600 de vale
      {
        id: 'j1',
        description: 'Vale Vini',
        amount: 100,
        type: TransactionType.EXPENSE,
        category: Category.EMPLOYEE_VOUCHER,
        date: '2026-06-10',
        status: TransactionStatus.PAID,
        paymentMethod: 'PIX',
        employeeId: 'v1',
      },
      {
        id: 'j2',
        description: 'Salário Vini',
        amount: 1250,
        type: TransactionType.EXPENSE,
        category: Category.SALARY,
        date: '2026-06-10',
        status: TransactionStatus.PAID,
        paymentMethod: 'PIX',
        employeeId: 'v1',
      },
      {
        id: 'j3',
        description: 'Vale - Vini',
        amount: 750,
        type: TransactionType.EXPENSE,
        category: Category.EMPLOYEE_VOUCHER,
        date: '2026-06-15',
        status: TransactionStatus.PAID,
        paymentMethod: 'PIX',
        employeeId: 'v1',
      },
      {
        id: 'j4',
        description: 'Vale - Vini',
        amount: 1500,
        type: TransactionType.EXPENSE,
        category: Category.EMPLOYEE_VOUCHER,
        date: '2026-06-20',
        status: TransactionStatus.PAID,
        paymentMethod: 'PIX',
        employeeId: 'v1',
      },
      // Julho: 3500 pago, salário 3000 → 500 de vale
      {
        id: 'jl1',
        description: 'Vale refeição - Vinicius Damascena',
        amount: 500,
        type: TransactionType.EXPENSE,
        category: Category.EMPLOYEE_VOUCHER,
        date: '2026-07-08',
        status: TransactionStatus.PAID,
        paymentMethod: 'PIX',
        employeeId: 'v1',
      },
      {
        id: 'jl2',
        description: 'Salário - Vinicius Damascena',
        amount: 1500,
        type: TransactionType.EXPENSE,
        category: Category.SALARY,
        date: '2026-07-08',
        status: TransactionStatus.PAID,
        paymentMethod: 'PIX',
        employeeId: 'v1',
      },
      {
        id: 'jl3',
        description: 'Salário (parcial) - Vinicius Damascena',
        amount: 1500,
        type: TransactionType.EXPENSE,
        category: Category.SALARY,
        date: '2026-07-08',
        status: TransactionStatus.PAID,
        paymentMethod: 'PIX',
        employeeId: 'v1',
      },
    ];
    const history: EmployeeCompensationHistory[] = [
      {
        id: 'h0',
        employeeId: 'v1',
        effectiveMonth: '1970-01',
        salary: 3000,
        bonus: 0,
      },
      {
        id: 'h1',
        employeeId: 'v1',
        effectiveMonth: '2026-05',
        salary: 2500,
        bonus: 0,
      },
      {
        id: 'h2',
        employeeId: 'v1',
        effectiveMonth: '2026-06',
        salary: 3000,
        bonus: 0,
      },
    ];
    const { byMonth, total } = computeEmployeeMonthlyOverpaymentVales(vini, txs, history);
    expect(byMonth.get('2026-05')).toBe(100);
    expect(byMonth.get('2026-06')).toBe(600);
    expect(byMonth.get('2026-07')).toBe(500);
    expect(total).toBe(1200);
  });

  it('abatimento de vale reduz o total em vales e desconta da folha', () => {
    const vini: Employee = {
      id: 'v1',
      name: 'Vinicius',
      role: 'COO',
      salary: 3000,
      bonus: 0,
      pixKey: '',
      paymentDay: 5,
    };
    const history: EmployeeCompensationHistory[] = [
      { id: 'h1', employeeId: 'v1', effectiveMonth: '2026-07', salary: 3000, bonus: 0 },
    ];
    const txs = [
      {
        id: 'p1',
        description: 'Salário - Vinicius',
        amount: 3500,
        type: TransactionType.EXPENSE,
        category: Category.SALARY,
        date: '2026-07-08',
        status: TransactionStatus.PAID,
        paymentMethod: 'PIX',
        employeeId: 'v1',
      },
      {
        id: 's1',
        description: 'Abatimento de vale - Vinicius',
        amount: 200,
        type: TransactionType.EXPENSE,
        category: Category.EMPLOYEE_VALE_SETTLEMENT,
        date: '2026-07-10',
        status: TransactionStatus.PAID,
        paymentMethod: 'PIX',
        employeeId: 'v1',
      },
    ];

    expect(getEmployeeTotalOverpaymentVales(vini, txs, history)).toBe(300);

    const payroll = computeEmployeeAmountToPay(vini, txs, '2026-07');
    expect(payroll.linkedExpenses).toBe(200);
    expect(payroll.amountToPay).toBe(0);
  });

  it('resolve salário vigente pelo histórico do mês', () => {
    const employee: Employee = {
      id: 'e1',
      name: 'Ana',
      role: 'Dev',
      salary: 3000,
      bonus: 0,
      pixKey: '',
      paymentDay: 5,
    };
    const history: EmployeeCompensationHistory[] = [
      {
        id: 'h1',
        employeeId: 'e1',
        effectiveMonth: '1970-01',
        salary: 3000,
        bonus: 0,
      },
      {
        id: 'h2',
        employeeId: 'e1',
        effectiveMonth: '2026-05',
        salary: 2500,
        bonus: 0,
      },
      {
        id: 'h3',
        employeeId: 'e1',
        effectiveMonth: '2026-06',
        salary: 3200,
        bonus: 200,
      },
    ];

    expect(getEmployeeCompensationForMonth(employee, history, '2026-04')).toEqual({
      salary: 3000,
      bonus: 0,
    });
    expect(getEmployeeCompensationForMonth(employee, history, '2026-05')).toEqual({
      salary: 2500,
      bonus: 0,
    });
    expect(getEmployeeCompensationForMonth(employee, history, '2026-07')).toEqual({
      salary: 3200,
      bonus: 200,
    });
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
