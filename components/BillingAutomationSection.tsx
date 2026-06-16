import React from 'react';
import { CompanyIntegrations } from '../types';
import { defaultBillingAutomation } from '../src/services/billingAutomation';

interface BillingAutomationSectionProps {
  integrations?: CompanyIntegrations;
  onChange: (integrations: CompanyIntegrations) => void;
}

const BillingAutomationSection: React.FC<BillingAutomationSectionProps> = ({
  integrations,
  onChange,
}) => {
  const billing = integrations?.billing ?? defaultBillingAutomation();

  const patch = (partial: Partial<typeof billing>) => {
    onChange({
      ...integrations,
      billing: { ...billing, ...partial },
    });
  };

  return (
    <section className="bg-[#121212] border border-gray-800 rounded-xl p-5 space-y-4">
      <div>
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Régua automática
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Disparo diário de cobranças por WhatsApp e/ou e-mail conforme estágio (lembrete, vencimento, atraso).
        </p>
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={billing.autoEnabled}
          onChange={(e) => patch({ autoEnabled: e.target.checked })}
          className="rounded border-gray-600 bg-[#1E1E1E] text-vybe-accent focus:ring-vybe-accent"
        />
        <span className="text-sm text-gray-200">Ativar régua automática</span>
      </label>

      {billing.autoEnabled && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs text-vybe-muted mb-1">Dias antes do vencimento (lembrete)</label>
            <input
              type="number"
              min={1}
              max={15}
              value={billing.preDueDays}
              onChange={(e) => patch({ preDueDays: Number(e.target.value) || 3 })}
              className="w-full bg-[#1E1E1E] border border-gray-700 rounded-lg p-2.5 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-vybe-muted mb-1">Hora preferida (informativo)</label>
            <input
              type="number"
              min={0}
              max={23}
              value={billing.dispatchHourLocal ?? 9}
              onChange={(e) => patch({ dispatchHourLocal: Number(e.target.value) })}
              className="w-full bg-[#1E1E1E] border border-gray-700 rounded-lg p-2.5 text-white text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={billing.whatsappChannel}
              onChange={(e) => patch({ whatsappChannel: e.target.checked })}
              className="rounded border-gray-600"
            />
            Canal WhatsApp
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={billing.emailChannel}
              onChange={(e) => patch({ emailChannel: e.target.checked })}
              className="rounded border-gray-600"
            />
            Canal e-mail (Resend)
          </label>
        </div>
      )}
    </section>
  );
};

export default BillingAutomationSection;
