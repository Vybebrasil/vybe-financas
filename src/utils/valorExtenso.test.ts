import { describe, expect, it } from 'vitest';
import { valorMonetarioExtenso } from './valorExtenso';

describe('valorMonetarioExtenso', () => {
  it('converte 3500 reais', () => {
    expect(valorMonetarioExtenso(3500)).toContain('reais');
    expect(valorMonetarioExtenso(3500)).toMatch(/três mil/);
  });

  it('converte zero', () => {
    expect(valorMonetarioExtenso(0)).toBe('zero real');
  });
});
