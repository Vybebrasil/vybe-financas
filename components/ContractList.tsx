import React, { useMemo, useState } from 'react';
import { Client, Contract, ContractStatus } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { FileSignature, Pencil, Search, Trash2 } from 'lucide-react';

type ContractSortBy = 'dueDay' | 'title' | 'amount' | 'startDate';

interface ContractListProps {
  contracts: Contract[];
  clients: Client[];
  onDeleteContract: (id: string) => void;
  onEditContract: (contract: Contract) => void;
}

const statusClass: Record<ContractStatus, string> = {
  Ativo: 'bg-vybe-green/10 text-vybe-green',
  Pendente: 'bg-amber-500/10 text-amber-400',
  Encerrado: 'bg-gray-500/10 text-gray-400',
  Cancelado: 'bg-red-500/10 text-red-400',
};

const ContractList: React.FC<ContractListProps> = ({
  contracts,
  clients,
  onDeleteContract,
  onEditContract,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ContractStatus>('all');
  const [sortBy, setSortBy] = useState<ContractSortBy>('dueDay');

  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const list = contracts.filter((contract) => {
      if (statusFilter !== 'all' && contract.status !== statusFilter) return false;
      const client = clientById.get(contract.clientId);
      const haystack = [
        contract.title,
        client?.name ?? '',
        client?.cnpj ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return !term || haystack.includes(term);
    });

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title, 'pt-BR');
        case 'amount':
          return a.amount - b.amount;
        case 'startDate':
          return a.startDate.localeCompare(b.startDate);
        case 'dueDay':
        default:
          return a.dueDay - b.dueDay;
      }
    });
  }, [contracts, searchTerm, statusFilter, sortBy, clientById]);

  return (
    <div className="bg-vybe-card rounded-xl border border-gray-800 shadow-lg overflow-hidden">
      <div className="p-6 border-b border-gray-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-1 h-6 bg-vybe-accent rounded-full" />
            Contratos cadastrados
          </h2>
          <span className="bg-[#121212] px-3 py-1 rounded-full text-xs text-gray-400 border border-gray-700">
            {filtered.length}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="bg-[#121212] border border-gray-700 rounded-full py-2 px-4 text-sm text-white focus:outline-none focus:border-vybe-accent cursor-pointer"
            aria-label="Filtrar por status"
          >
            <option value="all">Todos os status</option>
            <option value="Ativo">Ativo</option>
            <option value="Pendente">Pendente</option>
            <option value="Encerrado">Encerrado</option>
            <option value="Cancelado">Cancelado</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as ContractSortBy)}
            className="bg-[#121212] border border-gray-700 rounded-full py-2 px-4 text-sm text-white focus:outline-none focus:border-vybe-accent cursor-pointer"
            aria-label="Ordenar contratos"
          >
            <option value="dueDay">Vencimento</option>
            <option value="title">Título</option>
            <option value="amount">Valor</option>
            <option value="startDate">Data início</option>
          </select>

          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar contrato ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#121212] border border-gray-700 rounded-full py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-vybe-accent placeholder-gray-600"
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          <FileSignature className="mx-auto mb-3 opacity-30" size={40} />
          <p className="text-sm">Nenhum contrato encontrado.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1A1A1A] text-gray-400 uppercase text-xs">
              <tr>
                <th className="p-4 font-semibold">Contrato</th>
                <th className="p-4 font-semibold hidden md:table-cell">Cliente</th>
                <th className="p-4 font-semibold">Valor</th>
                <th className="p-4 font-semibold hidden sm:table-cell">Venc.</th>
                <th className="p-4 font-semibold hidden lg:table-cell">Período</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map((contract) => {
                const client = clientById.get(contract.clientId);
                return (
                  <tr key={contract.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <p className="font-medium text-white">{contract.title}</p>
                      <p className="text-xs text-gray-500 md:hidden">{client?.name ?? '—'}</p>
                    </td>
                    <td className="p-4 text-gray-300 hidden md:table-cell">
                      {client?.name ?? 'Cliente removido'}
                    </td>
                    <td className="p-4 font-bold text-vybe-accent whitespace-nowrap">
                      {formatCurrency(contract.amount)}
                    </td>
                    <td className="p-4 text-gray-300 hidden sm:table-cell">
                      Dia {contract.dueDay}
                    </td>
                    <td className="p-4 text-gray-400 text-xs hidden lg:table-cell whitespace-nowrap">
                      {formatDate(contract.startDate)}
                      {contract.endDate ? ` → ${formatDate(contract.endDate)}` : ' → Indefinido'}
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusClass[contract.status]}`}
                      >
                        {contract.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onEditContract(contract)}
                          title="Editar"
                          className="p-2 bg-gray-800 text-gray-400 rounded hover:bg-gray-700 hover:text-white border border-gray-700 transition-colors"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteContract(contract.id)}
                          title="Excluir"
                          className="p-2 bg-red-900/20 text-red-500 rounded hover:bg-red-900/40 border border-red-900/50 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ContractList;
