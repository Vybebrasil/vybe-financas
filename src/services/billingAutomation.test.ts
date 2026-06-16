import { describe, it, expect } from 'vitest';
import { resolveBillingStage, daysBetween } from './billingAutomation';
import { ClientBillingSnapshot } from './delinquency';
import { Client } from '../../types';

const client = { id: '1', name: 'Acme' } as Client;

function snap(
  status: ClientBillingSnapshot['status'],
  dueDate: string,
): ClientBillingSnapshot {
  return {
    client,
    status,
    monthKey: dueDate.slice(0, 7),
    dueDate,
    amount: 1000,
    daysOverdue: 0,
  };
}

describe('billingAutomation', () => {
  it('daysBetween calcula diferença em dias', () => {
    expect(daysBetween('2026-05-01', '2026-05-04')).toBe(3);
  });

  it('resolve overdue', () => {
    expect(resolveBillingStage(snap('overdue', '2026-05-01'), '2026-05-10', 3)).toBe('overdue');
  });

  it('resolve on_due no dia do vencimento', () => {
    expect(resolveBillingStage(snap('pending', '2026-05-10'), '2026-05-10', 3)).toBe('on_due');
  });

  it('resolve pre_due dentro da janela', () => {
    expect(resolveBillingStage(snap('upcoming', '2026-05-10'), '2026-05-08', 3)).toBe('pre_due');
  });

  it('retorna null para pago', () => {
    expect(resolveBillingStage(snap('paid', '2026-05-10'), '2026-05-10', 3)).toBeNull();
  });
});
