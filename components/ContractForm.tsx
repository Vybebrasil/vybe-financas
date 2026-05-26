import React, { useEffect, useMemo, useState } from 'react';
import { Client, Contract, ContractStatus } from '../types';
import { generateId } from '../utils';
import { FileSignature, Save, X } from 'lucide-react';

interface ContractFormProps {
  clients: Client[];
  onAddContract: (contract: Contract) => void;
  onUpdateContract: (contract: Contract) => void;
  editingContract: Contract | null;
  onCancelEdit: () => void;
}

const STATUS_OPTIONS: ContractStatus[] = ['Ativo', 'Pendente', 'Encerrado', 'Cancelado'];

const ContractForm: React.FC<ContractFormProps> = ({
  clients,
  onAddContract,
  onUpdateContract,
  editingContract,
  onCancelEdit,
}) => {
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<ContractStatus>('Ativo');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [dueDay, setDueDay] = useState('5');
  const [notes, setNotes] = useState('');

  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [clients],
  );

  const resetForm = () => {
    setClientId('');
    setTitle('');
    setAmount('');
    setStatus('Ativo');
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate('');
    setDueDay('5');
    setNotes('');
  };

  useEffect(() => {
    if (editingContract) {
      setClientId(editingContract.clientId);
      setTitle(editingContract.title);
      setAmount(String(editingContract.amount));
      setStatus(editingContract.status);
      setStartDate(editingContract.startDate);
      setEndDate(editingContract.endDate ?? '');
      setDueDay(String(editingContract.dueDay));
      setNotes(editingContract.notes ?? '');
    } else {
      resetForm();
    }
  }, [editingContract]);

  const handleClientChange = (id: string) => {
    setClientId(id);
    const client = clients.find((c) => c.id === id);
    if (!client || editingContract) return;
    if (!amount && client.monthlyFee > 0) setAmount(String(client.monthlyFee));
    if (client.dueDay) setDueDay(String(client.dueDay));
    if (!title.trim() && client.activePlan) setTitle(client.activePlan);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !title || !amount || !startDate || !dueDay) return;

    const payload: Contract = {
      id: editingContract?.id ?? generateId(),
      clientId,
      title: title.trim(),
      amount: parseFloat(amount),
      status,
      startDate,
      endDate: endDate || undefined,
      dueDay: parseInt(dueDay, 10),
      notes: notes.trim() || undefined,
      createdAt: editingContract?.createdAt,
    };

    if (editingContract) {
      onUpdateContract(payload);
    } else {
      onAddContract(payload);
      resetForm();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`bg-vybe-card p-6 rounded-xl border shadow-lg transition-colors ${
        editingContract ? 'border-vybe-accent/50' : 'border-gray-800'
      }`}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span
            className={`w-1 h-6 rounded-full ${
              editingContract ? 'bg-vybe-green' : 'bg-vybe-accent'
            }`}
          />
          <FileSignature className="text-vybe-accent" size={22} />
          {editingContract ? 'Editar Contrato' : 'Novo Contrato'}
        </h2>
        {editingContract && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-gray-400 hover:text-white flex items-center gap-1 text-sm"
          >
            <X size={16} /> Cancelar
          </button>
        )}
      </div>

      {clients.length === 0 ? (
        <p className="text-sm text-amber-400/90 bg-amber-900/10 border border-amber-900/30 rounded-lg p-3">
          Cadastre um cliente na aba Clientes antes de criar contratos.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Cliente</label>
            <select
              value={clientId}
              onChange={(e) => handleClientChange(e.target.value)}
              className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-vybe-accent outline-none cursor-pointer"
              required
              disabled={!!editingContract}
            >
              <option value="">Selecione o cliente</option>
              {sortedClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Título do contrato</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Gestão de tráfego mensal"
              className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-vybe-accent outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Valor mensal (R$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-vybe-accent outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Dia de vencimento</label>
            <input
              type="number"
              min="1"
              max="31"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-vybe-accent outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Início</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-vybe-accent outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Término (opcional)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-vybe-accent outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ContractStatus)}
              className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-vybe-accent outline-none cursor-pointer"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Observações</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Detalhes, escopo, condições..."
              className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-vybe-accent outline-none resize-none"
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={clients.length === 0}
        className="mt-6 w-full md:w-auto px-8 py-3 bg-vybe-accent hover:bg-[#E65C00] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <Save size={18} />
        {editingContract ? 'Salvar alterações' : 'Cadastrar contrato'}
      </button>
    </form>
  );
};

export default ContractForm;
