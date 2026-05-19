import React from 'react';
import { formatCurrency } from '../utils';

interface DashboardCardProps {
  title: string;
  value: number;
  type: 'income' | 'expense' | 'balance';
  icon: React.ReactNode;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, type, icon }) => {
  let valueColorClass = 'text-white';

  if (type === 'income') valueColorClass = 'text-vybe-green';
  if (type === 'expense') valueColorClass = 'text-vybe-red';
  if (type === 'balance') {
    valueColorClass = value >= 0 ? 'text-white' : 'text-vybe-red';
  }

  return (
    <div className="bg-vybe-card p-6 rounded-xl shadow-lg border border-gray-800 flex flex-col justify-between hover:border-vybe-accent transition-colors duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-vybe-muted text-sm font-medium uppercase tracking-wider">{title}</h3>
        <div className={`p-2 rounded-full ${type === 'income' ? 'bg-vybe-green/10 text-vybe-green' : type === 'expense' ? 'bg-vybe-red/10 text-vybe-red' : 'bg-vybe-accent/10 text-vybe-accent'}`}>
            {icon}
        </div>
      </div>
      <p className={`text-2xl lg:text-3xl font-bold ${valueColorClass}`}>
        {formatCurrency(value)}
      </p>
    </div>
  );
};

export default DashboardCard;