
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
  SUPPLIES = 'Insumos/Escritório', // legado — preferir VARIABLE_EXPENSE
  VARIABLE_EXPENSE = 'Gastos Variáveis',
  FIXED_EXPENSE = 'Gastos Fixos',
}

export type PaymentMethod = 'PIX' | 'BOLETO' | 'CARTAO' | 'DINHEIRO' | 'OUTRO';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  /** Data real do pagamento/recebimento (preenchida ao dar baixa em pendente). */
  paidDate?: string;
  status: TransactionStatus;
  clientId?: string; // Centro de Custo / Cliente vinculado
  employeeId?: string; // Colaborador vinculado (despesas)
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

export type ContractStatus = 'Ativo' | 'Pendente' | 'Encerrado' | 'Cancelado';

/** Campos substituíveis no modelo DOCX Vybe OS. */
export interface ContractParameters {
  clienteLogradouro?: string;
  clienteNumero?: string;
  clienteBairro?: string;
  clienteCidade?: string;
  clienteUf?: string;
  clienteCep?: string;
  clienteRepresentante?: string;
  clienteCpf?: string;
  prazoMeses?: number;
  cidadeForo?: string;
  testemunha1Nome?: string;
  testemunha1Cpf?: string;
  testemunha2Nome?: string;
  testemunha2Cpf?: string;
}

export interface Contract {
  id: string;
  clientId: string;
  title: string;
  amount: number;
  status: ContractStatus;
  startDate: string;
  /** Data de assinatura; com prazo em meses define o fim da vigência (endDate). */
  signedDate?: string;
  endDate?: string;
  dueDay: number;
  notes?: string;
  templateKey?: string;
  parameters?: ContractParameters;
  pdfUrl?: string;
  pdfFileName?: string;
  createdAt?: string;
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
  /** Bônus do mês (somado ao salário no cálculo "A pagar") */
  bonus?: number;
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
  pixKey?: string;
  paymentLink?: string;
}

export interface CategoryConfig {
  id: string;
  label: string;
  transactionType: TransactionType;
  /** Categorias do sistema — usadas em recorrência e régua */
  locked?: boolean;
}

export type WorkspaceRole = 'owner' | 'admin' | 'member';

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId?: string;
  email: string;
  role: WorkspaceRole;
  status: 'pending' | 'active';
  invitedAt?: string;
  joinedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  workspaceId: string;
  actorUserId?: string;
  actorEmail?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/** Integração WhatsApp via n8n → Evolution API */
export interface WhatsAppIntegrationSettings {
  /** Quando true, o app envia pela Edge Function (n8n) em vez de abrir wa.me */
  enabled: boolean;
  /** URL do webhook n8n (opcional se N8N_WHATSAPP_WEBHOOK_URL estiver no Supabase) */
  n8nWebhookUrl?: string;
}

/** Régua de cobrança automática */
export interface BillingAutomationSettings {
  autoEnabled: boolean;
  preDueDays: number;
  whatsappChannel: boolean;
  emailChannel: boolean;
  dispatchHourLocal?: number;
}

/** Webhook de pagamento (Asaas, Mercado Pago, genérico) */
export interface PaymentProviderSettings {
  enabled: boolean;
  provider: 'asaas' | 'mercadopago' | 'generic';
  webhookSecret?: string;
  /** E-mail remetente para régua (Resend) */
  emailFrom?: string;
}

export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';

/** Dados de pagamento usados na régua e no atendimento IA */
export interface PaymentIntegrationSettings {
  pixKey?: string;
  pixKeyType?: PixKeyType;
  paymentLink?: string;
  /** Texto livre (ex.: banco, titular, horário) */
  instructions?: string;
}

export interface CompanyIntegrations {
  whatsapp?: WhatsAppIntegrationSettings;
  payment?: PaymentIntegrationSettings;
  billing?: BillingAutomationSettings;
  paymentProvider?: PaymentProviderSettings;
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
  categories?: CategoryConfig[];
  integrations?: CompanyIntegrations;
}