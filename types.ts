
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
  bankAccountId?: string;
  paymentMethod: PaymentMethod;
  receiptUrl?: string;
}

export interface BankAccount {
  id: string;
  name: string;
  institution: string;
  initialBalance: number;
  isDefault: boolean;
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
  createdAt?: string;
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

export type MessageChannel = 'whatsapp' | 'email';

export type BillingStage = 'pre_due' | 'on_due' | 'overdue' | 'custom';

export interface MessageTemplate {
  id: string;
  name: string;
  channel: MessageChannel;
  stage: BillingStage;
  subject?: string;
  body: string;
}

export interface TemplateContext {
  contactPerson: string;
  clientName: string;
  activePlan: string;
  amount: string;
  dueDay: string;
  companyName: string;
}

export interface CompanySettings {
  name: string;
  cnpj: string;
  logoUrl?: string;
  email?: string;
  phone?: string;
  address?: string;
  plans?: string[];
  messageTemplates?: MessageTemplate[];
}