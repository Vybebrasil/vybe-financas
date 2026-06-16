export interface ParsedStatementLine {
  lineDate: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
}

function parseBrazilianAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^\d,.-]/g, '').trim();
  if (!cleaned) return null;
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function parseDateCell(raw: string): string | null {
  const t = raw.trim();
  const br = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (br) {
    const y = br[3].length === 2 ? `20${br[3]}` : br[3];
    return `${y}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
  }
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  return null;
}

/** Parser CSV genérico (;, ou ,) — colunas data, descrição, valor. */
export function parseBankStatementCsv(text: string): ParsedStatementLine[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const rows = lines.map((line) => line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, '')));

  const header = rows[0].map((h) => h.toLowerCase());
  const dateIdx = header.findIndex((h) => /data|date/.test(h));
  const descIdx = header.findIndex((h) => /descr|hist|lanç|lanc|memo|nome/.test(h));
  const amountIdx = header.findIndex((h) => /valor|amount|quantia|saldo/.test(h));

  const dataRows = dateIdx >= 0 ? rows.slice(1) : rows;

  const result: ParsedStatementLine[] = [];
  for (const row of dataRows) {
    const dateRaw = dateIdx >= 0 ? row[dateIdx] : row[0];
    const descRaw = descIdx >= 0 ? row[descIdx] : row[1] ?? '';
    const amountRaw = amountIdx >= 0 ? row[amountIdx] : row[row.length - 1];

    const lineDate = parseDateCell(dateRaw ?? '');
    const amount = parseBrazilianAmount(amountRaw ?? '');
    if (!lineDate || amount === null || amount === 0) continue;

    const type: 'credit' | 'debit' = amount >= 0 ? 'credit' : 'debit';
    result.push({
      lineDate,
      description: descRaw || 'Movimentação',
      amount: Math.abs(amount),
      type,
    });
  }

  return result;
}
