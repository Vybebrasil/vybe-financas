import React, { useEffect, useMemo, useState } from 'react';
import {
  BankAccount,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../types';
import { generateId } from '../utils';
import { ArrowLeftRight, CreditCard, Save } from 'lucide-react';
import { TRANSFER_CATEGORY_LABEL } from '../src/services/transfers';

interface TransferFormProps {
  bankAccounts: BankAccount[];
  onAddTransfer: (transaction: Transaction) => Promise<void>;
  onUpdateTransfer?: (transaction: Transaction) => Promise<void>;
  editingTransaction?: Transaction | null;
  onCancelEdit?: () => void;
}

const TransferForm: React.FC<TransferFormProps> = ({
  bankAccounts,
  onAddTransfer,
  onUpdateTransfer,
  editingTransaction,
  onCancelEdit,
}) => {
  const isEditing =
    Boolean(editingTransaction) && editingTransaction?.type === TransactionType.TRANSFER;

  const checkingAccounts = useMemo(
    () => bankAccounts.filter((a) => (a.accountType ?? 'checking') !== 'credit_card'),
    [bankAccounts],
  );
  const cardAccounts = useMemo(
    () => bankAccounts.filter((a) => a.accountType === 'credit_card'),
    [bankAccounts],
  );

  const defaultFromId =
    checkingAccounts.find((a) => a.isDefault)?.id ??
    checkingAccounts[0]?.id ??
    bankAccounts.find((a) => a.isDefault)?.id ??
    bankAccounts[0]?.id ??
    '';
  const defaultToId = cardAccounts[0]?.id ?? '';

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [fromAccountId, setFromAccountId] = useState(defaultFromId);
  const [toAccountId, setToAccountId] = useState(defaultToId);
  const [status, setStatus] = useState<TransactionStatus>(TransactionStatus.PAID);
  const [preset, setPreset] = useState<'default' | 'card_bill'>('default');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEditing || !editingTransaction) return;
    setAmount(String(editingTransaction.amount));
    setDate(editingTransaction.date.split('T')[0]);
    setDescription(editingTransaction.description);
    setFromAccountId(editingTransaction.bankAccountId ?? '');
    setToAccountId(editingTransaction.transferToAccountId ?? '');
    setStatus(editingTransaction.status);
    setPreset('default');
  }, [isEditing, editingTransaction]);

  useEffect(() => {
    if (isEditing || bankAccounts.length === 0) return;
    if (!fromAccountId && defaultFromId) setFromAccountId(defaultFromId);
    if (!toAccountId && defaultToId) setToAccountId(defaultToId);
  }, [isEditing, bankAccounts, defaultFromId, defaultToId, fromAccountId, toAccountId]);

  const applyCardBillPreset = () => {
    setPreset('card_bill');
    const from =
      checkingAccounts.find((a) => a.isDefault)?.id ??
      checkingAccounts[0]?.id ??
      defaultFromId;
    const to = cardAccounts[0]?.id ?? defaultToId;
    if (from) setFromAccountId(from);
    if (to) setToAccountId(to);
    const monthLabel = new Date().toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });
    setDescription(`Pagamento fatura cartão — ${monthLabel}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !date || !fromAccountId || !toAccountId) return;
    if (fromAccountId === toAccountId) return;

    const fromName = bankAccounts.find((a) => a.id === fromAccountId)?.name ?? 'Origem';
    const toName = bankAccounts.find((a) => a.id === toAccountId)?.name ?? 'Destino';

    const payload: Transaction = {
      id: editingTransaction?.id ?? generateId(),
      description: description.trim() || `Transferência: ${fromName} → ${toName}`,
      amount: Number(amount),
      type: TransactionType.TRANSFER,
      category: TRANSFER_CATEGORY_LABEL,
      date,
      status,
      bankAccountId: fromAccountId,
      transferToAccountId: toAccountId,
      paymentMethod: 'OUTRO',
    };

    setSaving(true);
    try {
      if (isEditing && onUpdateTransfer) {
        await onUpdateTransfer(payload);
        onCancelEdit?.();
      } else {
        await onAddTransfer(payload);
        setAmount('');
        setDescription('');
        setPreset('default');
        setStatus(TransactionStatus.PAID);
      }
    } finally {
      setSaving(false);
    }
  };

  if (bankAccounts.length < 2) {
    return (
      <section className="bg-vybe-card border border-gray-800 rounded-xl p-6 shadow-lg">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
          <ArrowLeftRight size={20} className="text-sky-400" />
          Transferência entre contas
        </h2>
        <p className="text-sm text-gray-500">
          Cadastre pelo menos duas contas em Configurações para registrar transferências (ex.:
          corrente e cartão).
        </p>
      </section>
    );
  }

  return (
    <section className="bg-vybe-card border border-gray-800 rounded-xl p-6 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ArrowLeftRight size={20} className="text-sky-400" />
            {isEditing ? 'Editar transferência' : 'Transferência entre contas'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Move valor entre contas sem duplicar despesas. Use para pagar a fatura do cartão.
          </p>
        </div>
        {!isEditing && cardAccounts.length > 0 && checkingAccounts.length > 0 && (
          <button
            type="button"
            onClick={applyCardBillPreset}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border border-sky-500/40 text-sky-300 hover:bg-sky-500/10 transition-colors shrink-0"
          >
            <CreditCard size={14} />
            Pagamento fatura do cartão
          </button>
        )}
      </div>

      {preset === 'card_bill' && !isEditing && (
        <p className="text-xs text-sky-400/90 bg-sky-500/10 border border-sky-500/20 rounded-lg px-3 py-2 mb-4">
          Registre as compras do cartão como <strong>despesas</strong> na conta do cartão. Esta
          transferência apenas quita a fatura — não entra no total de gastos.
        </p>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Conta de origem</label>
          <select
            value={fromAccountId}
            onChange={(e) => setFromAccountId(e.target.value)}
            className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-sky-400 outline-none"
            required
          >
            <option value="">Selecione...</option>
            {bankAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">Conta de destino</label>
          <select
            value={toAccountId}
            onChange={(e) => setToAccountId(e.target.value)}
            className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-sky-400 outline-none"
            required
          >
            <option value="">Selecione...</option>
            {bankAccounts
              .filter((a) => a.id !== fromAccountId)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">Valor</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-sky-400 outline-none"
            required
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">Data</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-sky-400 outline-none"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-xs text-gray-500 block mb-1">Descrição</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Pagamento fatura cartão — junho/2026"
            className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-sky-400 outline-none"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TransactionStatus)}
            className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-sky-400 outline-none"
          >
            <option value={TransactionStatus.PAID}>Realizada</option>
            <option value={TransactionStatus.PENDING}>Agendada</option>
          </select>
        </div>

        <div className="flex items-end gap-2 md:col-span-2">
          {isEditing && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-4 py-3 text-sm text-gray-400 hover:text-white"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={saving || fromAccountId === toAccountId}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-colors"
          >
            <Save size={16} />
            {saving ? 'Salvando...' : isEditing ? 'Atualizar transferência' : 'Registrar transferência'}
          </button>
        </div>
      </form>
    </section>
  );
};

export default TransferForm;
