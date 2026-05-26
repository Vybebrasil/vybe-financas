import { MessageTemplate } from '../../types';
import { supabase } from './supabase';
import { getErrorMessage } from '../utils/errorMessage';

export interface SendWhatsAppBillingParams {
  clientId: string;
  message: string;
  companyName?: string;
  stage?: MessageTemplate['stage'];
  templateId?: string;
  templateName?: string;
}

export interface SendWhatsAppBillingResult {
  ok: boolean;
  phone?: string;
}

export async function sendWhatsAppBillingMessage(
  params: SendWhatsAppBillingParams,
): Promise<SendWhatsAppBillingResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const { data, error } = await supabase.functions.invoke('send-whatsapp', {
    body: params,
  });

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  const payload = data as { ok?: boolean; error?: string; phone?: string } | null;
  if (payload?.error) {
    throw new Error(payload.error);
  }
  if (!payload?.ok) {
    throw new Error('Não foi possível enviar a mensagem pelo WhatsApp.');
  }

  return { ok: true, phone: payload.phone };
}
