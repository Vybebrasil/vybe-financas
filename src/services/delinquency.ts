import { Client, Transaction, TransactionType, TransactionStatus } from '../../types';
import { dateInMonth, getCurrentMonthKey, todayIsoDate } from './recurringLogic';
import { isClientPaymentCategory } from './categories';

export type ClientBillingStatus =
  | 'paid'
  | 'pending'
  | 'overdue'
  | 'upcoming'
  | 'missing_launch'
  | 'no_charge';

export interface ClientBillingSnapshot {
  client: Client;
  status: ClientBillingStatus;
  monthKey: string;
  dueDate: string;
  amount: number;
  daysOverdue: number;
  transactionId?: string;
}

const matchesClientPayment = (client: Client, t: Transaction, monthKey: string): boolean => {
  if (t.type !== TransactionType.INCOME) return false;
  if (!t.date.startsWith(monthKey)) return false;
  const namePattern = `mensalidade - ${client.name}`.toLowerCase();
  return (
    t.clientId === client.id ||
    (isClientPaymentCategory(t.category) &&
      t.description.toLowerCase().includes(namePattern))
  );
};

export function getClientBillingSnapshot(
  client: Client,
  transactions: Transaction[],
  monthKey = getCurrentMonthKey(),
  today = todayIsoDate(),
): ClientBillingSnapshot {
  const dueDate = dateInMonth(monthKey, client.dueDay);
  const monthTx = transactions.filter((t) => matchesClientPayment(client, t, monthKey));
  const paidTx = monthTx.find((t) => t.status === TransactionStatus.PAID);
  const pendingTx = monthTx.find((t) => t.status === TransactionStatus.PENDING);

  let status: ClientBillingStatus = 'no_charge';
  let daysOverdue = 0;

  if (paidTx) {
    status = 'paid';
  } else if (pendingTx) {
    status = today > dueDate ? 'overdue' : 'pending';
    if (status === 'overdue') {
      daysOverdue = Math.floor(
        (new Date(today).getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24),
      );
    }
  } else if (client.contractStatus === 'Ativo') {
    // Sem lançamento no mês: não entra na régua (overdue/pending exigem transação PENDING).
    if (today > dueDate) {
      status = 'missing_launch';
    } else {
      status = 'upcoming';
    }
  }

  return {
    client,
    status,
    monthKey,
    dueDate,
    amount: client.monthlyFee,
    daysOverdue,
    transactionId: pendingTx?.id ?? paidTx?.id,
  };
}

export function getClientMonthPaymentBadge(snapshot: ClientBillingSnapshot): {
  label: 'Pago' | 'Pendente';
  title: string;
  className: string;
} | null {
  if (snapshot.client.contractStatus !== 'Ativo') return null;

  if (snapshot.status === 'paid') {
    return {
      label: 'Pago',
      title: 'Mensalidade do mês quitada',
      className: 'bg-vybe-green/10 text-vybe-green',
    };
  }

  if (
    snapshot.status === 'pending' ||
    snapshot.status === 'overdue' ||
    snapshot.status === 'upcoming' ||
    snapshot.status === 'missing_launch'
  ) {
    const title =
      snapshot.status === 'overdue'
        ? `Mensalidade em atraso (${snapshot.daysOverdue} dia(s))`
        : snapshot.status === 'missing_launch'
          ? 'Sem lançamento de mensalidade neste mês'
          : 'Mensalidade pendente neste mês';

    return {
      label: 'Pendente',
      title,
      className:
        snapshot.status === 'overdue'
          ? 'bg-red-500/10 text-red-400'
          : 'bg-yellow-500/10 text-yellow-500',
    };
  }

  return null;
}

export function getDelinquencyReport(
  clients: Client[],
  transactions: Transaction[],
  monthKey = getCurrentMonthKey(),
): {
  overdue: ClientBillingSnapshot[];
  pending: ClientBillingSnapshot[];
  totalOverdueAmount: number;
  totalPendingAmount: number;
} {
  const active = clients.filter((c) => c.contractStatus === 'Ativo');
  const snapshots = active.map((c) => getClientBillingSnapshot(c, transactions, monthKey));

  const overdue = snapshots
    .filter((s) => s.status === 'overdue')
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  const pending = snapshots
    .filter((s) => s.status === 'pending')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return {
    overdue,
    pending,
    totalOverdueAmount: overdue.reduce((sum, s) => sum + s.amount, 0),
    totalPendingAmount: pending.reduce((sum, s) => sum + s.amount, 0),
  };
}
