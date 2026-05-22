import { describe, expect, it } from 'vitest';
import {
  categoriesForStorage,
  mergeCategoryLists,
  normalizeCategoriesFromStorage,
} from './companySettingsMapper';

describe('companySettingsMapper categories', () => {
  it('normaliza JSONB vazio para padrões', () => {
    expect(normalizeCategoriesFromStorage([]).length).toBeGreaterThan(0);
    expect(normalizeCategoriesFromStorage(null).length).toBeGreaterThan(0);
  });

  it('categoriesForStorage não grava array vazio', () => {
    expect(categoriesForStorage([]).length).toBeGreaterThan(0);
    expect(categoriesForStorage(undefined).length).toBeGreaterThan(0);
  });

  it('mergeCategoryLists preserva customizada com banco vazio', () => {
    const merged = mergeCategoryLists([], [{ id: 'x', label: 'Marketing', transactionType: 'EXPENSE' as const }]);
    expect(merged.some((c) => c.label === 'Marketing')).toBe(true);
  });
});
