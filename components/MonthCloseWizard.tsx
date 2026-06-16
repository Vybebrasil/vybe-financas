import React, { useMemo, useState } from 'react';
import { Lock, Unlock, CalendarCheck, AlertCircle } from 'lucide-react';
import { Transaction } from '../types';
import { PeriodClosure, monthKeyFromDate, countPendingInMonth } from '../src/services/periodClosure';
import { computeDashboardSummary } from '../src/services/summary';
import { getTransactionFilterDate } from '../src/services/transactionDates';
import { formatCurrency } from '../utils';
import { api } from '../src/services/api';
import { useToast } from './ToastProvider';

interface MonthCloseWizardProps {
  transactions: Transaction[];
  closures: PeriodClosure[];
  onClosed: () => void;
}

function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

const MonthCloseWizard: React.FC<MonthCloseWizardProps> = ({
  transactions,
  closures,
  onClosed,
}) => {
  const toast = useToast();
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const targetMonthKey = useMemo(() => {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const isClosed = closures.some((c) => c.monthKey === targetMonthKey);
  const pendingCount = countPendingInMonth(transactions, targetMonthKey);

  const monthTransactions = useMemo(
    () =>
      transactions.filter((t) => getTransactionFilterDate(t).startsWith(targetMonthKey)),
    [transactions, targetMonthKey],
  );

  const summary = useMemo(() => computeDashboardSummary(monthTransactions), [monthTransactions]);

  const handleClose = async () => {
    if (pendingCount > 0) {
      toast.error(`Ainda há ${pendingCount} lançamento(s) pendente(s) neste mês.`);
      return;
    }
    setBusy(true);
    try {
      await api.closures.close(targetMonthKey, notes);
      toast.success(`Mês ${formatMonthLabel(targetMonthKey)} fechado.`);
      setNotes('');
      onClosed();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao fechar o mês.');
    } finally {
      setBusy(false);
    }
  };

  const handleReopen = async () => {
    setBusy(true);
    try {
      await api.closures.reopen(targetMonthKey);
      toast.success('Mês reaberto para edição.');
      onClosed();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao reabrir o mês.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-vybe-card border border-gray-800 rounded-xl p-6 shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        <CalendarCheck size={20} className="text-vybe-accent" />
        <h2 className="text-lg font-bold text-white">Fechamento de mês</h2>
      </div>
      <p className="text-sm text-gray-400 mb-4 capitalize">
        Período: {formatMonthLabel(targetMonthKey)}
        {isClosed && (
          <span className="ml-2 inline-flex items-center gap-1 text-green-400 text-xs bg-green-500/10 px-2 py-0.5 rounded-full">
            <Lock size={12} /> Fechado
          </span>
        )}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-[#121212] rounded-lg p-3 border border-gray-800">
          <p className="text-[10px] text-gray-500 uppercase">Receitas</p>
          <p className="text-green-400 font-bold">{formatCurrency(summary.totalIncome)}</p>
        </div>
        <div className="bg-[#121212] rounded-lg p-3 border border-gray-800">
          <p className="text-[10px] text-gray-500 uppercase">Despesas</p>
          <p className="text-red-400 font-bold">{formatCurrency(summary.totalExpense)}</p>
        </div>
        <div className="bg-[#121212] rounded-lg p-3 border border-gray-800">
          <p className="text-[10px] text-gray-500 uppercase">Saldo</p>
          <p className="text-white font-bold">{formatCurrency(summary.balance)}</p>
        </div>
        <div className="bg-[#121212] rounded-lg p-3 border border-gray-800">
          <p className="text-[10px] text-gray-500 uppercase">Pendentes</p>
          <p className={pendingCount > 0 ? 'text-amber-400 font-bold' : 'text-gray-400 font-bold'}>
            {pendingCount}
          </p>
        </div>
      </div>

      {pendingCount > 0 && !isClosed && (
        <div className="flex items-start gap-2 text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-sm mb-4">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>Resolva os lançamentos pendentes antes de fechar o período.</span>
        </div>
      )}

      {!isClosed && (
        <>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observações do fechamento (opcional)"
            rows={2}
            className="w-full bg-[#121212] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white mb-3 focus:border-vybe-accent focus:outline-none resize-none"
          />
          <button
            type="button"
            onClick={() => void handleClose()}
            disabled={busy || pendingCount > 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-vybe-accent hover:bg-orange-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <Lock size={16} />
            Fechar {formatMonthLabel(targetMonthKey)}
          </button>
        </>
      )}

      {isClosed && (
        <button
          type="button"
          onClick={() => void handleReopen()}
          disabled={busy}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-600 hover:bg-gray-800 text-gray-300 rounded-lg text-sm disabled:opacity-50"
        >
          <Unlock size={16} />
          Reabrir período
        </button>
      )}

      {closures.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-800">
          <p className="text-xs text-gray-500 uppercase mb-2">Histórico de fechamentos</p>
          <ul className="space-y-1 text-sm text-gray-400">
            {closures.slice(0, 6).map((c) => (
              <li key={c.id} className="flex justify-between">
                <span className="capitalize">{formatMonthLabel(c.monthKey)}</span>
                <span className="text-xs text-gray-600">
                  {new Date(c.closedAt).toLocaleDateString('pt-BR')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export { monthKeyFromDate };
export default MonthCloseWizard;
