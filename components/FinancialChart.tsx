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
  income: number;
  expense: number;
  balance: number;
  incomeWithPending: number;
  expenseWithPending: number;
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
        income: 0,
        expense: 0,
        balance: 0,
        incomeWithPending: 0,
        expenseWithPending: 0,
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
        if (isPaid) point.income += amount;
        else point.incomeWithPending += amount;
      } else if (t.type === TransactionType.EXPENSE) {
        if (isPaid) point.expense += amount;
        else point.expenseWithPending += amount;
      }
    }

    return monthKeys.map((key) => {
      const p = monthMap.get(key)!;
      p.balance = p.income - p.expense;
      return p;
    });
  }, [transactions, selectedRange]);

  const marginLeft = 58;
  const marginRight = 12;
  const plotHeight = 260;
  const plotWidth = Math.max(520, data.length * 48);
  const chartWidth = plotWidth + marginLeft + marginRight;
  const xStep = data.length > 1 ? plotWidth / (data.length - 1) : 0;

  const yValues = data.flatMap((d) => {
    const base = [d.income, d.expense, d.balance];
    if (!includePending) return base;
    return [
      ...base,
      d.income + d.incomeWithPending,
      d.expense + d.expenseWithPending,
    ];
  });

  const minY = Math.min(0, ...yValues);
  const maxY = Math.max(1, ...yValues);
  const yRange = Math.max(1, maxY - minY);
  const yFor = (value: number) => plotHeight - ((value - minY) / yRange) * plotHeight;

  const yTicks = useMemo(() => {
    const steps = 5;
    return Array.from({ length: steps + 1 }, (_, i) => minY + (yRange * i) / steps);
  }, [minY, yRange]);

  const buildPoints = (values: number[]) =>
    values
      .map((v, i) => `${marginLeft + i * xStep},${yFor(v)}`)
      .join(' ');

  const series = includePending
    ? [
        {
          key: 'income',
          label: 'Receitas (realizadas)',
          color: '#22C55E',
          values: data.map((d) => d.income),
          dashed: false,
        },
        {
          key: 'expense',
          label: 'Despesas (realizadas)',
          color: '#F43F5E',
          values: data.map((d) => d.expense),
          dashed: false,
        },
        {
          key: 'incomeProj',
          label: 'Receitas (+ pendentes)',
          color: '#86EFAC',
          values: data.map((d) => d.income + d.incomeWithPending),
          dashed: true,
        },
        {
          key: 'expenseProj',
          label: 'Despesas (+ pendentes)',
          color: '#FDA4AF',
          values: data.map((d) => d.expense + d.expenseWithPending),
          dashed: true,
        },
        {
          key: 'balance',
          label: 'Resultado do mês',
          color: '#38BDF8',
          values: data.map((d) => d.balance),
          dashed: false,
        },
      ]
    : [
        {
          key: 'income',
          label: 'Receitas',
          color: '#22C55E',
          values: data.map((d) => d.income),
          dashed: false,
        },
        {
          key: 'expense',
          label: 'Despesas',
          color: '#F43F5E',
          values: data.map((d) => d.expense),
          dashed: false,
        },
        {
          key: 'balance',
          label: 'Resultado do mês',
          color: '#38BDF8',
          values: data.map((d) => d.balance),
          dashed: false,
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

      <div className="flex flex-wrap gap-x-5 gap-y-2 mb-4">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-2 text-xs text-gray-300">
            <span
              className="inline-block w-8 h-0.5 rounded-full"
              style={{
                backgroundColor: s.dashed ? 'transparent' : s.color,
                borderTop: s.dashed ? `2px dashed ${s.color}` : undefined,
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
                const y = yFor(tick);
                return (
                  <g key={`y-${i}`}>
                    <line
                      x1={marginLeft}
                      x2={chartWidth - marginRight}
                      y1={y}
                      y2={y}
                      stroke={tick === 0 || Math.abs(tick) < yRange * 0.02 ? '#4B5563' : '#2A2F3A'}
                      strokeWidth={tick === 0 || Math.abs(tick) < yRange * 0.02 ? 1.5 : 1}
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

              {series.map((s) => (
                <g key={s.key}>
                  <polyline
                    fill="none"
                    stroke={s.color}
                    strokeWidth={s.key === 'balance' ? 2.5 : 2}
                    strokeDasharray={s.dashed ? '6 4' : undefined}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={buildPoints(s.values)}
                    opacity={s.dashed ? 0.85 : 1}
                  />
                  {s.values.map((v, i) => (
                    <circle
                      key={`${s.key}-${i}`}
                      cx={marginLeft + i * xStep}
                      cy={yFor(v)}
                      r={s.key === 'balance' ? 3 : 2.5}
                      fill={s.color}
                      opacity={s.dashed ? 0.7 : 1}
                    >
                      <title>{`${s.label}: ${formatCurrency(v)}`}</title>
                    </circle>
                  ))}
                </g>
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
