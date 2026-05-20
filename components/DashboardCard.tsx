import React from 'react';
import { formatCurrency } from '../utils';
import { Clock } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  value: number;
  type: 'income' | 'expense' | 'balance';
  icon: React.ReactNode;
  pendingValue?: number;
  pendingHint?: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  type,
  icon,
  pendingValue = 0,
  pendingHint,
}) => {
  let valueColorClass = 'text-white';

  if (type === 'income') valueColorClass = 'text-vybe-green';
  if (type === 'expense') valueColorClass = 'text-vybe-red';
  if (type === 'balance') {
    valueColorClass = value >= 0 ? 'text-white' : 'text-vybe-red';
  }

  const showPending = pendingValue > 0 || !!pendingHint;

  return (
    <div className="bg-vybe-card p-6 rounded-xl shadow-lg border border-gray-800 flex flex-col justify-between hover:border-vybe-accent transition-colors duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-vybe-muted text-sm font-medium uppercase tracking-wider">{title}</h3>
        <div className={`p-2 rounded-full ${type === 'income' ? 'bg-vybe-green/10 text-vybe-green' : type === 'expense' ? 'bg-vybe-red/10 text-vybe-red' : 'bg-vybe-accent/10 text-vybe-accent'}`}>
          {icon}
        </div>
      </div>
      <div>
        <p className={`text-2xl lg:text-3xl font-bold ${valueColorClass}`}>
          {formatCurrency(value)}
        </p>
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
