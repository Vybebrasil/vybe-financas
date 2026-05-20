import React, { useMemo, useState } from 'react';
import { BankAccount, Transaction, TransactionStatus, TransactionType } from '../types';
import { formatCurrency, generateId } from '../utils';
import { Building2, Plus, Pencil, Trash2, Star } from 'lucide-react';

interface BankAccountsSectionProps {
  accounts: BankAccount[];
  transactions: Transaction[];
  onAdd: (account: BankAccount) => Promise<void>;
  onUpdate: (account: BankAccount) => Promise<void>;
  onDelete: (id: string) => void;
}

function computeBalance(account: BankAccount, transactions: Transaction[]): number {
  const delta = transactions
    .filter((t) => t.bankAccountId === account.id && t.status === TransactionStatus.PAID)
    .reduce((sum, t) => {
      const sign = t.type === TransactionType.INCOME ? 1 : -1;
      return sum + t.amount * sign;
    }, 0);
  return account.initialBalance + delta;
}

const emptyForm = (): BankAccount => ({
  id: '',
  name: '',
  institution: '',
  initialBalance: 0,
  isDefault: false,
});

const BankAccountsSection: React.FC<BankAccountsSectionProps> = ({
  accounts,
  transactions,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const [form, setForm] = useState<BankAccount | null>(null);

  const balances = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of accounts) {
      map.set(a.id, computeBalance(a, transactions));
    }
    return map;
  }, [accounts, transactions]);

  const startNew = () => {
    setForm({ ...emptyForm(), isDefault: accounts.length === 0 });
  };

  const startEdit = (account: BankAccount) => setForm({ ...account });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !form.name.trim()) return;

    if (form.id) {
      await onUpdate(form);
    } else {
      await onAdd({ ...form, id: generateId() });
    }
    setForm(null);
  };

  return (
    <section className="mt-8 pt-8 border-t border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Building2 size={18} className="text-vybe-accent" />
          Contas bancárias
        </h3>
        {!form && (
          <button
            type="button"
            onClick={startNew}
            className="flex items-center gap-1.5 text-xs font-bold text-vybe-accent hover:text-white transition-colors"
          >
            <Plus size={14} /> Nova conta
          </button>
        )}
      </div>

      {accounts.length === 0 && !form && (
        <p className="text-sm text-gray-500 mb-4">
          Cadastre contas para filtrar o extrato e os relatórios por banco.
        </p>
      )}

      <ul className="space-y-2 mb-4">
        {accounts.map((account) => (
          <li
            key={account.id}
            className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#121212] border border-gray-800"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-white flex items-center gap-1.5">
                {account.name}
                {account.isDefault && (
                  <Star size={12} className="text-amber-400 fill-amber-400" title="Conta padrão" />
                )}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {account.institution || 'Sem instituição'} · Saldo:{' '}
                {formatCurrency(balances.get(account.id) ?? account.initialBalance)}
              </p>
            </div>
            <div className="flex gap-1 shrink-0">
              <button
                type="button"
                onClick={() => startEdit(account)}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5"
                title="Editar"
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                onClick={() => onDelete(account.id)}
                className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-white/5"
                title="Excluir"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {form && (
        <form
          onSubmit={handleSubmit}
          className="p-4 rounded-lg bg-[#121212] border border-gray-700 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Nome da conta</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-[#1E1E1E] border border-gray-700 rounded p-2 text-sm text-white"
                placeholder="Ex: Nubank PJ"
                required
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Instituição</label>
              <input
                value={form.institution}
                onChange={(e) => setForm({ ...form, institution: e.target.value })}
                className="w-full bg-[#1E1E1E] border border-gray-700 rounded p-2 text-sm text-white"
                placeholder="Ex: Nubank"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Saldo inicial</label>
              <input
                type="number"
                step="0.01"
                value={form.initialBalance}
                onChange={(e) =>
                  setForm({ ...form, initialBalance: Number(e.target.value) || 0 })
                }
                className="w-full bg-[#1E1E1E] border border-gray-700 rounded p-2 text-sm text-white"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-300 sm:col-span-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                className="rounded border-gray-600"
              />
              Conta padrão para novos lançamentos
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setForm(null)}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold bg-vybe-accent text-white rounded-lg"
            >
              Salvar
            </button>
          </div>
        </form>
      )}
    </section>
  );
};

export default BankAccountsSection;
