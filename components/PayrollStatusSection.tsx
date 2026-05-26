import React from 'react';
import { CheckCircle2, Clock, HelpCircle, Users, ChevronRight } from 'lucide-react';
import type { PayrollMonthSummary } from '../src/services/dashboardMetrics';

interface PayrollStatusSectionProps {
  summary: PayrollMonthSummary;
  onOpenExpenses?: () => void;
}

const PayrollStatusSection: React.FC<PayrollStatusSectionProps> = ({
  summary,
  onOpenExpenses,
}) => {
  if (summary.entries.length === 0) {
    return (
      <section className="bg-vybe-card border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
          <Users size={16} className="text-vybe-accent" />
          Folha de pagamento
        </h3>
        <p className="text-sm text-gray-500">Nenhum colaborador cadastrado.</p>
        {onOpenExpenses && (
          <button
            type="button"
            onClick={onOpenExpenses}
            className="mt-3 text-xs text-vybe-accent hover:underline"
          >
            Cadastrar em Despesas
          </button>
        )}
      </section>
    );
  }

  const allPaid =
    summary.paidCount === summary.entries.length && summary.entries.length > 0;

  return (
    <section className="bg-vybe-card border border-gray-800 rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Users size={16} className="text-vybe-accent" />
            Folha de pagamento
          </h3>
          <p className="text-xs text-gray-500 mt-1 capitalize">{summary.periodLabel}</p>
        </div>
        <p className="text-xs text-gray-500 shrink-0">
          {summary.entries.length} colaborador{summary.entries.length !== 1 ? 'es' : ''}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[#121212] rounded-lg p-3 border border-emerald-900/40 text-center">
          <div className="flex items-center justify-center gap-1 text-emerald-400 mb-2">
            <CheckCircle2 size={14} />
            <span className="text-[10px] font-semibold uppercase tracking-wide">Pago</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{summary.paidCount}</p>
        </div>

        <div className="bg-[#121212] rounded-lg p-3 border border-amber-900/40 text-center">
          <div className="flex items-center justify-center gap-1 text-amber-400 mb-2">
            <Clock size={14} />
            <span className="text-[10px] font-semibold uppercase tracking-wide">Pendente</span>
          </div>
          <p className="text-2xl font-bold text-amber-400">{summary.pendingCount}</p>
        </div>

        <div className="bg-[#121212] rounded-lg p-3 border border-gray-700 text-center">
          <div className="flex items-center justify-center gap-1 text-gray-400 mb-2">
            <HelpCircle size={14} />
            <span className="text-[10px] font-semibold uppercase tracking-wide">A lançar</span>
          </div>
          <p className="text-2xl font-bold text-gray-300">{summary.missingCount}</p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-800 flex items-center justify-end">
        {onOpenExpenses && (
          <button
            type="button"
            onClick={onOpenExpenses}
            className="text-xs text-vybe-accent hover:underline flex items-center gap-0.5"
          >
            Detalhes <ChevronRight size={12} />
          </button>
        )}
      </div>

      {allPaid && (
        <p className="text-xs text-emerald-400/90 mt-2 flex items-center gap-1">
          <CheckCircle2 size={12} />
          Folha quitada no período.
        </p>
      )}
    </section>
  );
};

export default PayrollStatusSection;
