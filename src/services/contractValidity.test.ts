import { describe, expect, it } from 'vitest';
import {
  addMonthsToDate,
  computeContractEndDate,
  getContractExpiryLevel,
  getContractExpiryAlerts,
} from './contractValidity';
import type { Contract } from '../../types';

const base: Contract = {
  id: '1',
  clientId: 'c1',
  title: 'Teste',
  amount: 1000,
  status: 'Ativo',
  startDate: '2026-01-15',
  signedDate: '2026-01-10',
  dueDay: 10,
  parameters: { prazoMeses: 6 },
};

describe('contractValidity', () => {
  it('addMonthsToDate soma meses corretamente', () => {
    expect(addMonthsToDate('2026-01-10', 6)).toBe('2026-07-10');
  });

  it('computeContractEndDate usa assinatura antes do início', () => {
    expect(computeContractEndDate(base)).toBe('2026-07-10');
  });

  it('alerta expiring_soon com 30 dias ou menos', () => {
    const today = new Date('2026-06-15T12:00:00');
    const c: Contract = {
      ...base,
      endDate: '2026-07-10',
    };
    expect(getContractExpiryLevel(c, { today })).toBe('expiring_soon');
  });

  it('sem alerta quando vigência longe', () => {
    const today = new Date('2026-01-15T12:00:00');
    const c: Contract = { ...base, endDate: '2026-07-10' };
    expect(getContractExpiryLevel(c, { today })).toBeNull();
  });

  it('lista alertas ordenados por dias restantes', () => {
    const today = new Date('2026-06-20T12:00:00');
    const alerts = getContractExpiryAlerts(
      [
        { ...base, id: 'a', endDate: '2026-07-05' },
        { ...base, id: 'b', endDate: '2026-06-25', status: 'Encerrado' },
      ],
      [{ id: 'c1', name: 'Empresa X' } as never],
      { today },
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0].clientName).toBe('Empresa X');
  });
});
