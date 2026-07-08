import React, { useMemo, useState } from 'react';
import { Client, Transaction, TransactionType, TransactionStatus } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { X, History, TrendingUp, TrendingDown, FileText, Gem, Clock, CheckCircle } from 'lucide-react';
import SettlementDateModal from './SettlementDateModal';

interface ClientHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  transactions: Transaction[];
  /** Dar baixa (total/parcial) ou voltar para pendente, como no extrato. */
  onToggleStatus?: (id: string, paidDate?: string, partialAmount?: number) => void;
}

const ClientHistoryModal: React.FC<ClientHistoryModalProps> = ({
  isOpen,
  onClose,
  client,
  transactions,
  onToggleStatus,
}) => {
  const [settlingTransaction, setSettlingTransaction] = useState<Transaction | null>(null);

  const clientTransactions = useMemo(() => {
    if (!client) return [] as Transaction[];
    const term = client.name.toLowerCase();
    return transactions.filter(
      (t) => t.clientId === client.id || t.description.toLowerCase().includes(term)
    );
  }, [client, transactions]);

  const monthlyFee = client?.monthlyFee ?? 0;

  const stats = useMemo(() => {
    const totals = clientTransactions.reduce(
      (acc, curr) => {
        const isPaid = curr.status === TransactionStatus.PAID;
        if (curr.type === TransactionType.INCOME) {
          if (isPaid) {
            acc.totalIncome += curr.amount;
            acc.balance += curr.amount;
            acc.incomeMonths.add(curr.date.slice(0, 7));
          } else {
            acc.pendingIncome += curr.amount;
          }
        } else {
          if (isPaid) {
            acc.totalExpense += curr.amount;
            acc.balance -= curr.amount;
          } else {
            acc.pendingExpense += curr.amount;
          }
        }
        return acc;
      },
      {
        totalIncome: 0,
        pendingIncome: 0,
        totalExpense: 0,
        pendingExpense: 0,
        balance: 0,
        incomeMonths: new Set<string>(),
      }
    );

    const monthsActive = totals.incomeMonths.size;
    const ltv = totals.totalIncome;
    const avgMonthlyLtv = monthsActive > 0 ? ltv / monthsActive : 0;

    // Pendente do mês: mensalidade contratada menos o que já foi pago no mês atual
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const paidByMonth = new Map<string, number>();
    for (const t of clientTransactions) {
      if (t.type !== TransactionType.INCOME || t.status !== TransactionStatus.PAID) continue;
      const key = t.date.slice(0, 7);
      paidByMonth.set(key, (paidByMonth.get(key) ?? 0) + t.amount);
    }
    const paidThisMonth = paidByMonth.get(currentMonthKey) ?? 0;
    const monthPending = Math.max(monthlyFee - paidThisMonth, 0);

    // Pendente acumulado de meses anteriores: soma dos déficits mês a mês
    // desde o primeiro mês com movimentação do cliente até o mês passado.
    const allMonthKeys = clientTransactions
      .filter((t) => t.type === TransactionType.INCOME)
      .map((t) => t.date.slice(0, 7));
    let pastDue = 0;
    if (allMonthKeys.length > 0 && monthlyFee > 0) {
      const firstMonthKey = allMonthKeys.reduce((min, k) => (k < min ? k : min));
      let [y, m] = firstMonthKey.split('-').map(Number);
      const [cy, cm] = currentMonthKey.split('-').map(Number);
      while (y < cy || (y === cy && m < cm)) {
        const key = `${y}-${String(m).padStart(2, '0')}`;
        pastDue += Math.max(monthlyFee - (paidByMonth.get(key) ?? 0), 0);
        m += 1;
        if (m > 12) {
          m = 1;
          y += 1;
        }
      }
    }
    const totalPending = pastDue + monthPending;

    return {
      totalIncome: totals.totalIncome,
      pendingIncome: totals.pendingIncome,
      totalExpense: totals.totalExpense,
      pendingExpense: totals.pendingExpense,
      balance: totals.balance,
      ltv,
      monthsActive,
      avgMonthlyLtv,
      paidThisMonth,
      monthPending,
      pastDue,
      totalPending,
    };
  }, [clientTransactions, monthlyFee]);

  if (!isOpen || !client) return null;

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
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-vybe-card border border-gray-700 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-bar-grow origin-center max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-[#2A2A2A] p-4 flex justify-between items-center border-b border-gray-700 shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center border border-gray-700">
                <FileText className="text-vybe-accent" size={20} />
             </div>
             <div>
                <h3 className="text-white font-bold text-lg">Histórico Financeiro</h3>
                <p className="text-xs text-gray-400">Cliente: <span className="text-white font-medium">{client.name}</span></p>
             </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors bg-gray-800 p-2 rounded-full hover:bg-gray-700">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
             <div className="bg-[#121212] p-4 rounded-xl border border-gray-800">
                <span className="text-xs text-gray-500 block mb-1">Total Recebido</span>
                <span className="text-lg font-bold text-vybe-green">{formatCurrency(stats.totalIncome)}</span>
                {stats.pendingIncome > 0 && (
                  <span className="text-[10px] text-yellow-500 flex items-center gap-1 mt-1">
                    <Clock size={10} /> {formatCurrency(stats.pendingIncome)} pendente
                  </span>
                )}
             </div>
             <div className={`bg-[#121212] p-4 rounded-xl border ${stats.monthPending > 0 ? 'border-yellow-500/30' : 'border-gray-800'}`}>
                <span className="text-xs text-gray-500 block mb-1 flex items-center gap-1">
                  <Clock size={12} className={stats.monthPending > 0 ? 'text-yellow-500' : 'text-vybe-green'} /> Pendente do Mês
                </span>
                <span className={`text-lg font-bold ${stats.monthPending > 0 ? 'text-yellow-500' : 'text-vybe-green'}`}>
                    {formatCurrency(stats.monthPending)}
                </span>
                <span className="text-[10px] text-gray-500 block mt-1">
                  {stats.monthPending > 0
                    ? `Pago ${formatCurrency(stats.paidThisMonth)} de ${formatCurrency(client.monthlyFee)}`
                    : 'Mensalidade do mês quitada'}
                </span>
             </div>
             <div className={`bg-[#121212] p-4 rounded-xl border ${stats.totalPending > 0 ? 'border-red-500/30' : 'border-gray-800'}`}>
                <span className="text-xs text-gray-500 block mb-1 flex items-center gap-1">
                  <Clock size={12} className={stats.totalPending > 0 ? 'text-red-400' : 'text-vybe-green'} /> Pendente Total
                </span>
                <span className={`text-lg font-bold ${stats.totalPending > 0 ? 'text-red-400' : 'text-vybe-green'}`}>
                    {formatCurrency(stats.totalPending)}
                </span>
                <span className="text-[10px] text-gray-500 block mt-1">
                  {stats.totalPending === 0
                    ? 'Nenhum pagamento em atraso'
                    : stats.pastDue > 0
                      ? `${formatCurrency(stats.pastDue)} de meses anteriores + ${formatCurrency(stats.monthPending)} do mês`
                      : 'Apenas o pendente do mês atual'}
                </span>
             </div>
             <div className="bg-[#121212] p-4 rounded-xl border border-gray-800">
                <span className="text-xs text-gray-500 block mb-1 flex items-center gap-1">
                  <Gem size={12} className="text-vybe-accent" /> LTV (Lifetime Value)
                </span>
                <span className="text-lg font-bold text-vybe-accent">{formatCurrency(stats.ltv)}</span>
                <span className="text-[10px] text-gray-500 block mt-1">
                  {stats.monthsActive === 0
                    ? 'Nenhum pagamento confirmado'
                    : `${stats.monthsActive} ${stats.monthsActive === 1 ? 'mês' : 'meses'} · média ${formatCurrency(stats.avgMonthlyLtv)}/mês`}
                </span>
             </div>
             <div className="bg-[#121212] p-4 rounded-xl border border-gray-800">
                <span className="text-xs text-gray-500 block mb-1">Custos Vinculados</span>
                <span className="text-lg font-bold text-vybe-red">{formatCurrency(stats.totalExpense)}</span>
                {stats.pendingExpense > 0 && (
                  <span className="text-[10px] text-yellow-500 flex items-center gap-1 mt-1">
                    <Clock size={10} /> {formatCurrency(stats.pendingExpense)} pendente
                  </span>
                )}
             </div>
             <div className="bg-[#121212] p-4 rounded-xl border border-gray-800">
                <span className="text-xs text-gray-500 block mb-1">Saldo do Cliente</span>
                <span className={`text-lg font-bold ${stats.balance >= 0 ? 'text-white' : 'text-vybe-red'}`}>
                    {formatCurrency(stats.balance)}
                </span>
             </div>
          </div>

          <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <History size={16} className="text-vybe-muted" />
            Extrato de Movimentações
          </h4>

          {clientTransactions.length === 0 ? (
             <div className="text-center py-8 bg-[#121212] rounded-xl border border-gray-800 border-dashed">
                <p className="text-gray-500 text-sm">Nenhuma transação encontrada com o nome "{client.name}".</p>
                <p className="text-xs text-gray-600 mt-1">Certifique-se de que o nome do cliente esteja na descrição dos lançamentos.</p>
             </div>
          ) : (
             <div className="bg-[#121212] rounded-xl border border-gray-800 overflow-hidden">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="bg-[#1E1E1E] text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800">
                         <th className="p-3 font-medium">Data</th>
                         <th className="p-3 font-medium">Descrição</th>
                         <th className="p-3 font-medium">Categoria</th>
                         <th className="p-3 font-medium text-center">Status</th>
                         <th className="p-3 font-medium text-right">Valor</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-800">
                      {clientTransactions.map(t => {
                         const isPaid = t.status === TransactionStatus.PAID;
                         return (
                         <tr key={t.id} className={`hover:bg-gray-800/50 transition-colors ${!isPaid ? 'opacity-90' : ''}`}>
                            <td className="p-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(t.date)}</td>
                            <td className="p-3 text-sm text-white">{t.description}</td>
                            <td className="p-3 text-xs text-gray-400 whitespace-nowrap">
                               <span className="bg-[#1E1E1E] px-2 py-1 rounded border border-gray-700">{t.category}</span>
                            </td>
                            <td className="p-3 text-center whitespace-nowrap">
                               {onToggleStatus ? (
                                  <button
                                     type="button"
                                     onClick={() => handleStatusClick(t)}
                                     className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border transition-all ${
                                        isPaid
                                           ? 'bg-vybe-green/10 text-vybe-green border-vybe-green/20 hover:bg-vybe-green hover:text-white'
                                           : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500 hover:text-white'
                                     }`}
                                     title={isPaid ? 'Pago — clique para voltar a pendente' : 'Pendente — clique para dar baixa (total ou parcial)'}
                                  >
                                     {isPaid ? <CheckCircle size={10} /> : <Clock size={10} />}
                                     {isPaid ? 'Pago' : 'Pendente'}
                                  </button>
                               ) : isPaid ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-vybe-green/10 text-vybe-green border border-vybe-green/20">
                                     <CheckCircle size={10} /> Pago
                                  </span>
                               ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                     <Clock size={10} /> Pendente
                                  </span>
                               )}
                            </td>
                            <td className="p-3 text-sm font-medium text-right whitespace-nowrap">
                               <div className="flex items-center justify-end gap-1">
                                  {t.type === TransactionType.INCOME ? (
                                     <TrendingUp size={12} className={isPaid ? 'text-vybe-green' : 'text-yellow-500'} />
                                  ) : (
                                     <TrendingDown size={12} className={isPaid ? 'text-vybe-red' : 'text-yellow-500'} />
                                  )}
                                  <span className={isPaid ? (t.type === TransactionType.INCOME ? 'text-vybe-green' : 'text-vybe-red') : 'text-yellow-500'}>
                                     {t.type === TransactionType.EXPENSE && '- '}
                                     {formatCurrency(t.amount)}
                                  </span>
                               </div>
                            </td>
                         </tr>
                         );
                      })}
                   </tbody>
                </table>
             </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 bg-[#1E1E1E] border-t border-gray-800 text-center">
             <p className="text-[10px] text-gray-500">
                * Transações vinculadas por cliente ou pelo nome "{client.name}" na descrição. Totais e LTV consideram apenas lançamentos pagos.
             </p>
        </div>
      </div>
    </div>
  );
};

export default ClientHistoryModal;