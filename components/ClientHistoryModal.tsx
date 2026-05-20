import React, { useMemo } from 'react';
import { Client, Transaction, TransactionType } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { X, History, TrendingUp, TrendingDown, FileText, Gem } from 'lucide-react';

interface ClientHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  transactions: Transaction[];
}

const ClientHistoryModal: React.FC<ClientHistoryModalProps> = ({ isOpen, onClose, client, transactions }) => {
  if (!isOpen || !client) return null;

  const clientTransactions = useMemo(() => {
    const term = client.name.toLowerCase();
    return transactions.filter(
      (t) => t.clientId === client.id || t.description.toLowerCase().includes(term)
    );
  }, [client, transactions]);

  const stats = useMemo(() => {
    const totals = clientTransactions.reduce(
      (acc, curr) => {
        if (curr.type === TransactionType.INCOME) {
          acc.totalIncome += curr.amount;
          acc.balance += curr.amount;
          acc.incomeMonths.add(curr.date.slice(0, 7));
        } else {
          acc.totalExpense += curr.amount;
          acc.balance -= curr.amount;
        }
        return acc;
      },
      {
        totalIncome: 0,
        totalExpense: 0,
        balance: 0,
        incomeMonths: new Set<string>(),
      }
    );

    const monthsActive = totals.incomeMonths.size;
    const ltv = totals.totalIncome;
    const avgMonthlyLtv = monthsActive > 0 ? ltv / monthsActive : 0;

    return {
      totalIncome: totals.totalIncome,
      totalExpense: totals.totalExpense,
      balance: totals.balance,
      ltv,
      monthsActive,
      avgMonthlyLtv,
    };
  }, [clientTransactions]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
             <div className="bg-[#121212] p-4 rounded-xl border border-gray-800">
                <span className="text-xs text-gray-500 block mb-1">Total Recebido</span>
                <span className="text-lg font-bold text-vybe-green">{formatCurrency(stats.totalIncome)}</span>
             </div>
             <div className="bg-[#121212] p-4 rounded-xl border border-gray-800">
                <span className="text-xs text-gray-500 block mb-1 flex items-center gap-1">
                  <Gem size={12} className="text-vybe-accent" /> LTV (Lifetime Value)
                </span>
                <span className="text-lg font-bold text-vybe-accent">{formatCurrency(stats.ltv)}</span>
                <span className="text-[10px] text-gray-500 block mt-1">
                  {stats.monthsActive} {stats.monthsActive === 1 ? 'mês' : 'meses'} · média {formatCurrency(stats.avgMonthlyLtv)}/mês
                </span>
             </div>
             <div className="bg-[#121212] p-4 rounded-xl border border-gray-800">
                <span className="text-xs text-gray-500 block mb-1">Custos Vinculados</span>
                <span className="text-lg font-bold text-vybe-red">{formatCurrency(stats.totalExpense)}</span>
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
                         <th className="p-3 font-medium text-right">Valor</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-800">
                      {clientTransactions.map(t => (
                         <tr key={t.id} className="hover:bg-gray-800/50 transition-colors">
                            <td className="p-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(t.date)}</td>
                            <td className="p-3 text-sm text-white">{t.description}</td>
                            <td className="p-3 text-xs text-gray-400 whitespace-nowrap">
                               <span className="bg-[#1E1E1E] px-2 py-1 rounded border border-gray-700">{t.category}</span>
                            </td>
                            <td className="p-3 text-sm font-medium text-right whitespace-nowrap">
                               <div className="flex items-center justify-end gap-1">
                                  {t.type === TransactionType.INCOME ? (
                                     <TrendingUp size={12} className="text-vybe-green" />
                                  ) : (
                                     <TrendingDown size={12} className="text-vybe-red" />
                                  )}
                                  <span className={t.type === TransactionType.INCOME ? 'text-vybe-green' : 'text-vybe-red'}>
                                     {t.type === TransactionType.EXPENSE && '- '}
                                     {formatCurrency(t.amount)}
                                  </span>
                               </div>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 bg-[#1E1E1E] border-t border-gray-800 text-center">
             <p className="text-[10px] text-gray-500">
                * Transações vinculadas por cliente ou pelo nome "{client.name}" na descrição. LTV = receitas acumuladas do cliente.
             </p>
        </div>
      </div>
    </div>
  );
};

export default ClientHistoryModal;