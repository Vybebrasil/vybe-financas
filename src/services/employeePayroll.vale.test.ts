import { describe, expect, it } from 'vitest';
import { buildValeDescription } from './employeePayroll';

describe('buildValeDescription', () => {
  it('formata preset padrão com nome do colaborador', () => {
    expect(buildValeDescription('Vale transporte', 'Ana Silva')).toBe(
      'Vale transporte - Ana Silva',
    );
  });

  it('formata descrição customizada', () => {
    expect(buildValeDescription('Outro', 'João', 'Uniforme')).toBe(
      'Vale - Uniforme - João',
    );
  });
});
