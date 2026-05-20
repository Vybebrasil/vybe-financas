import React, { useState, useEffect } from 'react';

import { Transaction, DashboardSummary, TransactionType, Client, Category, Employee, Subscription, CompanySettings, TransactionStatus, PaymentMethod } from './types';
import DashboardCard from './components/DashboardCard';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import FinancialChart from './components/FinancialChart';
import ClientForm from './components/ClientForm';
import ClientList from './components/ClientList';
import ExpensesView from './components/ExpensesView';
import BillingModal from './components/BillingModal';
import ClientHistoryModal from './components/ClientHistoryModal';
import EmployeeDetailsModal from './components/EmployeeDetailsModal';
import ReceiptModal from './components/ReceiptModal';
import ReportsView from './components/ReportsView';
import CompanySettingsModal from './components/CompanySettingsModal';
import Login from './components/Login';
import { Wallet, TrendingUp, TrendingDown, LayoutDashboard, Users, CreditCard, PieChart, Building2, ChevronDown, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from './src/services/supabase';
import { api } from './src/services/api';

const App: React.FC = () => {
  // --- AUTHENTICATION STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false); // Estado para carregamento de dados (Create/Update)
  const [userEmail, setUserEmail] = useState('');

  // --- APP STATE ---
  const [activeTab, setActiveTab] = useState<'finance' | 'clients' | 'expenses' | 'reports'>('finance');

  // Transaction State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [preFilledTransaction, setPreFilledTransaction] = useState<{ description: string, amount: number, category: Category } | null>(null);

  const [summary, setSummary] = useState<DashboardSummary>({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
  });

  // Client State
  const [clients, setClients] = useState<Client[]>([]);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Employee & Subscriptions State (Ainda Mockados ou Local até criar tabelas no Supabase)
  // Para manter compatibilidade sem quebrar, vamos manter localmente por enquanto,
  // mas Transactions e Clients já virão do Banco Real.
  // Employee & Subscriptions State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  // Company Settings State
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    name: 'Minha Agência',
    cnpj: '',
    logoUrl: '',
    phone: '',
    address: ''
  });
  const [isCompanySettingsOpen, setIsCompanySettingsOpen] = useState(false);

  // Modals State
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [billingClient, setBillingClient] = useState<Client | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptTransaction, setReceiptTransaction] = useState<Transaction | null>(null);
  const [receiptClient, setReceiptClient] = useState<Client | null>(null);

  // --- INITIALIZATION & DATA FETCHING ---

  const fetchData = async () => {
    try {
      setIsLoadingData(true);
      // 1. Carregar Transações do Supabase
      const transData = await api.transactions.list();
      setTransactions(transData);

      // 2. Carregar Clientes do Supabase
      const clientData = await api.clients.list();
      setClients(clientData);

      // 3. Carregar Funcionários e Assinaturas
      const empData = await api.employees.list();
      setEmployees(empData);

      const subData = await api.subscriptions.list();
      setSubscriptions(subData);

      // 3. Carregar Configurações da Empresa (Dos metadados do usuário)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || '');
        if (user.user_metadata) {
          setCompanySettings(prev => ({
            ...prev,
            name: user.user_metadata.company_name || prev.name,
            cnpj: user.user_metadata.cnpj || prev.cnpj,
            phone: user.user_metadata.phone || prev.phone,
            address: user.user_metadata.address || prev.address,
            logoUrl: user.user_metadata.logoUrl || prev.logoUrl
          }));
        }
      }

    } catch (error: unknown) {
      console.error("Erro ao carregar dados:", error);
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      if (msg.includes('não autenticado') || msg.includes('Auth session')) {
        alert('Sessão expirada. Faça login novamente.');
        await supabase.auth.signOut();
        setIsAuthenticated(false);
      } else if (msg.includes('Could not find the table')) {
        alert('Tabelas do banco não configuradas. Execute o supabase_schema.sql no painel do Supabase.');
      } else {
        alert(`Erro ao carregar dados: ${msg}`);
      }
    } finally {
      setIsLoadingData(false);
    }
  };

  // ... (no changes until handleUpdateCompanySettings)
  const handleUpdateCompanySettings = async (settings: CompanySettings) => {
    setCompanySettings(settings);
    try {
      await api.user.updateMetadata({
        company_name: settings.name,
        cnpj: settings.cnpj,
        phone: settings.phone,
        address: settings.address,
        logoUrl: settings.logoUrl
      });
    } catch (error) {
      console.error("Erro ao salvar metadados:", error);
      alert("Erro ao salvar configurações no servidor. Tente novamente.");
    }
  };


  useEffect(() => {
    // Verificar Sessão Atual
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
        fetchData(); // Carrega os dados reais
      }
      setIsAuthLoading(false);
    };

    checkSession();

    // Listener para mudanças de Auth (Login/Logout em outras abas)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED')) {
        // Aguarda a sessão propagar antes de buscar dados (evita falha em produção)
        setTimeout(() => fetchData(), 0);
      } else if (!session) {
        setTransactions([]);
        setClients([]);
        setEmployees([]);
        setSubscriptions([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- SUMMARY CALCULATION (Client Side) ---
  useEffect(() => {
    const newSummary = transactions.reduce(
      (acc, curr) => {
        if (curr.status !== TransactionStatus.PAID) return acc;
        if (curr.type === TransactionType.INCOME) {
          acc.totalIncome += curr.amount;
          acc.balance += curr.amount;
        } else {
          acc.totalExpense += curr.amount;
          acc.balance -= curr.amount;
        }
        return acc;
      },
      { totalIncome: 0, totalExpense: 0, balance: 0 }
    );
    setSummary(newSummary);
  }, [transactions]);

  // --- AUTH HANDLERS ---

  const handleLogin = () => {
    // O próprio componente Login.tsx já faz o signIn no Supabase.
    // O listener onAuthStateChange vai detectar e atualizar o estado aqui.
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsCompanySettingsOpen(false);
    // State cleans up automatically via listener
  };

  // --- DATA HANDLERS (CRUD REAL) ---

  const handleAddTransaction = async (transaction: Transaction) => {
    try {
      // Envia para o Supabase
      const newTrans = await api.transactions.create(transaction);
      // Atualiza UI com o dado retornado (que tem o ID real)
      setTransactions((prev) => [newTrans, ...prev]);
      setPreFilledTransaction(null);
    } catch (error) {
      console.error(error);
      // Rethrow to let TransactionForm handle the UI feedback (it has better error alerting now)
      throw error;
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir?")) return;
    try {
      await api.transactions.delete(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.error(error);
      alert("Erro ao excluir.");
    }
  };

  const handleToggleTransactionStatus = async (id: string) => {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;

    const newStatus = transaction.status === TransactionStatus.PAID
      ? TransactionStatus.PENDING
      : TransactionStatus.PAID;

    // Atualiza UI Otimisticamente
    setTransactions((prev) => prev.map((t) => t.id === id ? { ...t, status: newStatus } : t));

    try {
      await api.transactions.updateStatus(id, newStatus);
    } catch (error) {
      console.error(error);
      alert("Erro ao atualizar status.");
      // Reverte UI se der erro
      setTransactions((prev) => prev.map((t) => t.id === id ? { ...t, status: transaction.status } : t));
    }
  };

  // Client Handlers
  // Client Handlers
  const handleAddClient = async (client: Client) => {
    try {
      const { id, ...rest } = client;
      const newClient = await api.clients.create(rest);
      setClients((prev) => [newClient, ...prev]);
    } catch (error) {
      console.error(error);
      alert("Erro ao adicionar cliente.");
    }
  };

  const handleUpdateClient = async (updatedClient: Client) => {
    try {
      await api.clients.update(updatedClient.id, updatedClient);
      setClients((prev) => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
      setEditingClient(null);
    } catch (error) {
      console.error(error);
      alert("Erro ao atualizar cliente.");
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
      try {
        await api.clients.delete(id);
        setClients((prev) => prev.filter((c) => c.id !== id));
        if (editingClient?.id === id) setEditingClient(null);
      } catch (error) {
        console.error(error);
        alert("Erro ao excluir cliente.");
      }
    }
  };

  // Employee & Sub Handlers (Mantidos Locais por enquanto)
  // Employee & Sub Handlers (Integrated with API)
  const handleAddEmployee = async (emp: Employee) => {
    try {
      // Remove ID generated by frontend if present, let Supabase generate it
      const { id, ...rest } = emp;
      const newEmp = await api.employees.create(rest);
      setEmployees(prev => [...prev, newEmp]);
    } catch (error) {
      console.error(error);
      alert("Erro ao adicionar funcionário.");
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!window.confirm("Remover funcionário?")) return;
    try {
      await api.employees.delete(id);
      setEmployees(prev => prev.filter(e => e.id !== id));
      if (selectedEmployee?.id === id) setSelectedEmployee(null);
    } catch (error) {
      console.error(error);
      alert("Erro ao remover funcionário.");
    }
  };

  const handleUpdateEmployee = async (updatedEmployee: Employee) => {
    try {
      await api.employees.update(updatedEmployee.id, updatedEmployee);
      setEmployees(prev => prev.map(e => e.id === updatedEmployee.id ? updatedEmployee : e));
      setSelectedEmployee(updatedEmployee);
    } catch (error) {
      console.error(error);
      alert("Erro ao atualizar funcionário.");
    }
  };

  const handleOpenEmployeeDetails = (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsEmployeeModalOpen(true);
  };

  const handleAddSubscription = async (sub: Subscription) => {
    try {
      const { id, ...rest } = sub;
      const newSub = await api.subscriptions.create(rest);
      setSubscriptions(prev => [...prev, newSub]);
    } catch (error) {
      console.error(error);
      alert("Erro ao adicionar assinatura.");
    }
  };

  const handleUpdateSubscription = async (updatedSub: Subscription) => {
    try {
      await api.subscriptions.update(updatedSub.id, updatedSub);
      setSubscriptions(prev => prev.map(s => s.id === updatedSub.id ? updatedSub : s));
    } catch (error) {
      console.error(error);
      alert("Erro ao atualizar assinatura.");
    }
  };

  const handleDeleteSubscription = async (id: string) => {
    if (!window.confirm("Remover assinatura?")) return;
    try {
      await api.subscriptions.delete(id);
      setSubscriptions(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error(error);
      alert("Erro ao remover assinatura.");
    }
  };


  // Integrations & Modals
  const handleOpenBillingModal = (client: Client) => {
    setBillingClient(client);
    setIsBillingModalOpen(true);
  };

  const handleConfirmToFinance = (client: Client) => {
    setIsBillingModalOpen(false);
    setPreFilledTransaction({
      description: `Mensalidade - ${client.name}`,
      amount: client.monthlyFee,
      category: Category.CLIENT_PAYMENT
    });
    setActiveTab('finance');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenHistory = (client: Client) => {
    setHistoryClient(client);
    setIsHistoryModalOpen(true);
  };

  const handleQuickExpense = (transaction: Transaction) => {
    setPreFilledTransaction({
      description: transaction.description,
      amount: transaction.amount,
      category: transaction.category
    });
    setActiveTab('finance');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGenerateReceipt = (transaction: Transaction) => {
    setReceiptTransaction(transaction);
    if (transaction.clientId) {
      const foundClient = clients.find(c => c.id === transaction.clientId);
      setReceiptClient(foundClient || null);
    } else {
      setReceiptClient(null);
    }
    setIsReceiptModalOpen(true);
  };



  // --- RENDER ---

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Background Decorativo */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#FF6600]/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="w-full max-w-2xl bg-[#1E1E1E] border border-gray-800 rounded-2xl shadow-2xl p-8 relative z-10 animate-bar-grow origin-center">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-[#FF6600] to-orange-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-950/40">
              <span className="font-bold text-2xl">V</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Vybe <span className="text-[#FF6600]">Finanças</span>
              </h1>
              <p className="text-xs text-gray-400">Portal de Configuração & Diagnóstico</p>
            </div>
          </div>

          <div className="bg-orange-950/20 border border-orange-800/30 rounded-xl p-5 mb-6">
            <h2 className="text-base font-semibold text-orange-400 flex items-center gap-2 mb-2">
              ⚠️ Supabase não configurado ou com valores padrão
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              O Vybe Finanças utiliza o Supabase para gerenciar a autenticação e o banco de dados. Atualmente, o arquivo <code className="text-xs bg-black/40 px-1.5 py-0.5 rounded font-mono text-orange-300">.env.local</code> não existe ou contém os dados padrão de exemplo.
            </p>
          </div>

          <div className="space-y-6 text-sm text-gray-300">
            <div>
              <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#FF6600] text-xs text-white">1</span>
                Configuração para Desenvolvimento Local
              </h3>
              <p className="mb-3 text-gray-400">
                Abra ou crie o arquivo <span className="text-white font-semibold">.env.local</span> na raiz do seu projeto e substitua as variáveis com as credenciais do seu projeto Supabase:
              </p>
              <pre className="bg-black/60 p-4 rounded-xl font-mono text-xs text-green-400 border border-gray-800 select-all overflow-x-auto">
{`# Configurações do Supabase para o Frontend (Vite)
VITE_SUPABASE_URL=https://[seu-projeto-id].supabase.co
VITE_SUPABASE_ANON_KEY=[sua-anon-key-aqui]

# Configurações do Banco de Dados para o Backend (NestJS) se for rodar local
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=admin
DB_NAME=vybe_financas_dev`}
              </pre>
            </div>

            <div>
              <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#FF6600] text-xs text-white">2</span>
                Configuração para Produção (Vercel)
              </h3>
              <p className="text-gray-400">
                Se você está vendo isso em produção na Vercel:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1.5 pl-2 text-gray-400">
                <li>Acesse o <span className="text-white font-semibold">Dashboard da Vercel</span></li>
                <li>Vá em <span className="text-white font-semibold">Settings &gt; Environment Variables</span></li>
                <li>Adicione as variáveis <span className="text-white font-mono">VITE_SUPABASE_URL</span> e <span className="text-white font-mono">VITE_SUPABASE_ANON_KEY</span> com seus valores reais</li>
                <li>Faça um novo <span className="text-white font-semibold">Redeploy</span> do projeto para carregar as novas configurações</li>
              </ul>
            </div>

            <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-gray-500">
                Após atualizar o arquivo .env.local, reinicie o servidor local (<code className="bg-black/40 px-1 py-0.5 rounded font-mono">npm run dev</code>).
              </span>
              <button 
                onClick={() => window.location.reload()} 
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-[#FF6600] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-medium transition-all shadow-md active:scale-95"
              >
                Recarregar Aplicativo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center text-white gap-4">
        <Loader2 className="animate-spin text-vybe-accent" size={48} />
        <p className="text-sm text-gray-400">Carregando sistema...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-vybe-bg pb-12 font-sans selection:bg-vybe-accent selection:text-white relative">

      <CompanySettingsModal
        isOpen={isCompanySettingsOpen}
        onClose={() => setIsCompanySettingsOpen(false)}
        settings={companySettings}
        onSave={handleUpdateCompanySettings}
        onLogout={handleLogout}
        userEmail={userEmail}
      />

      <BillingModal
        isOpen={isBillingModalOpen}
        client={billingClient}
        onClose={() => setIsBillingModalOpen(false)}
        onConfirmToFinance={handleConfirmToFinance}
      />

      <ClientHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        client={historyClient}
        transactions={transactions}
      />

      <EmployeeDetailsModal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        employee={selectedEmployee}
        transactions={transactions}
        onUpdateEmployee={handleUpdateEmployee}
      />

      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        transaction={receiptTransaction}
        client={receiptClient}
        companySettings={companySettings}
      />

      {/* Header */}
      <header className="bg-[#121212] border-b border-gray-800 sticky top-0 z-50 backdrop-blur-md bg-opacity-90 print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4 md:mb-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-vybe-accent to-orange-700 rounded-lg flex items-center justify-center text-white shadow-lg shadow-orange-900/40">
                <span className="font-bold text-xl">V</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white hidden sm:block">
                Vybe <span className="text-vybe-accent">Finanças</span>
              </h1>
              {isLoadingData && (
                <span className="ml-2 text-xs text-gray-500 flex items-center gap-1">
                  <Loader2 className="animate-spin" size={12} /> Sincronizando...
                </span>
              )}
            </div>

            {/* Profile Switcher */}
            <button
              onClick={() => setIsCompanySettingsOpen(true)}
              className="group flex items-center gap-3 bg-[#1E1E1E] hover:bg-[#252525] pl-1 pr-4 py-1 rounded-full border border-gray-800 transition-all hover:border-gray-600"
            >
              <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden border border-gray-600 group-hover:border-vybe-accent transition-colors flex items-center justify-center">
                {companySettings.logoUrl ? (
                  <img src={companySettings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Building2 size={14} className="text-gray-300" />
                )}
              </div>
              <div className="flex flex-col items-start">
                <span className="text-xs font-bold text-white max-w-[120px] truncate">{companySettings.name}</span>
                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                  Editar Perfil <ChevronDown size={8} />
                </span>
              </div>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex justify-center md:justify-center mt-4 overflow-x-auto">
            <div className="bg-[#1E1E1E] p-1 rounded-full border border-gray-800 flex items-center whitespace-nowrap">
              <button
                onClick={() => setActiveTab('finance')}
                className={`flex items-center gap-2 px-4 md:px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${activeTab === 'finance'
                  ? 'bg-vybe-accent text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                <LayoutDashboard size={16} />
                Financeiro
              </button>
              <button
                onClick={() => setActiveTab('clients')}
                className={`flex items-center gap-2 px-4 md:px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${activeTab === 'clients'
                  ? 'bg-vybe-accent text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                <Users size={16} />
                Clientes
              </button>
              <button
                onClick={() => setActiveTab('expenses')}
                className={`flex items-center gap-2 px-4 md:px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${activeTab === 'expenses'
                  ? 'bg-vybe-accent text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                <CreditCard size={16} />
                Despesas
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`flex items-center gap-2 px-4 md:px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${activeTab === 'reports'
                  ? 'bg-vybe-accent text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                <PieChart size={16} />
                Relatórios
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 animate-bar-grow origin-top">

        {activeTab === 'finance' && (
          <>
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 print:hidden">
              <DashboardCard
                title="Entradas"
                value={summary.totalIncome}
                type="income"
                icon={<TrendingUp size={20} />}
              />
              <DashboardCard
                title="Saídas"
                value={summary.totalExpense}
                type="expense"
                icon={<TrendingDown size={20} />}
              />
              <DashboardCard
                title="Saldo Atual"
                value={summary.balance}
                type="balance"
                icon={<Wallet size={20} />}
              />
            </section>

            <section className="mb-8 print:hidden">
              <FinancialChart transactions={transactions} />
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 print:hidden">
              <div className="xl:col-span-3">
                <TransactionForm
                  onAddTransaction={handleAddTransaction}
                  initialData={preFilledTransaction}
                  clients={clients}
                />
              </div>
              <div className="xl:col-span-3">
                <TransactionList
                  transactions={transactions}
                  clients={clients}
                  onDeleteTransaction={handleDeleteTransaction}
                  onGenerateReceipt={handleGenerateReceipt}
                  onToggleStatus={handleToggleTransactionStatus}
                />
              </div>
            </div>
          </>
        )}

        {activeTab === 'clients' && (
          <div className="grid grid-cols-1 gap-8">
            <ClientForm
              onAddClient={handleAddClient}
              onUpdateClient={handleUpdateClient}
              editingClient={editingClient}
              onCancelEdit={() => setEditingClient(null)}
            />
            <ClientList
              clients={clients}
              onDeleteClient={handleDeleteClient}
              onEditClient={setEditingClient}
              onGenerateCharge={handleOpenBillingModal}
              onViewHistory={handleOpenHistory}
            />
          </div>
        )}

        {activeTab === 'expenses' && (
          <ExpensesView
            employees={employees}
            subscriptions={subscriptions}
            transactions={transactions}
            onAddEmployee={handleAddEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            onAddSubscription={handleAddSubscription}
            onUpdateSubscription={handleUpdateSubscription}
            onDeleteSubscription={handleDeleteSubscription}
            onQuickExpense={handleQuickExpense}
            onViewEmployee={handleOpenEmployeeDetails}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            transactions={transactions}
            clients={clients}
            companySettings={companySettings}
          />
        )}

      </main>

      <footer className="text-center text-gray-600 text-sm py-6 print:hidden">
        <p>&copy; {new Date().getFullYear()} Vybe Finanças. Sistema de Gestão Financeira.</p>
      </footer>
    </div>
  );
};

export default App;