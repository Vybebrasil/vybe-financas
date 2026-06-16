import { AppTab } from '../context/AppDataContext';

export const TAB_TO_PATH: Record<AppTab, string> = {
  dashboard: '/',
  finance: '/financeiro',
  clients: '/clientes',
  contracts: '/contratos',
  expenses: '/despesas',
  reports: '/relatorios',
  settings: '/configuracoes',
};

const PATH_TO_TAB: Record<string, AppTab> = Object.fromEntries(
  Object.entries(TAB_TO_PATH).map(([tab, path]) => [path, tab as AppTab]),
);

export function tabToPath(tab: AppTab): string {
  return TAB_TO_PATH[tab] ?? '/';
}

export function pathToTab(pathname: string): AppTab {
  const normalized = pathname.replace(/\/$/, '') || '/';
  return PATH_TO_TAB[normalized] ?? 'dashboard';
}
