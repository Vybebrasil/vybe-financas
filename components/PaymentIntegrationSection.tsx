import React from 'react';
import { CompanyIntegrations, PixKeyType } from '../types';
import { defaultPaymentIntegration } from '../src/services/companySettingsMapper';
import { CreditCard, Link2 } from 'lucide-react';

interface PaymentIntegrationSectionProps {
  integrations?: CompanyIntegrations;
  onChange: (integrations: CompanyIntegrations) => void;
}

const PIX_TYPES: { value: PixKeyType; label: string }[] = [
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'cpf', label: 'CPF' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
  { value: 'random', label: 'Chave aleatória' },
];

const PaymentIntegrationSection: React.FC<PaymentIntegrationSectionProps> = ({
  integrations,
  onChange,
}) => {
  const payment = integrations?.payment ?? defaultPaymentIntegration();

  const updatePayment = (patch: Partial<typeof payment>) => {
    onChange({
      ...integrations,
      payment: { ...payment, ...patch },
    });
  };

  return (
    <div className="bg-[#121212] border border-gray-800 rounded-xl p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-vybe-accent/10 text-vybe-accent">
          <CreditCard size={20} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Pagamentos (PIX e links)</h3>
          <p className="text-xs text-gray-500 mt-1">
            Usado nos templates, no envio de cobrança e no atendimento automático por IA no
            WhatsApp.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-vybe-muted mb-1 font-medium">Tipo da chave PIX</label>
          <select
            value={payment.pixKeyType || 'cnpj'}
            onChange={(e) => updatePayment({ pixKeyType: e.target.value as PixKeyType })}
            className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-vybe-accent"
          >
            {PIX_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-vybe-muted mb-1 font-medium">Chave PIX</label>
          <input
            type="text"
            value={payment.pixKey ?? ''}
            onChange={(e) => updatePayment({ pixKey: e.target.value })}
            placeholder="CNPJ, e-mail ou chave aleatória"
            className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-vybe-accent"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-vybe-muted mb-1 font-medium flex items-center gap-1">
          <Link2 size={12} />
          Link de pagamento (opcional)
        </label>
        <input
          type="url"
          value={payment.paymentLink ?? ''}
          onChange={(e) => updatePayment({ paymentLink: e.target.value })}
          placeholder="https://pagamento.exemplo.com/..."
          className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-vybe-accent"
        />
      </div>

      <div>
        <label className="block text-xs text-vybe-muted mb-1 font-medium">
          Instruções extras (opcional)
        </label>
        <textarea
          value={payment.instructions ?? ''}
          onChange={(e) => updatePayment({ instructions: e.target.value })}
          rows={2}
          placeholder="Ex.: Titular Vybe Brasil LTDA. Horário comercial."
          className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-vybe-accent resize-none"
        />
      </div>
    </div>
  );
};

export default PaymentIntegrationSection;
