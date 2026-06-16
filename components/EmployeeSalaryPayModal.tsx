import React, { useEffect, useState } from 'react';
import { Employee, TransactionStatus } from '../types';
import { EmployeePayrollBreakdown } from '../src/services/employeePayroll';
import { todayIsoDate } from '../src/services/recurringLogic';
import { formatCurrency } from '../utils';
import { X, DollarSign, Loader2 } from 'lucide-react';

interface EmployeeSalaryPayModalProps {
  isOpen: boolean;
  employee: Employee | null;
  payroll: EmployeePayrollBreakdown | null;
  onClose: () => void;
  onSubmit: (payload: {
    amount: number;
    date: string;
    status: TransactionStatus;
    isPartial: boolean;
  }) => Promise<void>;
}

const EmployeeSalaryPayModal: React.FC<EmployeeSalaryPayModalProps> = ({
  isOpen,
  employee,
  payroll,
  onClose,
  onSubmit,
}) => {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIsoDate());
  const [asPending, setAsPending] = useState(false);
  const [busy, setBusy] = useState(false);

  const maxAmount = payroll?.amountToPay ?? 0;

  useEffect(() => {
    if (isOpen && payroll) {
      setAmount(maxAmount > 0 ? String(maxAmount) : '');
      setDate(todayIsoDate());
      setAsPending(false);
    }
  }, [isOpen, payroll, maxAmount]);

  if (!isOpen || !employee || !payroll || maxAmount <= 0) return null;

  const parsedAmount = parseFloat(amount.replace(',', '.')) || 0;
  const isPartial = parsedAmount > 0 && parsedAmount < maxAmount - 0.009;
  const remainingAfter = Math.max(0, maxAmount - parsedAmount);

  const setFraction = (pct: number) => {
    const value = Math.round(maxAmount * pct * 100) / 100;
    setAmount(String(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0 || parsedAmount > maxAmount + 0.009) return;

    setBusy(true);
    try {
      await onSubmit({
        amount: parsedAmount,
        date,
        status: asPending ? TransactionStatus.PENDING : TransactionStatus.PAID,
        isPartial,
      });
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
              <DollarSign className="text-green-400" size={20} />
              Pagar salário
            </h3>
            <p className="text-xs text-gray-500 mt-1">{employee.name}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
          <div className="bg-[#121212] rounded-lg p-2.5 border border-gray-800">
            <span className="text-gray-500 block">Salário + bônus</span>
            <span className="text-white font-medium">
              {formatCurrency(payroll.salary + payroll.bonus)}
            </span>
          </div>
          <div className="bg-[#121212] rounded-lg p-2.5 border border-gray-800">
            <span className="text-gray-500 block">A pagar agora</span>
            <span className="text-amber-400 font-bold">{formatCurrency(maxAmount)}</span>
          </div>
          {payroll.salaryPaid > 0 && (
            <div className="bg-[#121212] rounded-lg p-2.5 border border-gray-800 col-span-2">
              <span className="text-gray-500 block">Já pago no mês</span>
              <span className="text-gray-300">{formatCurrency(payroll.salaryPaid)}</span>
            </div>
          )}
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Valor do pagamento (R$)</label>
            <input
              type="number"
              min="0.01"
              max={maxAmount}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full bg-[#121212] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:border-vybe-accent outline-none"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                type="button"
                onClick={() => setFraction(0.25)}
                className="px-2 py-1 text-[11px] rounded bg-gray-800 text-gray-300 hover:bg-gray-700"
              >
                25%
              </button>
              <button
                type="button"
                onClick={() => setFraction(0.5)}
                className="px-2 py-1 text-[11px] rounded bg-gray-800 text-gray-300 hover:bg-gray-700"
              >
                50%
              </button>
              <button
                type="button"
                onClick={() => setAmount(String(maxAmount))}
                className="px-2 py-1 text-[11px] rounded bg-green-900/30 text-green-400 hover:bg-green-900/50"
              >
                Total ({formatCurrency(maxAmount)})
              </button>
            </div>
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

          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={asPending}
              onChange={(e) => setAsPending(e.target.checked)}
              className="rounded border-gray-600"
            />
            Marcar como pendente (não abate da folha até dar baixa)
          </label>

          {isPartial && !asPending && (
            <p className="text-xs text-gray-400 bg-[#121212] border border-gray-800 rounded-lg px-3 py-2">
              Pagamento parcial: após confirmar, restará{' '}
              <span className="text-amber-400 font-medium">{formatCurrency(remainingAfter)}</span>{' '}
              a pagar neste mês.
            </p>
          )}

          <button
            type="submit"
            disabled={busy || parsedAmount <= 0 || parsedAmount > maxAmount + 0.009}
            className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : null}
            {asPending
              ? 'Registrar pendente'
              : isPartial
                ? `Pagar ${formatCurrency(parsedAmount)} (parcial)`
                : `Pagar ${formatCurrency(parsedAmount)}`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EmployeeSalaryPayModal;
