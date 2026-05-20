import React, { useEffect, useMemo, useState } from 'react';
import { useToast } from './ToastProvider';
import { useAppData } from '../src/context/AppDataContext';
import { Transaction, TransactionType, Category, Client, TransactionStatus, CompanySettings } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { Printer, TrendingUp, DollarSign, Percent, PieChart, BarChart3, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle, CheckCircle, Clock, Download, X, FileText, Users, UserPlus, UserMinus, Receipt } from 'lucide-react';

interface ReportsViewProps {
  transactions: Transaction[];
  clients: Client[];
  companySettings: CompanySettings;
}

type SortKey = 'date' | 'amount' | 'category' | 'description' | 'status';
type SortDirection = 'asc' | 'desc';

const ReportsView: React.FC<ReportsViewProps> = ({ transactions, clients, companySettings }) => {
  const toast = useToast();
  const { reportsDateFilter, setReportsDateFilter, bankAccounts } = useAppData();
  const currentYear = new Date().getFullYear();
  
  // --- STATE FOR FILTERS ---
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>('all');

  useEffect(() => {
    if (!reportsDateFilter) return;
    setStartDate(reportsDateFilter.startDate);
    setEndDate(reportsDateFilter.endDate);
    setReportsDateFilter(null);
  }, [reportsDateFilter, setReportsDateFilter]);
  
  // Sorting State
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // --- FILTER LOGIC ---
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // 1. Date Range
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;

      if (selectedBankAccount !== 'all') {
        if (selectedBankAccount === 'none') {
          if (t.bankAccountId) return false;
        } else if (t.bankAccountId !== selectedBankAccount) {
          return false;
        }
      }

      // 2. Text Search (Description or Category or Client Name)
      if (searchText) {
        const term = searchText.toLowerCase();
        // Buscar nome do cliente se houver ID vinculado
        const clientName = t.clientId ? clients.find(c => c.id === t.clientId)?.name.toLowerCase() : '';
        
        // Verifica se o termo existe na Descrição, Categoria ou Nome do Cliente
        if (!t.description.toLowerCase().includes(term) && 
            !t.category.toLowerCase().includes(term) &&
            !(clientName && clientName.includes(term))) {
          return false;
        }
      }

      // 3. Category
      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;

      // 4. Status
      if (selectedStatus !== 'all' && t.status !== selectedStatus) return false;

      return true;
    });
  }, [transactions, startDate, endDate, searchText, selectedCategory, selectedStatus, selectedBankAccount, clients]);

  // --- SORT LOGIC ---
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      let valA: any = a[sortKey];
      let valB: any = b[sortKey];

      if (sortKey === 'amount') {
          valA = a.amount;
          valB = b.amount;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredTransactions, sortKey, sortDirection]);

  // --- KPI CALCULATIONS ---
  const kpis = useMemo(() => {
    const paid = filteredTransactions.filter((t) => t.status === TransactionStatus.PAID);

    const revenue = paid
      .filter((t) => t.type === TransactionType.INCOME)
      .reduce((acc, curr) => acc + curr.amount, 0);

    const expenses = paid
      .filter((t) => t.type === TransactionType.EXPENSE)
      .reduce((acc, curr) => acc + curr.amount, 0);

    const pendingIncome = filteredTransactions
      .filter((t) => t.status === TransactionStatus.PENDING && t.type === TransactionType.INCOME)
      .reduce((acc, curr) => acc + curr.amount, 0);

    const pendingExpense = filteredTransactions
      .filter((t) => t.status === TransactionStatus.PENDING && t.type === TransactionType.EXPENSE)
      .reduce((acc, curr) => acc + curr.amount, 0);

    const profit = revenue - expenses;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return { revenue, expenses, profit, margin, pendingIncome, pendingExpense };
  }, [filteredTransactions]);

  const clientMetrics = useMemo(() => {
    const activeClients = clients.filter((c) => c.contractStatus === 'Ativo');
    const activeCount = activeClients.length;
    const totalContracts = activeClients.reduce((sum, c) => sum + c.monthlyFee, 0);
    const ticketMedio = activeCount > 0 ? totalContracts / activeCount : 0;
    const mrr = totalContracts;

    const now = new Date();
    const defaultStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const defaultEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const periodStart = startDate || defaultStart;
    const periodEnd = endDate || defaultEnd;

    const matchesClientPayment = (client: Client, t: Transaction) => {
      if (t.type !== TransactionType.INCOME) return false;
      const namePattern = `mensalidade - ${client.name}`.toLowerCase();
      return (
        t.clientId === client.id ||
        (t.category === Category.CLIENT_PAYMENT &&
          t.description.toLowerCase().includes(namePattern))
      );
    };

    const getLastPaymentDate = (client: Client): string | null => {
      let latest: string | null = null;
      transactions.forEach((t) => {
        if (!matchesClientPayment(client, t)) return;
        const day = t.date.slice(0, 10);
        if (!latest || day > latest) latest = day;
      });
      return latest;
    };

    let newMrr = 0;
    let newContractsCount = 0;
    clients.forEach((client) => {
      const addedAt = client.createdAt;
      if (!addedAt || addedAt < periodStart || addedAt > periodEnd) return;
      newMrr += client.monthlyFee;
      newContractsCount += 1;
    });

    const cancelledClients = clients.filter((c) => c.contractStatus === 'Cancelado');
    let churnCount = 0;
    let churnMrr = 0;
    cancelledClients.forEach((client) => {
      const lastPayment = getLastPaymentDate(client);
      if (lastPayment && lastPayment >= periodStart && lastPayment <= periodEnd) {
        churnCount += 1;
        churnMrr += client.monthlyFee;
      }
    });

    const churnBase = activeCount + churnCount;
    const churnRate = churnBase > 0 ? (churnCount / churnBase) * 100 : 0;
    const totalCancelled = cancelledClients.length;

    return {
      activeCount,
      ticketMedio,
      mrr,
      newMrr,
      newContractsCount,
      totalContracts,
      periodStart,
      periodEnd,
      churnCount,
      churnMrr,
      churnRate,
      totalCancelled,
    };
  }, [clients, transactions, startDate, endDate]);

  // --- CHART DATA ---
  const expensesByCategory = useMemo(() => {
    const expenseMap = new Map<string, number>();
    let totalExp = 0;

    filteredTransactions
      .filter((t) => t.type === TransactionType.EXPENSE && t.status === TransactionStatus.PAID)
      .forEach(t => {
        const current = expenseMap.get(t.category) || 0;
        expenseMap.set(t.category, current + t.amount);
        totalExp += t.amount;
      });

    const data = Array.from(expenseMap.entries())
      .map(([cat, amount]) => ({
        category: cat,
        amount,
        percentage: totalExp > 0 ? (amount / totalExp) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    return { data, total: totalExp };
  }, [filteredTransactions]);

  const cashFlowHistory = useMemo(() => {
    const data = [];
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthStr = String(d.getMonth() + 1).padStart(2, '0');
      const yearStr = d.getFullYear();
      const key = `${yearStr}-${monthStr}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      
      const income = filteredTransactions
        .filter(
          (t) =>
            t.date.startsWith(key) &&
            t.type === TransactionType.INCOME &&
            t.status === TransactionStatus.PAID,
        )
        .reduce((acc, curr) => acc + curr.amount, 0);

      const expense = filteredTransactions
        .filter(
          (t) =>
            t.date.startsWith(key) &&
            t.type === TransactionType.EXPENSE &&
            t.status === TransactionStatus.PAID,
        )
        .reduce((acc, curr) => acc + curr.amount, 0);

      data.push({ label, income, expense });
    }
    return data;
  }, [filteredTransactions]);

  const maxChartValue = Math.max(
    ...cashFlowHistory.map(d => Math.max(d.income, d.expense)),
    100
  );

  // --- ACTION HANDLERS ---

  const SortIcon = ({ colKey }: { colKey: SortKey }) => {
    if (sortKey !== colKey) return <ArrowUpDown size={12} className="opacity-30" />;
    return sortDirection === 'asc' ? <ArrowUp size={12} className="text-vybe-accent" /> : <ArrowDown size={12} className="text-vybe-accent" />;
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleExportCSV = () => {
    const headers = ['Data', 'Descrição', 'Categoria', 'Cliente Vinculado', 'Tipo', 'Valor', 'Status'];
    
    const csvRows = sortedTransactions.map(t => {
        const clientName = t.clientId ? clients.find(c => c.id === t.clientId)?.name || '' : '';
        const typeLabel = t.type === TransactionType.INCOME ? 'Entrada' : 'Saída';
        const statusLabel = t.status === TransactionStatus.PAID ? 'Pago' : 'Pendente';
        
        // Escape quotes and format columns
        return [
            formatDate(t.date),
            `"${t.description.replace(/"/g, '""')}"`,
            `"${t.category}"`,
            `"${clientName}"`,
            typeLabel,
            t.amount.toFixed(2).replace('.', ','), // Format for Excel Brazil
            statusLabel
        ].join(';'); // Semicolon for Excel Brazil standard
    });

    // Add Company Info to CSV Header
    const reportHeader = [
        `Relatório Financeiro`,
        `Empresa: ${companySettings.name}`,
        `CNPJ: ${companySettings.cnpj}`,
        `Gerado em: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        '' // Empty line
    ].join('\n');

    const csvContent = '\uFEFF' + reportHeader + [headers.join(';'), ...csvRows].join('\n'); // Add BOM for UTF-8
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Relatorio_Vybe_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    // Access jsPDF from window object (loaded via CDN)
    const win = window as any;
    if (!win.jspdf) {
      toast.info('Biblioteca PDF ainda carregando. Tente novamente em instantes.');
      return;
    }
    
    const { jsPDF } = win.jspdf;
    const doc = new jsPDF();

    // -- Header --
    doc.setFillColor(30, 30, 30); // Dark Gray
    doc.rect(0, 0, 210, 28, 'F');
    
    doc.setFontSize(16);
    doc.setTextColor(255, 102, 0); // Vybe Accent Color
    doc.text(companySettings.name, 14, 10);
    
    doc.setFontSize(9);
    doc.setTextColor(200, 200, 200); // Light gray
    doc.text(`CNPJ: ${companySettings.cnpj}`, 14, 16);

    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("Relatório Gerencial", 14, 23);
    
    doc.setFontSize(8);
    doc.setTextColor(200, 200, 200);
    const dateStr = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR');
    doc.text(`Gerado em: ${dateStr}`, 196, 12, { align: 'right' });

    // -- KPIs Summary --
    let startY = 38;
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("Resumo Financeiro (Período Selecionado)", 14, startY);
    
    startY += 8;
    
    // KPI Boxes (Simulated with text)
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Receita Total:", 14, startY);
    doc.text("Despesas Totais:", 80, startY);
    doc.text("Resultado Líquido:", 146, startY);
    
    startY += 6;
    doc.setFontSize(12);
    doc.setTextColor(16, 185, 129); // Green
    doc.text(formatCurrency(kpis.revenue), 14, startY);
    
    doc.setTextColor(239, 68, 68); // Red
    doc.text(formatCurrency(kpis.expenses), 80, startY); // Using calculated expenses from earlier if available, or calc now
    
    // Profit
    if (kpis.profit >= 0) doc.setTextColor(16, 185, 129);
    else doc.setTextColor(239, 68, 68);
    doc.text(formatCurrency(kpis.profit), 146, startY);
    
    // -- Transactions Table --
    
    // Prepare data for AutoTable
    const tableColumn = ["Data", "Descrição", "Categoria", "Tipo", "Status", "Valor"];
    const tableRows: any[] = [];

    sortedTransactions.forEach(t => {
      const typeLabel = t.type === TransactionType.INCOME ? 'Entrada' : 'Saída';
      const statusLabel = t.status === TransactionStatus.PAID ? 'Pago' : 'Pendente';
      
      const rowData = [
        formatDate(t.date),
        t.description,
        t.category,
        typeLabel,
        statusLabel,
        formatCurrency(t.amount)
      ];
      tableRows.push(rowData);
    });

    // AutoTable Logic
    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: startY + 15,
      theme: 'striped',
      headStyles: {
        fillColor: [30, 30, 30],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      columnStyles: {
        5: { halign: 'right', fontStyle: 'bold' } // Amount Column
      },
      didParseCell: function(data: any) {
         // Color Income/Expense rows/cells if needed
         if (data.section === 'body' && data.column.index === 5) {
             const rawVal = tableRows[data.row.index][3]; // Check 'Tipo' column
             if (rawVal === 'Entrada') {
                 data.cell.styles.textColor = [16, 185, 129];
             } else {
                 data.cell.styles.textColor = [239, 68, 68];
             }
         }
      }
    });

    doc.save(`Relatorio_Vybe_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Colors for Doughnut
  const categoryColors: Record<string, string> = {
    [Category.SALARY]: '#EF4444', 
    [Category.ADS]: '#F59E0B',
    [Category.TOOLS]: '#3B82F6', 
    [Category.SUPPLIES]: '#10B981',
    [Category.OTHER]: '#8B5CF6',
    [Category.CLIENT_PAYMENT]: '#6B7280',
  };

  const doughnutGradient = useMemo(() => {
    let currentDeg = 0;
    const segments = expensesByCategory.data.map(item => {
      const deg = (item.percentage / 100) * 360;
      const color = categoryColors[item.category] || '#6B7280';
      const segment = `${color} ${currentDeg}deg ${currentDeg + deg}deg`;
      currentDeg += deg;
      return segment;
    });
    return `conic-gradient(${segments.join(', ')})`;
  }, [expensesByCategory]);

  return (
    <div className="animate-bar-grow origin-top space-y-6">
      
      {/* Header & Action */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <PieChart className="text-vybe-accent" />
            Relatórios & BI
          </h2>
          <p className="text-xs text-gray-500">
             {filteredTransactions.length} movimentações encontradas
          </p>
        </div>
        
        <div className="flex gap-2">
            <button 
              onClick={handleExportCSV}
              className="bg-[#1E1E1E] hover:bg-[#2A2A2A] text-white border border-gray-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm transition-colors"
              title="Exportar dados para Excel/CSV"
            >
              <Download size={16} />
              <span className="hidden md:inline">CSV</span>
            </button>
            <button 
              onClick={handleExportPDF}
              className="bg-[#1E1E1E] hover:bg-[#2A2A2A] text-white border border-gray-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm transition-colors"
              title="Baixar relatório em PDF"
            >
              <FileText size={16} />
              <span className="hidden md:inline">PDF</span>
            </button>
            <button 
              onClick={handlePrint}
              className="bg-vybe-accent hover:bg-[#E65C00] text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm transition-colors shadow-lg"
              title="Imprimir visualização"
            >
              <Printer size={16} />
              <span className="hidden md:inline">Imprimir</span>
            </button>
        </div>
      </div>

      {/* --- ADVANCED FILTERS BAR --- */}
      <div className="bg-[#1E1E1E] p-4 rounded-xl border border-gray-800 shadow-md print:hidden">
         <div className="flex items-center gap-2 mb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
            <Filter size={12} /> Filtros Avançados
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Date Range */}
            <div>
               <label className="text-[10px] text-gray-500 block mb-1">De</label>
               <input 
                 type="date" 
                 value={startDate} 
                 onChange={e => setStartDate(e.target.value)}
                 className="w-full bg-[#121212] border border-gray-700 rounded p-2 text-xs text-white focus:border-vybe-accent outline-none [color-scheme:dark]" 
               />
            </div>
            <div>
               <label className="text-[10px] text-gray-500 block mb-1">Até</label>
               <input 
                 type="date" 
                 value={endDate} 
                 onChange={e => setEndDate(e.target.value)}
                 className="w-full bg-[#121212] border border-gray-700 rounded p-2 text-xs text-white focus:border-vybe-accent outline-none [color-scheme:dark]" 
               />
            </div>

            {/* Search */}
            <div>
               <label className="text-[10px] text-gray-500 block mb-1">Buscar (Desc, Categ, Cliente)</label>
               <div className="relative group">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-vybe-accent transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Ex: Google, Salário, Cliente..." 
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    className={`w-full bg-[#121212] border rounded p-2 pl-8 pr-8 text-xs text-white outline-none transition-all ${searchText ? 'border-vybe-accent' : 'border-gray-700 focus:border-vybe-accent'}`}
                  />
                  {searchText && (
                    <button 
                        onClick={() => setSearchText('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                        title="Limpar busca"
                    >
                        <X size={12} />
                    </button>
                  )}
               </div>
            </div>

            {/* Category */}
            <div>
               <label className="text-[10px] text-gray-500 block mb-1">Categoria</label>
               <select 
                 value={selectedCategory} 
                 onChange={e => setSelectedCategory(e.target.value)}
                 className="w-full bg-[#121212] border border-gray-700 rounded p-2 text-xs text-white focus:border-vybe-accent outline-none cursor-pointer"
               >
                  <option value="all">Todas</option>
                  {Object.values(Category).map(cat => (
                     <option key={cat} value={cat}>{cat}</option>
                  ))}
               </select>
            </div>

            {/* Status */}
            <div>
               <label className="text-[10px] text-gray-500 block mb-1">Status (Conciliação)</label>
               <select 
                 value={selectedStatus} 
                 onChange={e => setSelectedStatus(e.target.value)}
                 className="w-full bg-[#121212] border border-gray-700 rounded p-2 text-xs text-white focus:border-vybe-accent outline-none cursor-pointer"
               >
                  <option value="all">Todos</option>
                  <option value={TransactionStatus.PAID}>Pagos / Recebidos</option>
                  <option value={TransactionStatus.PENDING}>Pendentes</option>
               </select>
            </div>

            {bankAccounts.length > 0 && (
            <div>
               <label className="text-[10px] text-gray-500 block mb-1">Conta bancária</label>
               <select
                 value={selectedBankAccount}
                 onChange={(e) => setSelectedBankAccount(e.target.value)}
                 className="w-full bg-[#121212] border border-gray-700 rounded p-2 text-xs text-white focus:border-vybe-accent outline-none cursor-pointer"
               >
                  <option value="all">Todas</option>
                  <option value="none">Sem conta</option>
                  {bankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
               </select>
            </div>
            )}
         </div>
      </div>

      {/* PRINT HEADER ONLY */}
      <div className="hidden print:block mb-8 border-b border-gray-300 pb-4">
          <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-black">{companySettings.name}</h1>
          </div>
          <p className="text-sm font-bold text-gray-700">CNPJ: {companySettings.cnpj}</p>
          <p className="text-sm text-gray-600 mt-1">Gerado em: {new Date().toLocaleDateString()}</p>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-vybe-card print:bg-white print:border print:border-gray-200 p-6 rounded-xl border border-gray-800 shadow-lg">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 print:text-gray-600">Receita (pagos)</p>
          <p className="text-2xl font-bold text-vybe-green print:text-black">{formatCurrency(kpis.revenue)}</p>
          {kpis.pendingIncome > 0 && (
            <p className="text-[10px] text-amber-500 mt-1">+ {formatCurrency(kpis.pendingIncome)} a receber</p>
          )}
        </div>

        <div className="bg-vybe-card print:bg-white print:border print:border-gray-200 p-6 rounded-xl border border-gray-800 shadow-lg">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 print:text-gray-600">Resultado Líquido (pagos)</p>
          <p className={`text-2xl font-bold ${kpis.profit >= 0 ? 'text-vybe-green print:text-black' : 'text-vybe-red'}`}>
            {formatCurrency(kpis.profit)}
          </p>
        </div>

        <div className="bg-vybe-card print:bg-white print:border print:border-gray-200 p-6 rounded-xl border border-gray-800 shadow-lg">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 print:text-gray-600">Margem</p>
          <p className="text-2xl font-bold text-vybe-accent print:text-black">{kpis.margin.toFixed(1)}%</p>
        </div>
      </div>

      {/* Carteira & MRR */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-vybe-card print:bg-white print:border print:border-gray-200 p-6 rounded-xl border border-gray-800 shadow-lg">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 print:text-gray-600 flex items-center gap-1.5">
            <Receipt size={14} /> Ticket Médio
          </p>
          <p className="text-2xl font-bold text-white print:text-black">{formatCurrency(clientMetrics.ticketMedio)}</p>
          <p className="text-[10px] text-gray-500 mt-2">
            {formatCurrency(clientMetrics.totalContracts)} em contratos ÷ {clientMetrics.activeCount} clientes ativos
          </p>
        </div>

        <div className="bg-vybe-card print:bg-white print:border print:border-gray-200 p-6 rounded-xl border border-gray-800 shadow-lg">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 print:text-gray-600 flex items-center gap-1.5">
            <UserPlus size={14} /> Novo MRR
          </p>
          <p className="text-2xl font-bold text-vybe-green print:text-black">{formatCurrency(clientMetrics.newMrr)}</p>
          <p className="text-[10px] text-gray-500 mt-2">
            {clientMetrics.newContractsCount} novo(s) contrato(s) cadastrado(s) ({clientMetrics.periodStart} a {clientMetrics.periodEnd})
          </p>
        </div>

        <div className="bg-vybe-card print:bg-white print:border print:border-gray-200 p-6 rounded-xl border border-gray-800 shadow-lg">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 print:text-gray-600 flex items-center gap-1.5">
            <Users size={14} /> Clientes Ativos
          </p>
          <p className="text-2xl font-bold text-vybe-accent print:text-black">{clientMetrics.activeCount}</p>
          <p className="text-[10px] text-gray-500 mt-2">
            MRR da carteira: {formatCurrency(clientMetrics.mrr)}
          </p>
        </div>

        <div className="bg-vybe-card print:bg-white print:border print:border-gray-200 p-6 rounded-xl border border-gray-800 shadow-lg">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 print:text-gray-600 flex items-center gap-1.5">
            <UserMinus size={14} /> Churn
          </p>
          <p className="text-2xl font-bold text-vybe-red print:text-black">{clientMetrics.churnRate.toFixed(1)}%</p>
          <p className="text-[10px] text-gray-500 mt-2">
            {clientMetrics.churnCount} cancelamento(s) no período · {formatCurrency(clientMetrics.churnMrr)} MRR perdido
          </p>
          <p className="text-[10px] text-gray-600 mt-1">
            {clientMetrics.totalCancelled} cliente(s) cancelados no total
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:block print:space-y-6">
        {/* Doughnut */}
        <div className="bg-vybe-card print:bg-white print:border print:border-gray-200 p-6 rounded-xl border border-gray-800 shadow-lg flex flex-col print:break-inside-avoid">
           <h3 className="text-white print:text-black font-bold mb-6 flex items-center gap-2 text-sm uppercase tracking-wide">
             <PieChart size={16} className="text-gray-400" /> Despesas (Filtrado)
           </h3>
           <div className="flex flex-col sm:flex-row items-center justify-center gap-8 h-full">
              <div className="relative w-40 h-40 shrink-0">
                 {expensesByCategory.data.length > 0 ? (
                    <div className="w-full h-full rounded-full" style={{ background: doughnutGradient }}>
                      <div className="absolute inset-4 bg-vybe-card print:bg-white rounded-full flex items-center justify-center">
                         <span className="text-xs text-gray-500 font-medium text-center">Total<br/>Despesas</span>
                      </div>
                    </div>
                 ) : (
                    <div className="w-full h-full rounded-full border-4 border-gray-800 flex items-center justify-center text-gray-600 text-xs">Sem dados</div>
                 )}
              </div>
              <div className="flex-1 w-full space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                 {expensesByCategory.data.map((item) => (
                    <div key={item.category} className="flex items-center justify-between text-xs">
                       <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: categoryColors[item.category] || '#666' }}></span>
                          <span className="text-gray-300 print:text-gray-800 truncate">{item.category}</span>
                       </div>
                       <span className="font-bold text-white print:text-black">{formatCurrency(item.amount)}</span>
                    </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-vybe-card print:bg-white print:border print:border-gray-200 p-6 rounded-xl border border-gray-800 shadow-lg flex flex-col print:break-inside-avoid">
           <h3 className="text-white print:text-black font-bold mb-6 flex items-center gap-2 text-sm uppercase tracking-wide">
             <BarChart3 size={16} className="text-gray-400" /> Fluxo (Filtrado)
           </h3>
           <div className="flex-1 flex items-end justify-between gap-2 h-48 sm:h-56 w-full pt-4">
              {cashFlowHistory.map((item, idx) => {
                 const incomePct = (item.income / maxChartValue) * 100;
                 const expensePct = (item.expense / maxChartValue) * 100;
                 return (
                   <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full gap-1 group">
                      <div className="w-full flex justify-center items-end gap-1 h-full px-0.5 relative">
                         <div style={{ height: `${incomePct}%` }} className="w-full max-w-[15px] bg-vybe-green rounded-t-sm" title={`Entrada: ${formatCurrency(item.income)}`}></div>
                         <div style={{ height: `${expensePct}%` }} className="w-full max-w-[15px] bg-vybe-red rounded-t-sm" title={`Saída: ${formatCurrency(item.expense)}`}></div>
                      </div>
                      <span className="text-[10px] text-gray-500 print:text-black uppercase mt-2">{item.label}</span>
                   </div>
                 );
              })}
           </div>
        </div>
      </div>

      {/* --- DETAILED DATA TABLE --- */}
      <div className="bg-vybe-card print:bg-white print:border print:border-gray-200 rounded-xl border border-gray-800 shadow-lg overflow-hidden print:break-inside-avoid">
         <div className="p-4 bg-[#1E1E1E] print:bg-gray-100 border-b border-gray-800 print:border-gray-300">
            <h3 className="font-bold text-white print:text-black text-sm">Detalhamento das Transações</h3>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-[#121212] print:bg-white text-gray-500 text-xs uppercase tracking-wider cursor-pointer">
                     <th onClick={() => handleSort('description')} className="p-4 font-semibold hover:text-white transition-colors group">
                        <div className="flex items-center gap-1">Descrição / Cliente <SortIcon colKey="description" /></div>
                     </th>
                     <th onClick={() => handleSort('amount')} className="p-4 font-semibold hover:text-white transition-colors text-right group">
                        <div className="flex items-center justify-end gap-1">Valor <SortIcon colKey="amount" /></div>
                     </th>
                     <th onClick={() => handleSort('status')} className="p-4 font-semibold hover:text-white transition-colors text-center group">
                        <div className="flex items-center justify-center gap-1">Status <SortIcon colKey="status" /></div>
                     </th>
                     <th onClick={() => handleSort('category')} className="p-4 font-semibold hover:text-white transition-colors group hidden md:table-cell">
                        <div className="flex items-center gap-1">Categoria <SortIcon colKey="category" /></div>
                     </th>
                     <th onClick={() => handleSort('date')} className="p-4 font-semibold hover:text-white transition-colors group hidden sm:table-cell">
                        <div className="flex items-center gap-1">Data <SortIcon colKey="date" /></div>
                     </th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-800 print:divide-gray-200">
                  {sortedTransactions.length === 0 ? (
                      <tr>
                          <td colSpan={5} className="p-8 text-center text-gray-500 text-sm">Nenhuma transação encontrada com os filtros atuais.</td>
                      </tr>
                  ) : (
                    sortedTransactions.map((t) => {
                         const client = t.clientId ? clients.find(c => c.id === t.clientId) : null;
                         const isPending = t.status === TransactionStatus.PENDING;

                         return (
                            <tr key={t.id} className={`hover:bg-[#252525] print:hover:bg-transparent transition-colors ${isPending ? 'bg-yellow-900/10' : ''}`}>
                                <td className="p-4 text-sm text-white print:text-black">
                                    <div className="font-medium">{t.description}</div>
                                    {client && (
                                        <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                            <span className="bg-[#1E1E1E] px-1.5 rounded border border-gray-700">Ref: {client.name}</span>
                                        </div>
                                    )}
                                </td>
                                <td className="p-4 text-sm font-mono text-right">
                                   <span className={t.type === TransactionType.INCOME ? 'text-vybe-green' : 'text-vybe-red'}>
                                      {t.type === TransactionType.EXPENSE && '- '}
                                      {formatCurrency(t.amount)}
                                   </span>
                                </td>
                                <td className="p-4 text-center">
                                    {isPending ? (
                                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[10px] font-bold uppercase">
                                            <Clock size={10} /> Pendente
                                        </div>
                                    ) : (
                                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-vybe-green/10 text-vybe-green border border-vybe-green/20 text-[10px] font-bold uppercase">
                                            <CheckCircle size={10} /> Pago
                                        </div>
                                    )}
                                </td>
                                <td className="p-4 text-xs text-gray-400 hidden md:table-cell">{t.category}</td>
                                <td className="p-4 text-xs text-gray-400 font-mono hidden sm:table-cell">{formatDate(t.date)}</td>
                            </tr>
                         );
                    })
                  )}
               </tbody>
            </table>
         </div>
      </div>
      
      <div className="hidden print:block text-center text-xs text-gray-500 mt-8 pt-8 border-t border-gray-300">
         Relatório gerado pelo sistema Vybe Finanças. Confidencial.
      </div>
    </div>
  );
};

export default ReportsView;