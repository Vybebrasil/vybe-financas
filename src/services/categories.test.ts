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
});
