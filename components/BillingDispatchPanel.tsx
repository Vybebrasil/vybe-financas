import React, { useEffect, useState } from 'react';
import { Client } from '../types';
import { api } from '../src/services/api';
import { BillingDispatchLogEntry } from '../src/services/billingAutomation';
import { BILLING_STAGE_LABELS } from '../messageTemplates';
import { MessageCircle, Mail, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { formatDate } from '../utils';

interface BillingDispatchPanelProps {
  clients: Client[];
}

const BillingDispatchPanel: React.FC<BillingDispatchPanelProps> = ({ clients }) => {
  const [logs, setLogs] = useState<BillingDispatchLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    api.billing
      .listDispatchLogs(today)
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  const sent = logs.filter((l) => l.status === 'sent').length;
  const failed = logs.filter((l) => l.status === 'failed').length;

  if (loading) {
    return (
      <section className="bg-vybe-card border border-gray-800 rounded-xl p-4 flex justify-center">
        <Loader2 className="animate-spin text-vybe-accent" size={20} />
      </section>
    );
  }

  if (logs.length === 0) return null;

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? 'Cliente';

  return (
    <section className="bg-vybe-card border border-gray-800 rounded-xl p-4">
      <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
        <MessageCircle size={16} className="text-vybe-accent" />
        Cobranças automáticas hoje
      </h3>
      <div className="flex gap-4 text-xs mb-3">
        <span className="text-vybe-green flex items-center gap-1">
          <CheckCircle size={12} /> {sent} enviadas
        </span>
        {failed > 0 && (
          <span className="text-red-400 flex items-center gap-1">
            <XCircle size={12} /> {failed} falhas
          </span>
        )}
      </div>
      <ul className="space-y-1.5 max-h-40 overflow-y-auto">
        {logs.slice(0, 8).map((log) => (
          <li key={log.id} className="flex justify-between items-center text-[11px] gap-2">
            <span className="text-gray-300 truncate">{clientName(log.clientId)}</span>
            <span className="shrink-0 flex items-center gap-1 text-gray-500">
              {log.channel === 'email' ? <Mail size={10} /> : <MessageCircle size={10} />}
              {BILLING_STAGE_LABELS[log.stage as keyof typeof BILLING_STAGE_LABELS] ?? log.stage}
              <span className={log.status === 'sent' ? 'text-vybe-green' : 'text-red-400'}>
                {log.status === 'sent' ? 'ok' : 'erro'}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-gray-600 mt-2">{formatDate(new Date().toISOString())}</p>
    </section>
  );
};

export default BillingDispatchPanel;
