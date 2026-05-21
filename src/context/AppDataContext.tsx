import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Transaction,
  Client,
  Employee,
  Subscription,
  CompanySettings,
  DashboardSummary,
  BankAccount,
  TransactionType,
  Category,
  TransactionStatus,
} from '../../types';
import { DEFAULT_SERVICE_PLANS, DEFAULT_MESSAGE_TEMPLATES } from '../../constants';
import { api } from '../services/api';
import { supabase } from '../services/supabase';
import { ensureMonthlyRecurringTransactions } from '../services/recurringTransactions';
import { computeDashboardSummary } from '../services/summary';
import { DEFAULT_CATEGORIES } from '../services/categories';
import { useToast } from '../../components/ToastProvider';

export type AppTab = 'dashboard' | 'finance' | 'clients' | 'expenses' | 'reports' | 'settings';

export type PreFilledTransaction = {
  description: string;
  amount: number;
  category: string;
  type?: TransactionType;
  clientId?: string;
  bankAccountId?: string;
};

export type ReportsDateFilter = {
  startDate: string;
  endDate: string;
};

export interface AppDataContextValue {
  userEmail: string;
  isLoadingData: boolean;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  tabBeforeSettings: Exclude<AppTab, 'settings'>;
  setTabBeforeSettings: (tab: Exclude<AppTab, 'settings'>) => void;
  transactions: Transaction[];
  clients: Client[];
  employees: Employee[];
  subscriptions: Subscription[];
  companySettings: CompanySettings;
  summary: DashboardSummary;
  bankAccounts: BankAccount[];
  reportsDateFilter: ReportsDateFilter | null;
  setReportsDateFilter: (filter: ReportsDateFilter | null) => void;
  openReportsWithDateRange: (startDate: string, endDate: string) => void;
  preFilledTransaction: PreFilledTransaction | null;
  editingTransaction: Transaction | null;
  editingClient: Client | null;
  isCompanySettingsOpen: boolean;
  setIsCompanySettingsOpen: (open: boolean) => void;
  isBillingModalOpen: boolean;
  billingClient: Client | null;
  isHistoryModalOpen: boolean;
  historyClient: Client | null;
  isEmployeeModalOpen: boolean;
  selectedEmployee: Employee | null;
  isReceiptModalOpen: boolean;
  receiptTransaction: Transaction | null;
  receiptClient: Client | null;
  confirmDialog: { title: string; message: string; onConfirm: () => void } | null;
  setConfirmDialog: (dialog: { title: string; message: string; onConfirm: () => void } | null) => void;
  fetchData: () => Promise<void>;
  handleLogout: () => Promise<void>;
  handleUpdateCompanySettings: (settings: CompanySettings) => Promise<void>;
  askConfirm: (title: string, message: string, onConfirm: () => void | Promise<void>) => void;
  handleAddTransaction: (transaction: Transaction) => Promise<void>;
  handleDeleteTransaction: (id: string) => void;
  handleUpdateTransaction: (transaction: Transaction) => Promise<void>;
  handleEditTransaction: (transaction: Transaction) => void;
  handleToggleTransactionStatus: (id: string) => Promise<void>;
  handleAddClient: (client: Client) => Promise<void>;
  handleUpdateClient: (updatedClient: Client) => Promise<void>;
  handleDeleteClient: (id: string) => void;
  handleAddEmployee: (emp: Employee) => Promise<void>;
  handleDeleteEmployee: (id: string) => void;
  handleUpdateEmployee: (updatedEmployee: Employee) => Promise<void>;
  handleOpenEmployeeDetails: (emp: Employee) => void;
  handleAddSubscription: (sub: Subscription) => Promise<void>;
  handleUpdateSubscription: (updatedSub: Subscription) => Promise<void>;
  handleDeleteSubscription: (id: string) => void;
  handleAddBankAccount: (account: BankAccount) => Promise<void>;
  handleUpdateBankAccount: (account: BankAccount) => Promise<void>;
  handleDeleteBankAccount: (id: string) => void;
  handleOpenBillingModal: (client: Client) => void;
  handleConfirmToFinance: (client: Client) => void;
  handleOpenHistory: (client: Client) => void;
  handleQuickExpense: (transaction: Transaction) => void;
  handleGenerateReceipt: (transaction: Transaction) => void;
  setEditingTransaction: (t: Transaction | null) => void;
  setEditingClient: (c: Client | null) => void;
  setIsBillingModalOpen: (open: boolean) => void;
  setIsHistoryModalOpen: (open: boolean) => void;
  setIsEmployeeModalOpen: (open: boolean) => void;
  setIsReceiptModalOpen: (open: boolean) => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData deve ser usado dentro de AppDataProvider');
  return ctx;
}

interface AppDataProviderProps {
  children: React.ReactNode;
}

export const AppDataProvider: React.FC<AppDataProviderProps> = ({ children }) => {
  const toast = useToast();

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [tabBeforeSettings, setTabBeforeSettings] = useState<Exclude<AppTab, 'settings'>>('dashboard');

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [preFilledTransaction, setPreFilledTransaction] = useState<PreFilledTransaction | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [reportsDateFilter, setReportsDateFilter] = useState<ReportsDateFilter | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    name: 'Minha Agência',
    cnpj: '',
    logoUrl: '',
    phone: '',
    address: '',
    plans: [...DEFAULT_SERVICE_PLANS],
    messageTemplates: [...DEFAULT_MESSAGE_TEMPLATES],
    categories: [...DEFAULT_CATEGORIES],
  });
  const [isCompanySettingsOpen, setIsCompanySettingsOpen] = useState(false);

  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [billingClient, setBillingClient] = useState<Client | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptTransaction, setReceiptTransaction] = useState<Transaction | null>(null);
  const [receiptClient, setReceiptClient] = useState<Client | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const summary = useMemo(() => computeDashboardSummary(transactions), [transactions]);

  const fetchData = useCallback(async () => {
    try {
      setIsLoadingData(true);
      const transData = await api.transactions.list();
      setTransactions(transData);

      const clientData = await api.clients.list();
      setClients(clientData);

      const empData = await api.employees.list();
      setEmployees(empData);

      const subData = await api.subscriptions.list();
      setSubscriptions(subData);

      try {
        const accountsData = await api.bankAccounts.list();
        setBankAccounts(accountsData);
      } catch (bankErr) {
        console.warn('Contas bancárias indisponíveis:', bankErr);
        setBankAccounts([]);
      }

      const recurringCreated = await ensureMonthlyRecurringTransactions({
        transactions: transData,
        clients: clientData,
        employees: empData,
        subscriptions: subData,
      });
      if (recurringCreated.length > 0) {
        setTransactions([...recurringCreated, ...transData]);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || '');
        const settings = await api.companySettings.load();
        setCompanySettings(settings);
      }
    } catch (error: unknown) {
      console.error('Erro ao carregar dados:', error);
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      if (msg.includes('não autenticado') || msg.includes('Auth session')) {
        toast.error('Sessão expirada. Faça login novamente.');
        await supabase.auth.signOut();
      } else if (msg.includes('Could not find the table')) {
        toast.error('Tabelas do banco não configuradas. Execute o supabase_schema.sql no Supabase.');
      } else {
        toast.error(`Erro ao carregar dados: ${msg}`);
      }
    } finally {
      setIsLoadingData(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateCompanySettings = async (settings: CompanySettings) => {
    setCompanySettings(settings);
    try {
      await api.companySettings.save(settings);
      toast.success('Configurações salvas com sucesso.');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações no servidor. Tente novamente.');
    }
  };

  const askConfirm = (title: string, message: string, onConfirm: () => void | Promise<void>) => {
    setConfirmDialog({
      title,
      message,
      onConfirm: async () => {
        setConfirmDialog(null);
        await onConfirm();
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsCompanySettingsOpen(false);
  };

  const handleAddTransaction = async (transaction: Transaction) => {
    const newTrans = await api.transactions.create(transaction);
    setTransactions((prev) => [newTrans, ...prev]);
    setPreFilledTransaction(null);
  };

  const handleDeleteTransaction = (id: string) => {
    setConfirmDialog({
      title: 'Excluir transação',
      message: 'Deseja realmente excluir esta transação? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.transactions.delete(id);
          setTransactions((prev) => prev.filter((t) => t.id !== id));
          if (editingTransaction?.id === id) setEditingTransaction(null);
        } catch (error) {
          console.error(error);
          toast.error('Erro ao excluir transação.');
        }
      },
    });
  };

  const handleUpdateTransaction = async (transaction: Transaction) => {
    const updated = await api.transactions.update(transaction.id, transaction);
    setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setEditingTransaction(null);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setPreFilledTransaction(null);
    setActiveTab('finance');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleTransactionStatus = async (id: string) => {
    const transaction = transactions.find((t) => t.id === id);
    if (!transaction) return;

    const newStatus =
      transaction.status === TransactionStatus.PAID
        ? TransactionStatus.PENDING
        : TransactionStatus.PAID;

    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)),
    );

    try {
      await api.transactions.updateStatus(id, newStatus);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar status.');
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: transaction.status } : t)),
      );
    }
  };

  const handleAddClient = async (client: Client) => {
    try {
      const { id: _id, ...rest } = client;
      const newClient = await api.clients.create(rest);
      setClients((prev) => [newClient, ...prev]);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao adicionar cliente.');
    }
  };

  const handleUpdateClient = async (updatedClient: Client) => {
    try {
      await api.clients.update(updatedClient.id, updatedClient);
      setClients((prev) => prev.map((c) => (c.id === updatedClient.id ? updatedClient : c)));
      setEditingClient(null);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar cliente.');
    }
  };

  const handleDeleteClient = (id: string) => {
    askConfirm('Excluir cliente', 'Tem certeza que deseja excluir este cliente?', async () => {
      try {
        await api.clients.delete(id);
        setClients((prev) => prev.filter((c) => c.id !== id));
        if (editingClient?.id === id) setEditingClient(null);
        toast.success('Cliente excluído.');
      } catch (error) {
        console.error(error);
        toast.error('Erro ao excluir cliente.');
      }
    });
  };

  const handleAddEmployee = async (emp: Employee) => {
    try {
      const { id: _id, ...rest } = emp;
      const newEmp = await api.employees.create(rest);
      setEmployees((prev) => [...prev, newEmp]);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao adicionar funcionário.');
    }
  };

  const handleDeleteEmployee = (id: string) => {
    askConfirm('Remover funcionário', 'Deseja remover este funcionário?', async () => {
      try {
        await api.employees.delete(id);
        setEmployees((prev) => prev.filter((e) => e.id !== id));
        if (selectedEmployee?.id === id) setSelectedEmployee(null);
        toast.success('Funcionário removido.');
      } catch (error) {
        console.error(error);
        toast.error('Erro ao remover funcionário.');
      }
    });
  };

  const handleUpdateEmployee = async (updatedEmployee: Employee) => {
    try {
      await api.employees.update(updatedEmployee.id, updatedEmployee);
      setEmployees((prev) =>
        prev.map((e) => (e.id === updatedEmployee.id ? updatedEmployee : e)),
      );
      setSelectedEmployee(updatedEmployee);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar funcionário.');
    }
  };

  const handleOpenEmployeeDetails = (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsEmployeeModalOpen(true);
  };

  const handleAddSubscription = async (sub: Subscription) => {
    try {
      const { id: _id, ...rest } = sub;
      const newSub = await api.subscriptions.create(rest);
      setSubscriptions((prev) => [...prev, newSub]);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao adicionar assinatura.');
    }
  };

  const handleUpdateSubscription = async (updatedSub: Subscription) => {
    try {
      await api.subscriptions.update(updatedSub.id, updatedSub);
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === updatedSub.id ? updatedSub : s)),
      );
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar assinatura.');
    }
  };

  const handleDeleteSubscription = (id: string) => {
    askConfirm('Remover assinatura', 'Deseja remover esta assinatura?', async () => {
      try {
        await api.subscriptions.delete(id);
        setSubscriptions((prev) => prev.filter((s) => s.id !== id));
        toast.success('Assinatura removida.');
      } catch (error) {
        console.error(error);
        toast.error('Erro ao remover assinatura.');
      }
    });
  };

  const openReportsWithDateRange = useCallback((startDate: string, endDate: string) => {
    setReportsDateFilter({ startDate, endDate });
    setActiveTab('reports');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleAddBankAccount = async (account: BankAccount) => {
    const { id: _id, ...payload } = account;
    const created = await api.bankAccounts.create(payload);
    setBankAccounts((prev) => [...prev, created]);
    toast.success('Conta bancária adicionada.');
  };

  const handleUpdateBankAccount = async (account: BankAccount) => {
    await api.bankAccounts.update(account.id, account);
    setBankAccounts((prev) => prev.map((a) => (a.id === account.id ? account : a)));
    toast.success('Conta atualizada.');
  };

  const handleDeleteBankAccount = (id: string) => {
    askConfirm('Excluir conta', 'Lançamentos vinculados ficarão sem conta. Continuar?', async () => {
      try {
        await api.bankAccounts.delete(id);
        setBankAccounts((prev) => prev.filter((a) => a.id !== id));
        setTransactions((prev) =>
          prev.map((t) => (t.bankAccountId === id ? { ...t, bankAccountId: undefined } : t)),
        );
        toast.success('Conta removida.');
      } catch (error) {
        console.error(error);
        toast.error('Erro ao remover conta.');
      }
    });
  };

  const handleOpenBillingModal = (client: Client) => {
    setBillingClient(client);
    setIsBillingModalOpen(true);
  };

  const handleConfirmToFinance = (client: Client) => {
    setIsBillingModalOpen(false);
    setPreFilledTransaction({
      description: `Mensalidade - ${client.name}`,
      amount: client.monthlyFee,
      category: Category.CLIENT_PAYMENT,
      type: TransactionType.INCOME,
      clientId: client.id,
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
      category: transaction.category,
      type: transaction.type,
    });
    setActiveTab('finance');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGenerateReceipt = (transaction: Transaction) => {
    setReceiptTransaction(transaction);
    if (transaction.clientId) {
      const foundClient = clients.find((c) => c.id === transaction.clientId);
      setReceiptClient(foundClient || null);
    } else {
      setReceiptClient(null);
    }
    setIsReceiptModalOpen(true);
  };

  const value: AppDataContextValue = {
    userEmail,
    isLoadingData,
    activeTab,
    setActiveTab,
    tabBeforeSettings,
    setTabBeforeSettings,
    transactions,
    clients,
    employees,
    subscriptions,
    companySettings,
    summary,
    bankAccounts,
    reportsDateFilter,
    setReportsDateFilter,
    openReportsWithDateRange,
    preFilledTransaction,
    editingTransaction,
    editingClient,
    isCompanySettingsOpen,
    setIsCompanySettingsOpen,
    isBillingModalOpen,
    billingClient,
    isHistoryModalOpen,
    historyClient,
    isEmployeeModalOpen,
    selectedEmployee,
    isReceiptModalOpen,
    receiptTransaction,
    receiptClient,
    confirmDialog,
    setConfirmDialog,
    fetchData,
    handleLogout,
    handleUpdateCompanySettings,
    askConfirm,
    handleAddTransaction,
    handleDeleteTransaction,
    handleUpdateTransaction,
    handleEditTransaction,
    handleToggleTransactionStatus,
    handleAddClient,
    handleUpdateClient,
    handleDeleteClient,
    handleAddEmployee,
    handleDeleteEmployee,
    handleUpdateEmployee,
    handleOpenEmployeeDetails,
    handleAddSubscription,
    handleUpdateSubscription,
    handleDeleteSubscription,
    handleAddBankAccount,
    handleUpdateBankAccount,
    handleDeleteBankAccount,
    handleOpenBillingModal,
    handleConfirmToFinance,
    handleOpenHistory,
    handleQuickExpense,
    handleGenerateReceipt,
    setEditingTransaction,
    setEditingClient,
    setIsBillingModalOpen,
    setIsHistoryModalOpen,
    setIsEmployeeModalOpen,
    setIsReceiptModalOpen,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
};
