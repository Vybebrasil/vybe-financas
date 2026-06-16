import React from 'react';
import { CompanyIntegrations } from '../types';

interface PaymentProviderSectionProps {
  integrations?: CompanyIntegrations;
  onChange: (integrations: CompanyIntegrations) => void;
  userId?: string;
}

const PaymentProviderSection: React.FC<PaymentProviderSectionProps> = ({
  integrations,
  onChange,
  userId,
}) => {
  const provider = integrations?.paymentProvider ?? {
    enabled: false,
    provider: 'generic' as const,
  };

  const patch = (partial: Partial<typeof provider>) => {
    onChange({
      ...integrations,
      paymentProvider: { ...provider, ...partial },
    });
  };

  const webhookUrl =
    userId && typeof window !== 'undefined'
      ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payment-webhook?user_id=${userId}`
      : '';

  return (
    <section className="bg-[#121212] border border-gray-800 rounded-xl p-5 space-y-4">
      <div>
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Webhook de pagamento (PIX)
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Baixa automática ao confirmar pagamento via Asaas, Mercado Pago ou payload genérico.
        </p>
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={provider.enabled}
          onChange={(e) => patch({ enabled: e.target.checked })}
          className="rounded border-gray-600 bg-[#1E1E1E] text-vybe-accent"
        />
        <span className="text-sm text-gray-200">Ativar baixa automática via webhook</span>
      </label>

      {provider.enabled && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-vybe-muted mb-1">Provedor</label>
            <select
              value={provider.provider}
              onChange={(e) =>
                patch({ provider: e.target.value as typeof provider.provider })
              }
              className="w-full bg-[#1E1E1E] border border-gray-700 rounded-lg p-2.5 text-white text-sm"
            >
              <option value="generic">Genérico</option>
              <option value="asaas">Asaas</option>
              <option value="mercadopago">Mercado Pago</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-vybe-muted mb-1">Secret do webhook (header X-Webhook-Secret)</label>
            <input
              type="text"
              value={provider.webhookSecret ?? ''}
              onChange={(e) => patch({ webhookSecret: e.target.value })}
              placeholder="opcional"
              className="w-full bg-[#1E1E1E] border border-gray-700 rounded-lg p-2.5 text-white text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-vybe-muted mb-1">E-mail remetente (régua Resend)</label>
            <input
              type="email"
              value={provider.emailFrom ?? ''}
              onChange={(e) => patch({ emailFrom: e.target.value })}
              placeholder="cobranca@suaagencia.com.br"
              className="w-full bg-[#1E1E1E] border border-gray-700 rounded-lg p-2.5 text-white text-sm"
            />
          </div>
          {webhookUrl && (
            <div className="text-xs text-gray-500 break-all bg-black/30 p-3 rounded-lg border border-gray-800">
              <span className="text-gray-400 block mb-1">URL do webhook:</span>
              {webhookUrl}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default PaymentProviderSection;
