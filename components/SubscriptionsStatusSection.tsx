import React from 'react';
import { AppWindow, CheckCircle2, ChevronRight, Clock, HelpCircle } from 'lucide-react';
import { formatCurrency } from '../utils';
import type {
  RecurringExpenseStatus,
  SubscriptionsMonthSummary,
} from '../src/services/dashboardMetrics';

interface SubscriptionsStatusSectionProps {
  summary: SubscriptionsMonthSummary;
  onOpenExpenses?: () => void;
  onEditTransaction?: (transactionId: string) => void;
}

const STATUS_CONFIG: Record<
  RecurringExpenseStatus,
  { label: string; className: string; icon: React.ReactNode }
> = {
  paid: {
    label: 'Pago',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    icon: <CheckCircle2 size={12} />,
  },
  pending: {
    label: 'Pendente',
    className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    icon: <Clock size={12} />,
  },
  missing: {
    label: 'Não lançado',
    className: 'bg-gray-500/15 text-gray-400 border-gray-600/40',
    icon: <HelpCircle size={12} />,
  },
};

const PAYMENT_LABELS: Record<string, string> = {
  PIX: 'PIX',
  BOLETO: 'Boleto',
  CARTAO: 'Cartão',
  DINHEIRO: 'Dinheiro',
  OUTRO: 'Outro',
};

const SubscriptionsStatusSection: React.FC<SubscriptionsStatusSectionProps> = ({
  summary,
  onOpenExpenses,
  onEditTransaction,
}) => {
  if (summary.entries.length === 0) {
    return (
      <section className="bg-vybe-card border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
          <AppWindow size={16} className="text-vybe-accent" />
          Aplicativos e assinaturas
        </h3>
        <p className="text-sm text-gray-500">
          Nenhum aplicativo ativo cadastrado em Despesas.
        </p>
        {onOpenExpenses && (
          <button
            type="button"
            onClick={onOpenExpenses}
            className="mt-3 text-xs text-vybe-accent hover:underline"
          >
            Cadastrar aplicativos
          </button>
        )}
      </section>
    );
  }

  const allPaid =
    summary.paidCount === summary.entries.length && summary.entries.length > 0;

  return (
    <section className="bg-vybe-card border border-gray-800 rounded-xl overflow-hidden h-full flex flex-col">
      <div className="p-5 border-b border-gray-800">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <AppWindow size={16} className="text-vybe-accent" />
              Aplicativos e assinaturas
            </h3>
            <p className="text-xs text-gray-500 mt-1 capitalize">{summary.periodLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
              {summary.paidCount} pago{summary.paidCount !== 1 ? 's' : ''} ·{' '}
              {formatCurrency(summary.totalPaid)}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25">
              {summary.pendingCount} pendente{summary.pendingCount !== 1 ? 's' : ''} ·{' '}
              {formatCurrency(summary.totalPending)}
            </span>
            {summary.missingCount > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-gray-500/10 text-gray-400 border border-gray-600/40">
                {summary.missingCount} sem lançamento
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-[#121212] rounded-lg p-3 border border-gray-800">
            <p className="text-[10px] uppercase text-gray-500 tracking-wide">Custo mensal</p>
            <p className="text-lg font-bold text-white mt-0.5">
              {formatCurrency(summary.totalExpected)}
            </p>
          </div>
          <div className="bg-[#121212] rounded-lg p-3 border border-emerald-900/40">
            <p className="text-[10px] uppercase text-emerald-600 tracking-wide">Já pago</p>
            <p className="text-lg font-bold text-emerald-400 mt-0.5">
              {formatCurrency(summary.totalPaid)}
            </p>
          </div>
          <div className="bg-[#121212] rounded-lg p-3 border border-amber-900/40">
            <p className="text-[10px] uppercase text-amber-600 tracking-wide">A pagar</p>
            <p className="text-lg font-bold text-amber-400 mt-0.5">
              {formatCurrency(Math.max(0, summary.totalExpected - summary.totalPaid))}
            </p>
          </div>
        </div>

        {allPaid && (
          <p className="text-xs text-emerald-400/90 mt-3 flex items-center gap-1">
            <CheckCircle2 size={14} />
            Todos os apps do período foram pagos.
          </p>
        )}
      </div>

      <ul className="divide-y divide-gray-800 max-h-64 overflow-y-auto custom-scrollbar flex-1">
        {summary.entries.map((entry) => {
          const cfg = STATUS_CONFIG[entry.status];
          const sub = entry.subscription;
          const canOpen =
            entry.transactionId && onEditTransaction && entry.status !== 'missing';

          return (
            <li key={sub.id}>
              <button
                type="button"
                disabled={!canOpen}
                onClick={() => canOpen && onEditTransaction(entry.transactionId!)}
                className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                  canOpen ? 'hover:bg-white/[0.03] cursor-pointer' : 'cursor-default'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{sub.name}</p>
                  <p className="text-[10px] text-gray-500 truncate">
                    {PAYMENT_LABELS[sub.paymentMethod] ?? sub.paymentMethod}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-white">{formatCurrency(entry.amount)}</p>
                  <p className="text-[10px] text-gray-500">
                    {entry.status === 'paid' && entry.paymentDate
                      ? `Pago em ${entry.paymentDate.split('-').reverse().join('/')}`
                      : entry.status === 'pending' && entry.scheduledDate
                        ? `Previsto ${entry.scheduledDate.split('-').reverse().join('/')}`
                        : `Renova dia ${sub.renewalDay}`}
                  </p>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.className}`}
                >
                  {cfg.icon}
                  {cfg.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {onOpenExpenses && (
        <button
          type="button"
          onClick={onOpenExpenses}
          className="w-full py-2.5 text-xs text-vybe-accent hover:bg-white/5 flex items-center justify-center gap-1 border-t border-gray-800"
        >
          Gerenciar apps em Despesas <ChevronRight size={12} />
        </button>
      )}
    </section>
  );
};

export default SubscriptionsStatusSection;
