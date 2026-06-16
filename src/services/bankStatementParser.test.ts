import { describe, it, expect } from 'vitest';
import { parseBankStatementCsv } from './bankStatementParser';

describe('bankStatementParser', () => {
  it('parseia CSV com cabeçalho em português', () => {
    const csv = `Data;Descrição;Valor
01/05/2026;PIX Cliente A;1500,00
02/05/2026;TED Fornecedor;-200,50`;

    const lines = parseBankStatementCsv(csv);
    expect(lines).toHaveLength(2);
    expect(lines[0].lineDate).toBe('2026-05-01');
    expect(lines[0].amount).toBe(1500);
    expect(lines[0].type).toBe('credit');
    expect(lines[1].type).toBe('debit');
  });
});
