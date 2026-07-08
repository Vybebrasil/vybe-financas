import React, { useEffect, useState } from 'react';
import { Employee, TransactionStatus } from '../types';
import {
  EMPLOYEE_VALE_PRESETS,
  buildValeDescription,
} from '../src/services/employeePayroll';
import { todayIsoDate } from '../src/services/recurringLogic';
import { formatCurrency } from '../utils';
import { X, Ticket, Loader2 } from 'lucide-react';

interface EmployeeValeModalProps {
  isOpen: boolean;
  employee: Employee | null;
  amountToPay: number;
  onClose: () => void;
  onSubmit: (payload: {
    description: string;
    amount: number;
    date: string;
    status: TransactionStatus;
  }) => Promise<void>;
  /** Título do modal (padrão: Registrar vale) */
  heading?: string;
  /** Rótulo do botão quando o vale é pago na hora */
  submitPaidLabel?: string;
}

const EmployeeValeModal: React.FC<EmployeeValeModalProps> = ({
  isOpen,
  employee,
  amountToPay,
  onClose,
  onSubmit,
  heading = 'Registrar vale',
  submitPaidLabel = 'Registrar e descontar da folha',
}) => {
  const [preset, setPreset] = useState<string>(EMPLOYEE_VALE_PRESETS[0]);
  const [customLabel, setCustomLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIsoDate());
  const [asPending, setAsPending] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isOpen && employee) {
      setPreset(EMPLOYEE_VALE_PRESETS[0]);
      setCustomLabel('');
      setAmount('');
      setDate(todayIsoDate());
      setAsPending(false);
    }
  }, [isOpen, employee]);

  if (!isOpen || !employee) return null;

  const isOther = preset === 'Outro';
  const parsedAmount = parseFloat(amount.replace(',', '.')) || 0;
  const exceedsPayroll = parsedAmount > amountToPay && amountToPay > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0) return;

    const description = buildValeDescription(
      preset,
      employee.name,
      isOther ? customLabel : preset,
    );

    setBusy(true);
    try {
      await onSubmit({
        description,
        amount: parsedAmount,
        date,
        status: asPending ? TransactionStatus.PENDING : TransactionStatus.PAID,
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
              <Ticket className="text-vybe-accent" size={20} />
              {heading}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {employee.name} · A pagar: {formatCurrency(amountToPay)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Tipo de vale</label>
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
              className="w-full bg-[#121212] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:border-vybe-accent outline-none"
            >
              {EMPLOYEE_VALE_PRESETS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
              <option value="Outro">Outro</option>
            </select>
          </div>

          {isOther && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">Descrição</label>
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="Ex.: Uniforme, ferramenta..."
                className="w-full bg-[#121212] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:border-vybe-accent outline-none"
                required
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Valor (R$)</label>
              <input
                type="number"
                min="0.01"
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

          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={asPending}
              onChange={(e) => setAsPending(e.target.checked)}
              className="rounded border-gray-600"
            />
            Marcar como pendente (não desconta da folha até dar baixa)
          </label>

          {exceedsPayroll && !asPending && (
            <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              O valor é maior que o saldo a pagar ({formatCurrency(amountToPay)}). Confirme se é intencional.
            </p>
          )}

          <p className="text-[11px] text-gray-600">
            Vales pagos abatem automaticamente do valor &quot;A pagar&quot; na folha do mês.
          </p>

          <button
            type="submit"
            disabled={busy || parsedAmount <= 0 || (isOther && !customLabel.trim())}
            className="w-full py-2.5 bg-vybe-accent hover:bg-orange-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : null}
            {asPending ? 'Registrar pendente' : submitPaidLabel}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EmployeeValeModal;
