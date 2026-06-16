import React, { useMemo } from 'react';
import { Client, Transaction } from '../types';
import { computeClientMargins } from '../src/services/clientMargin';
import { formatCurrency } from '../utils';
import { TrendingUp, TrendingDown, Users } from 'lucide-react';

interface ClientMarginSectionProps {
  clients: Client[];
  transactions: Transaction[];
  range?: { startDate: string; endDate: string };
  compact?: boolean;
}

const ClientMarginSection: React.FC<ClientMarginSectionProps> = ({
  clients,
  transactions,
  range,
  compact = false,
}) => {
  const rows = useMemo(
    () => computeClientMargins(clients, transactions, range),
    [clients, transactions, range],
  );

  if (rows.length === 0) return null;

  const display = compact ? rows.slice(0, 5) : rows;

  return (
    <section className="bg-vybe-card border border-gray-800 rounded-xl p-4">
      <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
        <Users size={16} className="text-vybe-accent" />
        Lucratividade por cliente
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-gray-800">
              <th className="pb-2 font-medium">Cliente</th>
              <th className="pb-2 font-medium text-right">Receita</th>
              <th className="pb-2 font-medium text-right">Despesas</th>
              <th className="pb-2 font-medium text-right">Margem</th>
            </tr>
          </thead>
          <tbody>
            {display.map((row) => (
              <tr key={row.client.id} className="border-b border-gray-800/50">
                <td className="py-2 text-gray-300 truncate max-w-[140px]">{row.client.name}</td>
                <td className="py-2 text-right text-vybe-green tabular-nums">
                  {formatCurrency(row.revenue)}
                </td>
                <td className="py-2 text-right text-vybe-red tabular-nums">
                  {formatCurrency(row.expenses)}
                </td>
                <td className="py-2 text-right tabular-nums">
                  <span
                    className={`inline-flex items-center gap-0.5 font-semibold ${
                      row.margin >= 0 ? 'text-vybe-green' : 'text-red-400'
                    }`}
                  >
                    {row.margin >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {formatCurrency(row.margin)}
                    <span className="text-gray-500 font-normal ml-1">
                      ({row.marginPct.toFixed(0)}%)
                    </span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default ClientMarginSection;
