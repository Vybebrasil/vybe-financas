import { Category, Transaction, TransactionType, TransactionStatus, Client, Employee, Subscription, MessageTemplate } from './types';
import { generateId } from './utils';

// Função auxiliar para gerar datas dinâmicas (Ex: 0 = mês atual, 1 = mês passado)
const getRelativeDate = (monthsAgo: number, day: number = 15): string => {
  const date = new Date();
  date.setMonth(date.getMonth() - monthsAgo);
  date.setDate(day);
  return date.toISOString().split('T')[0];
};

export const MOCK_TRANSACTIONS: Transaction[] = [];

export const MOCK_CLIENTS: Client[] = [];

export const MOCK_EMPLOYEES: Employee[] = [];

export const MOCK_SUBSCRIPTIONS: Subscription[] = [];

export const DEFAULT_SERVICE_PLANS = ['Vybe OS'];

export const DEFAULT_MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'wa-pre-due',
    name: 'Lembrete — WhatsApp',
    channel: 'whatsapp',
    stage: 'pre_due',
    body: `Olá {{contactPerson}}, tudo bem?

Aqui é da {{companyName}}. Lembramos que a fatura do serviço *{{activePlan}}* vence no dia *{{dueDay}}*.

💰 *Valor:* {{amount}}

Qualquer dúvida, estamos à disposição!`,
  },
  {
    id: 'wa-on-due',
    name: 'Vencimento hoje — WhatsApp',
    channel: 'whatsapp',
    stage: 'on_due',
    body: `Olá {{contactPerson}}!

Hoje é o vencimento da fatura referente a *{{activePlan}}* ({{clientName}}).

💰 *Valor:* {{amount}}
📅 *Vencimento:* Dia {{dueDay}}

Por favor, confirme o pagamento quando possível.`,
  },
  {
    id: 'wa-overdue',
    name: 'Cobrança em atraso — WhatsApp',
    channel: 'whatsapp',
    stage: 'overdue',
    body: `Olá {{contactPerson}}.

Identificamos que a fatura de *{{activePlan}}* ({{clientName}}) com vencimento dia {{dueDay}} ainda não foi quitada.

💰 *Valor:* {{amount}}

Podemos ajudar com alguma pendência?`,
  },
  {
    id: 'email-pre-due',
    name: 'Lembrete — E-mail',
    channel: 'email',
    stage: 'pre_due',
    subject: 'Lembrete de fatura — {{clientName}}',
    body: `Olá {{contactPerson}},

Somos da {{companyName}}. Este é um lembrete de que a fatura referente ao serviço {{activePlan}} vence no dia {{dueDay}}.

Valor: {{amount}}

Atenciosamente,
{{companyName}}`,
  },
  {
    id: 'email-on-due',
    name: 'Vencimento hoje — E-mail',
    channel: 'email',
    stage: 'on_due',
    subject: 'Fatura com vencimento hoje — {{clientName}}',
    body: `Olá {{contactPerson}},

A fatura de {{activePlan}} ({{clientName}}) vence hoje (dia {{dueDay}}).

Valor: {{amount}}

Por favor, confirme o pagamento ou entre em contato em caso de dúvidas.

{{companyName}}`,
  },
  {
    id: 'email-overdue',
    name: 'Cobrança em atraso — E-mail',
    channel: 'email',
    stage: 'overdue',
    subject: 'Fatura em aberto — {{clientName}}',
    body: `Olá {{contactPerson}},

Identificamos que a fatura de {{activePlan}} ({{clientName}}), com vencimento no dia {{dueDay}}, ainda não consta como paga.

Valor em aberto: {{amount}}

Caso já tenha efetuado o pagamento, desconsidere este e-mail.

Atenciosamente,
{{companyName}}`,
  },
];

export const createMessageTemplate = (
  channel: MessageTemplate['channel'],
  stage: MessageTemplate['stage'] = 'custom',
): MessageTemplate => ({
  id: generateId(),
  name: channel === 'whatsapp' ? 'Novo template WhatsApp' : 'Novo template E-mail',
  channel,
  stage,
  subject: channel === 'email' ? 'Assunto da cobrança' : undefined,
  body: 'Olá {{contactPerson}},\n\n',
});

export const STORAGE_KEY = 'vybe-financas-data';
export const STORAGE_KEY_CLIENTS = 'vybe-financas-clients';
export const STORAGE_KEY_EMPLOYEES = 'vybe-financas-employees';
export const STORAGE_KEY_SUBS = 'vybe-financas-subs';