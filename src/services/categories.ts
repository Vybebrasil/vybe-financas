import { Category, CategoryConfig, CompanySettings, TransactionType } from '../../types';

export type { CategoryConfig };

export const CLIENT_PAYMENT_LABEL = Category.CLIENT_PAYMENT;

export const DEFAULT_CATEGORIES: CategoryConfig[] = [
  {
    id: 'cat-client-payment',
    label: Category.CLIENT_PAYMENT,
    transactionType: TransactionType.INCOME,
    locked: true,
  },
  {
    id: 'cat-salary',
    label: Category.SALARY,
    transactionType: TransactionType.EXPENSE,
    locked: true,
  },
  {
    id: 'cat-tools',
    label: Category.TOOLS,
    transactionType: TransactionType.EXPENSE,
    locked: true,
  },
  {
    id: 'cat-ads',
    label: Category.ADS,
    transactionType: TransactionType.EXPENSE,
    locked: true,
  },
  {
    id: 'cat-supplies',
    label: Category.SUPPLIES,
    transactionType: TransactionType.EXPENSE,
    locked: true,
  },
  {
    id: 'cat-variable-expense',
    label: Category.VARIABLE_EXPENSE,
    transactionType: TransactionType.EXPENSE,
    locked: true,
  },
  {
    id: 'cat-fixed-expense',
    label: Category.FIXED_EXPENSE,
    transactionType: TransactionType.EXPENSE,
    locked: true,
  },
  {
    id: 'cat-other',
    label: Category.OTHER,
    transactionType: TransactionType.EXPENSE,
    locked: true,
  },
];

export function resolveCategories(settings?: CompanySettings | null): CategoryConfig[] {
  const custom = settings?.categories?.filter((c) => c.label?.trim());
  if (!custom?.length) return [...DEFAULT_CATEGORIES];

  const byId = new Map<string, CategoryConfig>();
  for (const c of DEFAULT_CATEGORIES) byId.set(c.id, { ...c });

  for (const c of custom) {
    const label = c.label.trim();
    const id =
      c.id ||
      DEFAULT_CATEGORIES.find((d) => d.label === label)?.id ||
      `custom-${label.toLowerCase().replace(/\s+/g, '-')}`;
    byId.set(id, {
      ...c,
      id,
      label,
      locked: c.locked ?? DEFAULT_CATEGORIES.find((d) => d.id === id)?.locked ?? false,
    });
  }

  return [...byId.values()];
}

export function getCategoryLabels(settings?: CompanySettings | null): string[] {
  return resolveCategories(settings).map((c) => c.label);
}

export function inferTransactionTypeForCategory(
  label: string,
  settings?: CompanySettings | null,
): TransactionType {
  const found = resolveCategories(settings).find((c) => c.label === label);
  return found?.transactionType ?? TransactionType.EXPENSE;
}

export function isClientPaymentCategory(label: string): boolean {
  return label === CLIENT_PAYMENT_LABEL;
}

const CHART_PALETTE = [
  '#EF4444',
  '#F59E0B',
  '#3B82F6',
  '#10B981',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F97316',
];

export function getCategoryChartColor(label: string, index: number): string {
  const defaults: Record<string, string> = {
    [Category.SALARY]: '#EF4444',
    [Category.ADS]: '#F59E0B',
    [Category.TOOLS]: '#3B82F6',
    [Category.SUPPLIES]: '#10B981',
    [Category.VARIABLE_EXPENSE]: '#14B8A6',
    [Category.FIXED_EXPENSE]: '#6366F1',
    [Category.OTHER]: '#8B5CF6',
    [Category.CLIENT_PAYMENT]: '#6B7280',
  };
  return defaults[label] ?? CHART_PALETTE[index % CHART_PALETTE.length];
}
