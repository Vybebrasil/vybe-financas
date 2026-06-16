import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, Category, Client, PaymentMethod, TransactionStatus, BankAccount } from '../types';
import { getCategoryLabels } from '../src/services/categories';
import {
  getTransactionFilterDate,
  getTransactionScheduledDate,
} from '../src/services/transactionDates';
import { formatCurrency, formatDate } from '../utils';
import { Trash2, TrendingUp, TrendingDown, Calendar, Tag, Filter, XCircle, FileText, Briefcase, QrCode, CreditCard, Barcode, Banknote, CheckCircle, Clock, Paperclip, Pencil } from 'lucide-react';
import SettlementDateModal from './SettlementDateModal';

interface TransactionListProps {
  transactions: Transaction[];
  clients: Client[];
  bankAccounts?: BankAccount[];
  categoryLabels?: string[];
  onDeleteTransaction: (id: string) => void;
  onEditTransaction?: (transaction: Transaction) => void;
  onGenerateReceipt?: (transaction: Transaction) => void;
  onToggleStatus: (id: string, paidDate?: string) => void;
}

const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  clients,
  bankAccounts = [],
  categoryLabels,
  onDeleteTransaction,
  onEditTransaction,
  onGenerateReceipt,
  onToggleStatus,
}) => {
  // Inicializar com a data atual
  const [filterMonth, setFilterMonth] = useState<string>(String(new Date().getMonth()));
  const [filterYear, setFilterYear] = useState<string>(String(new Date().getFullYear()));
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterBankAccount, setFilterBankAccount] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [settlingTransaction, setSettlingTransaction] = useState<Transaction | null>(null);

  const handleStatusClick = (transaction: Transaction) => {
    if (transaction.status === TransactionStatus.PENDING) {
      setSettlingTransaction(transaction);
      return;
    }
    onToggleStatus(transaction.id);
  };

  const handleConfirmSettlement = (paidDate: string) => {
    if (!settlingTransaction) return;
    onToggleStatus(settlingTransaction.id, paidDate);
    setSettlingTransaction(null);
  };

  const categoriesForFilter = useMemo(() => {
    const base = categoryLabels ?? getCategoryLabels();
    const fromTx = new Set(transactions.map((t) => t.category));
    return [...new Set([...base, ...fromTx])].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [categoryLabels, transactions]);

  // Gerar lista de anos disponíveis baseada nas transações + ano atual
  const availableYears = useMemo(() => {
    const years = new Set(
      transactions.map((t) => getTransactionFilterDate(t).split('-')[0]),
    );
    years.add(String(new Date().getFullYear()));
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [transactions]);

  const months = [
    { value: '0', label: 'Janeiro' },
    { value: '1', label: 'Fevereiro' },
    { value: '2', label: 'Março' },
    { value: '3', label: 'Abril' },
    { value: '4', label: 'Maio' },
    { value: '5', label: 'Junho' },
    { value: '6', label: 'Julho' },
    { value: '7', label: 'Agosto' },
    { value: '8', label: 'Setembro' },
    { value: '9', label: 'Outubro' },
    { value: '10', label: 'Novembro' },
    { value: '11', label: 'Dezembro' },
  ];

  // Lógica de Filtragem
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const filterDate = getTransactionFilterDate(t);
      const [tYear, tMonth] = filterDate.split('-'); // YYYY-MM-DD

      const matchYear = filterYear === 'all' || tYear === filterYear;
      // tMonth vem como "01", "10". Convertemos para index (0-11) para comparar
      const matchMonth = filterMonth === 'all' || String(parseInt(tMonth) - 1) === filterMonth;
      const matchCategory = filterCategory === 'all' || t.category === filterCategory;
      const matchBank =
        filterBankAccount === 'all' ||
        (filterBankAccount === 'none' ? !t.bankAccountId : t.bankAccountId === filterBankAccount);
      const matchType = filterType === 'all' || t.type === filterType;

      return matchYear && matchMonth && matchCategory && matchBank && matchType;
    });
  }, [transactions, filterYear, filterMonth, filterCategory, filterBankAccount, filterType]);

  const clearFilters = () => {
    setFilterMonth('all');
    setFilterYear('all');
    setFilterCategory('all');
    setFilterBankAccount('all');
    setFilterType('all');
  };

  const hasActiveFilters =
    filterMonth !== 'all' ||
    filterYear !== 'all' ||
    filterCategory !== 'all' ||
    filterBankAccount !== 'all' ||
    filterType !== 'all';

  const getPaymentIcon = (method?: PaymentMethod) => {
    switch (method) {
      case 'PIX': return <QrCode size={12} className="text-teal-400" />;
      case 'CARTAO': return <CreditCard size={12} className="text-purple-400" />;
      case 'BOLETO': return <Barcode size={12} className="text-gray-400" />;
      case 'DINHEIRO': return <Banknote size={12} className="text-green-400" />;
      default: return null;
    }
  };

  const getStatusButtonContent = (status: TransactionStatus) => {
    if (status === TransactionStatus.PAID) {
      return (
        <>
          <CheckCircle size={12} /> <span className="uppercase">Pago</span>
        </>
      );
    }
    return (
      <>
        <Clock size={12} /> <span className="uppercase">Pendente</span>
      </>
    );
  };

  const getStatusClasses = (status: TransactionStatus) => {
    if (status === TransactionStatus.PAID) {
      return "bg-vybe-green/10 text-vybe-green border-vybe-green/20 hover:bg-vybe-green hover:text-white";
    }
    return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500 hover:text-white";
  };

  return (
    <div className="bg-vybe-card rounded-xl border border-gray-800 shadow-lg overflow-hidden flex flex-col">
      <SettlementDateModal
        transaction={settlingTransaction}
        onClose={() => setSettlingTransaction(null)}
        onConfirm={handleConfirmSettlement}
      />
      <div className="p-6 border-b border-gray-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-1 h-6 bg-vybe-accent rounded-full"></span>
            Extrato
          </h2>

          {/* Área de Filtros */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-[#121212] p-1 rounded-lg border border-gray-700 max-w-full overflow-x-auto">
              <Filter size={14} className="text-vybe-muted ml-2 shrink-0" />

              {/* Filtro Mês */}
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="bg-transparent text-xs text-white p-2 outline-none cursor-pointer border-r border-gray-700 last:border-0"
              >
                <option value="all">Todos os Meses</option>
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>

              {/* Filtro Ano */}
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="bg-transparent text-xs text-white p-2 outline-none cursor-pointer border-r border-gray-700 last:border-0"
              >
                <option value="all">Todos os Anos</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

              {/* Filtro Entrada / Saída */}
              <select
                value={filterType}
                onChange={(e) =>
                  setFilterType(e.target.value as 'all' | TransactionType)
                }
                className="bg-transparent text-xs text-white p-2 outline-none cursor-pointer border-r border-gray-700"
                aria-label="Filtrar por entrada ou saída"
              >
                <option value="all">Entradas e saídas</option>
                <option value={TransactionType.INCOME}>Entradas</option>
                <option value={TransactionType.EXPENSE}>Saídas</option>
              </select>

              {/* Filtro Categoria */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-transparent text-xs text-white p-2 outline-none cursor-pointer border-r border-gray-700"
              >
                <option value="all">Todas as Categorias</option>
                {categoriesForFilter.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {bankAccounts.length > 0 && (
                <select
                  value={filterBankAccount}
                  onChange={(e) => setFilterBankAccount(e.target.value)}
                  className="bg-transparent text-xs text-white p-2 outline-none cursor-pointer"
                >
                  <option value="all">Todas as contas</option>
                  <option value="none">Sem conta</option>
                  {bankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              )}
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-vybe-muted hover:text-white flex items-center gap-1 px-2 py-1"
                title="Limpar Filtros"
              >
                <XCircle size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto lg:overflow-x-visible min-h-[300px]">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center justify-center text-vybe-muted">
            <div className="bg-[#121212] p-4 rounded-full mb-3">
              <Filter size={24} className="opacity-50" />
            </div>
            <p>Nenhuma transação encontrada.</p>
            {hasActiveFilters && (
              <p className="text-xs mt-2 text-gray-600">Tente ajustar os filtros selecionados.</p>
            )}
          </div>
        ) : (
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-[#2A2A2A] text-vybe-muted text-[10px] uppercase tracking-wider">
                <th className="px-2 py-2.5 font-semibold min-w-0">Descrição</th>
                <th className="px-2 py-2.5 font-semibold text-right w-[5.25rem]">Valor</th>
                <th className="px-2 py-2.5 font-semibold hidden lg:table-cell w-[5.5rem]">Cliente</th>
                <th className="px-2 py-2.5 font-semibold hidden md:table-cell w-[5rem]">Cat.</th>
                <th className="px-2 py-2.5 font-semibold hidden sm:table-cell w-[4.75rem]">Data</th>
                <th className="px-1 py-2.5 font-semibold hidden md:table-cell text-center w-10">St.</th>
                <th className="px-1 py-2.5 font-semibold text-center w-[6.75rem]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => {
                const client = transaction.clientId ? clients.find(c => c.id === transaction.clientId) : null;
                const displayDate = getTransactionFilterDate(transaction);
                const scheduledDate = getTransactionScheduledDate(transaction);
                const showScheduledHint =
                  transaction.status === TransactionStatus.PAID &&
                  transaction.paidDate &&
                  transaction.paidDate !== scheduledDate;

                return (
                  <tr
                    key={transaction.id}
                    className={`border-b border-gray-800 hover:bg-[#252525] transition-colors group ${transaction.status === TransactionStatus.PENDING ? 'bg-amber-500/[0.03]' : ''}`}
                  >
                    <td className="px-2 py-2.5 align-top md:align-middle overflow-hidden">
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {transaction.status === TransactionStatus.PENDING && (
                            <span
                              className="shrink-0 flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400"
                              title="Pendente"
                            >
                              <Clock size={10} />
                            </span>
                          )}
                          <span className={`font-medium text-sm truncate block min-w-0 ${transaction.status === TransactionStatus.PENDING ? 'text-amber-100' : 'text-white'}`} title={transaction.description}>
                            {transaction.description}
                          </span>
                        </div>

                        {/* Mobile/Tablet view info */}
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          {/* Payment Method Tag */}
                          {transaction.paymentMethod && (
                            <div className="flex items-center gap-1 text-[10px] text-gray-400 bg-[#121212] px-1.5 py-0.5 rounded border border-gray-700" title={`Pagamento via ${transaction.paymentMethod}`}>
                              {getPaymentIcon(transaction.paymentMethod)}
                              <span className="uppercase">{transaction.paymentMethod}</span>
                            </div>
                          )}

                          {/* Mobile Status Toggle */}
                          <div className="md:hidden">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusClick(transaction);
                              }}
                              className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border font-bold transition-all ${getStatusClasses(transaction.status)}`}
                            >
                              {getStatusButtonContent(transaction.status)}
                            </button>
                          </div>

                          {/* Cliente Tag (Visible on Mobile/Tablet < lg) */}
                          {client && (
                            <div className="lg:hidden flex items-center gap-1 text-[10px] text-vybe-accent font-medium bg-vybe-accent/10 px-1.5 py-0.5 rounded border border-vybe-accent/20 truncate max-w-[120px]">
                              <Briefcase size={10} className="shrink-0" /> <span className="truncate">{client.name}</span>
                            </div>
                          )}

                          {/* Categoria Tag (Visible on Mobile < md) */}
                          <div className="md:hidden flex items-center gap-1 text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded truncate max-w-[100px]">
                            <Tag size={10} className="shrink-0" /> <span className="truncate">{transaction.category}</span>
                          </div>

                          {/* Data Tag (Visible on Mobile < sm) */}
                          <div className="sm:hidden flex items-center gap-1 text-[10px] text-gray-500">
                            <Calendar size={10} className="shrink-0" />
                            <span title={showScheduledHint ? `Previsto: ${formatDate(scheduledDate)}` : undefined}>
                              {formatDate(displayDate)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-2 py-2.5 text-right align-top md:align-middle whitespace-nowrap">
                      <div className="flex items-center justify-end gap-0.5">
                        {transaction.type === TransactionType.INCOME ? (
                          <TrendingUp size={12} className="text-vybe-green shrink-0 hidden sm:block" />
                        ) : (
                          <TrendingDown size={12} className="text-vybe-red shrink-0 hidden sm:block" />
                        )}
                        <span className={`font-semibold text-xs sm:text-sm tabular-nums ${transaction.type === TransactionType.INCOME ? 'text-vybe-green' : 'text-vybe-red'}`}>
                          {transaction.type === TransactionType.EXPENSE ? '- ' : '+ '}
                          {formatCurrency(transaction.amount)}
                        </span>
                      </div>
                    </td>

                    {/* Desktop Columns */}

                    <td className="px-2 py-2.5 hidden lg:table-cell align-middle overflow-hidden">
                      {client ? (
                        <span className="text-[11px] text-gray-300 truncate block" title={client.name}>
                          {client.name}
                        </span>
                      ) : (
                        <span className="text-gray-700 text-xs">-</span>
                      )}
                    </td>

                    <td className="px-2 py-2.5 hidden md:table-cell align-middle overflow-hidden">
                      <span className="block text-[10px] text-gray-400 truncate" title={transaction.category}>
                        {transaction.category}
                      </span>
                    </td>

                    <td className="px-2 py-2.5 hidden sm:table-cell text-[11px] text-gray-400 align-middle whitespace-nowrap tabular-nums">
                      <span title={showScheduledHint ? `Previsto: ${formatDate(scheduledDate)}` : undefined}>
                        {formatDate(displayDate)}
                      </span>
                    </td>

                    <td className="px-1 py-2.5 hidden md:table-cell text-center align-middle">
                      <button
                        onClick={() => handleStatusClick(transaction)}
                        className={`inline-flex items-center justify-center p-1 rounded-md border transition-all ${getStatusClasses(transaction.status)}`}
                        title={transaction.status === TransactionStatus.PAID ? 'Pago — clique para pendente' : 'Pendente — clique para dar baixa'}
                      >
                        {transaction.status === TransactionStatus.PAID ? (
                          <CheckCircle size={14} />
                        ) : (
                          <Clock size={14} />
                        )}
                      </button>
                    </td>

                    <td className="px-1 py-2.5 text-center align-middle">
                      <div className="flex items-center justify-center gap-0.5 shrink-0">
                        {transaction.receiptUrl && (
                          <a
                            href={transaction.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-blue-400 hover:text-white hover:bg-blue-400/20 bg-blue-400/10 rounded transition-all"
                            title="Ver comprovante"
                          >
                            <Paperclip size={14} />
                          </a>
                        )}

                        {onEditTransaction && (
                          <button
                            type="button"
                            onClick={() => onEditTransaction(transaction)}
                            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 bg-gray-800 rounded transition-all"
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {onGenerateReceipt && (
                          <button
                            type="button"
                            onClick={() => onGenerateReceipt(transaction)}
                            className="p-1 text-vybe-accent hover:text-white hover:bg-vybe-accent bg-vybe-accent/10 rounded transition-all"
                            title="Recibo PDF"
                          >
                            <FileText size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDeleteTransaction(transaction.id)}
                          className="p-1 text-red-500 hover:text-white hover:bg-red-500 bg-red-500/10 rounded transition-all"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TransactionList;