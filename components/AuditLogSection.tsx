import React from 'react';
import { AuditLogEntry } from '../types';
import { formatDate } from '../utils';
import { History } from 'lucide-react';

interface AuditLogSectionProps {
  logs: AuditLogEntry[];
  isLoading?: boolean;
}

const actionLabels: Record<string, string> = {
  'transaction.create': 'Lançamento criado',
  'transaction.update': 'Lançamento editado',
  'transaction.delete': 'Lançamento excluído',
  'transaction.status': 'Status alterado',
  'client.create': 'Cliente criado',
  'client.update': 'Cliente editado',
  'client.delete': 'Cliente excluído',
  'employee.create': 'Colaborador criado',
  'employee.update': 'Colaborador editado',
  'employee.delete': 'Colaborador removido',
  'subscription.create': 'Assinatura criada',
  'subscription.update': 'Assinatura editada',
  'subscription.delete': 'Assinatura removida',
  'bank_account.create': 'Conta bancária criada',
  'bank_account.update': 'Conta bancária editada',
  'bank_account.delete': 'Conta bancária removida',
  'settings.update': 'Configurações salvas',
  'member.invite': 'Usuário convidado',
  'member.remove': 'Usuário removido',
  'member.role': 'Permissão alterada',
};

const AuditLogSection: React.FC<AuditLogSectionProps> = ({ logs, isLoading }) => {
  return (
    <section className="pt-6 border-t border-gray-800">
      <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
        <History size={16} className="text-vybe-accent" />
        Log de ações
      </h4>
      <p className="text-xs text-gray-500 mb-4">
        Histórico das últimas alterações feitas por usuários desta conta.
      </p>

      {isLoading ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-gray-500 italic">
          Nenhuma ação registrada ainda. Execute a migration de workspace no Supabase se o log não
          aparecer após usar o sistema.
        </p>
      ) : (
        <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {logs.map((log) => (
            <li
              key={log.id}
              className="bg-[#121212] border border-gray-800 rounded-lg px-3 py-2 text-xs"
            >
              <div className="flex justify-between gap-2 mb-1">
                <span className="text-vybe-accent font-medium">
                  {actionLabels[log.action] ?? log.action}
                </span>
                <span className="text-gray-500 shrink-0 tabular-nums">
                  {formatDate(log.createdAt.slice(0, 10))}
                </span>
              </div>
              <p className="text-gray-300">{log.summary}</p>
              <p className="text-gray-500 mt-0.5">
                {log.actorEmail ?? 'Sistema'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default AuditLogSection;
