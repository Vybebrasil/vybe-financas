import { Subscription, Transaction, TransactionStatus, TransactionType } from '../../types';
import {
  dateInMonth,
  getCurrentMonthKey,
  subscriptionDescriptionFor,
  todayIsoDate,
} from './recurringLogic';
import { getTransactionFilterDate } from './transactionDates';

export type SubscriptionBillingStatus = 'paid' | 'pending' | 'overdue' | 'no_charge';

export interface SubscriptionBillingSnapshot {
  subscription: Subscription;
  status: SubscriptionBillingStatus;
  monthKey: string;
  dueDate: string;
  amount: number;
  daysOverdue: number;
  transactionId?: string;
}

const matchesSubscription = (sub: Subscription, t: Transaction): boolean => {
  if (t.type !== TransactionType.EXPENSE) return false;
  const name = sub.name.trim().toLowerCase();
  if (!name) return false;
  const description = t.description.toLowerCase();
  return (
    description.includes(subscriptionDescriptionFor(sub.name).toLowerCase()) ||
    description.includes(name)
  );
};

export function getSubscriptionBillingSnapshot(
  subscription: Subscription,
  transactions: Transaction[],
  monthKey = getCurrentMonthKey(),
  today = todayIsoDate(),
): SubscriptionBillingSnapshot {
  const dueDate = dateInMonth(monthKey, subscription.renewalDay);
  const monthTx = transactions.filter(
    (t) => matchesSubscription(subscription, t) && getTransactionFilterDate(t).startsWith(monthKey),
  );
  const paidTx = monthTx.find((t) => t.status === TransactionStatus.PAID);
  const pendingTx = monthTx.find((t) => t.status === TransactionStatus.PENDING);

  let status: SubscriptionBillingStatus = 'no_charge';
  let daysOverdue = 0;

  // Pendente tem prioridade: mesmo pago parcialmente, o resto mantém a assinatura em aberto.
  if (pendingTx) {
    status = today > dueDate ? 'overdue' : 'pending';
    if (status === 'overdue') {
      daysOverdue = Math.floor(
        (new Date(today).getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24),
      );
    }
  } else if (paidTx) {
    status = 'paid';
  } else if (subscription.active) {
    // Assinatura ativa sem lançamento no mês: considerar em aberto.
    status = today > dueDate ? 'overdue' : 'pending';
    if (status === 'overdue') {
      daysOverdue = Math.floor(
        (new Date(today).getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24),
      );
    }
  }

  return {
    subscription,
    status,
    monthKey,
    dueDate,
    amount: subscription.cost,
    daysOverdue,
    transactionId: pendingTx?.id ?? paidTx?.id,
  };
}

/**
 * Soma dos lançamentos PENDENTES da assinatura em meses anteriores ao mês atual
 * (pagamentos recorrentes em atraso, incluindo restos de baixa parcial).
 */
export function getSubscriptionPastDueTotal(
  subscription: Subscription,
  transactions: Transaction[],
  currentMonthKey = getCurrentMonthKey(),
): number {
  return transactions
    .filter(
      (t) =>
        matchesSubscription(subscription, t) &&
        t.status === TransactionStatus.PENDING &&
        getTransactionFilterDate(t).slice(0, 7) < currentMonthKey,
    )
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getSubscriptionMonthPaymentBadge(snapshot: SubscriptionBillingSnapshot): {
  label: 'Pago' | 'Pendente';
  title: string;
  className: string;
} | null {
  if (!snapshot.subscription.active) return null;

  if (snapshot.status === 'paid') {
    return {
      label: 'Pago',
      title: 'Assinatura do mês quitada',
      className: 'bg-vybe-green/10 text-vybe-green',
    };
  }

  if (snapshot.status === 'pending' || snapshot.status === 'overdue') {
    const title =
      snapshot.status === 'overdue'
        ? `Assinatura em atraso (${snapshot.daysOverdue} dia(s))`
        : 'Assinatura pendente neste mês';

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

export function getSubscriptionPendingForMonth(
  subscription: Subscription,
  transactions: Transaction[],
  monthKey = getCurrentMonthKey(),
): Transaction | undefined {
  return getSubscriptionTransactions(subscription, transactions).find(
    (t) =>
      t.status === TransactionStatus.PENDING &&
      getTransactionFilterDate(t).startsWith(monthKey),
  );
}

export function getSubscriptionTransactions(
  subscription: Subscription,
  transactions: Transaction[],
): Transaction[] {
  return transactions
    .filter((t) => matchesSubscription(subscription, t))
    .sort((a, b) => getTransactionFilterDate(b).localeCompare(getTransactionFilterDate(a)));
}

export interface SubscriptionHistoryStats {
  totalPaid: number;
  paidThisMonth: number;
  monthPending: number;
  pastDue: number;
  totalPending: number;
  transactionCount: number;
}

export function getSubscriptionHistoryStats(
  subscription: Subscription,
  transactions: Transaction[],
  monthKey = getCurrentMonthKey(),
): SubscriptionHistoryStats {
  const subTransactions = getSubscriptionTransactions(subscription, transactions);

  const totalPaid = subTransactions
    .filter((t) => t.status === TransactionStatus.PAID)
    .reduce((sum, t) => sum + t.amount, 0);

  const paidThisMonth = subTransactions
    .filter(
      (t) =>
        t.status === TransactionStatus.PAID &&
        getTransactionFilterDate(t).startsWith(monthKey),
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const pendingTxThisMonth = subTransactions
    .filter(
      (t) =>
        t.status === TransactionStatus.PENDING &&
        getTransactionFilterDate(t).startsWith(monthKey),
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const pastDue = getSubscriptionPastDueTotal(subscription, transactions, monthKey);
  const snapshot = getSubscriptionBillingSnapshot(subscription, transactions, monthKey);

  const monthPending =
    pendingTxThisMonth > 0
      ? pendingTxThisMonth
      : snapshot.status === 'paid'
        ? 0
        : Math.max(subscription.cost - paidThisMonth, 0);

  return {
    totalPaid,
    paidThisMonth,
    monthPending,
    pastDue,
    totalPending: pastDue + monthPending,
    transactionCount: subTransactions.length,
  };
}

/** Ordena assinaturas pelo dia de pagamento/renovação (1–31), depois pelo nome. */
export function sortSubscriptionsByPaymentDay(subscriptions: Subscription[]): Subscription[] {
  return [...subscriptions].sort((a, b) => {
    const dayA = Number(a.renewalDay) || 31;
    const dayB = Number(b.renewalDay) || 31;
    if (dayA !== dayB) return dayA - dayB;
    return a.name.localeCompare(b.name, 'pt-BR');
  });
}
