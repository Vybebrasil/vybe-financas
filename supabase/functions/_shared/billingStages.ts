// Lógica compartilhada de estágios da régua (Edge Functions)

export type BillingStage = 'pre_due' | 'on_due' | 'overdue' | 'custom';

export type ClientBillingStatus =
  | 'paid'
  | 'pending'
  | 'overdue'
  | 'upcoming'
  | 'missing_launch'
  | 'no_charge';

export interface ClientRow {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  contact_person?: string;
  user_id: string;
  active_plan?: string;
  monthly_fee?: number;
  due_day?: number;
  cnpj?: string;
  contract_status?: string;
}

export interface TransactionRow {
  id: string;
  client_id?: string;
  type: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  status: string;
}

export const todayIsoDate = (): string => {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

export const getCurrentMonthKey = (date = new Date()): string => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

export const dateInMonth = (monthKey: string, day: number): string => {
  const [y, m] = monthKey.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const d = Math.min(Math.max(day, 1), lastDay);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

const daysBetween = (isoA: string, isoB: string): number => {
  const a = new Date(`${isoA}T12:00:00`).getTime();
  const b = new Date(`${isoB}T12:00:00`).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
};

const matchesClientPayment = (
  client: ClientRow,
  t: TransactionRow,
  monthKey: string,
): boolean => {
  if (t.type !== 'INCOME') return false;
  if (!t.date.startsWith(monthKey)) return false;
  const namePattern = `mensalidade - ${client.name}`.toLowerCase();
  return (
    t.client_id === client.id ||
    (t.category === 'Pagamento de Cliente' &&
      t.description.toLowerCase().includes(namePattern))
  );
};

export function getClientBillingStatus(
  client: ClientRow,
  transactions: TransactionRow[],
  monthKey: string,
  today: string,
): { status: ClientBillingStatus; dueDate: string } {
  const dueDate = dateInMonth(monthKey, Number(client.due_day) || 1);
  const monthTx = transactions.filter((t) => matchesClientPayment(client, t, monthKey));
  const paidTx = monthTx.find((t) => t.status === 'PAID');
  const pendingTx = monthTx.find((t) => t.status === 'PENDING');

  if (paidTx) return { status: 'paid', dueDate };
  if (pendingTx) {
    return { status: today > dueDate ? 'overdue' : 'pending', dueDate };
  }
  if (client.contract_status === 'Ativo') {
    return { status: today > dueDate ? 'missing_launch' : 'upcoming', dueDate };
  }
  return { status: 'no_charge', dueDate };
}

export function resolveBillingStage(
  status: ClientBillingStatus,
  dueDate: string,
  today: string,
  preDueDays: number,
): BillingStage | null {
  if (status === 'paid' || status === 'no_charge' || status === 'missing_launch') return null;
  if (status === 'overdue') return 'overdue';
  const daysUntilDue = daysBetween(today, dueDate);
  if (daysUntilDue === 0 && (status === 'pending' || status === 'upcoming')) return 'on_due';
  if (daysUntilDue > 0 && daysUntilDue <= preDueDays && (status === 'pending' || status === 'upcoming')) {
    return 'pre_due';
  }
  return null;
}

export function renderTemplate(
  body: string,
  vars: Record<string, string>,
): string {
  let out = body;
  for (const [key, val] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
  }
  return out;
}

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10) return '';
  if (digits.startsWith('55')) return digits;
  return `55${digits}`;
}
