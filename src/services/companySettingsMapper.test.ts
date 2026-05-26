import { describe, expect, it } from 'vitest';
import {
  categoriesForStorage,
  isWhatsAppIntegrationActive,
  mapIntegrationsFromDB,
  mapIntegrationsToDB,
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

describe('integrations whatsapp', () => {
  it('mapeia integrations do JSONB', () => {
    const mapped = mapIntegrationsFromDB({
      whatsapp: { enabled: true, n8n_webhook_url: 'https://n8n.test/hook' },
    });
    expect(mapped?.whatsapp?.enabled).toBe(true);
    expect(mapped?.whatsapp?.n8nWebhookUrl).toBe('https://n8n.test/hook');
  });

  it('isWhatsAppIntegrationActive respeita flag enabled', () => {
    expect(
      isWhatsAppIntegrationActive({
        whatsapp: { enabled: true, n8nWebhookUrl: 'https://x' },
      }),
    ).toBe(true);
    expect(
      isWhatsAppIntegrationActive({
        whatsapp: { enabled: false },
      }),
    ).toBe(false);
  });

  it('mapIntegrationsToDB grava snake_case', () => {
    expect(
      mapIntegrationsToDB({
        whatsapp: { enabled: true, n8nWebhookUrl: 'https://n8n.test' },
      }),
    ).toEqual({
      whatsapp: { enabled: true, n8n_webhook_url: 'https://n8n.test' },
    });
  });
});
