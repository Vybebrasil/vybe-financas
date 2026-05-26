/** Contexto Vybe para WhatsApp / n8n / IA (Deno) */

export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';

export interface PaymentSettingsDb {
  pix_key?: string;
  pix_key_type?: PixKeyType;
  payment_link?: string;
  instructions?: string;
}

export interface IntegrationsDb {
  whatsapp?: { enabled?: boolean; n8n_webhook_url?: string };
  payment?: PaymentSettingsDb;
}

export interface ClientRow {
  id: string;
  user_id: string;
  name: string;
  cnpj: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  active_plan: string | null;
  monthly_fee: number | null;
  due_day: number | null;
  contract_status: string | null;
}

export interface ContractRow {
  id: string;
  title: string;
  amount: number;
  status: string;
  start_date: string;
  end_date: string | null;
  due_day: number;
  notes: string | null;
  template_key: string | null;
  pdf_url: string | null;
  pdf_file_name: string | null;
}

export interface TransactionRow {
  id: string;
  client_id: string | null;
  type: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  status: string;
}

export interface MessageTemplateDb {
  id?: string;
  name?: string;
  channel?: string;
  stage?: string;
  subject?: string;
  body?: string;
}

export interface CompanySettingsRow {
  name: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  integrations?: IntegrationsDb | null;
  service_plans?: unknown;
  message_templates?: unknown;
}

export type BillingStatus =
  | 'paid'
  | 'pending'
  | 'overdue'
  | 'upcoming'
  | 'missing_launch'
  | 'no_charge';

export const BILLING_STATUS_PT: Record<BillingStatus, string> = {
  paid: 'Pago / quitado no mes',
  pending: 'Pendente (ainda no prazo)',
  overdue: 'Em atraso',
  upcoming: 'Vencimento futuro neste mes',
  missing_launch: 'Sem lancamento de cobranca no mes',
  no_charge: 'Sem cobranca ativa',
};

export const STAGE_LABELS_PT: Record<string, string> = {
  pre_due: 'Lembrete antes do vencimento',
  on_due: 'Dia do vencimento',
  overdue: 'Cobranca em atraso',
  custom: 'Mensagem personalizada',
};

export interface VariableCatalogItem {
  chave: string;
  label: string;
  grupo: string;
  valor_atual: string;
}

export interface WhatsAppVybeContext {
  encontrado: boolean;
  telefone: string;
  identificacao?: {
    metodo: 'telefone' | 'cnpj' | 'nome' | 'nenhum';
    confianca: 'alta' | 'media' | 'baixa';
  };
  cliente?: {
    id: string;
    nome: string;
    contato: string;
    cnpj: string;
    email: string;
    telefone: string;
    plano: string;
    mensalidade: string;
    dia_vencimento: number;
    status_contrato: string;
    cliente_desde?: string;
  };
  empresa?: {
    nome: string;
    cnpj: string;
    email: string;
    telefone: string;
    endereco: string;
  };
  pagamento?: {
    chave_pix: string;
    tipo_pix: string;
    link_pagamento: string;
    instrucoes: string;
  };
  cobranca?: {
    status: BillingStatus;
    status_label: string;
    mes_referencia: string;
    data_vencimento: string;
    valor: string;
    dias_atraso: number;
  };
  contratos?: Array<{
    titulo: string;
    valor: string;
    status: string;
    inicio: string;
    fim: string;
    dia_vencimento: number;
    tem_pdf: boolean;
    observacoes: string;
  }>;
  historico_mensal?: Array<{
    mes: string;
    status: BillingStatus;
    status_label: string;
    valor: string;
    vencimento: string;
    dias_atraso: number;
  }>;
  transacoes_recentes?: Array<{
    data: string;
    descricao: string;
    valor: string;
    status: string;
    tipo: string;
  }>;
  templates_whatsapp?: Array<{
    nome: string;
    estagio: string;
    estagio_label: string;
    texto_exemplo: string;
  }>;
  planos_disponiveis?: string[];
  variaveis: Record<string, string>;
  catalogo_variaveis: VariableCatalogItem[];
  guia_ia: string;
}

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10) return '';
  if (digits.startsWith('55')) return digits;
  return `55${digits}`;
}

export function normalizeCnpjCpf(raw: string): string {
  return raw.replace(/\D/g, '');
}

export function formatValorBr(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getCurrentMonthKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return getCurrentMonthKey(d);
}

export function dateInMonth(monthKey: string, day: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  const d = Math.min(Math.max(1, day), last);
  return `${monthKey}-${String(d).padStart(2, '0')}`;
}

function matchesClientPayment(
  client: ClientRow,
  t: TransactionRow,
  monthKey: string,
): boolean {
  if (t.type !== 'INCOME') return false;
  if (!t.date.startsWith(monthKey)) return false;
  const namePattern = `mensalidade - ${client.name}`.toLowerCase();
  return (
    t.client_id === client.id ||
    (t.category === 'Pagamento de Cliente' &&
      t.description.toLowerCase().includes(namePattern))
  );
}

export function getBillingSnapshot(
  client: ClientRow,
  transactions: TransactionRow[],
  monthKey = getCurrentMonthKey(),
  today = new Date().toISOString().slice(0, 10),
): {
  status: BillingStatus;
  dueDate: string;
  amount: number;
  daysOverdue: number;
} {
  const dueDay = Number(client.due_day) || 1;
  const dueDate = dateInMonth(monthKey, dueDay);
  const monthTx = transactions.filter((t) =>
    matchesClientPayment(client, t, monthKey)
  );
  const paidTx = monthTx.find((t) => t.status === 'PAID');
  const pendingTx = monthTx.find((t) => t.status === 'PENDING');

  let status: BillingStatus = 'no_charge';
  let daysOverdue = 0;

  if (paidTx) {
    status = 'paid';
  } else if (pendingTx) {
    status = today > dueDate ? 'overdue' : 'pending';
    if (status === 'overdue') {
      daysOverdue = Math.floor(
        (new Date(today).getTime() - new Date(dueDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );
    }
  } else if (client.contract_status === 'Ativo') {
    status = today > dueDate ? 'missing_launch' : 'upcoming';
  }

  return {
    status,
    dueDate,
    amount: Number(client.monthly_fee) || 0,
    daysOverdue,
  };
}

export function paymentFromIntegrations(
  integrations: IntegrationsDb | null | undefined,
): PaymentSettingsDb {
  return integrations?.payment ?? {};
}

export function findClientByPhone(
  clients: ClientRow[],
  telefone: string,
): ClientRow | null {
  return (
    clients.find((c) => normalizePhone(String(c.phone ?? '')) === telefone) ??
    null
  );
}

/** Busca por CNPJ/CPF ou trecho do nome no texto da mensagem */
export function findClientByTextHint(
  clients: ClientRow[],
  texto: string,
): { client: ClientRow; metodo: 'cnpj' | 'nome'; confianca: 'alta' | 'media' } | null {
  const t = texto.toLowerCase().trim();
  if (!t) return null;

  const digits = normalizeCnpjCpf(texto);
  if (digits.length === 14 || digits.length === 11) {
    const byDoc = clients.find((c) => normalizeCnpjCpf(c.cnpj ?? '') === digits);
    if (byDoc) return { client: byDoc, metodo: 'cnpj', confianca: 'alta' };
  }

  const words = t.split(/\s+/).filter((w) => w.length >= 3);
  if (words.length === 0) return null;

  for (const c of clients) {
    const name = (c.name ?? '').toLowerCase();
    const contact = (c.contact_person ?? '').toLowerCase();
    const hitName = words.some((w) => name.includes(w));
    const hitContact = words.some((w) => contact.includes(w));
    if (hitName || hitContact) {
      return { client: c, metodo: 'nome', confianca: words.length >= 2 ? 'media' : 'media' };
    }
  }
  return null;
}

function renderTemplateBody(
  body: string,
  vars: Record<string, string>,
): string {
  return body
    .replace(/\{\{contactPerson\}\}/g, vars.contactPerson ?? '')
    .replace(/\{\{clientName\}\}/g, vars.clientName ?? '')
    .replace(/\{\{activePlan\}\}/g, vars.activePlan ?? '')
    .replace(/\{\{amount\}\}/g, vars.amount ?? '')
    .replace(/\{\{dueDay\}\}/g, vars.dueDay ?? '')
    .replace(/\{\{companyName\}\}/g, vars.companyName ?? '')
    .replace(/\{\{pixKey\}\}/g, vars.pixKey ?? '')
    .replace(/\{\{paymentLink\}\}/g, vars.paymentLink ?? '');
}

export function buildVariableMap(
  client: ClientRow,
  settings: CompanySettingsRow | null,
  payment: PaymentSettingsDb,
  billing: ReturnType<typeof getBillingSnapshot>,
  monthKey: string,
): Record<string, string> {
  const companyName = settings?.name?.trim() || 'Vybe Brasil';
  const mensalidade = formatValorBr(Number(client.monthly_fee) || 0);
  const contato = String(client.contact_person || client.name || 'Cliente');

  return {
    contactPerson: contato,
    clientName: client.name || '',
    activePlan: client.active_plan || '',
    amount: mensalidade,
    dueDay: String(client.due_day ?? 1),
    companyName,
    pixKey: payment.pix_key || '',
    paymentLink: payment.payment_link || '',
    empresa_nome: companyName,
    empresa_cnpj: settings?.cnpj || '',
    empresa_email: settings?.email || '',
    empresa_telefone: settings?.phone || '',
    empresa_endereco: settings?.address || '',
    cliente_cnpj: client.cnpj || '',
    cliente_email: client.email || '',
    cliente_telefone: normalizePhone(String(client.phone || '')),
    status_contrato: client.contract_status || '',
    status_cobranca: billing.status,
    status_cobranca_label: BILLING_STATUS_PT[billing.status],
    mes_referencia: monthKey,
    data_vencimento: billing.dueDate,
    dias_atraso: String(billing.daysOverdue),
    valor_mensalidade: mensalidade,
    instrucoes_pagamento: payment.instructions || '',
    tipo_pix: payment.pix_key_type || '',
  };
}

export function buildVariableCatalog(
  vars: Record<string, string>,
): VariableCatalogItem[] {
  const defs: Array<{ chave: string; label: string; grupo: string }> = [
    { chave: 'contactPerson', label: 'Nome do contato', grupo: 'Cliente' },
    { chave: 'clientName', label: 'Razao social / nome empresa cliente', grupo: 'Cliente' },
    { chave: 'cliente_cnpj', label: 'CNPJ do cliente', grupo: 'Cliente' },
    { chave: 'cliente_email', label: 'E-mail do cliente', grupo: 'Cliente' },
    { chave: 'cliente_telefone', label: 'WhatsApp do cliente', grupo: 'Cliente' },
    { chave: 'activePlan', label: 'Plano ativo', grupo: 'Cliente' },
    { chave: 'amount', label: 'Valor mensalidade formatado', grupo: 'Cobranca' },
    { chave: 'dueDay', label: 'Dia de vencimento (numero)', grupo: 'Cobranca' },
    { chave: 'data_vencimento', label: 'Data de vencimento no mes', grupo: 'Cobranca' },
    { chave: 'status_cobranca', label: 'Codigo status cobranca', grupo: 'Cobranca' },
    { chave: 'status_cobranca_label', label: 'Status cobranca em portugues', grupo: 'Cobranca' },
    { chave: 'dias_atraso', label: 'Dias em atraso', grupo: 'Cobranca' },
    { chave: 'mes_referencia', label: 'Mes de referencia (AAAA-MM)', grupo: 'Cobranca' },
    { chave: 'companyName', label: 'Nome da sua agencia', grupo: 'Empresa' },
    { chave: 'empresa_cnpj', label: 'CNPJ da agencia', grupo: 'Empresa' },
    { chave: 'empresa_email', label: 'E-mail da agencia', grupo: 'Empresa' },
    { chave: 'empresa_telefone', label: 'Telefone da agencia', grupo: 'Empresa' },
    { chave: 'empresa_endereco', label: 'Endereco da agencia', grupo: 'Empresa' },
    { chave: 'pixKey', label: 'Chave PIX', grupo: 'Pagamento' },
    { chave: 'tipo_pix', label: 'Tipo da chave PIX', grupo: 'Pagamento' },
    { chave: 'paymentLink', label: 'Link de pagamento', grupo: 'Pagamento' },
    { chave: 'instrucoes_pagamento', label: 'Instrucoes de pagamento', grupo: 'Pagamento' },
    { chave: 'status_contrato', label: 'Status do contrato comercial', grupo: 'Contrato' },
  ];

  return defs.map((d) => ({
    ...d,
    valor_atual: vars[d.chave] ?? '',
  }));
}

export const GUIA_IA_VYBE = `Voce atende no WhatsApp com dados do sistema Vybe Financas.
Secoes do JSON:
- catalogo_variaveis: TODAS as variaveis do sistema (chave, label, grupo, valor_atual)
- variaveis: mesmo conteudo em mapa chave-valor
- cliente, empresa, pagamento, cobranca: dados principais
- contratos, historico_mensal, transacoes_recentes, templates_whatsapp, planos_disponiveis

Sinonimos comuns -> chave no catalogo:
- pix / chave pix -> pixKey, pagamento.chave_pix
- link / boleto / pagar -> paymentLink
- vencimento / quando pago -> data_vencimento, dueDay, cobranca
- atraso / multa -> dias_atraso, status_cobranca_label
- plano / mensalidade -> activePlan, amount
- contrato / pdf -> contratos
- agencia / empresa -> companyName, empresa_*
- cnpj / cpf -> cliente_cnpj ou empresa_cnpj conforme contexto

Regras:
1) Para QUALQUER pergunta sobre dados do sistema, localize a chave em catalogo_variaveis e cite valor_atual
2) Se valor_atual vazio, diga que nao esta cadastrado (nao invente)
3) Responda SOMENTE com dados do JSON
4) Se encontrado=false, use dados de empresa/pagamento e peca CNPJ ou nome para identificar o cliente
5) Ate 550 caracteres, portugues BR, cordial`;

export interface BuildContextInput {
  telefone: string;
  client: ClientRow | null;
  settings: CompanySettingsRow | null;
  transactions: TransactionRow[];
  contracts?: ContractRow[];
  textoMensagem?: string;
  identificacao?: WhatsAppVybeContext['identificacao'];
}

export function buildWhatsAppVybeContext(input: BuildContextInput): WhatsAppVybeContext {
  const {
    telefone,
    client,
    settings,
    transactions,
    contracts = [],
    identificacao,
  } = input;

  const payment = paymentFromIntegrations(settings?.integrations);
  const companyName = settings?.name?.trim() || 'Vybe Brasil';
  const plans = Array.isArray(settings?.service_plans)
    ? (settings!.service_plans as string[])
    : [];

  const templatesRaw = Array.isArray(settings?.message_templates)
    ? (settings!.message_templates as MessageTemplateDb[])
    : [];

  const base: WhatsAppVybeContext = {
    encontrado: Boolean(client),
    telefone,
    identificacao: identificacao ?? {
      metodo: client ? 'telefone' : 'nenhum',
      confianca: client ? 'alta' : 'baixa',
    },
    empresa: settings
      ? {
          nome: companyName,
          cnpj: settings.cnpj || '',
          email: settings.email || '',
          telefone: settings.phone || '',
          endereco: settings.address || '',
        }
      : { nome: companyName, cnpj: '', email: '', telefone: '', endereco: '' },
    pagamento: {
      chave_pix: payment.pix_key || '',
      tipo_pix: payment.pix_key_type || '',
      link_pagamento: payment.payment_link || '',
      instrucoes: payment.instructions || '',
    },
    planos_disponiveis: plans,
    variaveis: {
      companyName,
      pixKey: payment.pix_key || '',
      paymentLink: payment.payment_link || '',
    },
    catalogo_variaveis: [],
    guia_ia: GUIA_IA_VYBE,
  };

  if (!client) {
    const varsSemCliente: Record<string, string> = {
      ...base.variaveis,
      empresa_nome: base.empresa?.nome || companyName,
      empresa_cnpj: base.empresa?.cnpj || '',
      empresa_email: base.empresa?.email || '',
      empresa_telefone: base.empresa?.telefone || '',
      empresa_endereco: base.empresa?.endereco || '',
      pixKey: base.pagamento?.chave_pix || '',
      tipo_pix: base.pagamento?.tipo_pix || '',
      paymentLink: base.pagamento?.link_pagamento || '',
      instrucoes_pagamento: base.pagamento?.instrucoes || '',
      companyName,
    };
    base.variaveis = varsSemCliente;
    base.catalogo_variaveis = buildVariableCatalog(varsSemCliente);
    if (templatesRaw.length) {
      base.templates_whatsapp = templatesRaw
        .filter((t) => t.channel === 'whatsapp' && t.body)
        .map((t) => ({
          nome: t.name || 'Template',
          estagio: t.stage || 'custom',
          estagio_label: STAGE_LABELS_PT[t.stage || 'custom'] || t.stage || '',
          texto_exemplo: renderTemplateBody(String(t.body), varsSemCliente).slice(0, 600),
        }));
    }
    return base;
  }

  const monthKey = getCurrentMonthKey();
  const billing = getBillingSnapshot(client, transactions, monthKey);
  const vars = buildVariableMap(client, settings, payment, billing, monthKey);
  const mensalidade = vars.amount;
  const contato = vars.contactPerson;

  const historico_mensal: WhatsAppVybeContext['historico_mensal'] = [];
  for (let i = 0; i < 6; i++) {
    const mk = shiftMonthKey(monthKey, -i);
    const snap = getBillingSnapshot(client, transactions, mk);
    historico_mensal.push({
      mes: mk,
      status: snap.status,
      status_label: BILLING_STATUS_PT[snap.status],
      valor: formatValorBr(snap.amount),
      vencimento: snap.dueDate,
      dias_atraso: snap.daysOverdue,
    });
  }

  const transacoes_recentes = transactions
    .filter((t) => t.client_id === client.id)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8)
    .map((t) => ({
      data: t.date,
      descricao: t.description,
      valor: formatValorBr(Number(t.amount) || 0),
      status: t.status === 'PAID' ? 'Pago' : t.status === 'PENDING' ? 'Pendente' : t.status,
      tipo: t.type === 'INCOME' ? 'Receita' : 'Despesa',
    }));

  const templates_whatsapp = templatesRaw
    .filter((t) => t.channel === 'whatsapp' && t.body)
    .map((t) => ({
      nome: t.name || 'Template',
      estagio: t.stage || 'custom',
      estagio_label: STAGE_LABELS_PT[t.stage || 'custom'] || t.stage || '',
      texto_exemplo: renderTemplateBody(String(t.body), vars).slice(0, 600),
    }));

  base.cliente = {
    id: client.id,
    nome: client.name || '',
    contato,
    cnpj: client.cnpj || '',
    email: client.email || '',
    telefone: normalizePhone(String(client.phone || '')),
    plano: client.active_plan || '',
    mensalidade,
    dia_vencimento: Number(client.due_day) || 1,
    status_contrato: client.contract_status || '',
    cliente_desde: '',
  };

  base.cobranca = {
    status: billing.status,
    status_label: BILLING_STATUS_PT[billing.status],
    mes_referencia: monthKey,
    data_vencimento: billing.dueDate,
    valor: mensalidade,
    dias_atraso: billing.daysOverdue,
  };

  base.contratos = contracts.map((c) => ({
    titulo: c.title,
    valor: formatValorBr(Number(c.amount) || 0),
    status: c.status,
    inicio: c.start_date,
    fim: c.end_date || '',
    dia_vencimento: c.due_day,
    tem_pdf: Boolean(c.pdf_url),
    observacoes: c.notes || '',
  }));

  base.historico_mensal = historico_mensal;
  base.transacoes_recentes = transacoes_recentes;
  base.templates_whatsapp = templates_whatsapp;
  base.variaveis = vars;
  base.catalogo_variaveis = buildVariableCatalog(vars);

  return base;
}

export interface CobrancaN8nPayload {
  telefone: string;
  valor: string;
  nome: string;
  vencimento: string;
  mensagem: string;
  id_fatura?: string;
  link_pagamento?: string;
  usar_ia?: boolean;
  empresa?: string;
  chave_pix?: string;
  tipo_pix?: string;
  plano?: string;
  status_cobranca?: string;
  cnpj_cliente?: string;
  email_cliente?: string;
  instrucoes_pagamento?: string;
  contexto?: WhatsAppVybeContext;
}

export function buildCobrancaN8nPayloadFromContext(
  ctx: WhatsAppVybeContext,
  message: string,
  usarIa = true,
): CobrancaN8nPayload {
  const c = ctx.cliente;
  const v = ctx.variaveis ?? {};
  return {
    telefone: ctx.telefone,
    valor: c?.mensalidade || v.amount || '0,00',
    nome: c?.contato || v.contactPerson || 'Cliente',
    vencimento: c ? `Dia ${c.dia_vencimento}` : `Dia ${v.dueDay || '1'}`,
    mensagem: message.trim(),
    id_fatura: c?.id,
    link_pagamento: ctx.pagamento?.link_pagamento || v.paymentLink || '',
    usar_ia: usarIa,
    empresa: ctx.empresa?.nome || v.companyName || 'Vybe Brasil',
    chave_pix: ctx.pagamento?.chave_pix || v.pixKey || '',
    tipo_pix: ctx.pagamento?.tipo_pix || v.tipo_pix || '',
    plano: c?.plano || v.activePlan || '',
    status_cobranca: ctx.cobranca?.status || v.status_cobranca || '',
    cnpj_cliente: c?.cnpj || v.cliente_cnpj || '',
    email_cliente: c?.email || v.cliente_email || '',
    instrucoes_pagamento: ctx.pagamento?.instrucoes || v.instrucoes_pagamento || '',
    contexto: ctx,
  };
}
