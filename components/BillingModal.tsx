import React, { useEffect, useMemo, useState } from 'react';
import { Client, MessageTemplate } from '../types';
import { formatCurrency } from '../utils';
import {
  buildTemplateContext,
  renderMessageTemplate,
  generateMailtoLink,
  BILLING_STAGE_LABELS,
  normalizeWhatsAppPhone,
} from '../messageTemplates';
import { X, MessageCircle, CheckCircle, Smartphone, Mail, Loader2 } from 'lucide-react';
import { useToast } from './ToastProvider';
import { sendWhatsAppBillingMessage } from '../src/services/whatsappMessaging';

interface BillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  companyName: string;
  messageTemplates: MessageTemplate[];
  onConfirmToFinance: (client: Client) => void;
}

const BillingModal: React.FC<BillingModalProps> = ({
  isOpen,
  onClose,
  client,
  companyName,
  messageTemplates,
  onConfirmToFinance,
}) => {
  const toast = useToast();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  const whatsappTemplates = useMemo(
    () => messageTemplates.filter((t) => t.channel === 'whatsapp'),
    [messageTemplates],
  );

  const emailTemplates = useMemo(
    () => messageTemplates.filter((t) => t.channel === 'email'),
    [messageTemplates],
  );

  useEffect(() => {
    if (!isOpen || !client) return;
    const preferred =
      whatsappTemplates.find((t) => t.stage === 'on_due') ?? whatsappTemplates[0];
    setSelectedTemplateId(preferred?.id ?? '');
  }, [isOpen, client, whatsappTemplates]);

  if (!isOpen || !client) return null;

  const selectedTemplate = messageTemplates.find((t) => t.id === selectedTemplateId);
  const context = buildTemplateContext(client, companyName);

  const previewBody = selectedTemplate
    ? renderMessageTemplate(selectedTemplate.body, context)
    : '';

  const previewSubject =
    selectedTemplate?.channel === 'email' && selectedTemplate.subject
      ? renderMessageTemplate(selectedTemplate.subject, context)
      : '';

  const handleSendWhatsApp = async () => {
    if (!selectedTemplate || selectedTemplate.channel !== 'whatsapp') {
      toast.info('Selecione um template de WhatsApp.');
      return;
    }

    if (!normalizeWhatsAppPhone(client.phone)) {
      toast.error('Cadastre um WhatsApp válido para este cliente.');
      return;
    }

    const message = renderMessageTemplate(selectedTemplate.body, context);

    setIsSendingWhatsApp(true);
    try {
      await sendWhatsAppBillingMessage({
        clientId: client.id,
        message,
        companyName,
        stage: selectedTemplate.stage,
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
      });
      toast.success('Mensagem enviada pelo WhatsApp.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Falha no envio: ${msg}`);
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const handleSendEmail = () => {
    const emailTemplate =
      selectedTemplate?.channel === 'email'
        ? selectedTemplate
        : emailTemplates.find((t) => t.stage === selectedTemplate?.stage) ?? emailTemplates[0];

    if (!emailTemplate) {
      toast.info('Cadastre um template de e-mail em Configurações do Sistema.');
      return;
    }
    if (!client.email?.trim()) {
      toast.error('Este cliente não possui e-mail cadastrado.');
      return;
    }
    const subject = renderMessageTemplate(emailTemplate.subject || 'Cobrança', context);
    const body = renderMessageTemplate(emailTemplate.body, context);
    window.open(generateMailtoLink(client, subject, body), '_blank');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative bg-vybe-card border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-bar-grow origin-center max-h-[90vh] overflow-y-auto">
        <div className="bg-[#2A2A2A] p-4 flex justify-between items-center border-b border-gray-700 sticky top-0 z-10">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Smartphone className="text-vybe-accent" size={20} />
            Cobrança — Régua
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex flex-col items-center mb-4">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-3 border border-gray-700">
              <span className="text-2xl font-bold text-white">{client.name.charAt(0)}</span>
            </div>
            <h2 className="text-lg font-bold text-white text-center">{client.name}</h2>
            <p className="text-sm text-gray-400">{client.activePlan}</p>
          </div>

          <div className="bg-[#121212] rounded-lg p-4 mb-4 border border-gray-800">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">Valor da Fatura:</span>
              <span className="text-xl font-bold text-vybe-green">{formatCurrency(client.monthlyFee)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Vencimento:</span>
              <span className="text-sm text-white font-medium">Dia {client.dueDay} deste mês</span>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs text-vybe-muted mb-1 font-medium">Template da régua</label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-vybe-accent"
            >
              {whatsappTemplates.length === 0 && emailTemplates.length === 0 && (
                <option value="">Nenhum template cadastrado</option>
              )}
              {whatsappTemplates.length > 0 && (
                <optgroup label="WhatsApp">
                  {whatsappTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {BILLING_STAGE_LABELS[t.stage]}
                    </option>
                  ))}
                </optgroup>
              )}
              {emailTemplates.length > 0 && (
                <optgroup label="E-mail (visualização)">
                  {emailTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {BILLING_STAGE_LABELS[t.stage]}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {previewBody && (
            <div className="mb-4">
              <label className="block text-xs text-vybe-muted mb-1 font-medium">Pré-visualização</label>
              {previewSubject && (
                <p className="text-xs text-gray-400 mb-1">
                  <span className="text-gray-500">Assunto:</span> {previewSubject}
                </p>
              )}
              <pre className="whitespace-pre-wrap text-xs text-gray-300 bg-[#121212] border border-gray-800 rounded-lg p-3 max-h-40 overflow-y-auto font-sans">
                {previewBody}
              </pre>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={() => void handleSendWhatsApp()}
              disabled={
                isSendingWhatsApp ||
                !selectedTemplate ||
                selectedTemplate.channel !== 'whatsapp'
              }
              className="w-full bg-[#25D366] hover:bg-[#1faa53] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg"
            >
              {isSendingWhatsApp ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <MessageCircle size={20} />
              )}
              {isSendingWhatsApp ? 'Enviando...' : 'Enviar no WhatsApp'}
            </button>

            <button
              type="button"
              onClick={handleSendEmail}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg"
            >
              <Mail size={20} />
              Enviar por E-mail
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-gray-700" />
              <span className="flex-shrink mx-4 text-gray-500 text-xs">E TAMBÉM</span>
              <div className="flex-grow border-t border-gray-700" />
            </div>

            <button
              type="button"
              onClick={() => onConfirmToFinance(client)}
              className="w-full bg-vybe-card border border-vybe-accent text-vybe-accent hover:bg-vybe-accent hover:text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all"
            >
              <CheckCircle size={20} />
              Lançar no Financeiro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingModal;
