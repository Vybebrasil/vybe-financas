import React, { useMemo } from 'react';
import { Client, Contract } from '../types';
import { formatCurrency } from '../utils';
import ContractForm from './ContractForm';
import ContractList from './ContractList';
import { FileSignature, TrendingUp } from 'lucide-react';

interface ContractsViewProps {
  contracts: Contract[];
  clients: Client[];
  onAddContract: (contract: Contract) => void;
  onUpdateContract: (contract: Contract) => void;
  onDeleteContract: (id: string) => void;
  editingContract: Contract | null;
  onCancelEdit: () => void;
  onEditContract: (contract: Contract) => void;
}

const ContractsView: React.FC<ContractsViewProps> = ({
  contracts,
  clients,
  onAddContract,
  onUpdateContract,
  onDeleteContract,
  editingContract,
  onCancelEdit,
  onEditContract,
}) => {
  const stats = useMemo(() => {
    const active = contracts.filter((c) => c.status === 'Ativo');
    const mrr = active.reduce((sum, c) => sum + c.amount, 0);
    return { total: contracts.length, activeCount: active.length, mrr };
  }, [contracts]);

  return (
    <div className="space-y-8 animate-bar-grow origin-top">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-vybe-card border border-gray-800 rounded-xl p-4">
          <span className="text-xs text-gray-500 block mb-1">Total de contratos</span>
          <span className="text-2xl font-bold text-white flex items-center gap-2">
            <FileSignature size={20} className="text-vybe-accent" />
            {stats.total}
          </span>
        </div>
        <div className="bg-vybe-card border border-gray-800 rounded-xl p-4">
          <span className="text-xs text-gray-500 block mb-1">Contratos ativos</span>
          <span className="text-2xl font-bold text-vybe-green">{stats.activeCount}</span>
        </div>
        <div className="bg-vybe-card border border-indigo-900/40 rounded-xl p-4">
          <span className="text-xs text-gray-500 block mb-1">Receita recorrente (ativos)</span>
          <span className="text-2xl font-bold text-indigo-400 flex items-center gap-2">
            <TrendingUp size={20} />
            {formatCurrency(stats.mrr)}
          </span>
        </div>
      </div>

      <ContractForm
        clients={clients}
        onAddContract={onAddContract}
        onUpdateContract={onUpdateContract}
        editingContract={editingContract}
        onCancelEdit={onCancelEdit}
      />

      <ContractList
        contracts={contracts}
        clients={clients}
        onDeleteContract={onDeleteContract}
        onEditContract={onEditContract}
      />
    </div>
  );
};

export default ContractsView;
