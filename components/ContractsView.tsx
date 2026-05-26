import React, { useMemo, useState } from 'react';
import { Client, CompanySettings, Contract } from '../types';
import { formatCurrency } from '../utils';
import ContractsBoard from './ContractsBoard';
import ContractEditorModal from './ContractEditorModal';
import { CONTRACT_TEMPLATE_PATH } from '../src/services/contractTemplates';
import { getContractExpiryAlerts, formatDateBr } from '../src/services/contractValidity';
import { AlertTriangle, FileSignature, TrendingUp, Info } from 'lucide-react';

interface ContractsViewProps {
  contracts: Contract[];
  clients: Client[];
  companySettings: CompanySettings;
  onAddContract: (contract: Contract, pdfFile?: File | null) => Promise<void>;
  onUpdateContract: (contract: Contract) => Promise<void>;
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

  const expiryAlerts = useMemo(
    () => getContractExpiryAlerts(contracts, clients),
    [contracts, clients],
  );

  const expiringSoon = useMemo(
    () => expiryAlerts.filter((a) => a.level === 'expiring_soon'),
    [expiryAlerts],
  );

  const expired = useMemo(
    () => expiryAlerts.filter((a) => a.level === 'expired'),
    [expiryAlerts],
  );

  const openNew = () => {
    setEditingContract(null);
    setEditorOpen(true);
  };

  const openEdit = (contract: Contract) => {
    setEditingContract(contract);
    setEditorOpen(true);
  };

  const handleSave = async (contract: Contract, pdfFile?: File | null) => {
    if (editingContract?.id) {
      await onUpdateContract({ ...contract, id: editingContract.id });
    } else {
      await onAddContract(contract, pdfFile ?? null);
    }
  };

  return (
    <div className="space-y-8">
      {(expiringSoon.length > 0 || expired.length > 0) && (
        <div className="space-y-3">
          {expiringSoon.length > 0 && (
            <div
              className="bg-amber-950/30 border border-amber-700/50 rounded-xl p-4 flex gap-3"
              role="alert"
            >
              <AlertTriangle className="text-amber-400 shrink-0" size={22} />
              <div className="text-sm min-w-0">
                <p className="font-bold text-amber-200 mb-2">
                  {expiringSoon.length === 1
                    ? '1 contrato encerra em até 30 dias'
                    : `${expiringSoon.length} contratos encerram em até 30 dias`}
                </p>
                <ul className="space-y-1 text-amber-100/90">
                  {expiringSoon.map(({ contract, clientName, daysLeft }) => (
                    <li key={contract.id} className="flex flex-wrap gap-x-2 gap-y-0.5">
                      <button
                        type="button"
                        onClick={() => openEdit(contract)}
                        className="font-medium text-left hover:text-white underline-offset-2 hover:underline"
                      >
                        {clientName}
                      </button>
                      <span className="text-amber-200/70">—</span>
                      <span>
                        vigência até{' '}
                        {contract.endDate ? formatDateBr(contract.endDate) : '—'}
                        {daysLeft === 0
                          ? ' (vence hoje)'
                          : daysLeft === 1
                            ? ' (falta 1 dia)'
                            : ` (faltam ${daysLeft} dias)`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {expired.length > 0 && (
            <div
              className="bg-red-950/25 border border-red-900/50 rounded-xl p-4 flex gap-3"
              role="alert"
            >
              <AlertTriangle className="text-red-400 shrink-0" size={22} />
              <div className="text-sm min-w-0">
                <p className="font-bold text-red-200 mb-2">
                  {expired.length === 1
                    ? '1 contrato com vigência encerrada'
                    : `${expired.length} contratos com vigência encerrada`}
                </p>
                <ul className="space-y-1 text-red-100/80">
                  {expired.slice(0, 5).map(({ contract, clientName }) => (
                    <li key={contract.id}>
                      <button
                        type="button"
                        onClick={() => openEdit(contract)}
                        className="hover:text-white underline-offset-2 hover:underline"
                      >
                        {clientName}
                      </button>
                      {contract.endDate && (
                        <span className="text-red-200/60">
                          {' '}
                          — encerrou em {formatDateBr(contract.endDate)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-vybe-card border border-gray-800 rounded-xl p-4 flex gap-3 text-sm text-gray-400">
        <Info className="text-vybe-accent shrink-0" size={20} />
        <p>
          Quadro de gestão de contratos com modelo{' '}
          <strong className="text-white">Vybe OS (Marketing Estratégico)</strong>. Informe a{' '}
          <strong className="text-white">data de assinatura</strong> e o{' '}
          <strong className="text-white">prazo de validade</strong>; o sistema calcula o fim da
          vigência e alerta quando faltar 1 mês para encerrar. Baixe o{' '}
          <strong className="text-white">DOCX</strong> ou envie o{' '}
          <strong className="text-white">PDF</strong> assinado. Modelo em{' '}
          <code className="text-xs text-gray-500">{CONTRACT_TEMPLATE_PATH}</code>.
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
