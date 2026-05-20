
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum TransactionStatus {
  PAID = 'PAID',       // Pago / Recebido
  PENDING = 'PENDING', // Pendente / Agendado
}

export enum Category {
  CLIENT_PAYMENT = 'Pagamento de Cliente',
  SALARY = 'Salário/Prolabore',
  TOOLS = 'Ferramentas/Software',
  ADS = 'Tráfego Pago',
  OTHER = 'Outros',
  SUPPLIES = 'Insumos/Escritório',
}

export type PaymentMethod = 'PIX' | 'BOLETO' | 'CARTAO' | 'DINHEIRO' | 'OUTRO';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: Category;
  date: string;
  status: TransactionStatus;
  clientId?: string; // Centro de Custo / Cliente vinculado
  paymentMethod: PaymentMethod; // Novo campo
  receiptUrl?: string; // Comprovante
}

export interface DashboardSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  pendingIncome: number;
  pendingExpense: number;
  projectedBalance: number;
}

export interface Client {
  id: string;
  name: string; // Nome da Empresa
  cnpj: string;
  contactPerson: string;
  email: string;
  phone: string;
  activePlan: string;
  monthlyFee: number;
  dueDay: number;
  contractStatus: 'Ativo' | 'Pendente' | 'Cancelado';
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  salary: number;
  pixKey: string;
  paymentDay: number;
  observations?: string;
}

// PaymentMethod já foi definido acima, reutilizando para Subscription
export interface Subscription {
  id: string;
  name: string;
  cost: number;
  renewalDay: number;
  paymentMethod: PaymentMethod;
  active: boolean;
}

export type ChartPeriod = 'daily' | 'monthly' | 'yearly' | 'total';

export interface ChartDataPoint {
  label: string;
  key: string;
  income: number;
  expense: number;
  pendingIncome: number;
  pendingExpense: number;
}

export interface CompanySettings {
  name: string;
  cnpj: string;
  logoUrl?: string;
  email?: string;
  phone?: string;
  address?: string;
}