import { supabase } from './supabase';
import {
  Transaction,
  Client,
  Contract,
  Employee,
  Subscription,
  TransactionType,
  Category,
  TransactionStatus,
  CompanySettings,
  BankAccount,
  CategoryConfig,
} from '../../types';
import { validateTransferTransaction } from './transfers';
import {
  mapCompanySettingsFromDB,
  mapCompanySettingsFromMetadata,
  mapCompanySettingsToDB,
  categoriesForStorage,
  mergeCategoryLists,
  normalizeCategoriesFromStorage,
  type CompanySettingsRow,
} from './companySettingsMapper';
import { requireWorkspace, clearWorkspaceCache } from './workspace';
import {
  listWorkspaceMembers,
  inviteWorkspaceMember,
  removeWorkspaceMember,
  updateMemberRole,
  refreshTeamWorkspace,
} from './workspace';
import { listAuditLogs, logAudit } from './auditLog';

export { clearWorkspaceCache };

const requireUser = async () => {
  // getSession é síncrono com o storage local — evita race após login (comum em produção)
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) return session.user;

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error('Usuário não autenticado');
  return user;
};

const mapTransactionFromDB = (data: Record<string, unknown>): Transaction => ({
  id: data.id as string,
  description: data.description as string,
  amount: Number(data.amount),
  type: data.type as TransactionType,
  category: data.category as Category,
  date: data.date as string,
  paidDate: data.paid_date ? String(data.paid_date).slice(0, 10) : undefined,
  status: data.status as TransactionStatus,
  clientId: (data.client_id as string) || undefined,
  employeeId: (data.employee_id as string) || undefined,
  bankAccountId: (data.bank_account_id as string) || undefined,
  transferToAccountId: (data.transfer_to_account_id as string) || undefined,
  paymentMethod: (data.payment_method as Transaction['paymentMethod']) || 'OUTRO',
  receiptUrl: (data.receipt_url as string) || undefined,
});

const mapTransactionToDB = (t: Omit<Transaction, 'id'> | Transaction, userId: string) => {
  const row: Record<string, unknown> = {
    user_id: userId,
    description: t.description,
    amount: t.amount,
    type: t.type,
    category: t.category,
    date: t.date,
    paid_date: t.paidDate || null,
    status: t.status,
    client_id: t.clientId || null,
    employee_id: t.employeeId || null,
    payment_method: t.paymentMethod,
    receipt_url: t.receiptUrl || null,
  };
  // Só envia se houver conta — evita erro quando a coluna ainda não existe no Supabase
  if (t.bankAccountId) {
    row.bank_account_id = t.bankAccountId;
  }
  if (t.transferToAccountId) {
    row.transfer_to_account_id = t.transferToAccountId;
  }
  return row;
};

const mapClientFromDB = (c: Record<string, unknown>): Client => ({
  id: c.id as string,
  name: c.name as string,
  cnpj: (c.cnpj as string) || '',
  contactPerson: (c.contact_person as string) || '',
  email: (c.email as string) || '',
  phone: (c.phone as string) || '',
  activePlan: (c.active_plan as string) || '',
  monthlyFee: Number(c.monthly_fee) || 0,
  dueDay: Number(c.due_day) || 1,
  contractStatus: (c.contract_status as Client['contractStatus']) || 'Pendente',
  createdAt: c.created_at ? String(c.created_at).slice(0, 10) : undefined,
});

const mapContractFromDB = (row: Record<string, unknown>): Contract => ({
  id: row.id as string,
  clientId: row.client_id as string,
  title: row.title as string,
  amount: Number(row.amount) || 0,
  status: (row.status as Contract['status']) || 'Pendente',
  startDate: String(row.start_date).slice(0, 10),
  signedDate: row.signed_date ? String(row.signed_date).slice(0, 10) : undefined,
  endDate: row.end_date ? String(row.end_date).slice(0, 10) : undefined,
  dueDay: Number(row.due_day) || 1,
  notes: (row.notes as string) || undefined,
  templateKey: (row.template_key as string) || 'vybe-os-marketing',
  parameters: (row.parameters as Contract['parameters']) ?? {},
  pdfUrl: (row.pdf_url as string) || undefined,
  pdfFileName: (row.pdf_file_name as string) || undefined,
  createdAt: row.created_at ? String(row.created_at).slice(0, 10) : undefined,
});

const mapContractToDB = (c: Omit<Contract, 'id'>, userId: string) => ({
  user_id: userId,
  client_id: c.clientId,
  title: c.title,
  amount: c.amount,
  status: c.status,
  start_date: c.startDate,
  signed_date: c.signedDate || null,
  end_date: c.endDate || null,
  due_day: c.dueDay,
  notes: c.notes || null,
  template_key: c.templateKey || 'vybe-os-marketing',
  parameters: c.parameters ?? {},
  pdf_url: c.pdfUrl || null,
  pdf_file_name: c.pdfFileName || null,
});

const mapClientToDB = (c: Omit<Client, 'id'>, userId: string) => ({
  user_id: userId,
  name: c.name,
  cnpj: c.cnpj,
  contact_person: c.contactPerson,
  email: c.email,
  phone: c.phone,
  active_plan: c.activePlan,
  monthly_fee: c.monthlyFee,
  due_day: c.dueDay,
  contract_status: c.contractStatus,
});

const mapEmployeeFromDB = (e: Record<string, unknown>): Employee => ({
  id: e.id as string,
  name: e.name as string,
  role: e.role as string,
  salary: Number(e.salary),
  bonus: Number(e.bonus) || 0,
  pixKey: (e.pix_key as string) || '',
  paymentDay: Number(e.payment_day) || 1,
  observations: (e.observations as string) || undefined,
});

const mapEmployeeToDB = (e: Omit<Employee, 'id'>, userId: string) => ({
  user_id: userId,
  name: e.name,
  role: e.role,
  salary: e.salary,
  bonus: e.bonus ?? 0,
  pix_key: e.pixKey,
  payment_day: e.paymentDay,
  observations: e.observations || null,
});

const mapSubscriptionFromDB = (s: Record<string, unknown>): Subscription => ({
  id: s.id as string,
  name: s.name as string,
  cost: Number(s.cost),
  renewalDay: Number(s.renewal_day) || 1,
  paymentMethod: (s.payment_method as Subscription['paymentMethod']) || 'OUTRO',
  active: Boolean(s.active),
});

const uploadStorageFile = async (
  bucket: 'receipts' | 'logos' | 'contracts',
  file: File,
  subPath?: string,
): Promise<string> => {
  const { ownerId } = await requireWorkspace();
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const path = subPath
    ? `${ownerId}/${subPath}/${Date.now()}.${ext}`
    : `${ownerId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

const mapBankAccountFromDB = (row: Record<string, unknown>): BankAccount => ({
  id: row.id as string,
  name: row.name as string,
  institution: (row.institution as string) || '',
  initialBalance: Number(row.initial_balance) || 0,
  isDefault: Boolean(row.is_default),
  accountType: (row.account_type as BankAccount['accountType']) || 'checking',
});

const mapBankAccountToDB = (a: Omit<BankAccount, 'id'>, userId: string) => ({
  user_id: userId,
  name: a.name,
  institution: a.institution,
  initial_balance: a.initialBalance,
  is_default: a.isDefault,
  account_type: a.accountType ?? 'checking',
});

const mapSubscriptionToDB = (s: Omit<Subscription, 'id'>, userId: string) => ({
  user_id: userId,
  name: s.name,
  cost: s.cost,
  renewal_day: s.renewalDay,
  payment_method: s.paymentMethod,
  active: s.active,
});

export const api = {
  user: {
    async updateMetadata(metadata: Record<string, unknown>) {
      const { user, ownerId } = await requireWorkspace();
      const { error } = await supabase.auth.updateUser({
        data: { ...user.user_metadata, ...metadata },
      });
      if (error) throw error;
    },
  },

  companySettings: {
    async load(): Promise<CompanySettings> {
      const { user, ownerId } = await requireWorkspace();
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('user_id', ownerId)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
          return mapCompanySettingsFromMetadata(user.user_metadata);
        }
        throw error;
      }

      if (data) {
        const fromDb = mapCompanySettingsFromDB(data as CompanySettingsRow);
        const fromMeta = mapCompanySettingsFromMetadata(user.user_metadata);
        return {
          ...fromDb,
          categories: mergeCategoryLists(fromDb.categories, fromMeta.categories),
        };
      }

      const fromMetadata = mapCompanySettingsFromMetadata(user.user_metadata);
      try {
        await api.companySettings.save(fromMetadata);
      } catch {
        // Tabela indisponível: segue com metadata
      }
      return fromMetadata;
    },

    async saveCategories(categories: CategoryConfig[] | undefined): Promise<CategoryConfig[]> {
      const { user, ownerId } = await requireWorkspace();
      const stored = categoriesForStorage(categories);

      const { data: existing, error: fetchErr } = await supabase
        .from('company_settings')
        .select('user_id, name')
        .eq('user_id', ownerId)
        .maybeSingle();

      if (fetchErr && fetchErr.code !== 'PGRST205' && !fetchErr.message?.includes('does not exist')) {
        throw fetchErr;
      }

      let savedRaw: unknown;

      if (existing) {
        const { data, error } = await supabase
          .from('company_settings')
          .update({ transaction_categories: stored })
          .eq('user_id', ownerId)
          .select('transaction_categories')
          .single();
        if (error) throw error;
        savedRaw = data?.transaction_categories;
      } else {
        const companyName =
          (user.user_metadata?.company_name as string) || 'Minha Agência';
        const { data, error } = await supabase
          .from('company_settings')
          .insert({
            user_id: ownerId,
            name: companyName,
            transaction_categories: stored,
          })
          .select('transaction_categories')
          .single();
        if (error) throw error;
        savedRaw = data?.transaction_categories;
      }

      const saved = normalizeCategoriesFromStorage(savedRaw);
      if (saved.length < stored.length) {
        throw new Error('As categorias não foram gravadas no servidor. Tente novamente.');
      }

      if (ownerId === user.id) {
        await api.user.updateMetadata({ transaction_categories: stored });
      }

      return saved;
    },

    async save(settings: CompanySettings): Promise<void> {
      const { user, ownerId } = await requireWorkspace();
      const categories = await api.companySettings.saveCategories(settings.categories);
      const payload = mapCompanySettingsToDB(ownerId, { ...settings, categories });
      const { error } = await supabase.from('company_settings').upsert(payload, {
        onConflict: 'user_id',
      });

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
          if (ownerId === user.id) {
            await api.user.updateMetadata({
              company_name: settings.name,
              cnpj: settings.cnpj,
              phone: settings.phone,
              address: settings.address,
              logoUrl: settings.logoUrl,
              service_plans: settings.plans ?? [],
              message_templates: settings.messageTemplates ?? [],
              transaction_categories: categories,
            });
          }
          return;
        }
        throw error;
      }

      if (ownerId === user.id) {
        await api.user.updateMetadata({
          company_name: settings.name,
          cnpj: settings.cnpj,
          phone: settings.phone,
          address: settings.address,
          logoUrl: settings.logoUrl,
          service_plans: settings.plans ?? [],
          message_templates: settings.messageTemplates ?? [],
          transaction_categories: categories,
        });
      }
    },
  },

  transactions: {
    async list() {
      const { user, ownerId } = await requireWorkspace();
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', ownerId)
        .order('date', { ascending: false });

      if (error) throw error;
      return (data ?? []).map(mapTransactionFromDB);
    },

    async create(transaction: Omit<Transaction, 'id'> | Transaction) {
      const { user, ownerId } = await requireWorkspace();
      validateTransferTransaction(transaction);
      const payload = mapTransactionToDB(transaction, ownerId);

      const { data, error } = await supabase
        .from('transactions')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return mapTransactionFromDB(data);
    },

    async delete(id: string) {
      const { user, ownerId } = await requireWorkspace();
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', ownerId);

      if (error) throw error;
    },

    async updateStatus(
      id: string,
      newStatus: TransactionStatus,
      paidDate?: string | null,
    ) {
      const { user, ownerId } = await requireWorkspace();
      const patch: Record<string, unknown> = { status: newStatus };
      if (newStatus === TransactionStatus.PAID && paidDate) {
        patch.paid_date = paidDate;
      } else if (newStatus === TransactionStatus.PENDING) {
        patch.paid_date = null;
      }

      const { error } = await supabase
        .from('transactions')
        .update(patch)
        .eq('id', id)
        .eq('user_id', ownerId);

      if (error) throw error;
    },

    async update(id: string, transaction: Transaction) {
      const { user, ownerId } = await requireWorkspace();
      validateTransferTransaction(transaction);
      const payload = mapTransactionToDB(transaction, ownerId);
      const { data, error } = await supabase
        .from('transactions')
        .update(payload)
        .eq('id', id)
        .eq('user_id', ownerId)
        .select()
        .single();

      if (error) throw error;
      return mapTransactionFromDB(data);
    },
  },

  storage: {
    uploadReceipt: (file: File) => uploadStorageFile('receipts', file),
    uploadLogo: (file: File) => uploadStorageFile('logos', file),
    uploadContractPdf: (file: File, contractId: string) =>
      uploadStorageFile('contracts', file, `contracts/${contractId}`),
  },

  recurring: {
    async hasGenerated(monthKey: string): Promise<boolean> {
      const { user, ownerId } = await requireWorkspace();
      const { data, error } = await supabase
        .from('recurring_generation_log')
        .select('month_key')
        .eq('user_id', ownerId)
        .eq('month_key', monthKey)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
          const legacy = user.user_metadata?.last_recurring_month as string | undefined;
          return legacy === monthKey;
        }
        throw error;
      }
      return Boolean(data);
    },

    async markGenerated(monthKey: string, transactionsCount: number): Promise<void> {
      const { user, ownerId } = await requireWorkspace();
      const { error } = await supabase.from('recurring_generation_log').upsert(
        {
          user_id: ownerId,
          month_key: monthKey,
          transactions_count: transactionsCount,
        },
        { onConflict: 'user_id,month_key' },
      );

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
          await api.user.updateMetadata({ last_recurring_month: monthKey });
          return;
        }
        throw error;
      }

      await api.user.updateMetadata({ last_recurring_month: monthKey });
    },
  },

  contracts: {
    async list() {
      const { ownerId } = await requireWorkspace();
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('user_id', ownerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []).map(mapContractFromDB);
    },

    async create(contract: Omit<Contract, 'id'>) {
      const { ownerId } = await requireWorkspace();
      const { data, error } = await supabase
        .from('contracts')
        .insert([mapContractToDB(contract, ownerId)])
        .select()
        .single();

      if (error) throw error;
      return mapContractFromDB(data);
    },

    async update(id: string, contract: Contract) {
      const { ownerId } = await requireWorkspace();
      const { error } = await supabase
        .from('contracts')
        .update(mapContractToDB(contract, ownerId))
        .eq('id', id)
        .eq('user_id', ownerId);

      if (error) throw error;
    },

    async delete(id: string) {
      const { ownerId } = await requireWorkspace();
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', id)
        .eq('user_id', ownerId);

      if (error) throw error;
    },
  },

  clients: {
    async list() {
      const { user, ownerId } = await requireWorkspace();
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', ownerId);

      if (error) throw error;
      return (data ?? []).map(mapClientFromDB);
    },

    async create(client: Omit<Client, 'id'>) {
      const { user, ownerId } = await requireWorkspace();
      const { data, error } = await supabase
        .from('clients')
        .insert([mapClientToDB(client, ownerId)])
        .select()
        .single();

      if (error) throw error;
      return mapClientFromDB(data);
    },

    async update(id: string, client: Client) {
      const { user, ownerId } = await requireWorkspace();
      const { error } = await supabase
        .from('clients')
        .update(mapClientToDB(client, ownerId))
        .eq('id', id)
        .eq('user_id', ownerId);

      if (error) throw error;
    },

    async delete(id: string) {
      const { user, ownerId } = await requireWorkspace();
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)
        .eq('user_id', ownerId);

      if (error) throw error;
    },
  },

  employees: {
    async list() {
      const { user, ownerId } = await requireWorkspace();
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', ownerId);

      if (error) throw error;
      return (data ?? []).map(mapEmployeeFromDB);
    },

    async create(employee: Omit<Employee, 'id'>) {
      const { user, ownerId } = await requireWorkspace();
      const { data, error } = await supabase
        .from('employees')
        .insert([mapEmployeeToDB(employee, ownerId)])
        .select()
        .single();

      if (error) throw error;
      return mapEmployeeFromDB(data);
    },

    async update(id: string, employee: Employee) {
      const { user, ownerId } = await requireWorkspace();
      const { error } = await supabase
        .from('employees')
        .update(mapEmployeeToDB(employee, ownerId))
        .eq('id', id)
        .eq('user_id', ownerId);

      if (error) throw error;
    },

    async delete(id: string) {
      const { user, ownerId } = await requireWorkspace();
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id)
        .eq('user_id', ownerId);

      if (error) throw error;
    },
  },

  bankAccounts: {
    async list() {
      const { user, ownerId } = await requireWorkspace();
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', ownerId)
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;
      return (data ?? []).map(mapBankAccountFromDB);
    },

    async create(account: Omit<BankAccount, 'id'>) {
      const { user, ownerId } = await requireWorkspace();
      if (account.isDefault) {
        await supabase
          .from('bank_accounts')
          .update({ is_default: false })
          .eq('user_id', ownerId);
      }
      const { data, error } = await supabase
        .from('bank_accounts')
        .insert([mapBankAccountToDB(account, ownerId)])
        .select()
        .single();

      if (error) throw error;
      return mapBankAccountFromDB(data);
    },

    async update(id: string, account: BankAccount) {
      const { user, ownerId } = await requireWorkspace();
      if (account.isDefault) {
        await supabase
          .from('bank_accounts')
          .update({ is_default: false })
          .eq('user_id', ownerId)
          .neq('id', id);
      }
      const { error } = await supabase
        .from('bank_accounts')
        .update(mapBankAccountToDB(account, ownerId))
        .eq('id', id)
        .eq('user_id', ownerId);

      if (error) throw error;
    },

    async delete(id: string) {
      const { user, ownerId } = await requireWorkspace();
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', id)
        .eq('user_id', ownerId);

      if (error) throw error;
    },
  },

  subscriptions: {
    async list() {
      const { user, ownerId } = await requireWorkspace();
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', ownerId);

      if (error) throw error;
      return (data ?? []).map(mapSubscriptionFromDB);
    },

    async create(subscription: Omit<Subscription, 'id'>) {
      const { user, ownerId } = await requireWorkspace();
      const { data, error } = await supabase
        .from('subscriptions')
        .insert([mapSubscriptionToDB(subscription, ownerId)])
        .select()
        .single();

      if (error) throw error;
      return mapSubscriptionFromDB(data);
    },

    async update(id: string, subscription: Subscription) {
      const { user, ownerId } = await requireWorkspace();
      const { error } = await supabase
        .from('subscriptions')
        .update(mapSubscriptionToDB(subscription, ownerId))
        .eq('id', id)
        .eq('user_id', ownerId);

      if (error) throw error;
    },

    async delete(id: string) {
      const { user, ownerId } = await requireWorkspace();
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', id)
        .eq('user_id', ownerId);

      if (error) throw error;
    },
  },

  workspace: {
    bootstrap: () => requireWorkspace(),
    refresh: refreshTeamWorkspace,
    listMembers: listWorkspaceMembers,
    invite: inviteWorkspaceMember,
    removeMember: removeWorkspaceMember,
    updateMemberRole,
  },

  audit: {
    log: logAudit,
    list: listAuditLogs,
  },

  billing: {
    async listDispatchLogs(since?: string) {
      const { ownerId } = await requireWorkspace();
      let q = supabase
        .from('billing_dispatch_log')
        .select('*')
        .eq('user_id', ownerId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (since) q = q.gte('dispatch_date', since);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id as string,
        clientId: r.client_id as string,
        channel: r.channel as 'whatsapp' | 'email',
        stage: r.stage as string,
        dispatchDate: String(r.dispatch_date).slice(0, 10),
        status: r.status as 'sent' | 'failed' | 'skipped',
        errorMessage: (r.error_message as string) || undefined,
        templateId: (r.template_id as string) || undefined,
        createdAt: r.created_at as string,
      }));
    },
  },

  reconciliation: {
    async importLines(
      lines: Array<{
        lineDate: string;
        description: string;
        amount: number;
        bankAccountId?: string;
      }>,
      importBatchId: string,
    ) {
      const { ownerId } = await requireWorkspace();
      const rows = lines.map((l) => ({
        user_id: ownerId,
        bank_account_id: l.bankAccountId || null,
        import_batch_id: importBatchId,
        line_date: l.lineDate,
        description: l.description,
        amount: l.amount,
      }));
      const { data, error } = await supabase
        .from('bank_statement_lines')
        .insert(rows)
        .select();
      if (error) throw error;
      return data ?? [];
    },

    async listUnreconciled() {
      const { ownerId } = await requireWorkspace();
      const { data, error } = await supabase
        .from('bank_statement_lines')
        .select('*')
        .eq('user_id', ownerId)
        .is('transaction_id', null)
        .order('line_date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id as string,
        bankAccountId: (r.bank_account_id as string) || undefined,
        importBatchId: r.import_batch_id as string,
        lineDate: String(r.line_date).slice(0, 10),
        description: r.description as string,
        amount: Number(r.amount),
      }));
    },

    async reconcile(lineId: string, transactionId: string, paidDate: string) {
      const { ownerId } = await requireWorkspace();
      const { error: txError } = await supabase
        .from('transactions')
        .update({ status: 'PAID', paid_date: paidDate })
        .eq('id', transactionId)
        .eq('user_id', ownerId);
      if (txError) throw txError;

      const { error: lineError } = await supabase
        .from('bank_statement_lines')
        .update({
          transaction_id: transactionId,
          reconciled_at: new Date().toISOString(),
        })
        .eq('id', lineId)
        .eq('user_id', ownerId);
      if (lineError) throw lineError;
    },
  },

  portal: {
    async getOrCreateToken(clientId: string): Promise<string> {
      const { ownerId } = await requireWorkspace();
      const { data: existing } = await supabase
        .from('client_portal_tokens')
        .select('token')
        .eq('client_id', clientId)
        .eq('user_id', ownerId)
        .maybeSingle();

      if (existing?.token) return existing.token as string;

      const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
      const { error } = await supabase.from('client_portal_tokens').insert({
        user_id: ownerId,
        client_id: clientId,
        token,
      });
      if (error) throw error;
      return token;
    },

    async regenerateToken(clientId: string): Promise<string> {
      const { ownerId } = await requireWorkspace();
      const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
      const { error } = await supabase.from('client_portal_tokens').upsert(
        {
          user_id: ownerId,
          client_id: clientId,
          token,
          expires_at: null,
        },
        { onConflict: 'client_id' },
      );
      if (error) throw error;
      return token;
    },

    buildPortalUrl(token: string): string {
      if (typeof window !== 'undefined') {
        return `${window.location.origin}/portal/${token}`;
      }
      return `/portal/${token}`;
    },
  },

  budgets: {
    async list(monthKey?: string) {
      const { ownerId } = await requireWorkspace();
      let q = supabase
        .from('monthly_budgets')
        .select('*')
        .eq('user_id', ownerId)
        .order('category');
      if (monthKey) q = q.eq('month_key', monthKey);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id as string,
        monthKey: r.month_key as string,
        category: r.category as string,
        amount: Number(r.amount),
      }));
    },

    async save(monthKey: string, items: Array<{ category: string; amount: number }>) {
      const { ownerId } = await requireWorkspace();
      const rows = items.map((item) => ({
        user_id: ownerId,
        month_key: monthKey,
        category: item.category,
        amount: item.amount,
      }));
      const { error } = await supabase.from('monthly_budgets').upsert(rows, {
        onConflict: 'user_id,month_key,category',
      });
      if (error) throw error;
    },
  },

  closures: {
    async list() {
      const { ownerId } = await requireWorkspace();
      const { data, error } = await supabase
        .from('period_closures')
        .select('*')
        .eq('user_id', ownerId)
        .order('month_key', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id as string,
        monthKey: r.month_key as string,
        closedAt: r.closed_at as string,
        closedByEmail: (r.closed_by_email as string) || undefined,
        notes: (r.notes as string) || undefined,
      }));
    },

    async close(monthKey: string, notes?: string) {
      const { user, ownerId } = await requireWorkspace();
      const { data, error } = await supabase
        .from('period_closures')
        .insert({
          user_id: ownerId,
          month_key: monthKey,
          closed_by_email: user.email ?? undefined,
          notes: notes?.trim() || null,
        })
        .select()
        .single();
      if (error) throw error;
      return {
        id: data.id as string,
        monthKey: data.month_key as string,
        closedAt: data.closed_at as string,
        closedByEmail: (data.closed_by_email as string) || undefined,
        notes: (data.notes as string) || undefined,
      };
    },

    async reopen(monthKey: string) {
      const { ownerId } = await requireWorkspace();
      const { error } = await supabase
        .from('period_closures')
        .delete()
        .eq('user_id', ownerId)
        .eq('month_key', monthKey);
      if (error) throw error;
    },
  },
};
