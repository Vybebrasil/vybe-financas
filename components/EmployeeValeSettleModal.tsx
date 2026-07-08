import React, { useEffect, useState } from 'react';
import { Employee } from '../types';
import { todayIsoDate } from '../src/services/recurringLogic';
import { formatCurrency } from '../utils';
import { X, Ticket, Loader2 } from 'lucide-react';

interface EmployeeValeSettleModalProps {
  isOpen: boolean;
  employee: Employee | null;
  /** Saldo de vales a abater (total em vales). */
  outstandingVales: number;
  amountToPay: number;
  onClose: () => void;
  onSubmit: (payload: { amount: number; date: string }) => Promise<void>;
}

const EmployeeValeSettleModal: React.FC<EmployeeValeSettleModalProps> = ({
  isOpen,
  employee,
  outstandingVales,
  amountToPay,
  onClose,
  onSubmit,
}) => {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIsoDate());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isOpen && employee) {
      setAmount('');
      setDate(todayIsoDate());
    }
  }, [isOpen, employee]);

  if (!isOpen || !employee) return null;

  const parsedAmount = parseFloat(amount.replace(',', '.')) || 0;
  const exceedsOutstanding = parsedAmount > outstandingVales;
  const exceedsPayroll = parsedAmount > amountToPay && amountToPay > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0 || exceedsOutstanding) return;

    setBusy(true);
    try {
      await onSubmit({ amount: parsedAmount, date });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-vybe-card border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-bar-grow origin-center">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Ticket className="text-green-400" size={20} />
              Baixar vale
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {employee.name} · Total em vales:{' '}
              <span className="text-yellow-400 font-medium">{formatCurrency(outstandingVales)}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        {outstandingVales <= 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            Não há saldo de vales para abater neste colaborador.
          </p>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Valor a abater (R$)</label>
                <input
                  type="number"
                  min="0.01"
                  max={outstandingVales}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  required
                  className="w-full bg-[#121212] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:border-vybe-accent outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Data</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full bg-[#121212] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:border-vybe-accent outline-none"
                />
              </div>
            </div>

            {exceedsOutstanding && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                O valor não pode ser maior que o total em vales ({formatCurrency(outstandingVales)}).
              </p>
            )}

            {exceedsPayroll && !exceedsOutstanding && (
              <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                O valor é maior que o saldo a pagar no mês ({formatCurrency(amountToPay)}). O abatimento
                reduzirá o que falta pagar de salário.
              </p>
            )}

            <p className="text-[11px] text-gray-600">
              O valor abatido reduz o <strong className="text-gray-500">Total em vales</strong> e desconta do
              salário &quot;A pagar&quot; do mês.
            </p>

            <button
              type="submit"
              disabled={busy || parsedAmount <= 0 || exceedsOutstanding}
              className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : null}
              Baixar vale
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default EmployeeValeSettleModal;
