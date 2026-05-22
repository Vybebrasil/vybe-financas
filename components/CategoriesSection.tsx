import React, { useState } from 'react';
import { CategoryConfig, Transaction, TransactionType } from '../types';
import { DEFAULT_CATEGORIES } from '../src/services/categories';
import { generateId } from '../utils';
import { Tag, Plus, Trash2, Pencil, Lock } from 'lucide-react';
import { useToast } from './ToastProvider';

interface CategoriesSectionProps {
  categories: CategoryConfig[];
  transactions: Transaction[];
  onChange: (categories: CategoryConfig[]) => void;
  /** Grava no Supabase ao adicionar/editar/remover (não depende só do botão Salvar). */
  onPersist?: (categories: CategoryConfig[]) => Promise<void>;
}

const CategoriesSection: React.FC<CategoriesSectionProps> = ({
  categories,
  transactions,
  onChange,
  onPersist,
}) => {
  const toast = useToast();
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const list = categories.length > 0 ? categories : [...DEFAULT_CATEGORIES];

  const applyCategories = async (next: CategoryConfig[]) => {
    onChange(next);
    if (!onPersist) return;
    try {
      await onPersist(next);
    } catch (err: unknown) {
      console.error('Erro ao salvar categorias:', err);
      toast.error('Não foi possível salvar as categorias. Tente novamente.');
    }
  };

  const countUsage = (label: string) =>
    transactions.filter((t) => t.category === label).length;

  const handleAdd = () => {
    const label = newLabel.trim();
    if (!label) return;
    if (list.some((c) => c.label.toLowerCase() === label.toLowerCase())) {
      toast.info('Já existe uma categoria com esse nome.');
      return;
    }
    void applyCategories([
      ...list,
      {
        id: generateId(),
        label,
        transactionType: newType,
        locked: false,
      },
    ]);
    setNewLabel('');
  };

  const startEdit = (cat: CategoryConfig) => {
    setEditingId(cat.id);
    setEditLabel(cat.label);
  };

  const saveEdit = (cat: CategoryConfig) => {
    const label = editLabel.trim();
    if (!label) return;
    if (
      list.some((c) => c.id !== cat.id && c.label.toLowerCase() === label.toLowerCase())
    ) {
      toast.info('Já existe uma categoria com esse nome.');
      return;
    }
    const usage = countUsage(cat.label);
    if (usage > 0 && label !== cat.label) {
      toast.info(
        `${usage} lançamento(s) usam o nome antigo. O histórico mantém "${cat.label}" até você editar cada lançamento.`,
      );
    }
    void applyCategories(list.map((c) => (c.id === cat.id ? { ...c, label } : c)));
    setEditingId(null);
  };

  const handleRemove = (cat: CategoryConfig) => {
    if (cat.locked) return;
    const usage = countUsage(cat.label);
    if (usage > 0) {
      toast.error(`Não é possível remover: ${usage} lançamento(s) usam esta categoria.`);
      return;
    }
    void applyCategories(list.filter((c) => c.id !== cat.id));
  };

  const toggleType = (cat: CategoryConfig) => {
    if (cat.locked) return;
    const next =
      cat.transactionType === TransactionType.INCOME
        ? TransactionType.EXPENSE
        : TransactionType.INCOME;
    void applyCategories(list.map((c) => (c.id === cat.id ? { ...c, transactionType: next } : c)));
  };

  return (
    <div className="pt-6 border-t border-gray-800">
      <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
        <Tag size={16} className="text-vybe-accent" />
        Categorias de lançamento
      </h4>
      <p className="text-xs text-gray-500 mb-4">
        Personalize as categorias do extrato e dos relatórios. Categorias do sistema (cadeado)
        alimentam mensalidades e recorrências.
      </p>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
          placeholder="Nova categoria..."
          className="flex-1 bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-vybe-accent"
        />
        <select
          value={newType}
          onChange={(e) => setNewType(e.target.value as TransactionType)}
          className="bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-vybe-accent"
        >
          <option value={TransactionType.EXPENSE}>Saída</option>
          <option value={TransactionType.INCOME}>Entrada</option>
        </select>
        <button
          type="button"
          onClick={handleAdd}
          className="px-4 py-2 bg-vybe-accent hover:bg-[#E65C00] text-white rounded-lg font-bold text-sm flex items-center justify-center gap-1 shrink-0"
        >
          <Plus size={16} /> Adicionar
        </button>
      </div>

      <ul className="space-y-2">
        {list.map((cat) => (
          <li
            key={cat.id}
            className="flex flex-wrap items-center gap-2 bg-[#121212] border border-gray-800 rounded-lg px-3 py-2"
          >
            {cat.locked && <Lock size={14} className="text-gray-500 shrink-0" title="Sistema" />}
            {editingId === cat.id && !cat.locked ? (
              <>
                <input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="flex-1 min-w-[120px] bg-[#1E1E1E] border border-gray-700 rounded px-2 py-1 text-sm text-white"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => saveEdit(cat)}
                  className="text-xs font-bold text-vybe-accent"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="text-xs text-gray-500"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <span className="text-sm text-white font-medium flex-1 min-w-0 truncate">
                {cat.label}
              </span>
            )}
            <button
              type="button"
              onClick={() => toggleType(cat)}
              disabled={cat.locked}
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                cat.transactionType === TransactionType.INCOME
                  ? 'bg-vybe-green/15 text-vybe-green'
                  : 'bg-vybe-red/15 text-vybe-red'
              } ${cat.locked ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-80'}`}
              title={cat.locked ? 'Tipo fixo (sistema)' : 'Alternar entrada/saída'}
            >
              {cat.transactionType === TransactionType.INCOME ? 'Entrada' : 'Saída'}
            </button>
            {!cat.locked && editingId !== cat.id && (
              <>
                <button
                  type="button"
                  onClick={() => startEdit(cat)}
                  className="p-1.5 text-gray-500 hover:text-white rounded"
                  title="Renomear"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(cat)}
                  className="p-1.5 text-gray-500 hover:text-red-500 rounded"
                  title="Remover"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CategoriesSection;
