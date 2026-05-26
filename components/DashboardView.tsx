import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Percent,
  Users,
  DollarSign,
  AlertTriangle,
  Clock,
  MessageCircle,
  Plus,
  FileText,
  ChevronRight,
  Calendar,
  PieChart,
  BarChart3,
} from 'lucide-react';
import { useAppData } from '../src/context/AppDataContext';
import { formatCurrency, formatDate } from '../utils';
import DashboardCard from './DashboardCard';
import FinancialChart from './FinancialChart';
import {
  DashboardPeriodPreset,
  computePeriodComparison,
  computeClientPortfolio,
  computeFixedCosts,
  computeMrrVsReceived,
  computeExpensesByCategory,
  filterTransactionsByRange,
  getClientsDueSoon,
  getDelinquencySnapshot,
  getPendingToReconcile,
  getPeriodRange,
  computePayrollMonthStatus,
  computeSubscriptionsMonthStatus,
} from '../src/services/dashboardMetrics';
import PayrollStatusSection from './PayrollStatusSection';
import SubscriptionsStatusSection from './SubscriptionsStatusSection';
const PERIOD_OPTIONS: { id: DashboardPeriodPreset; label: string }[] = [
  { id: 'this_month', label: 'Este mês' },
  { id: 'last_month', label: 'Mês anterior' },
  { id: 'this_year', label: 'Este ano' },
];

const DashboardView: React.FC = () => {
  const {
    transactions,
    clients,
    employees,
    subscriptions,
    setActiveTab,
    openReportsWithDateRange,
    handleOpenBillingModal,
    handleEditTransaction,
  } = useAppData();

  const [period, setPeriod] = useState<DashboardPeriodPreset>('this_month');

  const range = useMemo(() => getPeriodRange(period), [period]);

  const comparison = useMemo(
    () => computePeriodComparison(transactions, range),
    [transactions, range],
  );

  const portfolio = useMemo(() => computeClientPortfolio(clients), [clients]);
  const fixedCosts = useMemo(
    () => computeFixedCosts(employees, subscriptions),
    [employees, subscriptions],
  );

  const mrrVsReceived = useMemo(
    () => computeMrrVsReceived(clients, transactions, range),
    [clients, transactions, range],
  );

  const expensesByCategory = useMemo(
    () => computeExpensesByCategory(transactions, range),
    [transactions, range],
  );

  const filteredTransactions = useMemo(
    () => filterTransactionsByRange(transactions, range.startDate, range.endDate),
    [transactions, range],
  );

  const dueSoon = useMemo(() => getClientsDueSoon(clients), [clients]);
  const pendingList = useMemo(() => getPendingToReconcile(transactions), [transactions]);
  const delinquency = useMemo(
    () => getDelinquencySnapshot(clients, transactions),
    [clients, transactions],
  );

  const payrollStatus = useMemo(
    () => computePayrollMonthStatus(employees, transactions, range),
    [employees, transactions, range],
  );

  const subscriptionsStatus = useMemo(
    () => computeSubscriptionsMonthStatus(subscriptions, transactions, range),
    [subscriptions, transactions, range],
  );

  const openExpenseTransaction = (transactionId: string) => {
    const tx = transactions.find((t) => t.id === transactionId);
    if (tx) {
      setActiveTab('finance');
      handleEditTransaction(tx);
    }
  };

  const topDelinquent = useMemo(() => {
    const items = [...delinquency.overdue, ...delinquency.pending].slice(0, 3);
    return items;
  }, [delinquency]);

  const { current: kpis } = comparison;

  return (
    <div className="space-y-8 print:hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-1 h-6 bg-vybe-accent rounded-full" />
            Cockpit financeiro
          </h2>
          <p className="text-sm text-gray-500 mt-1 capitalize">{range.label}</p>
        </div>
        <div className="flex bg-[#1E1E1E] p-1 rounded-lg border border-gray-800">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setPeriod(opt.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                period === opt.id
                  ? 'bg-vybe-accent text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Entradas"
          subtitle="Pagas no período"
          value={kpis.totalIncome}
          type="income"
          icon={<TrendingUp size={20} />}
          pendingValue={kpis.pendingIncome}
          deltaPercent={comparison.deltaIncomePct}
        />
        <DashboardCard
          title="Saídas"
          subtitle="Pagas no período"
          value={kpis.totalExpense}
          type="expense"
          icon={<TrendingDown size={20} />}
          pendingValue={kpis.pendingExpense}
          deltaPercent={comparison.deltaExpensePct}
        />
        <DashboardCard
          title="Lucro"
          subtitle="Entradas − saídas (pagas)"
          value={kpis.profit}
          type="balance"
          icon={<Wallet size={20} />}
          deltaPercent={comparison.deltaProfitPct}
        />
        <DashboardCard
          title="Margem"
          subtitle="Sobre receita paga"
          value={kpis.margin}
          type="neutral"
          formatAsPercent
          icon={<Percent size={20} />}
        />
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="MRR"
          subtitle={`${portfolio.activeCount} clientes ativos`}
          value={portfolio.mrr}
          type="neutral"
          icon={<Users size={20} />}
        />
        <DashboardCard
          title="Ticket médio"
          value={portfolio.ticketMedio}
          type="neutral"
          icon={<DollarSign size={20} />}
        />
        <DashboardCard
          title="Custos fixos"
          subtitle={`Folha ${formatCurrency(fixedCosts.payroll)} + tools ${formatCurrency(fixedCosts.subscriptions)}`}
          value={fixedCosts.total}
          type="expense"
          icon={<BarChart3 size={20} />}
        />
        <DashboardCard
          title="Saldo período"
          value={kpis.balance}
          type="balance"
          icon={<Wallet size={20} />}
          pendingHint={
            kpis.pendingIncome > 0 || kpis.pendingExpense > 0
              ? `Projetado: ${formatCurrency(kpis.projectedBalance)}`
              : undefined
          }
        />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <PayrollStatusSection
          summary={payrollStatus}
          onOpenExpenses={() => setActiveTab('expenses')}
          onEditTransaction={openExpenseTransaction}
        />
        <SubscriptionsStatusSection
          summary={subscriptionsStatus}
          onOpenExpenses={() => setActiveTab('expenses')}
          onEditTransaction={openExpenseTransaction}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <FinancialChart transactions={filteredTransactions} />

          {expensesByCategory.length > 0 && (
            <section className="bg-vybe-card border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <PieChart size={16} className="text-vybe-accent" />
                Despesas por categoria
              </h3>
              <ul className="space-y-3">
                {expensesByCategory.slice(0, 6).map((row) => (
                  <li key={row.category}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-300 truncate pr-2">{row.category}</span>
                      <span className="text-gray-500 shrink-0">
                        {row.percent.toFixed(0)}% · {formatCurrency(row.amount)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-vybe-red/80 rounded-full"
                        style={{ width: `${Math.min(row.percent, 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="bg-vybe-card border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-white mb-3">Ações rápidas</h3>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('finance')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-vybe-accent/15 text-vybe-accent hover:bg-vybe-accent/25 text-sm font-medium transition-colors"
              >
                <Plus size={16} />
                Novo lançamento
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('clients')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 text-sm transition-colors"
              >
                <Users size={16} />
                Clientes
              </button>
              <button
                type="button"
                onClick={() => openReportsWithDateRange(range.startDate, range.endDate)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 text-sm transition-colors"
              >
                <FileText size={16} />
                Relatórios detalhados
              </button>
            </div>
          </section>

          {(delinquency.overdue.length > 0 || delinquency.pending.length > 0) && (
            <section className="bg-vybe-card border border-gray-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-500" />
                  Régua de cobrança
                </h3>
                <div className="flex gap-3 mt-2 text-xs">
                  {delinquency.overdue.length > 0 && (
                    <span className="text-red-400">
                      {delinquency.overdue.length} atraso ·{' '}
                      {formatCurrency(delinquency.totalOverdueAmount)}
                    </span>
                  )}
                  {delinquency.pending.length > 0 && (
                    <span className="text-amber-400">
                      {delinquency.pending.length} a vencer ·{' '}
                      {formatCurrency(delinquency.totalPendingAmount)}
                    </span>
                  )}
                </div>
              </div>
              <ul className="divide-y divide-gray-800">
                {topDelinquent.map((item) => (
                  <li
                    key={item.client.id}
                    className="flex items-center gap-2 p-3 hover:bg-white/[0.02]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-white truncate">{item.client.name}</p>
                      <p className="text-[10px] text-gray-500">
                        {item.daysOverdue > 0
                          ? `${item.daysOverdue}d atraso`
                          : `Vence dia ${item.client.dueDay}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenBillingModal(item.client)}
                      className="shrink-0 p-1.5 rounded-lg bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366]/25"
                      title="Cobrar"
                    >
                      <MessageCircle size={14} />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setActiveTab('finance')}
                className="w-full py-2 text-xs text-vybe-accent hover:bg-white/5 flex items-center justify-center gap-1 border-t border-gray-800"
              >
                Ver régua completa <ChevronRight size={12} />
              </button>
            </section>
          )}

          <section className="bg-vybe-card border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Calendar size={16} className="text-vybe-accent" />
              MRR vs recebido
            </h3>
            <p className="text-xs text-gray-500 mb-3">Mensalidades pagas no mês do período</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">MRR esperado</span>
                <span className="text-white font-medium">{formatCurrency(mrrVsReceived.expectedMrr)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Recebido (pago)</span>
                <span className="text-vybe-green font-medium">
                  {formatCurrency(mrrVsReceived.receivedPaid)}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-800 pt-2">
                <span className="text-gray-400">Gap</span>
                <span
                  className={`font-bold ${mrrVsReceived.gap > 0 ? 'text-amber-400' : 'text-vybe-green'}`}
                >
                  {formatCurrency(mrrVsReceived.gap)}
                </span>
              </div>
            </div>
          </section>

          {dueSoon.length > 0 && (
            <section className="bg-vybe-card border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Clock size={16} className="text-amber-400" />
                Vence em 7 dias
              </h3>
              <ul className="space-y-2">
                {dueSoon.slice(0, 5).map(({ client, daysUntilDue }) => (
                  <li key={client.id} className="flex justify-between text-xs">
                    <span className="text-gray-300 truncate pr-2">{client.name}</span>
                    <span className="text-amber-400 shrink-0">
                      {daysUntilDue === 0 ? 'Hoje' : `${daysUntilDue}d`}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {pendingList.length > 0 && (
            <section className="bg-vybe-card border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-bold text-white mb-3">Pendentes para conciliar</h3>
              <ul className="space-y-2">
                {pendingList.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('finance');
                        handleEditTransaction(t);
                      }}
                      className="w-full flex justify-between items-center text-xs text-left hover:bg-white/5 rounded-lg p-2 transition-colors"
                    >
                      <span className="text-gray-300 truncate pr-2">{t.description}</span>
                      <span className="text-amber-400 shrink-0">{formatCurrency(t.amount)}</span>
                    </button>
                    <p className="text-[10px] text-gray-600 px-2">{formatDate(t.date)}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
