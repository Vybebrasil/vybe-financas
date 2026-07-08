import React, { useEffect, useMemo, useState } from 'react';
import {
  Subscription,
  Transaction,
  TransactionStatus,
  Category,
  TransactionType,
} from '../types';
import { getSubscriptionPendingForMonth } from '../src/services/subscriptionBilling';
import { getCurrentMonthKey, subscriptionDescriptionFor, todayIsoDate } from '../src/services/recurringLogic';
import { formatCurrency } from '../utils';
import { X, DollarSign, Loader2 } from 'lucide-react';

interface SubscriptionPayModalProps {
  isOpen: boolean;
  subscription: Subscription | null;
  transactions: Transaction[];
  monthKey?: string;
  onClose: () => void;
  onSettlePending: (transactionId: string, paidDate: string, amount: number) => Promise<void>;
  onAddPayment: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
}

const SubscriptionPayModal: React.FC<SubscriptionPayModalProps> = ({
  isOpen,
  subscription,
  transactions,
  monthKey = getCurrentMonthKey(),
  onClose,
  onSettlePending,
  onAddPayment,
}) => {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIsoDate());
  const [busy, setBusy] = useState(false);

  const pendingTx = useMemo(() => {
    if (!subscription) return undefined;
    return getSubscriptionPendingForMonth(subscription, transactions, monthKey);
  }, [subscription, transactions, monthKey]);

  const referenceAmount = pendingTx?.amount ?? subscription?.cost ?? 0;

  useEffect(() => {
    if (isOpen && subscription) {
      setAmount(referenceAmount > 0 ? String(referenceAmount) : '');
      setDate(todayIsoDate());
    }
  }, [isOpen, subscription, referenceAmount]);

  if (!isOpen || !subscription) return null;

  const parsedAmount = parseFloat(amount.replace(',', '.')) || 0;
  const isValid = parsedAmount > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setBusy(true);
    try {
      if (pendingTx) {
        await onSettlePending(pendingTx.id, date, parsedAmount);
      } else {
        await onAddPayment({
          description: subscriptionDescriptionFor(subscription.name),
          amount: parsedAmount,
          category: Category.TOOLS,
          type: TransactionType.EXPENSE,
          date,
          paidDate: date,
          status: TransactionStatus.PAID,
          paymentMethod: subscription.paymentMethod,
        });
      }
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
              Confirmar pagamento
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {subscription.name}
              {pendingTx ? ' · baixa do lançamento pendente' : ' · novo pagamento'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="rounded-lg bg-[#121212] border border-gray-800 p-3 text-xs text-gray-500 space-y-1">
            {pendingTx ? (
              <>
                <p>
                  Pendente no mês:{' '}
                  <span className="text-yellow-500 font-medium">
                    {formatCurrency(pendingTx.amount)}
                  </span>
                </p>
                <p>
                  Valor no cadastro:{' '}
                  <span className="text-gray-400">{formatCurrency(subscription.cost)}</span>
                </p>
              </>
            ) : (
              <p>
                Valor no cadastro:{' '}
                <span className="text-gray-400">{formatCurrency(subscription.cost)}</span>
              </p>
            )}
            <p className="text-[11px] text-gray-600">
              Confirme o valor real pago — assinaturas podem variar de mês em mês.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Valor pago (R$)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                autoFocus
                className="w-full bg-[#121212] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:border-vybe-accent outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Data do pagamento</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-[#121212] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:border-vybe-accent outline-none"
              />
            </div>
          </div>

          {isValid && parsedAmount !== referenceAmount && (
            <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              {pendingTx && parsedAmount < pendingTx.amount
                ? `Baixa parcial: restarão ${formatCurrency(pendingTx.amount - parsedAmount)} pendentes.`
                : `Valor confirmado difere de ${formatCurrency(referenceAmount)}.`}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !isValid}
            className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : null}
            Confirmar pagamento
          </button>
        </form>
      </div>
    </div>
  );
};

export default SubscriptionPayModal;
