/** Payload do webhook n8n `cobranca-whatsapp` (ver projeto n8n/COBRANCA-API.md) */

export const DEFAULT_COBRANCA_WEBHOOK_URL =
  'https://n8n.srv1704092.hstgr.cloud/webhook/cobranca-whatsapp';

export interface CobrancaN8nPayload {
  telefone: string;
  valor: string;
  nome: string;
  vencimento: string;
  mensagem: string;
  id_fatura?: string;
  link_pagamento?: string;
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
}): CobrancaN8nPayload {
  const payload: CobrancaN8nPayload = {
    telefone: input.phone,
    valor: formatValorBr(input.monthlyFee),
    nome: input.contactName.trim() || 'Cliente',
    vencimento: `Dia ${input.dueDay}`,
    mensagem: input.message.trim(),
  };

  if (input.clientId) payload.id_fatura = input.clientId;
  if (input.paymentLink?.trim()) payload.link_pagamento = input.paymentLink.trim();

  return payload;
}
