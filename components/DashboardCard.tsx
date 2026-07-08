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
  size?: 'lg' | 'sm';
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
  size = 'lg',
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

  const isLarge = size === 'lg';

  return (
    <div
      className={`bg-vybe-card rounded-xl shadow-lg border flex flex-col justify-between hover:border-vybe-accent transition-colors duration-300 ${
        isLarge
          ? 'p-6 lg:p-7 border-gray-800'
          : 'p-4 border-gray-800/80 hover:border-gray-700'
      }`}
    >
      <div className={`flex items-center justify-between ${isLarge ? 'mb-4' : 'mb-3'}`}>
        <h3
          className={`text-vybe-muted font-medium uppercase tracking-wider ${
            isLarge ? 'text-sm' : 'text-[11px]'
          }`}
        >
          {title}
        </h3>
        <div
          className={`rounded-full ${
            isLarge ? 'p-2' : 'p-1.5'
          } ${
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
        {subtitle && (
          <p className={`text-gray-500 mb-1 ${isLarge ? 'text-[10px]' : 'text-[9px]'}`}>{subtitle}</p>
        )}
        <p
          className={`font-bold ${valueColorClass} ${
            isLarge ? 'text-3xl lg:text-4xl' : 'text-xl lg:text-2xl'
          }`}
        >
          {formatAsPercent ? `${value.toFixed(1)}%` : formatCurrency(value)}
        </p>
        {deltaLabel && (
          <p
            className={`mt-1 font-medium ${
              isLarge ? 'text-xs' : 'text-[10px]'
            } ${(deltaPercent ?? 0) >= 0 ? 'text-vybe-green' : 'text-red-400'}`}
          >
            {deltaLabel}
          </p>
        )}
        {showPending && (
          <p
            className={`mt-2 text-amber-400/90 flex items-center gap-1.5 font-medium ${
              isLarge ? 'text-xs' : 'text-[10px]'
            }`}
          >
            <Clock size={isLarge ? 12 : 10} className="shrink-0" />
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
