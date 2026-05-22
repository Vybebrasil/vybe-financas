import { describe, expect, it } from 'vitest';
import { getErrorMessage, isMissingTableError } from './errorMessage';

describe('getErrorMessage', () => {
  it('lê message de objeto estilo PostgREST', () => {
    expect(getErrorMessage({ message: 'relation does not exist', code: '42P01' })).toBe(
      'relation does not exist',
    );
  });

  it('usa Error quando disponível', () => {
    expect(getErrorMessage(new Error('falha auth'))).toBe('falha auth');
  });
});

describe('isMissingTableError', () => {
  it('detecta PGRST205', () => {
    expect(isMissingTableError({ code: 'PGRST205', message: 'x' })).toBe(true);
  });
});
