/** Contexto Vybe enviado ao n8n (espelha Edge Function whatsapp-context) */
export interface WhatsAppVybeContextPayload {
  encontrado: boolean;
  telefone: string;
  cliente?: Record<string, unknown>;
  empresa?: Record<string, unknown>;
  pagamento?: Record<string, unknown>;
  cobranca?: Record<string, unknown>;
  variaveis?: Record<string, string>;
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
  contexto?: WhatsAppVybeContextPayload;
}

export function formatValorBr(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function buildCobrancaN8nPayload(input: {
  phone: string;
  contactName: string;
  monthlyFee: number;
  dueDay: number;
  message: string;
  clientId?: string;
  paymentLink?: string;
  companyName?: string;
  usarIa?: boolean;
  pixKey?: string;
  pixKeyType?: string;
  activePlan?: string;
  billingStatus?: string;
  clientCnpj?: string;
  clientEmail?: string;
  paymentInstructions?: string;
}): CobrancaN8nPayload {
  const payload: CobrancaN8nPayload = {
    telefone: input.phone,
    valor: formatValorBr(input.monthlyFee),
    nome: input.contactName.trim() || 'Cliente',
    vencimento: `Dia ${input.dueDay}`,
    mensagem: input.message.trim(),
    usar_ia: input.usarIa !== false,
    empresa: input.companyName?.trim() || 'Vybe Brasil',
  };

  if (input.clientId) payload.id_fatura = input.clientId;
  if (input.paymentLink?.trim()) payload.link_pagamento = input.paymentLink.trim();
  if (input.pixKey?.trim()) payload.chave_pix = input.pixKey.trim();
  if (input.pixKeyType) payload.tipo_pix = input.pixKeyType;
  if (input.activePlan) payload.plano = input.activePlan;
  if (input.billingStatus) payload.status_cobranca = input.billingStatus;
  if (input.clientCnpj) payload.cnpj_cliente = input.clientCnpj;
  if (input.clientEmail) payload.email_cliente = input.clientEmail;
  if (input.paymentInstructions) payload.instrucoes_pagamento = input.paymentInstructions;

  return payload;
}
