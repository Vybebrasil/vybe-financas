/** Extrai mensagem legível de Error, PostgrestError ou objetos do Supabase. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error !== null) {
    const e = error as Record<string, unknown>;
    if (typeof e.message === 'string' && e.message) return e.message;
    if (typeof e.error_description === 'string') return e.error_description;
    if (typeof e.details === 'string' && e.details) return e.details;
  }
  if (typeof error === 'string' && error) return error;
  return 'Erro desconhecido';
}

export function isMissingTableError(error: unknown): boolean {
  const msg = getErrorMessage(error).toLowerCase();
  const code =
    typeof error === 'object' && error !== null
      ? String((error as Record<string, unknown>).code ?? '')
      : '';
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes('does not exist') ||
    msg.includes('could not find the table') ||
    msg.includes('schema cache')
  );
}

export function isRlsOrPolicyError(error: unknown): boolean {
  const msg = getErrorMessage(error).toLowerCase();
  const code =
    typeof error === 'object' && error !== null
      ? String((error as Record<string, unknown>).code ?? '')
      : '';
  return (
    code === '42501' ||
    msg.includes('row-level security') ||
    msg.includes('permission denied') ||
    msg.includes('violates row-level') ||
    msg.includes('is ambiguous')
  );
}
