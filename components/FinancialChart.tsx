import React, { useMemo, useState } from 'react';
import {
  Category,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../types';
import { formatCurrency } from '../utils';
import { getTransactionCashDate, getTransactionFilterDate } from '../src/services/transactionDates';
import { LineChart } from 'lucide-react';

interface FinancialChartProps {
  transactions: Transaction[];
}

type RangeOption = '6m' | '12m' | '24m' | '36m' | 'all';

type MonthlyPoint = {
  key: string;
  label: string;
  income: number;
  expenseTotal: number;
  expenseFixed: number;
  expenseVariable: number;
  incomeProj: number;
  expenseTotalProj: number;
  expenseFixedProj: number;
  expenseVariableProj: number;
  cashTotal: number;
};

const RANGE_OPTIONS: Array<{ id: RangeOption; label: string }> = [
  { id: '6m', label: '6 meses' },
  { id: '12m', label: '12 meses' },
  { id: '24m', label: '24 meses' },
  { id: '36m', label: '36 meses' },
  { id: 'all', label: 'Todo histórico' },
];

const isFixedCost = (category: string): boolean =>
  category === Category.SALARY ||
  category === Category.FIXED_EXPENSE ||
  category === Category.TOOLS;

const isVariableCost = (category: string): boolean =>
  category === Category.ADS ||
  category === Category.SUPPLIES ||
  category === Category.VARIABLE_EXPENSE ||
  category === Category.OTHER;

const formatMonthLabel = (monthKey: string): string => {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', {
    month: 'short',
    year: '2-digit',
  });
};

const getMonthStart = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), 1);

const addMonths = (date: Date, delta: number): Date =>
  new Date(date.getFullYear(), date.getMonth() + delta, 1);

const monthKeyFromDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const FinancialChart: React.FC<FinancialChartProps> = ({ transactions }) => {
  const [selectedRange, setSelectedRange] = useState<RangeOption>('24m');

  const data = useMemo(() => {
    if (transactions.length === 0) return [] as MonthlyPoint[];

    const txDates = transactions
      .map((t) => new Date(`${getTransactionFilterDate(t)}T12:00:00`))
      .filter((d) => !Number.isNaN(d.getTime()));

    if (txDates.length === 0) return [] as MonthlyPoint[];

    const minDate = getMonthStart(
      txDates.reduce((a, b) => (a < b ? a : b)),
    );
    const maxDate = getMonthStart(
      txDates.reduce((a, b) => (a > b ? a : b)),
    );

    const months: string[] = [];
    let cursor = minDate;
    while (cursor <= maxDate) {
      months.push(monthKeyFromDate(cursor));
      cursor = addMonths(cursor, 1);
    }

    const monthMap = new Map<string, MonthlyPoint>();
    months.forEach((key) => {
      monthMap.set(key, {
        key,
        label: formatMonthLabel(key),
        income: 0,
        expenseTotal: 0,
        expenseFixed: 0,
        expenseVariable: 0,
        incomeProj: 0,
        expenseTotalProj: 0,
        expenseFixedProj: 0,
        expenseVariableProj: 0,
        cashTotal: 0,
      });
    });

    transactions.forEach((t) => {
      const isPaid = t.status === TransactionStatus.PAID;
      const key = (isPaid ? getTransactionCashDate(t) : t.date.split('T')[0]).slice(0, 7);
      const point = monthMap.get(key);
      if (!point) return;

      const amount = Number(t.amount) || 0;

      if (t.type === TransactionType.INCOME) {
        if (isPaid) point.income += amount;
        point.incomeProj += amount;
        return;
      }

      if (t.type === TransactionType.EXPENSE) {
        if (isPaid) point.expenseTotal += amount;
        point.expenseTotalProj += amount;

        const fixed = isFixedCost(t.category);
        const variable = isVariableCost(t.category);

        if (fixed) {
          if (isPaid) point.expenseFixed += amount;
          point.expenseFixedProj += amount;
        } else if (variable) {
          if (isPaid) point.expenseVariable += amount;
          point.expenseVariableProj += amount;
        } else {
          if (isPaid) point.expenseVariable += amount;
          point.expenseVariableProj += amount;
        }
      }
    });

    const ordered = [...monthMap.values()].sort((a, b) =>
      a.key.localeCompare(b.key),
    );

    let runningCash = 0;
    ordered.forEach((p) => {
      runningCash += p.income - p.expenseTotal;
      p.cashTotal = runningCash;
    });

    if (selectedRange === 'all') return ordered;

    const keep = parseInt(selectedRange.replace('m', ''), 10);
    return ordered.slice(-keep);
  }, [transactions, selectedRange]);

  const chartWidth = Math.max(760, data.length * 54);
  const chartHeight = 300;
  const xStep = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth;

  const allValues = data.flatMap((d) => [
    d.income,
    d.expenseTotal,
    d.expenseFixed,
    d.expenseVariable,
    d.incomeProj,
    d.expenseTotalProj,
    d.expenseFixedProj,
    d.expenseVariableProj,
    d.cashTotal,
  ]);

  const minY = Math.min(0, ...allValues, 0);
  const maxY = Math.max(1, ...allValues, 1);
  const yRange = Math.max(1, maxY - minY);
  const yFor = (value: number) => chartHeight - ((value - minY) / yRange) * chartHeight;

  const buildPoints = (values: number[]) =>
    values.map((v, i) => `${i * xStep},${yFor(v)}`).join(' ');

  const series = [
    {
      key: 'income',
      label: 'Receitas',
      color: '#22C55E',
      values: data.map((d) => d.income),
      dashed: false,
    },
    {
      key: 'expenseTotal',
      label: 'Desp. Total',
      color: '#F43F5E',
      values: data.map((d) => d.expenseTotal),
      dashed: false,
    },
    {
      key: 'expenseFixed',
      label: 'Desp. Fixas',
      color: '#FB7185',
      values: data.map((d) => d.expenseFixed),
      dashed: true,
    },
    {
      key: 'expenseVariable',
      label: 'Desp. Variáveis',
      color: '#F59E0B',
      values: data.map((d) => d.expenseVariable),
      dashed: true,
    },
    {
      key: 'cashTotal',
      label: 'Caixa Total',
      color: '#38BDF8',
      values: data.map((d) => d.cashTotal),
      dashed: false,
    },
    {
      key: 'incomeProj',
      label: 'Receitas (Proj.)',
      color: '#4ADE80',
      values: data.map((d) => d.incomeProj),
      dashed: true,
    },
    {
      key: 'expenseTotalProj',
      label: 'Desp. Total (Proj.)',
      color: '#FB7185',
      values: data.map((d) => d.expenseTotalProj),
      dashed: true,
    },
    {
      key: 'expenseFixedProj',
      label: 'Desp. Fixas (Proj.)',
      color: '#FDA4AF',
      values: data.map((d) => d.expenseFixedProj),
      dashed: true,
    },
    {
      key: 'expenseVariableProj',
      label: 'Desp. Variáveis (Proj.)',
      color: '#FCD34D',
      values: data.map((d) => d.expenseVariableProj),
      dashed: true,
    },
  ];

  return (
    <section className="bg-vybe-card p-5 rounded-xl shadow-lg border border-gray-800">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <LineChart size={18} className="text-vybe-accent" />
            Receitas vs. Despesas por Mês
          </h2>
          <p className="text-xs text-gray-500">Valores em R$</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">Período:</label>
          <select
            value={selectedRange}
            onChange={(e) => setSelectedRange(e.target.value as RangeOption)}
            className="bg-[#121212] border border-gray-700 rounded-md px-2 py-1.5 text-xs text-white outline-none focus:border-vybe-accent"
          >
            {RANGE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-4">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <span
              className="inline-block w-7 h-0.5"
              style={{
                backgroundColor: s.color,
                borderTop: s.dashed ? `2px dashed ${s.color}` : `2px solid ${s.color}`,
              }}
            />
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      {data.length === 0 ? (
        <div className="h-72 flex items-center justify-center text-sm text-gray-500">
          Sem dados para o período selecionado.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div style={{ minWidth: `${chartWidth + 20}px` }}>
            <svg
              width={chartWidth}
              height={chartHeight + 24}
              className="block"
              role="img"
              aria-label="Gráfico de linhas de fluxo de caixa"
            >
              {[...Array(6)].map((_, i) => {
                const y = (chartHeight / 5) * i;
                return (
                  <line
                    key={`grid-${i}`}
                    x1={0}
                    x2={chartWidth}
                    y1={y}
                    y2={y}
                    stroke="#2A2F3A"
                    strokeWidth="1"
                  />
                );
              })}

              {series.map((s) => (
                <g key={s.key}>
                  <polyline
                    fill="none"
                    stroke={s.color}
                    strokeWidth="2"
                    strokeDasharray={s.dashed ? '5 4' : undefined}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={buildPoints(s.values)}
                  />
                  {s.values.map((v, i) => (
                    <circle
                      key={`${s.key}-${i}`}
                      cx={i * xStep}
                      cy={yFor(v)}
                      r="2.5"
                      fill={s.color}
                    >
                      <title>{`${s.label}: ${formatCurrency(v)}`}</title>
                    </circle>
                  ))}
                </g>
              ))}

              <line
                x1={0}
                x2={chartWidth}
                y1={yFor(0)}
                y2={yFor(0)}
                stroke="#4B5563"
                strokeWidth="1"
              />
            </svg>
            <div
              className="mt-1 grid"
              style={{ gridTemplateColumns: `repeat(${data.length}, minmax(36px, 1fr))` }}
            >
              {data.map((d) => (
                <span
                  key={d.key}
                  className="text-[10px] text-gray-500 text-center uppercase truncate"
                  title={d.label}
                >
                  {d.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default FinancialChart;