import React from 'react';
import { formatCurrency } from '../utils';
import { Clock } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  value: number;
  type: 'income' | 'expense' | 'balance' | 'neutral';
  icon: React.ReactNode;
  pendingValue?: number;
  pendingHint?: string;
  subtitle?: string;
  deltaPercent?: number | null;
  formatAsPercent?: boolean;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  type,
  icon,
  pendingValue = 0,
  pendingHint,
  subtitle,
  deltaPercent,
  formatAsPercent = false,
}) => {
  let valueColorClass = 'text-white';

  if (type === 'income') valueColorClass = 'text-vybe-green';
  if (type === 'expense') valueColorClass = 'text-vybe-red';
  if (type === 'balance') {
    valueColorClass = value >= 0 ? 'text-white' : 'text-vybe-red';
  }
  if (type === 'neutral') valueColorClass = 'text-vybe-accent';

  const showPending = pendingValue > 0 || !!pendingHint;

  const deltaLabel =
    deltaPercent === null || deltaPercent === undefined
      ? null
      : `${deltaPercent > 0 ? '+' : ''}${deltaPercent.toFixed(0)}% vs período ant.`;

  return (
    <div className="bg-vybe-card p-6 rounded-xl shadow-lg border border-gray-800 flex flex-col justify-between hover:border-vybe-accent transition-colors duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-vybe-muted text-sm font-medium uppercase tracking-wider">{title}</h3>
        <div
          className={`p-2 rounded-full ${
            type === 'income'
              ? 'bg-vybe-green/10 text-vybe-green'
              : type === 'expense'
                ? 'bg-vybe-red/10 text-vybe-red'
                : 'bg-vybe-accent/10 text-vybe-accent'
          }`}
        >
          {icon}
        </div>
      </div>
      <div>
        {subtitle && <p className="text-[10px] text-gray-500 mb-1">{subtitle}</p>}
        <p className={`text-2xl lg:text-3xl font-bold ${valueColorClass}`}>
          {formatAsPercent ? `${value.toFixed(1)}%` : formatCurrency(value)}
        </p>
        {deltaLabel && (
          <p
            className={`text-xs mt-1 font-medium ${
              (deltaPercent ?? 0) >= 0 ? 'text-vybe-green' : 'text-red-400'
            }`}
          >
            {deltaLabel}
          </p>
        )}
        {showPending && (
          <p className="mt-2 text-xs text-amber-400/90 flex items-center gap-1.5 font-medium">
            <Clock size={12} className="shrink-0" />
            {pendingHint ?? (
              <>
                Pendente: <span className="text-amber-300">{formatCurrency(pendingValue)}</span>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
};

export default DashboardCard;
