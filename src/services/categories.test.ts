import { describe, expect, it } from 'vitest';
import { Category, TransactionType } from '../../types';
import {
  inferTransactionTypeForCategory,
  isClientPaymentCategory,
  resolveCategories,
} from './categories';

describe('categories', () => {
  it('resolve categorias padrão', () => {
    const list = resolveCategories();
    expect(list.some((c) => c.label === Category.CLIENT_PAYMENT)).toBe(true);
  });

  it('infere tipo entrada para pagamento de cliente', () => {
    expect(inferTransactionTypeForCategory(Category.CLIENT_PAYMENT)).toBe(
      TransactionType.INCOME,
    );
  });

  it('identifica categoria de mensalidade', () => {
    expect(isClientPaymentCategory(Category.CLIENT_PAYMENT)).toBe(true);
  });

  it('inclui categoria customizada além das padrões', () => {
    const list = resolveCategories({
      name: 'X',
      cnpj: '',
      categories: [
        ...resolveCategories(),
        { id: 'custom-1', label: 'Marketing', transactionType: TransactionType.EXPENSE },
      ],
    });
    expect(list.some((c) => c.label === 'Marketing')).toBe(true);
    expect(list.some((c) => c.label === Category.CLIENT_PAYMENT)).toBe(true);
  });

  it('trata lista vazia como padrões', () => {
    expect(resolveCategories({ name: 'X', cnpj: '', categories: [] }).length).toBe(
      resolveCategories().length,
    );
  });
});
