import { supabase } from './supabase';
import { Transaction, Client, TransactionType, Category, TransactionStatus } from '../types';

// --- Funções Auxiliares de Conversão ---

// Converte do formato do Banco (snake_case) para o App (camelCase)
const mapTransactionFromDB = (data: any): Transaction => ({
  id: data.id,
  description: data.description,
  amount: Number(data.amount),
  type: data.type as TransactionType,
  category: data.category as Category,
  date: data.date,
  status: data.status as TransactionStatus,
  clientId: data.client_id || undefined, // Converte client_id -> clientId
  paymentMethod: data.payment_method || 'OUTRO', // Converte payment_method -> paymentMethod
});

// Converte do formato do App (camelCase) para o Banco (snake_case)
const mapTransactionToDB = (t: Transaction, userId: string) => ({
  // id é gerado pelo banco se for insert, ou passado se for update
  user_id: userId,
  description: t.description,
  amount: t.amount,
  type: t.type,
  category: t.category,
  date: t.date,
  status: t.status,
  client_id: t.clientId || null,
  payment_method: t.paymentMethod
});

// --- API Transactions ---

export const api = {
  transactions: {
    async list() {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      return data.map(mapTransactionFromDB);
    },

    async create(transaction: Transaction) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Removemos o ID gerado no front para deixar o banco gerar o UUID real
      // ou mantemos se você quiser controlar o ID (recomendado deixar o banco gerar)
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
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },

    async updateStatus(id: string, newStatus: TransactionStatus) {
        const { error } = await supabase
            .from('transactions')
            .update({ status: newStatus })
            .eq('id', id);
            
        if (error) throw error;
    }
  },

  clients: {
    async list() {
      const { data, error } = await supabase.from('clients').select('*');
      if (error) throw error;
      
      // Mapeamento simples para clientes (ajuste conforme seus nomes de coluna no DB)
      return data.map((c: any) => ({
        id: c.id,
        name: c.name,
        cnpj: c.cnpj,
        contactPerson: c.contact_person, // snake -> camel
        email: c.email,
        phone: c.phone,
        activePlan: c.active_plan, // snake -> camel
        monthlyFee: Number(c.monthly_fee), // snake -> camel
        dueDay: c.due_day, // snake -> camel
        contractStatus: c.contract_status // snake -> camel
      })) as Client[];
    },
    
    // Adicione create/delete clients aqui seguindo a lógica acima se precisar
  }
};