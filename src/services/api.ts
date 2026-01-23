import { supabase } from './supabase';
import { Transaction, Client, TransactionStatus, Employee, Subscription } from '../../types';
import { generateId } from '../../utils';

const api = {
    transactions: {
        list: async (): Promise<Transaction[]> => {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .order('date', { ascending: false });

            if (error) {
                console.error('Error fetching transactions:', error);
                throw error;
            }

            return data?.map(t => ({
                ...t,
                date: t.date, // Ensure format matches if needed, supabase usually returns ISO string
            })) || [];
        },

        create: async (transaction: Omit<Transaction, 'id'>): Promise<Transaction> => {
            // Remove ephemeral/local-only fields if necessary, or just pass the object
            // Assuming the DB generates the ID
            const { id, ...rest } = transaction as any; // Handle potential ID collision if 'id' is passed but empty

            const { data, error } = await supabase
                .from('transactions')
                .insert([rest])
                .select()
                .single();

            if (error) {
                console.error('Error creating transaction:', error);
                throw error;
            }

            return data;
        },

        delete: async (id: string) => {
            const { error } = await supabase
                .from('transactions')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting transaction:', error);
                throw error;
            }
        },

        updateStatus: async (id: string, status: TransactionStatus) => {
            const { error } = await supabase
                .from('transactions')
                .update({ status })
                .eq('id', id);

            if (error) {
                console.error('Error updating transaction status:', error);
                throw error;
            }
        }
    },

    storage: {
        uploadReceipt: async (file: File): Promise<string | null> => {
            const fileExt = file.name.split('.').pop();
            const fileName = `${generateId()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('receipts')
                .upload(filePath, file);

            if (uploadError) {
                console.error('Error uploading receipt:', uploadError);
                throw uploadError;
            }

            const { data } = supabase.storage
                .from('receipts')
                .getPublicUrl(filePath);

            return data.publicUrl;
        },

        uploadLogo: async (file: File): Promise<string | null> => {
            const fileExt = file.name.split('.').pop();
            const fileName = `logo_${generateId()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('logos')
                .upload(filePath, file, { upsert: true });

            if (uploadError) {
                console.error('Error uploading logo:', uploadError);
                throw uploadError;
            }

            const { data } = supabase.storage
                .from('logos')
                .getPublicUrl(filePath);

            return data.publicUrl;
        }
    },

    clients: {
        list: async (): Promise<Client[]> => {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .order('name');

            if (error) {
                console.error('Error fetching clients:', error);
                throw error;
            }
            return data || [];
        },

        create: async (client: Omit<Client, 'id'>): Promise<Client> => {
            const { data, error } = await supabase
                .from('clients')
                .insert([client])
                .select()
                .single();

            if (error) {
                console.error('Error creating client:', error);
                throw error;
            }
            return data;
        },

        update: async (id: string, client: Partial<Client>): Promise<void> => {
            const { error } = await supabase
                .from('clients')
                .update(client)
                .eq('id', id);

            if (error) {
                console.error('Error updating client:', error);
                throw error;
            }
        },

        delete: async (id: string): Promise<void> => {
            const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting client:', error);
                throw error;
            }
        }
    },

    employees: {
        list: async (): Promise<Employee[]> => {
            const { data, error } = await supabase
                .from('employees')
                .select('*')
                .order('name');

            if (error) {
                console.error('Error fetching employees:', error);
                throw error;
            }
            return data || [];
        },

        create: async (employee: Omit<Employee, 'id'>): Promise<Employee> => {
            const { data, error } = await supabase
                .from('employees')
                .insert([employee])
                .select()
                .single();

            if (error) {
                console.error('Error creating employee:', error);
                throw error;
            }
            return data;
        },

        update: async (id: string, employee: Partial<Employee>): Promise<void> => {
            const { error } = await supabase
                .from('employees')
                .update(employee)
                .eq('id', id);

            if (error) {
                console.error('Error updating employee:', error);
                throw error;
            }
        },

        delete: async (id: string): Promise<void> => {
            const { error } = await supabase
                .from('employees')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting employee:', error);
                throw error;
            }
        }
    },

    subscriptions: {
        list: async (): Promise<Subscription[]> => {
            const { data, error } = await supabase
                .from('subscriptions')
                .select('*')
                .order('name');

            if (error) {
                console.error('Error fetching subscriptions:', error);
                throw error;
            }
            return data || [];
        },

        create: async (subscription: Omit<Subscription, 'id'>): Promise<Subscription> => {
            const { data, error } = await supabase
                .from('subscriptions')
                .insert([subscription])
                .select()
                .single();

            if (error) {
                console.error('Error creating subscription:', error);
                throw error;
            }
            return data;
        },

        update: async (id: string, subscription: Partial<Subscription>): Promise<void> => {
            const { error } = await supabase
                .from('subscriptions')
                .update(subscription)
                .eq('id', id);

            if (error) {
                console.error('Error updating subscription:', error);
                throw error;
            }
        },

        delete: async (id: string): Promise<void> => {
            const { error } = await supabase
                .from('subscriptions')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting subscription:', error);
                throw error;
            }
        }
    },

    auth: {
        updatePassword: async (password: string): Promise<void> => {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
        }
    },

    user: {
        updateMetadata: async (metadata: any): Promise<void> => {
            const { error } = await supabase.auth.updateUser({
                data: metadata
            });
            if (error) throw error;
        }
    }
};

export { api };
