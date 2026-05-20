import {
  Client,
  Employee,
  Subscription,
  Transaction,
  TransactionType,
  TransactionStatus,
  Category,
} from '../../types';

export const getCurrentMonthKey = (date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

export const dateInMonth = (monthKey: string, day: number): string => {
  const [y, m] = monthKey.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const d = Math.min(Math.max(day, 1), lastDay);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

export const todayIsoDate = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const isSameMonth = (dateStr: string, monthKey: string): boolean =>
  dateStr.slice(0, 7) === monthKey;

export const alreadyScheduled = (
  transactions: Transaction[],
  description: string,
  monthKey: string,
): boolean =>
  transactions.some(
    (t) => t.description === description && isSameMonth(t.date, monthKey),
  );

export interface RecurringData {
  transactions: Transaction[];
  clients: Client[];
  employees: Employee[];
  subscriptions: Subscription[];
}

/** Monta payloads de lançamentos recorrentes pendentes do mês (sem persistir). */
export function buildMonthlyRecurringPayloads(
  data: RecurringData,
  monthKey = getCurrentMonthKey(),
): Omit<Transaction, 'id'>[] {
  const { transactions, clients, employees, subscriptions } = data;
  const toCreate: Omit<Transaction, 'id'>[] = [];

  for (const client of clients) {
    if (client.contractStatus !== 'Ativo') continue;
    const description = `Mensalidade - ${client.name}`;
    if (alreadyScheduled(transactions, description, monthKey)) continue;
    toCreate.push({
      description,
      amount: client.monthlyFee,
      type: TransactionType.INCOME,
      category: Category.CLIENT_PAYMENT,
      date: dateInMonth(monthKey, client.dueDay),
      status: TransactionStatus.PENDING,
      clientId: client.id,
      paymentMethod: 'PIX',
    });
  }

  for (const emp of employees) {
    const description = `Salário - ${emp.name}`;
    if (alreadyScheduled(transactions, description, monthKey)) continue;
    toCreate.push({
      description,
      amount: emp.salary,
      type: TransactionType.EXPENSE,
      category: Category.SALARY,
      date: dateInMonth(monthKey, emp.paymentDay),
      status: TransactionStatus.PENDING,
      paymentMethod: 'PIX',
    });
  }

  for (const sub of subscriptions) {
    if (!sub.active) continue;
    const description = `Assinatura - ${sub.name}`;
    if (alreadyScheduled(transactions, description, monthKey)) continue;
    toCreate.push({
      description,
      amount: sub.cost,
      type: TransactionType.EXPENSE,
      category: Category.TOOLS,
      date: dateInMonth(monthKey, sub.renewalDay),
      status: TransactionStatus.PENDING,
      paymentMethod: sub.paymentMethod,
    });
  }

  return toCreate;
}
