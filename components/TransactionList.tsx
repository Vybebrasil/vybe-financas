import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, Category, Client, PaymentMethod, TransactionStatus } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { Trash2, TrendingUp, TrendingDown, Calendar, Tag, Filter, XCircle, FileText, Briefcase, Building2, QrCode, CreditCard, Barcode, Banknote, HelpCircle, CheckCircle, Clock, Paperclip } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  clients: Client[];
  onDeleteTransaction: (id: string) => void;
  onGenerateReceipt?: (transaction: Transaction) => void;
  onToggleStatus: (id: string) => void;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, clients, onDeleteTransaction, onGenerateReceipt, onToggleStatus }) => {
  // Inicializar com a data atual
  const [filterMonth, setFilterMonth] = useState<string>(String(new Date().getMonth()));
  const [filterYear, setFilterYear] = useState<string>(String(new Date().getFullYear()));
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Gerar lista de anos disponíveis baseada nas transações + ano atual
  const availableYears = useMemo(() => {
    const years = new Set(transactions.map(t => t.date.split('-')[0]));
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
      const [tYear, tMonth] = t.date.split('-'); // YYYY-MM-DD

      const matchYear = filterYear === 'all' || tYear === filterYear;
      // tMonth vem como "01", "10". Convertemos para index (0-11) para comparar
      const matchMonth = filterMonth === 'all' || String(parseInt(tMonth) - 1) === filterMonth;
      const matchCategory = filterCategory === 'all' || t.category === filterCategory;

      return matchYear && matchMonth && matchCategory;
    });
  }, [transactions, filterYear, filterMonth, filterCategory]);

  const clearFilters = () => {
    setFilterMonth('all');
    setFilterYear('all');
    setFilterCategory('all');
  };

  const hasActiveFilters = filterMonth !== 'all' || filterYear !== 'all' || filterCategory !== 'all';

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

              {/* Filtro Categoria */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-transparent text-xs text-white p-2 outline-none cursor-pointer"
              >
                <option value="all">Todas as Categorias</option>
                {Object.values(Category).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
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

      <div className="overflow-x-auto min-h-[300px]">
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
          <table className="w-full text-left border-collapse table-fixed md:table-auto">
            <thead>
              <tr className="bg-[#2A2A2A] text-vybe-muted text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold w-[40%] md:w-auto">Descrição</th>
                <th className="p-4 font-semibold text-right md:text-left whitespace-nowrap w-[25%] md:w-auto">Valor</th>
                <th className="p-4 font-semibold hidden lg:table-cell w-[20%]">Cliente</th>
                <th className="p-4 font-semibold hidden md:table-cell w-[10%]">Categoria</th>
                <th className="p-4 font-semibold hidden sm:table-cell w-[10%]">Data</th>
                <th className="p-4 font-semibold hidden md:table-cell text-center w-[10%]">Status</th>
                <th className="p-4 font-semibold text-center w-[15%] md:w-24">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => {
                const client = transaction.clientId ? clients.find(c => c.id === transaction.clientId) : null;

                return (
                  <tr
                    key={transaction.id}
                    className="border-b border-gray-800 hover:bg-[#252525] transition-colors group"
                  >
                    <td className="p-4 align-top md:align-middle">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white truncate max-w-[150px] sm:max-w-[200px] md:max-w-xs" title={transaction.description}>
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
                                onToggleStatus(transaction.id);
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
                            <Calendar size={10} className="shrink-0" /> <span>{formatDate(transaction.date)}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 text-right md:text-left align-top md:align-middle whitespace-nowrap">
                      <div className="flex items-center justify-end md:justify-start gap-1 md:gap-2">
                        {transaction.type === TransactionType.INCOME ? (
                          <TrendingUp size={14} className="text-vybe-green shrink-0 hidden md:block" />
                        ) : (
                          <TrendingDown size={14} className="text-vybe-red shrink-0 hidden md:block" />
                        )}
                        <span className={`font-semibold text-sm md:text-base ${transaction.type === TransactionType.INCOME ? 'text-vybe-green' : 'text-vybe-red'}`}>
                          {transaction.type === TransactionType.EXPENSE ? '- ' : '+ '}
                          {formatCurrency(transaction.amount)}
                        </span>
                      </div>
                    </td>

                    {/* Desktop Columns */}

                    <td className="p-4 hidden lg:table-cell align-middle">
                      {client ? (
                        <div className="flex items-center gap-2 text-xs text-gray-300 group/client" title={client.name}>
                          <div className="w-6 h-6 rounded bg-[#121212] border border-gray-700 flex items-center justify-center text-gray-500 shrink-0">
                            <Building2 size={12} />
                          </div>
                          <span className="truncate max-w-[140px]">{client.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-700 text-xs">-</span>
                      )}
                    </td>

                    <td className="p-4 hidden md:table-cell align-middle">
                      <span className="inline-block px-2 py-1 bg-[#121212] rounded text-xs border border-gray-700 text-gray-400 truncate max-w-[120px]" title={transaction.category}>
                        {transaction.category}
                      </span>
                    </td>

                    <td className="p-4 hidden sm:table-cell text-sm text-gray-400 align-middle whitespace-nowrap">
                      {formatDate(transaction.date)}
                    </td>

                    <td className="p-4 hidden md:table-cell text-center align-middle">
                      <button
                        onClick={() => onToggleStatus(transaction.id)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border transition-all ${getStatusClasses(transaction.status)}`}
                        title="Clique para alterar o status"
                      >
                        {getStatusButtonContent(transaction.status)}
                      </button>
                    </td>

                    <td className="p-4 text-center align-middle">
                      <div className="flex items-center justify-center gap-1 md:gap-2">
                        {/* Botão de Recibo (Download/View) */}
                        {transaction.receiptUrl && (
                          <a
                            href={transaction.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 md:p-2 text-blue-400 hover:text-white hover:bg-blue-400/20 bg-blue-400/10 rounded-lg transition-all"
                            title="Ver Comprovante Anexado"
                          >
                            <Paperclip size={16} />
                          </a>
                        )}

                        {onGenerateReceipt && (
                          <button
                            onClick={() => onGenerateReceipt(transaction)}
                            className="p-1.5 md:p-2 text-vybe-accent hover:text-white hover:bg-vybe-accent bg-vybe-accent/10 rounded-lg transition-all"
                            title="Gerar Recibo (PDF)"
                          >
                            <FileText size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteTransaction(transaction.id)}
                          className="p-1.5 md:p-2 text-red-500 hover:text-white hover:bg-red-500 bg-red-500/10 rounded-lg transition-all"
                          title="Excluir Transação"
                        >
                          <Trash2 size={16} />
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