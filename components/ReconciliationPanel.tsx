import React, { useMemo, useState } from 'react';
import { Transaction, BankAccount } from '../types';
import { parseBankStatementCsv } from '../src/services/bankStatementParser';
import { suggestReconciliationMatches } from '../src/services/bankReconciliation';
import { api } from '../src/services/api';
import { formatCurrency, formatDate, generateId } from '../utils';
import { useToast } from './ToastProvider';
import { Upload, Link2, Loader2, CheckCircle } from 'lucide-react';

interface ReconciliationPanelProps {
  transactions: Transaction[];
  bankAccounts: BankAccount[];
  onReconciled: () => void;
  onToggleStatus: (id: string, paidDate?: string) => void;
}

const ReconciliationPanel: React.FC<ReconciliationPanelProps> = ({
  transactions,
  bankAccounts,
  onReconciled,
  onToggleStatus,
}) => {
  const toast = useToast();
  const [parsedLines, setParsedLines] = useState<ReturnType<typeof parseBankStatementCsv>>([]);
  const [bankAccountId, setBankAccountId] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const suggestions = useMemo(
    () => suggestReconciliationMatches(parsedLines, transactions),
    [parsedLines, transactions],
  );

  const handleFile = async (file: File) => {
    const text = await file.text();
    const lines = parseBankStatementCsv(text);
    if (lines.length === 0) {
      toast.error('Nenhuma linha válida no arquivo.');
      return;
    }
    setParsedLines(lines);
    toast.success(`${lines.length} movimentações importadas.`);
  };

  const handleImport = async () => {
    if (parsedLines.length === 0) return;
    setBusy('import');
    try {
      const batchId = generateId();
      await api.reconciliation.importLines(
        parsedLines.map((l) => ({
          lineDate: l.lineDate,
          description: l.description,
          amount: l.amount,
          bankAccountId: bankAccountId || undefined,
        })),
        batchId,
      );
      toast.success('Extrato salvo para conciliação.');
    } catch (e) {
      toast.error('Erro ao importar extrato.');
    } finally {
      setBusy(null);
    }
  };

  const handleReconcile = async (lineId: string, txId: string, paidDate: string) => {
    setBusy(lineId);
    try {
      await api.reconciliation.reconcile(lineId, txId, paidDate);
      onToggleStatus(txId, paidDate);
      onReconciled();
      setParsedLines((prev) => prev.filter((_, i) => i !== 0));
      toast.success('Conciliação concluída.');
    } catch {
      try {
        await onToggleStatus(txId, paidDate);
        toast.success('Baixa registrada.');
      } catch {
        toast.error('Erro na conciliação.');
      }
    } finally {
      setBusy(null);
    }
  };

  const quickReconcile = async (txId: string, paidDate: string) => {
    setBusy(txId);
    try {
      await onToggleStatus(txId, paidDate);
      toast.success('Baixa com data do extrato.');
    } catch {
      toast.error('Erro ao dar baixa.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="bg-vybe-card border border-gray-800 rounded-xl p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Link2 size={16} className="text-vybe-accent" />
            Conciliação bancária
          </h3>
          <p className="text-xs text-gray-500 mt-1">Importe CSV do banco e concilie com lançamentos pendentes.</p>
        </div>
        <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#121212] border border-gray-700 rounded-lg text-xs font-medium text-white cursor-pointer hover:border-vybe-accent transition-colors">
          <Upload size={14} />
          Importar CSV
          <input
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = '';
            }}
          />
        </label>
      </div>

      {bankAccounts.length > 0 && (
        <select
          value={bankAccountId}
          onChange={(e) => setBankAccountId(e.target.value)}
          className="bg-[#121212] border border-gray-700 rounded-lg p-2 text-xs text-white"
        >
          <option value="">Conta (opcional)</option>
          {bankAccounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      )}

      {parsedLines.length > 0 && (
        <button
          type="button"
          onClick={() => void handleImport()}
          disabled={busy === 'import'}
          className="text-xs text-vybe-accent hover:underline disabled:opacity-50"
        >
          {busy === 'import' ? 'Salvando...' : 'Salvar extrato no servidor'}
        </button>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 font-medium">Sugestões de match</p>
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {suggestions.slice(0, 15).map(({ line, transaction, score }) => (
              <li
                key={`${line.lineDate}-${transaction.id}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-[#121212] border border-gray-800 rounded-lg text-xs"
              >
                <div className="min-w-0">
                  <p className="text-gray-300 truncate">{line.description}</p>
                  <p className="text-gray-500">
                    {formatDate(line.lineDate)} · {formatCurrency(line.amount)}
                  </p>
                  <p className="text-vybe-accent truncate">→ {transaction.description}</p>
                </div>
                <button
                  type="button"
                  disabled={busy === transaction.id}
                  onClick={() => void quickReconcile(transaction.id, line.lineDate)}
                  className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-vybe-green/20 text-vybe-green border border-vybe-green/30 rounded-md font-bold hover:bg-vybe-green hover:text-white transition-colors disabled:opacity-50"
                >
                  {busy === transaction.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <CheckCircle size={12} />
                  )}
                  Dar baixa ({score}%)
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {parsedLines.length > 0 && suggestions.length === 0 && (
        <p className="text-xs text-gray-500">Nenhum match automático — verifique lançamentos pendentes no extrato.</p>
      )}
    </section>
  );
};

export default ReconciliationPanel;
