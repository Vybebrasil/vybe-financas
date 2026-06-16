import React, { useMemo } from 'react';
import { AlertTriangle, Target } from 'lucide-react';
import { Transaction } from '../types';
import { MonthlyBudget, computeBudgetVsActual } from '../src/services/budgetMetrics';
import { formatCurrency } from '../utils';

interface BudgetVsActualSectionProps {
  transactions: Transaction[];
  budgets: MonthlyBudget[];
  monthKey: string;
}

const BudgetVsActualSection: React.FC<BudgetVsActualSectionProps> = ({
  transactions,
  budgets,
  monthKey,
}) => {
  const rows = useMemo(
    () => computeBudgetVsActual(budgets, transactions, monthKey),
    [budgets, transactions, monthKey],
  );

  const withBudget = rows.filter((r) => r.budget > 0 || r.actual > 0);
  if (withBudget.length === 0) return null;

  const overBudget = withBudget.filter((r) => r.budget > 0 && r.actual > r.budget);

  return (
    <section className="bg-vybe-card border border-gray-800 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Target size={20} className="text-vybe-accent" />
          Orçamento vs. realizado
        </h2>
        <span className="text-xs text-gray-500">{monthKey}</span>
      </div>

      {overBudget.length > 0 && (
        <div className="mb-4 flex items-start gap-2 text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-sm">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>
            {overBudget.length} categoria(s) acima do orçamento:{' '}
            {overBudget.map((r) => r.category).join(', ')}
          </span>
        </div>
      )}

      <div className="space-y-4">
        {withBudget.slice(0, 8).map((row) => {
          const pct = Math.min(row.pctUsed, 100);
          const barColor =
            row.budget > 0 && row.actual > row.budget
              ? 'bg-red-500'
              : row.pctUsed >= 85
                ? 'bg-amber-500'
                : 'bg-vybe-accent';

          return (
            <div key={row.category}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-300 truncate pr-2">{row.category}</span>
                <span className="text-gray-400 whitespace-nowrap text-xs">
                  {formatCurrency(row.actual)}
                  {row.budget > 0 && (
                    <span className="text-gray-600"> / {formatCurrency(row.budget)}</span>
                  )}
                </span>
              </div>
              {row.budget > 0 && (
                <div className="h-2 bg-[#121212] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default BudgetVsActualSection;
