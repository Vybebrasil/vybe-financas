import { Category, Transaction, TransactionType, TransactionStatus, Client, Employee, Subscription } from './types';

// Função auxiliar para gerar datas dinâmicas (Ex: 0 = mês atual, 1 = mês passado)
const getRelativeDate = (monthsAgo: number, day: number = 15): string => {
  const date = new Date();
  date.setMonth(date.getMonth() - monthsAgo);
  date.setDate(day);
  return date.toISOString().split('T')[0];
};

export const MOCK_TRANSACTIONS: Transaction[] = [];

export const MOCK_CLIENTS: Client[] = [];

export const MOCK_EMPLOYEES: Employee[] = [];

export const MOCK_SUBSCRIPTIONS: Subscription[] = [];

export const STORAGE_KEY = 'vybe-financas-data';
export const STORAGE_KEY_CLIENTS = 'vybe-financas-clients';
export const STORAGE_KEY_EMPLOYEES = 'vybe-financas-employees';
export const STORAGE_KEY_SUBS = 'vybe-financas-subs';