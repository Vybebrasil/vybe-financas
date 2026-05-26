import React, { useMemo } from 'react';
import { Client, Contract, ContractStatus } from '../types';
import { formatCurrency } from '../utils';
import {
  formatDateBr,
  getContractExpiryLevel,
} from '../src/services/contractValidity';
import { AlertTriangle, FileText, Pencil, Plus, Trash2, FileType } from 'lucide-react';

const COLUMNS: { status: ContractStatus; label: string; accent: string }[] = [
  { status: 'Pendente', label: 'Rascunho / Pendente', accent: 'border-amber-900/50' },
  { status: 'Ativo', label: 'Ativos', accent: 'border-vybe-green/40' },
  { status: 'Encerrado', label: 'Encerrados', accent: 'border-gray-600' },
  { status: 'Cancelado', label: 'Cancelados', accent: 'border-red-900/40' },
];

interface ContractsBoardProps {
  contracts: Contract[];
  clients: Client[];
  onEdit: (contract: Contract) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

const ContractsBoard: React.FC<ContractsBoardProps> = ({
  contracts,
  clients,
  onEdit,
  onDelete,
  onNew,
}) => {
  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  const byStatus = useMemo(() => {
    const map: Record<ContractStatus, Contract[]> = {
      Pendente: [],
      Ativo: [],
      Encerrado: [],
      Cancelado: [],
    };
    for (const c of contracts) {
      map[c.status]?.push(c);
    }
    return map;
  }, [contracts]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onNew}
          className="flex items-center gap-2 px-4 py-2 bg-vybe-accent hover:bg-[#E65C00] text-white text-sm font-bold rounded-lg transition-colors"
        >
          <Plus size={18} /> Novo contrato
        </button>
      </div>

      <div className="overflow-x-auto pb-2 -mx-1 px-1 overscroll-x-contain">
        <div className="grid grid-flow-col auto-cols-[minmax(260px,1fr)] md:grid-flow-row md:grid-cols-2 xl:grid-cols-4 gap-4 items-start min-w-0 md:min-w-0 w-max md:w-full max-w-full">
        {COLUMNS.map((col) => (
          <div
            key={col.status}
            className={`bg-[#121212] rounded-xl border ${col.accent} min-h-[200px] flex flex-col w-[260px] md:w-auto shrink-0 md:shrink`}
          >
            <div className="p-3 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white">{col.label}</h3>
              <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                {byStatus[col.status].length}
              </span>
            </div>
            <div className="p-2 space-y-2 flex-1">
              {byStatus[col.status].length === 0 && (
                <p className="text-xs text-gray-600 text-center py-6 italic">Vazio</p>
              )}
              {byStatus[col.status].map((contract) => {
                const client = clientMap.get(contract.clientId);
                const expiry = getContractExpiryLevel(contract);
                return (
                  <div
                    key={contract.id}
                    className={`bg-vybe-card border rounded-lg p-3 hover:border-gray-600 transition-colors group ${
                      expiry === 'expiring_soon'
                        ? 'border-amber-700/60'
                        : expiry === 'expired'
                          ? 'border-red-900/50'
                          : 'border-gray-800'
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <FileText size={16} className="text-vybe-accent shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white truncate">{contract.title}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {client?.name ?? 'Cliente removido'}
                        </p>
                      </div>
                    </div>
                    {contract.endDate && (
                      <p className="text-[11px] text-gray-500 mb-1">
                        Vigência até {formatDateBr(contract.endDate)}
                        {contract.signedDate && (
                          <span className="text-gray-600">
                            {' '}
                            · assin. {formatDateBr(contract.signedDate)}
                          </span>
                        )}
                      </p>
                    )}
                    {expiry === 'expiring_soon' && (
                      <p className="text-[11px] text-amber-400 flex items-center gap-1 mb-2 font-medium">
                        <AlertTriangle size={12} /> Encerra em até 30 dias
                      </p>
                    )}
                    {expiry === 'expired' && (
                      <p className="text-[11px] text-red-400 flex items-center gap-1 mb-2 font-medium">
                        <AlertTriangle size={12} /> Vigência encerrada
                      </p>
                    )}
                    <p className="text-sm font-bold text-vybe-accent mb-2">
                      {formatCurrency(contract.amount)}
                      <span className="text-gray-500 font-normal text-xs ml-1">
                        · dia {contract.dueDay}
                      </span>
                    </p>
                    <div className="flex gap-1 opacity-80 group-hover:opacity-100">
                      {contract.pdfUrl && (
                        <a
                          href={contract.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={contract.pdfFileName ?? 'Abrir PDF'}
                          className="p-1.5 rounded bg-indigo-900/30 text-indigo-300 hover:bg-indigo-900/50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FileType size={12} />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => onEdit(contract)}
                        title="Abrir editor e DOCX"
                        className="flex-1 py-1.5 text-xs rounded bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 flex items-center justify-center gap-1"
                      >
                        <Pencil size={12} /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(contract.id)}
                        title="Excluir"
                        className="p-1.5 rounded bg-red-900/20 text-red-400 hover:bg-red-900/40"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
};

export default ContractsBoard;
