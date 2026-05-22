import { CategoryConfig, CompanySettings, MessageTemplate } from '../../types';
import { DEFAULT_CATEGORIES } from './categories';
import { DEFAULT_MESSAGE_TEMPLATES, DEFAULT_SERVICE_PLANS } from '../../constants';

export interface CompanySettingsRow {
  user_id: string;
  name: string;
  cnpj: string | null;
  logo_url: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  service_plans: unknown;
  message_templates: unknown;
  transaction_categories?: unknown;
}

export const defaultCompanySettings = (): CompanySettings => ({
  name: 'Minha Agência',
  cnpj: '',
  logoUrl: '',
  phone: '',
  address: '',
  plans: [...DEFAULT_SERVICE_PLANS],
  messageTemplates: [...DEFAULT_MESSAGE_TEMPLATES],
  categories: [...DEFAULT_CATEGORIES],
});

export const mapCompanySettingsFromDB = (row: CompanySettingsRow): CompanySettings => ({
  name: row.name || 'Minha Agência',
  cnpj: row.cnpj || '',
  logoUrl: row.logo_url || '',
  email: row.email || undefined,
  phone: row.phone || '',
  address: row.address || '',
  plans: Array.isArray(row.service_plans) ? (row.service_plans as string[]) : [...DEFAULT_SERVICE_PLANS],
  messageTemplates: Array.isArray(row.message_templates)
    ? (row.message_templates as MessageTemplate[])
    : [...DEFAULT_MESSAGE_TEMPLATES],
  categories: normalizeCategoriesFromStorage(row.transaction_categories),
});

export const mapCompanySettingsToDB = (userId: string, settings: CompanySettings) => ({
  user_id: userId,
  name: settings.name,
  cnpj: settings.cnpj,
  logo_url: settings.logoUrl || null,
  email: settings.email || null,
  phone: settings.phone || null,
  address: settings.address || null,
  service_plans: settings.plans ?? [],
  message_templates: settings.messageTemplates ?? [],
  transaction_categories: categoriesForStorage(settings.categories),
});

export const mapCompanySettingsFromMetadata = (
  metadata: Record<string, unknown> | undefined,
): CompanySettings => {
  const base = defaultCompanySettings();
  if (!metadata) return base;
  return {
    ...base,
    name: (metadata.company_name as string) || base.name,
    cnpj: (metadata.cnpj as string) || base.cnpj,
    phone: (metadata.phone as string) || base.phone,
    address: (metadata.address as string) || base.address,
    logoUrl: (metadata.logoUrl as string) || base.logoUrl,
    plans: Array.isArray(metadata.service_plans)
      ? (metadata.service_plans as string[])
      : base.plans,
    messageTemplates: Array.isArray(metadata.message_templates)
      ? (metadata.message_templates as MessageTemplate[])
      : base.messageTemplates,
    categories: normalizeCategoriesFromStorage(metadata.transaction_categories) ?? base.categories,
  };
};

/** JSONB `[]` ou ausente → padrões; evita dropdown sem categorias customizadas. */
export function normalizeCategoriesFromStorage(
  raw: unknown,
): CategoryConfig[] {
  if (!Array.isArray(raw) || raw.length === 0) return [...DEFAULT_CATEGORIES];
  return raw.filter(
    (c): c is CategoryConfig =>
      Boolean(c && typeof c === 'object' && typeof (c as CategoryConfig).label === 'string'),
  );
}

export function categoriesForStorage(
  categories: CategoryConfig[] | undefined,
): CategoryConfig[] {
  if (!categories?.length) return [...DEFAULT_CATEGORIES];
  return categories;
}

/** Une listas (banco + metadata + formulário) sem perder categorias customizadas. */
export function mergeCategoryLists(
  ...lists: (CategoryConfig[] | undefined)[]
): CategoryConfig[] {
  const map = new Map<string, CategoryConfig>();

  for (const list of lists) {
    for (const c of list ?? []) {
      if (!c?.label?.trim()) continue;
      const label = c.label.trim();
      const id =
        c.id ||
        DEFAULT_CATEGORIES.find((d) => d.label === label)?.id ||
        `custom-${label.toLowerCase().replace(/\s+/g, '-')}`;
      const txType =
        c.transactionType ??
        (c as { transaction_type?: CategoryConfig['transactionType'] }).transaction_type;
      map.set(id, {
        ...c,
        id,
        label,
        transactionType: txType ?? DEFAULT_CATEGORIES.find((d) => d.id === id)?.transactionType ?? c.transactionType,
        locked: c.locked ?? DEFAULT_CATEGORIES.find((d) => d.id === id)?.locked ?? false,
      });
    }
  }

  for (const d of DEFAULT_CATEGORIES) {
    if (!map.has(d.id)) map.set(d.id, { ...d });
  }

  return map.size > 0 ? [...map.values()] : [...DEFAULT_CATEGORIES];
}
