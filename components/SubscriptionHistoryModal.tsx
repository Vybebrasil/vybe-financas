import React, { useEffect, useMemo, useState } from 'react';
import { Subscription, Transaction, TransactionStatus } from '../types';
import { formatCurrency, formatDate } from '../utils';
import {
  getSubscriptionHistoryStats,
  getSubscriptionTransactions,
} from '../src/services/subscriptionBilling';
import { getCurrentMonthKey } from '../src/services/recurringLogic';
import { getTransactionFilterDate } from '../src/services/transactionDates';
import SettlementDateModal from './SettlementDateModal';
import { X, History, TrendingDown, Laptop, ChevronDown, Clock, CheckCircle } from 'lucide-react';

interface SubscriptionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: Subscription | null;
  transactions: Transaction[];
  /** Dar baixa (total/parcial) ou voltar para pendente, como no extrato. */
  onToggleStatus?: (id: string, paidDate?: string, partialAmount?: number) => void;
}

const SubscriptionHistoryModal: React.FC<SubscriptionHistoryModalProps> = ({
  isOpen,
  onClose,
  subscription,
  transactions,
  onToggleStatus,
}) => {
  const [settlingTransaction, setSettlingTransaction] = useState<Transaction | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const monthKey = getCurrentMonthKey();

  const subTransactions = useMemo(() => {
    if (!subscription) return [];
    return getSubscriptionTransactions(subscription, transactions);
  }, [subscription, transactions]);

  const stats = useMemo(() => {
    if (!subscription) return null;
    return getSubscriptionHistoryStats(subscription, transactions, monthKey);
  }, [subscription, transactions, monthKey]);

  const groupedHistory = useMemo(() => {
    const groups = new Map<string, { monthKey: string; items: Transaction[]; total: number }>();
    for (const t of subTransactions) {
      const key = getTransactionFilterDate(t).slice(0, 7);
      const group = groups.get(key) ?? { monthKey: key, items: [], total: 0 };
      group.items.push(t);
      if (t.status === TransactionStatus.PAID) {
        group.total += t.amount;
      }
      groups.set(key, group);
    }
    return [...groups.values()].sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [subTransactions]);

  useEffect(() => {
    if (groupedHistory.length > 0) {
      setExpandedMonths(new Set([groupedHistory[0].monthKey]));
    } else {
      setExpandedMonths(new Set());
    }
  }, [subscription?.id, groupedHistory.length > 0 ? groupedHistory[0].monthKey : '']);

  const formatMonthLabel = (key: string) => {
    const [y, m] = key.split('-').map(Number);
    const label = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const toggleMonth = (key: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (!isOpen || !subscription || !stats) return null;

  const handleStatusClick = (transaction: Transaction) => {
    if (!onToggleStatus) return;
    if (transaction.status === TransactionStatus.PENDING) {
      setSettlingTransaction(transaction);
      return;
    }
    onToggleStatus(transaction.id);
  };

  const handleConfirmSettlement = (paidDate: string, partialAmount?: number) => {
    if (!settlingTransaction || !onToggleStatus) return;
    onToggleStatus(settlingTransaction.id, paidDate, partialAmount);
    setSettlingTransaction(null);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <SettlementDateModal
        transaction={settlingTransaction}
        onClose={() => setSettlingTransaction(null)}
        onConfirm={handleConfirmSettlement}
      />
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative bg-vybe-card border border-gray-700 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-bar-grow origin-center max-h-[90vh] flex flex-col">
        <div className="bg-[#2A2A2A] p-4 flex justify-between items-center border-b border-gray-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center border border-gray-700">
              <Laptop className="text-vybe-accent" size={20} />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Histórico de Pagamentos</h3>
              <p className="text-xs text-gray-400">
                Software: <span className="text-white font-medium">{subscription.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors bg-gray-800 p-2 rounded-full hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-[#121212] p-4 rounded-xl border border-gray-800">
              <span className="text-xs text-gray-500 block mb-1">Total Pago</span>
              <span className="text-lg font-bold text-white">{formatCurrency(stats.totalPaid)}</span>
              <span className="text-[10px] text-gray-500 block mt-1">
                {stats.transactionCount}{' '}
                {stats.transactionCount === 1 ? 'lançamento' : 'lançamentos'}
              </span>
            </div>
            <div
              className={`bg-[#121212] p-4 rounded-xl border ${stats.monthPending > 0 ? 'border-yellow-500/30' : 'border-gray-800'}`}
            >
              <span className="text-xs text-gray-500 block mb-1 flex items-center gap-1">
                <Clock
                  size={12}
                  className={stats.monthPending > 0 ? 'text-yellow-500' : 'text-vybe-green'}
                />
                Pendente do Mês
              </span>
              <span
                className={`text-lg font-bold ${stats.monthPending > 0 ? 'text-yellow-500' : 'text-vybe-green'}`}
              >
                {formatCurrency(stats.monthPending)}
              </span>
              <span className="text-[10px] text-gray-500 block mt-1">
                {stats.monthPending > 0
                  ? `Mensalidade ${formatCurrency(subscription.cost)} · pago ${formatCurrency(stats.paidThisMonth)} no mês`
                  : 'Assinatura do mês quitada'}
              </span>
            </div>
            <div
              className={`bg-[#121212] p-4 rounded-xl border ${stats.totalPending > 0 ? 'border-red-500/30' : 'border-gray-800'}`}
            >
              <span className="text-xs text-gray-500 block mb-1 flex items-center gap-1">
                <Clock
                  size={12}
                  className={stats.totalPending > 0 ? 'text-red-400' : 'text-vybe-green'}
                />
                Pendente Total
              </span>
              <span
                className={`text-lg font-bold ${stats.totalPending > 0 ? 'text-red-400' : 'text-vybe-green'}`}
              >
                {formatCurrency(stats.totalPending)}
              </span>
              <span className="text-[10px] text-gray-500 block mt-1">
                {stats.totalPending === 0
                  ? 'Nenhum pagamento em atraso'
                  : stats.pastDue > 0
                    ? `${formatCurrency(stats.pastDue)} em atraso + ${formatCurrency(stats.monthPending)} do mês`
                    : 'Apenas o pendente do mês atual'}
              </span>
            </div>
          </div>

          <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <History size={16} className="text-vybe-muted" />
            Extrato de Lançamentos
          </h4>

          {subTransactions.length === 0 ? (
            <div className="text-center py-8 bg-[#121212] rounded-xl border border-gray-800 border-dashed">
              <p className="text-gray-500 text-sm">
                Nenhum pagamento registrado para &quot;{subscription.name}&quot;.
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Utilize o botão $ no card do software para registrar pagamentos.
              </p>
            </div>
          ) : (
            <div className="bg-[#121212] rounded-xl border border-gray-800 overflow-hidden">
              <div className="divide-y divide-gray-800">
                {groupedHistory.map((group) => {
                  const isExpanded = expandedMonths.has(group.monthKey);
                  return (
                    <div key={group.monthKey}>
                      <button
                        type="button"
                        onClick={() => toggleMonth(group.monthKey)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-[#1E1E1E] hover:bg-[#252525] transition-colors"
                        aria-expanded={isExpanded}
                      >
                        <span className="flex items-center gap-2 text-sm font-bold text-white">
                          <ChevronDown
                            size={16}
                            className={`text-gray-500 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                          />
                          {formatMonthLabel(group.monthKey)}
                          <span className="text-[10px] font-medium text-gray-500 bg-[#121212] px-1.5 py-0.5 rounded-full border border-gray-700">
                            {group.items.length}{' '}
                            {group.items.length === 1 ? 'lançamento' : 'lançamentos'}
                          </span>
                        </span>
                        {group.total > 0 && (
                          <span className="text-sm font-bold text-vybe-red whitespace-nowrap">
                            - {formatCurrency(group.total)}
                          </span>
                        )}
                      </button>

                      {isExpanded && (
                        <table className="w-full text-left border-collapse">
                          <tbody className="divide-y divide-gray-800/70">
                            {group.items.map((t) => {
                              const isPaid = t.status === TransactionStatus.PAID;
                              return (
                                <tr key={t.id} className="hover:bg-gray-800/50 transition-colors">
                                  <td className="p-3 pl-10 text-xs text-gray-400 font-mono whitespace-nowrap w-28">
                                    {formatDate(getTransactionFilterDate(t))}
                                  </td>
                                  <td className="p-3 text-sm text-white">{t.description}</td>
                                  <td className="p-3 text-center whitespace-nowrap w-28">
                                    {onToggleStatus ? (
                                      <button
                                        type="button"
                                        onClick={() => handleStatusClick(t)}
                                        className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border transition-all ${
                                          isPaid
                                            ? 'bg-vybe-green/10 text-vybe-green border-vybe-green/20 hover:bg-vybe-green hover:text-white'
                                            : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500 hover:text-white'
                                        }`}
                                        title={
                                          isPaid
                                            ? 'Pago — clique para voltar a pendente'
                                            : 'Pendente — clique para dar baixa (total ou parcial)'
                                        }
                                      >
                                        {isPaid ? <CheckCircle size={10} /> : <Clock size={10} />}
                                        {isPaid ? 'Pago' : 'Pendente'}
                                      </button>
                                    ) : (
                                      <span
                                        className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                          isPaid
                                            ? 'bg-vybe-green/10 text-vybe-green border-vybe-green/20'
                                            : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                        }`}
                                      >
                                        {isPaid ? <CheckCircle size={10} /> : <Clock size={10} />}
                                        {isPaid ? 'Pago' : 'Pendente'}
                                      </span>
                                    )}
                                  </td>
                                  <td
                                    className={`p-3 text-sm font-bold text-right whitespace-nowrap ${isPaid ? 'text-vybe-red' : 'text-yellow-500'}`}
                                  >
                                    <div className="flex items-center justify-end gap-1">
                                      <TrendingDown size={12} />
                                      - {formatCurrency(t.amount)}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-[#1E1E1E] border-t border-gray-800 text-center shrink-0">
          <p className="text-[10px] text-gray-500">
            Lançamentos vinculados por &quot;Assinatura - {subscription.name}&quot; ou nome na
            descrição. Clique no status para dar baixa total ou parcial.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionHistoryModal;
