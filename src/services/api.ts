import { supabase } from './supabase';
import {
  Transaction,
  Client,
  Employee,
  Subscription,
  TransactionType,
  Category,
  TransactionStatus,
  CompanySettings,
  BankAccount,
} from '../../types';
import {
  mapCompanySettingsFromDB,
  mapCompanySettingsFromMetadata,
  mapCompanySettingsToDB,
  type CompanySettingsRow,
} from './companySettingsMapper';

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
  status: data.status as TransactionStatus,
  clientId: (data.client_id as string) || undefined,
  bankAccountId: (data.bank_account_id as string) || undefined,
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
    status: t.status,
    client_id: t.clientId || null,
    payment_method: t.paymentMethod,
    receipt_url: t.receiptUrl || null,
  };
  // Só envia se houver conta — evita erro quando a coluna ainda não existe no Supabase
  if (t.bankAccountId) {
    row.bank_account_id = t.bankAccountId;
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
  pixKey: (e.pix_key as string) || '',
  paymentDay: Number(e.payment_day) || 1,
  observations: (e.observations as string) || undefined,
});

const mapEmployeeToDB = (e: Omit<Employee, 'id'>, userId: string) => ({
  user_id: userId,
  name: e.name,
  role: e.role,
  salary: e.salary,
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

const uploadStorageFile = async (bucket: 'receipts' | 'logos', file: File): Promise<string> => {
  const user = await requireUser();
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const path = `${user.id}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
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
});

const mapBankAccountToDB = (a: Omit<BankAccount, 'id'>, userId: string) => ({
  user_id: userId,
  name: a.name,
  institution: a.institution,
  initial_balance: a.initialBalance,
  is_default: a.isDefault,
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
      const user = await requireUser();
      const { error } = await supabase.auth.updateUser({
        data: { ...user.user_metadata, ...metadata },
      });
      if (error) throw error;
    },
  },

  companySettings: {
    async load(): Promise<CompanySettings> {
      const user = await requireUser();
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
          return mapCompanySettingsFromMetadata(user.user_metadata);
        }
        throw error;
      }

      if (data) return mapCompanySettingsFromDB(data as CompanySettingsRow);

      const fromMetadata = mapCompanySettingsFromMetadata(user.user_metadata);
      try {
        await api.companySettings.save(fromMetadata);
      } catch {
        // Tabela indisponível: segue com metadata
      }
      return fromMetadata;
    },

    async save(settings: CompanySettings): Promise<void> {
      const user = await requireUser();
      const payload = mapCompanySettingsToDB(user.id, settings);
      const { error } = await supabase.from('company_settings').upsert(payload, {
        onConflict: 'user_id',
      });

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
          await api.user.updateMetadata({
            company_name: settings.name,
            cnpj: settings.cnpj,
            phone: settings.phone,
            address: settings.address,
            logoUrl: settings.logoUrl,
            service_plans: settings.plans ?? [],
            message_templates: settings.messageTemplates ?? [],
          });
          return;
        }
        throw error;
      }

      await api.user.updateMetadata({
        company_name: settings.name,
        cnpj: settings.cnpj,
        phone: settings.phone,
        address: settings.address,
        logoUrl: settings.logoUrl,
      });
    },
  },

  transactions: {
    async list() {
      const user = await requireUser();
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      return (data ?? []).map(mapTransactionFromDB);
    },

    async create(transaction: Omit<Transaction, 'id'> | Transaction) {
      const user = await requireUser();
      const payload = mapTransactionToDB(transaction, user.id);

      const { data, error } = await supabase
        .from('transactions')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return mapTransactionFromDB(data);
    },

    async delete(id: string) {
      const user = await requireUser();
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },

    async updateStatus(id: string, newStatus: TransactionStatus) {
      const user = await requireUser();
      const { error } = await supabase
        .from('transactions')
        .update({ status: newStatus })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },

    async update(id: string, transaction: Transaction) {
      const user = await requireUser();
      const payload = mapTransactionToDB(transaction, user.id);
      const { data, error } = await supabase
        .from('transactions')
        .update(payload)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return mapTransactionFromDB(data);
    },
  },

  storage: {
    uploadReceipt: (file: File) => uploadStorageFile('receipts', file),
    uploadLogo: (file: File) => uploadStorageFile('logos', file),
  },

  recurring: {
    async hasGenerated(monthKey: string): Promise<boolean> {
      const user = await requireUser();
      const { data, error } = await supabase
        .from('recurring_generation_log')
        .select('month_key')
        .eq('user_id', user.id)
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
      const user = await requireUser();
      const { error } = await supabase.from('recurring_generation_log').upsert(
        {
          user_id: user.id,
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

  clients: {
    async list() {
      const user = await requireUser();
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return (data ?? []).map(mapClientFromDB);
    },

    async create(client: Omit<Client, 'id'>) {
      const user = await requireUser();
      const { data, error } = await supabase
        .from('clients')
        .insert([mapClientToDB(client, user.id)])
        .select()
        .single();

      if (error) throw error;
      return mapClientFromDB(data);
    },

    async update(id: string, client: Client) {
      const user = await requireUser();
      const { error } = await supabase
        .from('clients')
        .update(mapClientToDB(client, user.id))
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },

    async delete(id: string) {
      const user = await requireUser();
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
  },

  employees: {
    async list() {
      const user = await requireUser();
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return (data ?? []).map(mapEmployeeFromDB);
    },

    async create(employee: Omit<Employee, 'id'>) {
      const user = await requireUser();
      const { data, error } = await supabase
        .from('employees')
        .insert([mapEmployeeToDB(employee, user.id)])
        .select()
        .single();

      if (error) throw error;
      return mapEmployeeFromDB(data);
    },

    async update(id: string, employee: Employee) {
      const user = await requireUser();
      const { error } = await supabase
        .from('employees')
        .update(mapEmployeeToDB(employee, user.id))
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },

    async delete(id: string) {
      const user = await requireUser();
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
  },

  bankAccounts: {
    async list() {
      const user = await requireUser();
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;
      return (data ?? []).map(mapBankAccountFromDB);
    },

    async create(account: Omit<BankAccount, 'id'>) {
      const user = await requireUser();
      if (account.isDefault) {
        await supabase
          .from('bank_accounts')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }
      const { data, error } = await supabase
        .from('bank_accounts')
        .insert([mapBankAccountToDB(account, user.id)])
        .select()
        .single();

      if (error) throw error;
      return mapBankAccountFromDB(data);
    },

    async update(id: string, account: BankAccount) {
      const user = await requireUser();
      if (account.isDefault) {
        await supabase
          .from('bank_accounts')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .neq('id', id);
      }
      const { error } = await supabase
        .from('bank_accounts')
        .update(mapBankAccountToDB(account, user.id))
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },

    async delete(id: string) {
      const user = await requireUser();
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
  },

  subscriptions: {
    async list() {
      const user = await requireUser();
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return (data ?? []).map(mapSubscriptionFromDB);
    },

    async create(subscription: Omit<Subscription, 'id'>) {
      const user = await requireUser();
      const { data, error } = await supabase
        .from('subscriptions')
        .insert([mapSubscriptionToDB(subscription, user.id)])
        .select()
        .single();

      if (error) throw error;
      return mapSubscriptionFromDB(data);
    },

    async update(id: string, subscription: Subscription) {
      const user = await requireUser();
      const { error } = await supabase
        .from('subscriptions')
        .update(mapSubscriptionToDB(subscription, user.id))
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },

    async delete(id: string) {
      const user = await requireUser();
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
  },
};
