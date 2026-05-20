import { describe, it, expect } from 'vitest';
import { formatDate } from './utils';

describe('formatDate', () => {
  it('formata YYYY-MM-DD sem deslocar dia', () => {
    expect(formatDate('2026-05-15')).toBe('15/05/2026');
  });

  it('não adiciona +1 ao dia', () => {
    expect(formatDate('2026-01-01')).toBe('01/01/2026');
  });
});
