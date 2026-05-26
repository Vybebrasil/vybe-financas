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
  WorkspaceMember,
  AuditLogEntry,
  WorkspaceRole,
  CategoryConfig,
} from '../../types';
import { DEFAULT_SERVICE_PLANS, DEFAULT_MESSAGE_TEMPLATES } from '../../constants';
import { api, clearWorkspaceCache } from '../services/api';
import {
  consumeWorkspaceSetupWarning,
  getLastBootstrapError,
  isTeamWorkspaceActive,
} from '../services/workspace';
import type { AuditAction } from '../services/auditLog';
import { supabase } from '../services/supabase';
import { ensureMonthlyRecurringTransactions } from '../services/recurringTransactions';
import { computeDashboardSummary } from '../services/summary';
import { DEFAULT_CATEGORIES } from '../services/categories';
import { useToast } from '../../components/ToastProvider';
import { getErrorMessage, isMissingTableError } from '../utils/errorMessage';

export type AppTab = 'dashboard' | 'finance' | 'clients' | 'expenses' | 'reports' | 'settings';

export type PreFilledTransaction = {
  description: string;
  amount: number;
  category: string;
  type?: TransactionType;
  clientId?: string;
  employeeId?: string;
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
  handlePersistCategories: (categories: CategoryConfig[]) => Promise<void>;
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
  workspaceMembers: WorkspaceMember[];
  workspaceTeamActive: boolean;
  workspaceRole: WorkspaceRole;
  auditLogs: AuditLogEntry[];
  isLoadingTeam: boolean;
  handleInviteMember: (email: string, role: Exclude<WorkspaceRole, 'owner'>) => Promise<void>;
  handleRemoveMember: (memberId: string) => Promise<void>;
  handleUpdateMemberRole: (
    memberId: string,
    role: Exclude<WorkspaceRole, 'owner'>,
  ) => Promise<void>;
  handleRefreshTeam: () => Promise<void>;
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
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [workspaceTeamActive, setWorkspaceTeamActive] = useState(false);
  const [workspaceRole, setWorkspaceRole] = useState<WorkspaceRole>('owner');
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);

  const summary = useMemo(() => computeDashboardSummary(transactions), [transactions]);

  const refreshAuditLogs = useCallback(async () => {
    try {
      const logs = await api.audit.list(100);
      setAuditLogs(logs);
    } catch {
      setAuditLogs([]);
    }
  }, []);

  const recordAudit = useCallback(
    async (
      action: AuditAction,
      summary: string,
      entityType?: string,
      entityId?: string,
    ) => {
      await api.audit.log({ action, summary, entityType, entityId });
      await refreshAuditLogs();
    },
    [refreshAuditLogs],
  );

  const fetchData = useCallback(async () => {
    try {
      setIsLoadingData(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      setUserEmail(user.email || '');

      const ctx = await api.workspace.bootstrap();
      setWorkspaceRole(ctx.role);
      setWorkspaceTeamActive(isTeamWorkspaceActive(ctx));
      setIsLoadingTeam(true);
      try {
        const [members, logs] = await Promise.all([
          api.workspace.listMembers(),
          api.audit.list(100),
        ]);
        setWorkspaceMembers(members);
        setAuditLogs(logs);
      } catch (teamErr) {
        console.warn('Equipe/log indisponíveis:', teamErr);
        setWorkspaceMembers([]);
        setAuditLogs([]);
      } finally {
        setIsLoadingTeam(false);
      }

      consumeWorkspaceSetupWarning();

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

      const settings = await api.companySettings.load();
      setCompanySettings(settings);
    } catch (error: unknown) {
      console.error('Erro ao carregar dados:', error);
      const msg = getErrorMessage(error);
      if (msg.includes('não autenticado') || msg.includes('Auth session')) {
        toast.error('Sessão expirada. Faça login novamente.');
        await supabase.auth.signOut();
      } else if (
        msg.includes('Could not find the table') ||
        msg.includes('does not exist') ||
        isMissingTableError(error)
      ) {
        toast.error(
          'Tabelas do banco não configuradas. Execute supabase_schema.sql e as migrations em supabase/migrations/ no Supabase.',
        );
      } else if (msg.includes('migration') || msg.includes('workspaces_audit')) {
        toast.error(msg);
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

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        session &&
        (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')
      ) {
        clearWorkspaceCache();
        fetchData();
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchData]);

  const handlePersistCategories = useCallback(async (categories: CategoryConfig[]) => {
    const saved = await api.companySettings.saveCategories(categories);
    setCompanySettings((prev) => ({ ...prev, categories: saved }));
  }, []);

  const handleUpdateCompanySettings = async (settings: CompanySettings) => {
    try {
      await api.companySettings.save(settings);
      const fresh = await api.companySettings.load();
      setCompanySettings(fresh);
      await recordAudit('settings.update', 'Configurações da empresa atualizadas');
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
    clearWorkspaceCache();
    await supabase.auth.signOut();
    setIsCompanySettingsOpen(false);
    setWorkspaceMembers([]);
    setAuditLogs([]);
    setWorkspaceRole('owner');
    setWorkspaceTeamActive(false);
  };

  const handleInviteMember = async (
    email: string,
    role: Exclude<WorkspaceRole, 'owner'>,
  ) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) throw new Error('Informe um e-mail válido.');
    try {
      const member = await api.workspace.invite(trimmed, role);
      setWorkspaceMembers((prev) => {
        const exists = prev.some(
          (m) => m.id === member.id || m.email.toLowerCase() === trimmed,
        );
        return exists
          ? prev.map((m) =>
              m.id === member.id || m.email.toLowerCase() === trimmed ? member : m,
            )
          : [...prev, member];
      });
      await recordAudit(
        'member.invite',
        `Convite para ${trimmed} (${role === 'admin' ? 'admin' : 'membro'})`,
        'workspace_member',
        member.id || undefined,
      );
      toast.success(
        'Convite registrado. A pessoa entra ao criar conta ou fazer login com este e-mail.',
      );
    } catch (err) {
      const msg = getErrorMessage(err);
      toast.error(msg);
      throw err;
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    const target = workspaceMembers.find((m) => m.id === memberId);
    askConfirm(
      'Remover usuário',
      `Remover ${target?.email ?? 'este usuário'} da conta?`,
      async () => {
        await api.workspace.removeMember(memberId);
        setWorkspaceMembers((prev) => prev.filter((m) => m.id !== memberId));
        await recordAudit(
          'member.remove',
          `Usuário removido: ${target?.email ?? memberId}`,
          'workspace_member',
          memberId,
        );
        toast.success('Usuário removido.');
      },
    );
  };

  const handleUpdateMemberRole = async (
    memberId: string,
    role: Exclude<WorkspaceRole, 'owner'>,
  ) => {
    const target = workspaceMembers.find((m) => m.id === memberId);
    await api.workspace.updateMemberRole(memberId, role);
    setWorkspaceMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role } : m)),
    );
    await recordAudit(
      'member.role',
      `Permissão de ${target?.email ?? memberId} alterada para ${role}`,
      'workspace_member',
      memberId,
    );
    toast.success('Permissão atualizada.');
  };

  const handleRefreshTeam = async () => {
    try {
      const { ctx, members } = await api.workspace.refresh();
      setWorkspaceRole(ctx.role);
      setWorkspaceTeamActive(isTeamWorkspaceActive(ctx));
      setWorkspaceMembers(members);
      if (isTeamWorkspaceActive(ctx)) {
        toast.success('Equipe ativada. Você já pode convidar usuários.');
      } else {
        toast.error(
          getLastBootstrapError() ??
            'Não foi possível ativar a equipe. Confirme o script 009 no Supabase e tente de novo.',
        );
      }
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err));
    }
  };

  const handleAddTransaction = async (transaction: Transaction) => {
    const newTrans = await api.transactions.create(transaction);
    setTransactions((prev) => [newTrans, ...prev]);
    setPreFilledTransaction(null);
    await recordAudit(
      'transaction.create',
      `Lançamento: ${newTrans.description} — R$ ${newTrans.amount.toFixed(2)}`,
      'transaction',
      newTrans.id,
    );
  };

  const handleDeleteTransaction = (id: string) => {
    setConfirmDialog({
      title: 'Excluir transação',
      message: 'Deseja realmente excluir esta transação? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const removed = transactions.find((t) => t.id === id);
          await api.transactions.delete(id);
          setTransactions((prev) => prev.filter((t) => t.id !== id));
          if (editingTransaction?.id === id) setEditingTransaction(null);
          await recordAudit(
            'transaction.delete',
            `Excluído: ${removed?.description ?? id}`,
            'transaction',
            id,
          );
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
    await recordAudit(
      'transaction.update',
      `Editado: ${updated.description}`,
      'transaction',
      updated.id,
    );
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
      await recordAudit(
        'transaction.status',
        `${transaction.description}: ${newStatus === TransactionStatus.PAID ? 'pago' : 'pendente'}`,
        'transaction',
        id,
      );
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
      await recordAudit('client.create', `Cliente: ${newClient.name}`, 'client', newClient.id);
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
      await recordAudit(
        'client.update',
        `Cliente editado: ${updatedClient.name}`,
        'client',
        updatedClient.id,
      );
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar cliente.');
    }
  };

  const handleDeleteClient = (id: string) => {
    askConfirm('Excluir cliente', 'Tem certeza que deseja excluir este cliente?', async () => {
      try {
        const removed = clients.find((c) => c.id === id);
        await api.clients.delete(id);
        setClients((prev) => prev.filter((c) => c.id !== id));
        if (editingClient?.id === id) setEditingClient(null);
        await recordAudit(
          'client.delete',
          `Cliente excluído: ${removed?.name ?? id}`,
          'client',
          id,
        );
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
      await recordAudit(
        'employee.create',
        `Colaborador: ${newEmp.name}`,
        'employee',
        newEmp.id,
      );
    } catch (error) {
      console.error(error);
      toast.error('Erro ao adicionar funcionário.');
    }
  };

  const handleDeleteEmployee = (id: string) => {
    askConfirm('Remover funcionário', 'Deseja remover este funcionário?', async () => {
      try {
        const removed = employees.find((e) => e.id === id);
        await api.employees.delete(id);
        setEmployees((prev) => prev.filter((e) => e.id !== id));
        if (selectedEmployee?.id === id) setSelectedEmployee(null);
        await recordAudit(
          'employee.delete',
          `Colaborador removido: ${removed?.name ?? id}`,
          'employee',
          id,
        );
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
      await recordAudit(
        'employee.update',
        `Colaborador editado: ${updatedEmployee.name}`,
        'employee',
        updatedEmployee.id,
      );
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
      await recordAudit(
        'subscription.create',
        `Assinatura: ${newSub.name}`,
        'subscription',
        newSub.id,
      );
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
      await recordAudit(
        'subscription.update',
        `Assinatura editada: ${updatedSub.name}`,
        'subscription',
        updatedSub.id,
      );
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar assinatura.');
    }
  };

  const handleDeleteSubscription = (id: string) => {
    askConfirm('Remover assinatura', 'Deseja remover esta assinatura?', async () => {
      try {
        const removed = subscriptions.find((s) => s.id === id);
        await api.subscriptions.delete(id);
        setSubscriptions((prev) => prev.filter((s) => s.id !== id));
        await recordAudit(
          'subscription.delete',
          `Assinatura removida: ${removed?.name ?? id}`,
          'subscription',
          id,
        );
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
    await recordAudit(
      'bank_account.create',
      `Conta: ${created.name}`,
      'bank_account',
      created.id,
    );
    toast.success('Conta bancária adicionada.');
  };

  const handleUpdateBankAccount = async (account: BankAccount) => {
    await api.bankAccounts.update(account.id, account);
    setBankAccounts((prev) => prev.map((a) => (a.id === account.id ? account : a)));
    await recordAudit(
      'bank_account.update',
      `Conta editada: ${account.name}`,
      'bank_account',
      account.id,
    );
    toast.success('Conta atualizada.');
  };

  const handleDeleteBankAccount = (id: string) => {
    askConfirm('Excluir conta', 'Lançamentos vinculados ficarão sem conta. Continuar?', async () => {
      try {
        const removed = bankAccounts.find((a) => a.id === id);
        await api.bankAccounts.delete(id);
        setBankAccounts((prev) => prev.filter((a) => a.id !== id));
        setTransactions((prev) =>
          prev.map((t) => (t.bankAccountId === id ? { ...t, bankAccountId: undefined } : t)),
        );
        await recordAudit(
          'bank_account.delete',
          `Conta removida: ${removed?.name ?? id}`,
          'bank_account',
          id,
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
      employeeId: transaction.employeeId,
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
    handlePersistCategories,
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
    workspaceMembers,
    workspaceTeamActive,
    workspaceRole,
    auditLogs,
    isLoadingTeam,
    handleInviteMember,
    handleRemoveMember,
    handleUpdateMemberRole,
    handleRefreshTeam,
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
