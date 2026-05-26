import React, { useMemo, useState } from 'react';
import { Client, CompanySettings, Contract } from '../types';
import { formatCurrency } from '../utils';
import ContractsBoard from './ContractsBoard';
import ContractEditorModal from './ContractEditorModal';
import { CONTRACT_TEMPLATE_PATH } from '../src/services/contractTemplates';
import { FileSignature, TrendingUp, Info } from 'lucide-react';

interface ContractsViewProps {
  contracts: Contract[];
  clients: Client[];
  companySettings: CompanySettings;
  onAddContract: (contract: Contract) => void;
  onUpdateContract: (contract: Contract) => void;
  onDeleteContract: (id: string) => void;
}

const ContractsView: React.FC<ContractsViewProps> = ({
  contracts,
  clients,
  companySettings,
  onAddContract,
  onUpdateContract,
  onDeleteContract,
}) => {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);

  const stats = useMemo(() => {
    const active = contracts.filter((c) => c.status === 'Ativo');
    const mrr = active.reduce((sum, c) => sum + c.amount, 0);
    return { total: contracts.length, activeCount: active.length, mrr };
  }, [contracts]);

  const openNew = () => {
    setEditingContract(null);
    setEditorOpen(true);
  };

  const openEdit = (contract: Contract) => {
    setEditingContract(contract);
    setEditorOpen(true);
  };

  const handleSave = (contract: Contract) => {
    if (editingContract?.id) {
      onUpdateContract({ ...contract, id: editingContract.id });
    } else {
      onAddContract(contract);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-vybe-card border border-gray-800 rounded-xl p-4 flex gap-3 text-sm text-gray-400">
        <Info className="text-vybe-accent shrink-0" size={20} />
        <p>
          Quadro de gestão de contratos com modelo{' '}
          <strong className="text-white">Vybe OS (Marketing Estratégico)</strong>. Preencha os
          parâmetros, visualize o texto e baixe o{' '}
          <strong className="text-white">DOCX</strong> com os campos substituídos. O arquivo modelo
          fica em <code className="text-xs text-gray-500">{CONTRACT_TEMPLATE_PATH}</code> — para
          personalizar cláusulas, edite o .docx e mantenha os marcadores{' '}
          <code className="text-vybe-accent">{'{cliente_nome}'}</code>,{' '}
          <code className="text-vybe-accent">{'{valor_mensal}'}</code>, etc.
        </p>
      </div>

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

      <ContractsBoard
        contracts={contracts}
        clients={clients}
        onEdit={openEdit}
        onDelete={onDeleteContract}
        onNew={openNew}
      />

      <ContractEditorModal
        isOpen={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setEditingContract(null);
        }}
        contract={editingContract}
        clients={clients}
        companySettings={companySettings}
        onSave={handleSave}
      />
    </div>
  );
};

export default ContractsView;
