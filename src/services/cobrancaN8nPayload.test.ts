import { describe, expect, it } from 'vitest';
import { buildCobrancaN8nPayload, formatValorBr } from './cobrancaN8nPayload';

describe('cobrancaN8nPayload', () => {
  it('formata valor em pt-BR', () => {
    expect(formatValorBr(1499.9)).toBe('1.499,90');
  });

  it('monta payload compatível com webhook cobranca-whatsapp', () => {
    const payload = buildCobrancaN8nPayload({
      phone: '5511988887777',
      contactName: 'Maria',
      monthlyFee: 199.9,
      dueDay: 10,
      message: 'Olá Maria, sua fatura vence hoje.',
      clientId: 'client-uuid',
    });

    expect(payload.telefone).toBe('5511988887777');
    expect(payload.valor).toBe('199,90');
    expect(payload.nome).toBe('Maria');
    expect(payload.vencimento).toBe('Dia 10');
    expect(payload.mensagem).toContain('fatura');
    expect(payload.id_fatura).toBe('client-uuid');
  });
});
