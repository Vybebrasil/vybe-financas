import React, { useMemo, useState } from 'react';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../types';
import { formatCurrency } from '../utils';
import { getTransactionCashDate, getTransactionScheduledDate } from '../src/services/transactionDates';
import { LineChart } from 'lucide-react';

interface FinancialChartProps {
  transactions: Transaction[];
}

type RangeOption = '6m' | '12m' | '24m';

type MonthlyPoint = {
  key: string;
  label: string;
  incomePaid: number;
  expensePaid: number;
  incomePending: number;
  expensePending: number;
  incomeTotal: number;
  expenseTotal: number;
  balance: number;
};

const RANGE_OPTIONS: Array<{ id: RangeOption; label: string }> = [
  { id: '6m', label: '6 meses' },
  { id: '12m', label: '12 meses' },
  { id: '24m', label: '24 meses' },
];

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

function formatAxisValue(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `R$ ${Math.round(value / 1_000)}k`;
  if (abs >= 1_000) return `R$ ${(value / 1_000).toFixed(1)}k`;
  return `R$ ${Math.round(value)}`;
}

function buildMonthRange(count: number): string[] {
  const end = getMonthStart(new Date());
  const start = addMonths(end, -(count - 1));
  const keys: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    keys.push(monthKeyFromDate(cursor));
    cursor = addMonths(cursor, 1);
  }
  return keys;
}

function niceTickRange(maxValue: number): { max: number; ticks: number[] } {
  if (maxValue <= 0) return { max: 1, ticks: [0, 0.25, 0.5, 0.75, 1] };

  const roughStep = maxValue / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;
  const niceMultiplier =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = niceMultiplier * magnitude;
  const max = Math.ceil(maxValue / step) * step;

  return {
    max,
    ticks: Array.from({ length: 5 }, (_, i) => step * i),
  };
}

const FinancialChart: React.FC<FinancialChartProps> = ({ transactions }) => {
  const [selectedRange, setSelectedRange] = useState<RangeOption>('12m');
  const [includePending, setIncludePending] = useState(false);

  const data = useMemo(() => {
    const monthCount = parseInt(selectedRange.replace('m', ''), 10);
    const monthKeys = buildMonthRange(monthCount);

    const monthMap = new Map<string, MonthlyPoint>();
    for (const key of monthKeys) {
      monthMap.set(key, {
        key,
        label: formatMonthLabel(key),
        incomePaid: 0,
        expensePaid: 0,
        incomePending: 0,
        expensePending: 0,
        incomeTotal: 0,
        expenseTotal: 0,
        balance: 0,
      });
    }

    for (const t of transactions) {
      const amount = Number(t.amount) || 0;
      if (amount <= 0) continue;

      const isPaid = t.status === TransactionStatus.PAID;
      const monthKey = (
        isPaid ? getTransactionCashDate(t) : getTransactionScheduledDate(t)
      ).slice(0, 7);

      const point = monthMap.get(monthKey);
      if (!point) continue;

      if (t.type === TransactionType.INCOME) {
        if (isPaid) point.incomePaid += amount;
        else point.incomePending += amount;
      } else if (t.type === TransactionType.EXPENSE) {
        if (isPaid) point.expensePaid += amount;
        else point.expensePending += amount;
      }
    }

    return monthKeys.map((key) => {
      const p = monthMap.get(key)!;
      p.incomeTotal = includePending ? p.incomePaid + p.incomePending : p.incomePaid;
      p.expenseTotal = includePending ? p.expensePaid + p.expensePending : p.expensePaid;
      p.balance = p.incomeTotal - p.expenseTotal;
      return p;
    });
  }, [transactions, selectedRange, includePending]);

  const summary = useMemo(() => {
    const income = data.reduce((sum, d) => sum + d.incomeTotal, 0);
    const expense = data.reduce((sum, d) => sum + d.expenseTotal, 0);
    const balance = income - expense;
    const margin = income > 0 ? (balance / income) * 100 : 0;
    return { income, expense, balance, margin };
  }, [data]);

  const marginLeft = 62;
  const marginRight = 18;
  const plotHeight = 260;
  const plotWidth = Math.max(560, data.length * 66);
  const chartWidth = plotWidth + marginLeft + marginRight;
  const bandWidth = plotWidth / Math.max(data.length, 1);
  const barWidth = Math.min(22, Math.max(10, bandWidth * 0.26));
  const groupCenter = (index: number) => marginLeft + bandWidth * index + bandWidth / 2;

  const maxBarValue = Math.max(1, ...data.flatMap((d) => [d.incomeTotal, d.expenseTotal]));
  const { max: barMax, ticks: yTicks } = useMemo(
    () => niceTickRange(maxBarValue),
    [maxBarValue],
  );
  const barYFor = (value: number) => plotHeight - (value / barMax) * plotHeight;

  const maxAbsBalance = Math.max(1, ...data.map((d) => Math.abs(d.balance)));
  const balanceYFor = (value: number) => {
    const mid = plotHeight / 2;
    return mid - (value / maxAbsBalance) * (plotHeight * 0.38);
  };

  const balancePoints = data
    .map((d, i) => `${groupCenter(i)},${balanceYFor(d.balance)}`)
    .join(' ');

  const legend = [
    { key: 'income', label: includePending ? 'Receitas (+ pendentes)' : 'Receitas', color: '#22C55E' },
    { key: 'expense', label: includePending ? 'Despesas (+ pendentes)' : 'Despesas', color: '#F43F5E' },
    { key: 'balance', label: 'Resultado', color: '#38BDF8' },
  ];

  return (
    <section className="bg-vybe-card p-5 rounded-xl shadow-lg border border-gray-800">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <LineChart size={18} className="text-vybe-accent" />
            Receitas vs. Despesas por Mês
          </h2>
          <p className="text-xs text-gray-500">
            Valores realizados (pagos/recebidos) · eixo em R$
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={includePending}
              onChange={(e) => setIncludePending(e.target.checked)}
              className="rounded border-gray-600"
            />
            Incluir pendentes
          </label>
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-[#121212] border border-gray-800 rounded-lg p-3">
          <p className="text-[10px] uppercase text-gray-500">Receitas</p>
          <p className="text-sm font-bold text-green-400">{formatCurrency(summary.income)}</p>
        </div>
        <div className="bg-[#121212] border border-gray-800 rounded-lg p-3">
          <p className="text-[10px] uppercase text-gray-500">Despesas</p>
          <p className="text-sm font-bold text-rose-400">{formatCurrency(summary.expense)}</p>
        </div>
        <div className="bg-[#121212] border border-gray-800 rounded-lg p-3">
          <p className="text-[10px] uppercase text-gray-500">Resultado</p>
          <p className={`text-sm font-bold ${summary.balance >= 0 ? 'text-sky-400' : 'text-rose-400'}`}>
            {formatCurrency(summary.balance)}
          </p>
        </div>
        <div className="bg-[#121212] border border-gray-800 rounded-lg p-3">
          <p className="text-[10px] uppercase text-gray-500">Margem</p>
          <p className={`text-sm font-bold ${summary.margin >= 0 ? 'text-gray-200' : 'text-rose-400'}`}>
            {summary.margin.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 mb-4">
        {legend.map((s) => (
          <div key={s.key} className="flex items-center gap-2 text-xs text-gray-300">
            <span
              className={`inline-block rounded-full ${s.key === 'balance' ? 'w-8 h-0.5' : 'w-3 h-3'}`}
              style={{
                backgroundColor: s.color,
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
          <div style={{ minWidth: `${chartWidth}px` }}>
            <svg
              width={chartWidth}
              height={plotHeight + 28}
              className="block"
              role="img"
              aria-label="Gráfico de receitas e despesas mensais"
            >
              {yTicks.map((tick, i) => {
                const y = barYFor(tick);
                return (
                  <g key={`y-${i}`}>
                    <line
                      x1={marginLeft}
                      x2={chartWidth - marginRight}
                      y1={y}
                      y2={y}
                      stroke={tick === 0 ? '#4B5563' : '#2A2F3A'}
                      strokeWidth={tick === 0 ? 1.5 : 1}
                    />
                    <text
                      x={marginLeft - 8}
                      y={y + 4}
                      textAnchor="end"
                      fill="#9CA3AF"
                      fontSize="10"
                    >
                      {formatAxisValue(tick)}
                    </text>
                  </g>
                );
              })}

              {data.map((d, i) => {
                const center = groupCenter(i);
                const incomeHeight = plotHeight - barYFor(d.incomeTotal);
                const expenseHeight = plotHeight - barYFor(d.expenseTotal);
                return (
                  <g key={d.key}>
                    <rect
                      x={center - barWidth - 3}
                      y={barYFor(d.incomeTotal)}
                      width={barWidth}
                      height={Math.max(0, incomeHeight)}
                      rx={4}
                      fill="#22C55E"
                    >
                      <title>
                        {`${d.label} · Receitas: ${formatCurrency(d.incomeTotal)}${
                          includePending && d.incomePending > 0
                            ? ` (${formatCurrency(d.incomePending)} pendente)`
                            : ''
                        }`}
                      </title>
                    </rect>
                    <rect
                      x={center + 3}
                      y={barYFor(d.expenseTotal)}
                      width={barWidth}
                      height={Math.max(0, expenseHeight)}
                      rx={4}
                      fill="#F43F5E"
                    >
                      <title>
                        {`${d.label} · Despesas: ${formatCurrency(d.expenseTotal)}${
                          includePending && d.expensePending > 0
                            ? ` (${formatCurrency(d.expensePending)} pendente)`
                            : ''
                        }`}
                      </title>
                    </rect>
                  </g>
                );
              })}

              <line
                x1={marginLeft}
                x2={chartWidth - marginRight}
                y1={balanceYFor(0)}
                y2={balanceYFor(0)}
                stroke="#334155"
                strokeDasharray="4 4"
              />

              <polyline
                fill="none"
                stroke="#38BDF8"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={balancePoints}
              />

              {data.map((d, i) => (
                <circle
                  key={`balance-${d.key}`}
                  cx={groupCenter(i)}
                  cy={balanceYFor(d.balance)}
                  r="3"
                  fill={d.balance >= 0 ? '#38BDF8' : '#FB7185'}
                >
                  <title>{`${d.label} · Resultado: ${formatCurrency(d.balance)}`}</title>
                </circle>
              ))}
            </svg>
            <div
              className="grid mt-1"
              style={{
                marginLeft: `${marginLeft}px`,
                width: `${plotWidth}px`,
                gridTemplateColumns: `repeat(${data.length}, minmax(40px, 1fr))`,
              }}
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
