import React from 'react';
import { CompanyIntegrations } from '../types';
import { defaultWhatsAppIntegration } from '../src/services/companySettingsMapper';
import { MessageCircle, Link2 } from 'lucide-react';

interface WhatsAppIntegrationSectionProps {
  integrations?: CompanyIntegrations;
  onChange: (integrations: CompanyIntegrations) => void;
}

const WhatsAppIntegrationSection: React.FC<WhatsAppIntegrationSectionProps> = ({
  integrations,
  onChange,
}) => {
  const whatsapp = integrations?.whatsapp ?? defaultWhatsAppIntegration();

  const updateWhatsApp = (patch: Partial<typeof whatsapp>) => {
    onChange({
      ...integrations,
      whatsapp: { ...whatsapp, ...patch },
    });
  };

  return (
    <div className="bg-[#121212] border border-gray-800 rounded-xl p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-[#25D366]/10 text-[#25D366]">
          <MessageCircle size={20} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">WhatsApp (n8n + Evolution)</h3>
          <p className="text-xs text-gray-500 mt-1">
            Envio automático na régua de cobrança. O app chama seu webhook n8n, que dispara a
            Evolution API.
          </p>
        </div>
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={whatsapp.enabled}
          onChange={(e) => updateWhatsApp({ enabled: e.target.checked })}
          className="w-4 h-4 rounded border-gray-600 text-vybe-accent focus:ring-vybe-accent"
        />
        <span className="text-sm text-white">Permitir envio na régua de cobrança (n8n)</span>
      </label>

      <div>
        <label className="block text-xs text-vybe-muted mb-1 font-medium flex items-center gap-1">
          <Link2 size={12} />
          URL do webhook n8n (opcional)
        </label>
        <input
          type="url"
          value={whatsapp.n8nWebhookUrl ?? ''}
          onChange={(e) => updateWhatsApp({ n8nWebhookUrl: e.target.value })}
          placeholder="https://n8n.srv1704092.hstgr.cloud/webhook/cobranca-whatsapp"
          className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-vybe-accent"
        />
        <p className="text-[11px] text-gray-500 mt-1">
          Deixe em branco para usar o padrão{' '}
          <code className="text-gray-400">/webhook/cobranca-whatsapp</code> configurado no Supabase.
        </p>
      </div>
    </div>
  );
};

export default WhatsAppIntegrationSection;
