import React, { useEffect, useState } from 'react';
import { Transaction, TransactionType } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { getTransactionScheduledDate } from '../src/services/transactionDates';
import ModalPortal from './ModalPortal';
import { Calendar, CheckCircle, X } from 'lucide-react';

interface SettlementDateModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onConfirm: (paidDate: string) => void;
}

const SettlementDateModal: React.FC<SettlementDateModalProps> = ({
  transaction,
  onClose,
  onConfirm,
}) => {
  const [paidDate, setPaidDate] = useState('');

  useEffect(() => {
    if (!transaction) return;
    setPaidDate(new Date().toISOString().split('T')[0]);
  }, [transaction]);

  if (!transaction) return null;

  const scheduledDate = getTransactionScheduledDate(transaction);
  const isIncome = transaction.type === TransactionType.INCOME;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paidDate) return;
    onConfirm(paidDate);
  };

  return (
    <ModalPortal isOpen={Boolean(transaction)} onClose={onClose}>
      <div className="bg-vybe-card border border-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-vybe-green" />
            <h3 className="text-lg font-bold text-white">
              {isIncome ? 'Confirmar recebimento' : 'Confirmar pagamento'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="rounded-lg bg-[#121212] border border-gray-800 p-4 space-y-1">
            <p className="text-sm font-medium text-white truncate">{transaction.description}</p>
            <p className="text-xs text-gray-400">
              Valor:{' '}
              <span className={isIncome ? 'text-vybe-green' : 'text-vybe-red'}>
                {formatCurrency(transaction.amount)}
              </span>
            </p>
            <p className="text-xs text-gray-500">
              Data prevista: {formatDate(scheduledDate)}
            </p>
          </div>

          <div>
            <label className="block text-xs text-vybe-muted mb-1.5 font-medium">
              Data real da baixa
            </label>
            <div className="relative">
              <Calendar
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
              <input
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                required
                className="w-full bg-[#121212] border border-gray-700 rounded-lg py-3 pl-10 pr-3 text-white focus:outline-none focus:border-vybe-accent focus:ring-1 focus:ring-vybe-accent"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-lg bg-vybe-green text-white hover:bg-vybe-green/90 transition-colors text-sm font-bold"
            >
              Confirmar baixa
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
};

export default SettlementDateModal;
