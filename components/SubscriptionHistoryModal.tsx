import React, { useMemo } from 'react';
import { Subscription, Transaction, TransactionType } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { X, History, TrendingDown, Laptop } from 'lucide-react';

interface SubscriptionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: Subscription | null;
  transactions: Transaction[];
}

const SubscriptionHistoryModal: React.FC<SubscriptionHistoryModalProps> = ({ isOpen, onClose, subscription, transactions }) => {
  if (!isOpen || !subscription) return null;

  // Filtra transações onde a descrição contém o nome da assinatura (case insensitive)
  // e que sejam do tipo EXPENSE (Saída)
  const subTransactions = useMemo(() => {
    const term = subscription.name.toLowerCase();
    return transactions.filter(t => 
        t.type === TransactionType.EXPENSE &&
        t.description.toLowerCase().includes(term)
    );
  }, [subscription, transactions]);

  // Calcula total gasto
  const totalSpent = useMemo(() => {
    return subTransactions.reduce((acc, curr) => acc + curr.amount, 0);
  }, [subTransactions]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-vybe-card border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-bar-grow origin-center max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-[#2A2A2A] p-4 flex justify-between items-center border-b border-gray-700 shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center border border-gray-700">
                <Laptop className="text-vybe-accent" size={20} />
             </div>
             <div>
                <h3 className="text-white font-bold text-lg">Histórico de Pagamentos</h3>
                <p className="text-xs text-gray-400">Software: <span className="text-white font-medium">{subscription.name}</span></p>
             </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors bg-gray-800 p-2 rounded-full hover:bg-gray-700">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          
          {/* Stats Card */}
          <div className="bg-[#121212] p-4 rounded-xl border border-gray-800 mb-6 flex justify-between items-center">
             <div>
                <span className="text-xs text-gray-500 block mb-1">Custo Total Acumulado</span>
                <span className="text-xl font-bold text-vybe-red">{formatCurrency(totalSpent)}</span>
             </div>
             <div className="text-right">
                <span className="text-xs text-gray-500 block mb-1">Pagamentos Realizados</span>
                <span className="text-lg font-bold text-white">{subTransactions.length}</span>
             </div>
          </div>

          <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <History size={16} className="text-vybe-muted" />
            Extrato de Lançamentos
          </h4>

          {subTransactions.length === 0 ? (
             <div className="text-center py-8 bg-[#121212] rounded-xl border border-gray-800 border-dashed">
                <p className="text-gray-500 text-sm">Nenhum pagamento registrado para "{subscription.name}".</p>
                <p className="text-xs text-gray-600 mt-1">Utilize o botão "Lançar" no card do software para registrar pagamentos.</p>
             </div>
          ) : (
             <div className="bg-[#121212] rounded-xl border border-gray-800 overflow-hidden">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="bg-[#1E1E1E] text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800">
                         <th className="p-3 font-medium">Data</th>
                         <th className="p-3 font-medium">Descrição</th>
                         <th className="p-3 font-medium text-right">Valor</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-800">
                      {subTransactions.map(t => (
                         <tr key={t.id} className="hover:bg-gray-800/50 transition-colors">
                            <td className="p-3 text-xs text-gray-400 font-mono">{formatDate(t.date)}</td>
                            <td className="p-3 text-sm text-white">{t.description}</td>
                            <td className="p-3 text-sm font-medium text-right whitespace-nowrap">
                               <div className="flex items-center justify-end gap-1 text-vybe-red">
                                  <TrendingDown size={12} />
                                  <span>- {formatCurrency(t.amount)}</span>
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
                * O histórico baseia-se em despesas que contêm o nome "{subscription.name}" na descrição.
             </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionHistoryModal;