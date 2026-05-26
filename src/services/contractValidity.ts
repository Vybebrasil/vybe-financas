import type { Client, Contract } from '../../types';
import { mergeContractParameters } from './contractTemplates';

/** Soma meses a uma data ISO (YYYY-MM-DD), preservando o dia quando possível. */
export function addMonthsToDate(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1 + months, d);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function getValidityMonths(contract: Pick<Contract, 'parameters'>): number {
  const months = mergeContractParameters(contract.parameters).prazoMeses ?? 6;
  return Math.min(120, Math.max(1, Number(months) || 6));
}

/** Fim da vigência: data de assinatura (ou início) + prazo em meses. */
export function computeContractEndDate(contract: {
  signedDate?: string;
  startDate: string;
  parameters?: Contract['parameters'];
}): string | undefined {
  const base = contract.signedDate?.trim() || contract.startDate?.trim();
  if (!base) return undefined;
  const months = getValidityMonths(contract);
  return addMonthsToDate(base, months);
}

export type ContractExpiryLevel = 'expired' | 'expiring_soon';

const MS_PER_DAY = 86_400_000;

export function daysUntilContractEnd(
  endDate: string,
  today = new Date(),
): number {
  const endMs = new Date(`${endDate}T12:00:00`).getTime();
  const todayIso = today.toISOString().slice(0, 10);
  const todayMs = new Date(`${todayIso}T12:00:00`).getTime();
  return Math.ceil((endMs - todayMs) / MS_PER_DAY);
}

/** Alerta quando faltam até 30 dias para o fim da vigência (contratos Ativo/Pendente). */
export function getContractExpiryLevel(
  contract: Contract,
  options?: { today?: Date; alertDaysBefore?: number },
): ContractExpiryLevel | null {
  const { today = new Date(), alertDaysBefore = 30 } = options ?? {};
  if (contract.status !== 'Ativo' && contract.status !== 'Pendente') return null;
  const end = contract.endDate;
  if (!end) return null;

  const daysLeft = daysUntilContractEnd(end, today);
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= alertDaysBefore) return 'expiring_soon';
  return null;
}

export interface ContractExpiryAlertItem {
  contract: Contract;
  clientName: string;
  daysLeft: number;
  level: ContractExpiryLevel;
}

export function getContractExpiryAlerts(
  contracts: Contract[],
  clients: Client[],
  options?: { today?: Date; alertDaysBefore?: number },
): ContractExpiryAlertItem[] {
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));
  const items: ContractExpiryAlertItem[] = [];

  for (const contract of contracts) {
    const level = getContractExpiryLevel(contract, options);
    if (!level || !contract.endDate) continue;
    items.push({
      contract,
      clientName: clientMap.get(contract.clientId) ?? 'Cliente',
      daysLeft: daysUntilContractEnd(contract.endDate, options?.today),
      level,
    });
  }

  return items.sort((a, b) => a.daysLeft - b.daysLeft);
}

export function formatDateBr(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

type ContractDateFields = Pick<
  Contract,
  'signedDate' | 'startDate' | 'parameters' | 'endDate'
>;

/** Preenche endDate a partir de assinatura + prazo quando ausente. */
export function withComputedContractDates<T extends ContractDateFields>(contract: T): T {
  const endDate = contract.endDate || computeContractEndDate(contract);
  return endDate === contract.endDate ? contract : { ...contract, endDate };
}
