import React, { useMemo } from 'react';
import { Client, Transaction } from '../types';
import { formatCurrency } from '../utils';
import { getDelinquencyReport } from '../src/services/delinquency';
import { AlertTriangle, Clock, MessageCircle, ChevronRight } from 'lucide-react';

interface DelinquencyPanelProps {
  clients: Client[];
  transactions: Transaction[];
  onGenerateCharge: (client: Client) => void;
}

const DelinquencyPanel: React.FC<DelinquencyPanelProps> = ({
  clients,
  transactions,
  onGenerateCharge,
}) => {
  const report = useMemo(
    () => getDelinquencyReport(clients, transactions),
    [clients, transactions],
  );

  if (report.overdue.length === 0 && report.pending.length === 0) {
    return null;
  }

  return (
    <section className="mb-8 print:hidden">
      <div className="bg-vybe-card border border-gray-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={20} />
              Régua de cobrança —{' '}
              {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Clientes ativos com mensalidade em aberto neste mês
            </p>
          </div>
          <div className="flex gap-4 text-sm">
            {report.overdue.length > 0 && (
              <div>
                <span className="text-red-400 font-bold">{report.overdue.length}</span>
                <span className="text-gray-500 ml-1">em atraso</span>
                <p className="text-xs text-red-400/80">{formatCurrency(report.totalOverdueAmount)}</p>
              </div>
            )}
            {report.pending.length > 0 && (
              <div>
                <span className="text-amber-400 font-bold">{report.pending.length}</span>
                <span className="text-gray-500 ml-1">a vencer</span>
                <p className="text-xs text-amber-400/80">{formatCurrency(report.totalPendingAmount)}</p>
              </div>
            )}
          </div>
        </div>

        <div className="divide-y divide-gray-800 max-h-80 overflow-y-auto">
          {report.overdue.map((item) => (
            <div
              key={item.client.id}
              className="flex items-center justify-between gap-3 p-4 hover:bg-white/[0.02] transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{item.client.name}</p>
                <p className="text-xs text-gray-500">
                  Venceu dia {item.client.dueDay} · {item.daysOverdue} dia(s) em atraso
                </p>
              </div>
              <p className="text-sm font-bold text-red-400 shrink-0">{formatCurrency(item.amount)}</p>
              <button
                type="button"
                onClick={() => onGenerateCharge(item.client)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366]/25 text-xs font-bold transition-colors"
              >
                <MessageCircle size={14} />
                Cobrar
              </button>
            </div>
          ))}

          {report.pending.map((item) => (
            <div
              key={item.client.id}
              className="flex items-center justify-between gap-3 p-4 hover:bg-white/[0.02] transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{item.client.name}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock size={12} />
                  Vencimento dia {item.client.dueDay}
                </p>
              </div>
              <p className="text-sm font-bold text-amber-400 shrink-0">{formatCurrency(item.amount)}</p>
              <button
                type="button"
                onClick={() => onGenerateCharge(item.client)}
                className="shrink-0 p-1.5 text-gray-500 hover:text-vybe-accent transition-colors"
                title="Enviar lembrete"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DelinquencyPanel;
