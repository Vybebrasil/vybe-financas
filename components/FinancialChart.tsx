import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, ChartPeriod } from '../types';
import { getChartData, formatCurrency } from '../utils';
import { Calendar, Clock, Layers, PieChart, ChevronLeft, ChevronRight } from 'lucide-react';
interface FinancialChartProps {
  transactions: Transaction[];
  /** Sincroniza o ano exibido no gráfico mensal (ex.: filtro do dashboard). */
  initialYear?: number;
}

const FinancialChart: React.FC<FinancialChartProps> = ({
  transactions,
  initialYear,
}) => {
  const currentYear = new Date().getFullYear();
  const [period, setPeriod] = useState<ChartPeriod>('monthly');
  const [selectedYear, setSelectedYear] = useState<number>(initialYear ?? currentYear);

  useEffect(() => {
    if (initialYear != null) setSelectedYear(initialYear);
  }, [initialYear]);

  const data = useMemo(() => getChartData(transactions, period, selectedYear), [transactions, period, selectedYear]);

  const maxValue = Math.max(
    ...data.map((d) =>
      Math.max(d.income, d.expense, d.pendingIncome, d.pendingExpense)
    ),
    1
  );

  const tabs: { id: ChartPeriod; label: string; icon: React.ReactNode }[] = [
    { id: 'daily', label: 'Diário', icon: <Clock size={14} /> },
    { id: 'monthly', label: 'Mensal', icon: <Calendar size={14} /> },
    { id: 'yearly', label: 'Anual', icon: <Layers size={14} /> },
    { id: 'total', label: 'Total', icon: <PieChart size={14} /> },
  ];

  const { minYear, maxYear } = useMemo(() => {
    const fromTx = transactions
      .map((t) => parseInt(t.date.split('T')[0].slice(0, 4), 10))
      .filter((y) => !Number.isNaN(y));
    const dataMin = fromTx.length > 0 ? Math.min(...fromTx) : currentYear;
    const dataMax = fromTx.length > 0 ? Math.max(...fromTx) : currentYear;
    return {
      minYear: Math.min(currentYear - 10, dataMin),
      maxYear: Math.max(currentYear + 2, dataMax),
    };
  }, [transactions, currentYear]);

  return (
    <div className="bg-vybe-card p-6 rounded-xl shadow-lg border border-gray-800 mb-8 flex flex-col">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="w-1 h-6 bg-vybe-accent rounded-full"></span>
          Fluxo de Caixa
        </h2>

        {/* Filter Tabs */}
        <div className="flex bg-[#121212] p-1 rounded-lg border border-gray-700 overflow-x-auto max-w-full">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPeriod(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                period === tab.id
                  ? 'bg-gray-700 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-xs font-medium mb-4">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-md bg-vybe-green shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
          <span className="text-gray-400">Entradas (pagas)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-md bg-vybe-red shadow-[0_0_8px_rgba(239,68,68,0.4)]"></span>
          <span className="text-gray-400">Saídas (pagas)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-md bg-amber-400/90 border border-amber-300/50"></span>
          <span className="text-gray-400 flex items-center gap-1">
            <Clock size={12} className="text-amber-400" />
            Entrada pendente
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-md bg-amber-600/90 border border-amber-500/50"></span>
          <span className="text-gray-400 flex items-center gap-1">
            <Clock size={12} className="text-amber-500" />
            Saída pendente
          </span>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative h-64 w-full mb-6">
        {/* Background Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border-t border-gray-800 w-full h-full last:border-0 opacity-30"></div>
          ))}
        </div>

        {/* Bars Container */}
        <div className="absolute inset-0 flex items-end justify-between gap-2 md:gap-4 pt-4 pb-6 px-2">
          {data.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                Sem dados para este período
            </div>
          ) : (
          data.map((item, index) => {
            const incomeHeight = (item.income / maxValue) * 100;
            const expenseHeight = (item.expense / maxValue) * 100;
            const pendingIncomeHeight = (item.pendingIncome / maxValue) * 100;
            const pendingExpenseHeight = (item.pendingExpense / maxValue) * 100;

            return (
              <div key={item.key} className="flex-1 flex flex-col items-center justify-end h-full group min-w-[40px]">
                {/* Bar Wrapper */}
                <div className="w-full flex justify-center items-end gap-0.5 md:gap-1 h-full relative px-0.5">
                  
                  {/* Tooltip Overlay */}
                  <div className="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-[#252525] border border-gray-700 text-white text-xs rounded-lg p-3 whitespace-nowrap z-20 pointer-events-none shadow-2xl transform translate-y-2 group-hover:translate-y-0">
                    <p className="font-bold mb-2 pb-1 border-b border-gray-700">{item.label}</p>
                    <div className="flex items-center justify-between gap-4 mb-1">
                        <span className="text-gray-400">Entrada (paga):</span>
                        <span className="text-vybe-green font-mono">{formatCurrency(item.income)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 mb-1">
                        <span className="text-gray-400 flex items-center gap-1"><Clock size={10} className="text-amber-400" /> Ent. pendente:</span>
                        <span className="text-amber-400 font-mono">{formatCurrency(item.pendingIncome)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 mb-1">
                        <span className="text-gray-400">Saída (paga):</span>
                        <span className="text-vybe-red font-mono">{formatCurrency(item.expense)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-gray-400 flex items-center gap-1"><Clock size={10} className="text-amber-500" /> Saída pendente:</span>
                        <span className="text-amber-500 font-mono">{formatCurrency(item.pendingExpense)}</span>
                    </div>
                  </div>

                  <div
                    style={{ height: `${incomeHeight}%`, animationDelay: `${index * 50}ms` }}
                    className="flex-1 max-w-[28px] bg-vybe-green hover:bg-emerald-400 rounded-t-sm transition-all duration-300 origin-bottom animate-bar-grow opacity-90 hover:opacity-100"
                    title="Entrada paga"
                  />
                  <div
                    style={{ height: `${pendingIncomeHeight}%`, animationDelay: `${index * 50 + 12}ms` }}
                    className={`flex-1 max-w-[28px] bg-amber-400/85 border border-amber-300/40 rounded-t-sm transition-all duration-300 origin-bottom animate-bar-grow ${item.pendingIncome > 0 ? 'opacity-90' : 'opacity-0'}`}
                    title="Entrada pendente"
                  />
                  <div
                    style={{ height: `${expenseHeight}%`, animationDelay: `${index * 50 + 25}ms` }}
                    className="flex-1 max-w-[28px] bg-vybe-red hover:bg-rose-400 rounded-t-sm transition-all duration-300 origin-bottom animate-bar-grow opacity-90 hover:opacity-100"
                    title="Saída paga"
                  />
                  <div
                    style={{ height: `${pendingExpenseHeight}%`, animationDelay: `${index * 50 + 37}ms` }}
                    className={`flex-1 max-w-[28px] bg-amber-600/85 border border-amber-500/40 rounded-t-sm transition-all duration-300 origin-bottom animate-bar-grow ${item.pendingExpense > 0 ? 'opacity-90' : 'opacity-0'}`}
                    title="Saída pendente"
                  />
                </div>

                {/* X-Axis Label */}
                <span className="mt-3 text-[10px] md:text-xs text-gray-500 font-medium uppercase tracking-wider group-hover:text-white transition-colors truncate w-full text-center">
                  {item.label}
                </span>
              </div>
            );
          })
          )}
        </div>
      </div>

      {/* Year Slider (Only visible for Monthly view usually, but functional for context) */}
      {period === 'monthly' && (
        <div className="mt-auto border-t border-gray-800 pt-6 px-4">
          <div className="flex flex-col items-center">
             <div className="flex justify-between w-full text-xs text-gray-500 mb-2 font-medium">
                <span>{minYear}</span>
                <span className="text-vybe-accent font-bold text-lg">{selectedYear}</span>
                <span>{maxYear}</span>
             </div>
             
             <div className="relative w-full flex items-center group">
               <button 
                  onClick={() => setSelectedYear(prev => Math.max(minYear, prev - 1))}
                  className="p-1 text-gray-500 hover:text-white transition-colors"
                >
                  <ChevronLeft size={20} />
               </button>

               <input 
                  type="range" 
                  min={minYear} 
                  max={maxYear} 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-vybe-accent hover:accent-orange-500 mx-4"
               />

               <button 
                  onClick={() => setSelectedYear(prev => Math.min(maxYear, prev + 1))}
                  className="p-1 text-gray-500 hover:text-white transition-colors"
                >
                  <ChevronRight size={20} />
               </button>
             </div>
             <p className="text-[10px] text-gray-600 mt-2">Arraste para navegar entre os anos (10 anos passados / 10 anos futuros)</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialChart;