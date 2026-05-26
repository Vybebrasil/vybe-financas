import { describe, expect, it } from 'vitest';
import { normalizeWhatsAppPhone, generateWhatsAppLink } from './messageTemplates';
import type { Client } from './types';

const baseClient: Client = {
  id: '1',
  name: 'Cliente',
  cnpj: '',
  contactPerson: '',
  email: '',
  phone: '(11) 98888-7777',
  activePlan: 'Plano',
  monthlyFee: 100,
  dueDay: 5,
  contractStatus: 'Ativo',
};

describe('normalizeWhatsAppPhone', () => {
  it('adiciona DDI 55 quando ausente', () => {
    expect(normalizeWhatsAppPhone('11988887777')).toBe('5511988887777');
  });

  it('mantém DDI existente', () => {
    expect(normalizeWhatsAppPhone('5511988887777')).toBe('5511988887777');
  });

  it('rejeita número curto', () => {
    expect(normalizeWhatsAppPhone('123')).toBe('');
  });
});

describe('generateWhatsAppLink', () => {
  it('monta wa.me com telefone normalizado', () => {
    const link = generateWhatsAppLink(baseClient, 'Olá');
    expect(link).toContain('wa.me/5511988887777');
    expect(link).toContain('text=Ol%C3%A1');
  });
});
