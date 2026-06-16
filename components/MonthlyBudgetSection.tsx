import React, { useEffect, useState } from 'react';
import { Save, Target } from 'lucide-react';
import { CategoryConfig, TransactionType } from '../types';
import { MonthlyBudget } from '../src/services/budgetMetrics';
import { api } from '../src/services/api';
import { useToast } from './ToastProvider';

interface MonthlyBudgetSectionProps {
  categories: CategoryConfig[];
  monthKey: string;
  initialBudgets: MonthlyBudget[];
  onSaved: () => void;
}

const MonthlyBudgetSection: React.FC<MonthlyBudgetSectionProps> = ({
  categories,
  monthKey,
  initialBudgets,
  onSaved,
}) => {
  const toast = useToast();
  const expenseCategories = categories.filter((c) => c.transactionType === TransactionType.EXPENSE);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const map: Record<string, string> = {};
    for (const cat of expenseCategories) {
      const found = initialBudgets.find((b) => b.monthKey === monthKey && b.category === cat.label);
      map[cat.label] = found ? String(found.amount) : '';
    }
    setAmounts(map);
  }, [expenseCategories, initialBudgets, monthKey]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const items = expenseCategories
        .map((c) => ({
          category: c.label,
          amount: parseFloat(amounts[c.label]?.replace(',', '.') || '0') || 0,
        }))
        .filter((i) => i.amount > 0);
      await api.budgets.save(monthKey, items);
      toast.success('Orçamento salvo.');
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar orçamento.');
    } finally {
      setSaving(false);
    }
  };

  if (expenseCategories.length === 0) return null;

  return (
    <section className="bg-vybe-card border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Target size={18} className="text-vybe-accent" />
          Orçamento mensal
        </h3>
        <span className="text-xs text-gray-500">{monthKey}</span>
      </div>
      <p className="text-sm text-gray-400 mb-4">
        Defina metas de gastos por categoria para comparar com o realizado no dashboard.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {expenseCategories.map((cat) => (
          <label key={cat.id} className="block">
            <span className="text-xs text-gray-500 mb-1 block">{cat.label}</span>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
              <input
                type="text"
                inputMode="decimal"
                value={amounts[cat.label] ?? ''}
                onChange={(e) => setAmounts((prev) => ({ ...prev, [cat.label]: e.target.value }))}
                placeholder="0,00"
                className="w-full bg-[#121212] border border-gray-700 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:border-vybe-accent focus:outline-none"
              />
            </div>
          </label>
        ))}
      </div>
      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving}
        className="inline-flex items-center gap-2 px-4 py-2 bg-vybe-accent hover:bg-orange-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
      >
        <Save size={16} />
        {saving ? 'Salvando...' : 'Salvar orçamento'}
      </button>
    </section>
  );
};

export default MonthlyBudgetSection;
