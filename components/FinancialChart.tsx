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
  const minValue = 0;
  const valueRange = Math.max(1, maxValue - minValue);
  const chartHeight = 220;
  const chartWidth = Math.max(320, data.length * 72);
  const xStep = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth;
  const yForValue = (value: number) =>
    chartHeight - ((value - minValue) / valueRange) * chartHeight;

  const series = useMemo(
    () => [
      { key: 'income', color: '#10B981', values: data.map((d) => d.income) },
      { key: 'expense', color: '#EF4444', values: data.map((d) => d.expense) },
      { key: 'pendingIncome', color: '#FBBF24', values: data.map((d) => d.pendingIncome) },
      { key: 'pendingExpense', color: '#D97706', values: data.map((d) => d.pendingExpense) },
    ],
    [data],
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
      <div className="relative w-full mb-6">
        {data.length === 0 ? (
          <div className="h-64 w-full flex items-center justify-center text-gray-500 text-sm">
            Sem dados para este período
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div
              className="relative"
              style={{ minWidth: `${chartWidth + 16}px` }}
            >
              <svg
                width={chartWidth}
                height={chartHeight}
                className="block"
                role="img"
                aria-label="Gráfico de linha do fluxo de caixa"
              >
                {[...Array(5)].map((_, i) => {
                  const y = (chartHeight / 4) * i;
                  return (
                    <line
                      key={`grid-${i}`}
                      x1={0}
                      x2={chartWidth}
                      y1={y}
                      y2={y}
                      stroke="#2b2b2b"
                      strokeWidth="1"
                    />
                  );
                })}

                {series.map((s) => {
                  const points = s.values
                    .map((value, idx) => `${idx * xStep},${yForValue(value)}`)
                    .join(' ');
                  return (
                    <g key={s.key}>
                      <polyline
                        fill="none"
                        stroke={s.color}
                        strokeWidth="2.5"
                        points={points}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {s.values.map((value, idx) => (
                        <circle
                          key={`${s.key}-${idx}`}
                          cx={idx * xStep}
                          cy={yForValue(value)}
                          r="3"
                          fill={s.color}
                        >
                          <title>{formatCurrency(value)}</title>
                        </circle>
                      ))}
                    </g>
                  );
                })}
              </svg>

              <div className="mt-3 grid" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(40px, 1fr))` }}>
                {data.map((item) => (
                  <span
                    key={item.key}
                    className="text-[10px] md:text-xs text-gray-500 font-medium uppercase tracking-wider truncate text-center"
                    title={item.label}
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
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