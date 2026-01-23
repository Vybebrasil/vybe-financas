import React, { useState, useEffect } from 'react';
import { Client } from '../types';
import { generateId } from '../utils';
import { UserPlus, Briefcase, CalendarClock, DollarSign, Save, X } from 'lucide-react';

interface ClientFormProps {
  onAddClient: (client: Client) => void;
  onUpdateClient: (client: Client) => void;
  editingClient: Client | null;
  onCancelEdit: () => void;
}

const ClientForm: React.FC<ClientFormProps> = ({ onAddClient, onUpdateClient, editingClient, onCancelEdit }) => {
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [activePlan, setActivePlan] = useState('');
  const [monthlyFee, setMonthlyFee] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [contractStatus, setContractStatus] = useState<'Ativo' | 'Pendente' | 'Cancelado'>('Ativo');

  // Populate form when editingClient changes
  useEffect(() => {
    if (editingClient) {
      setName(editingClient.name);
      setCnpj(editingClient.cnpj);
      setContactPerson(editingClient.contactPerson);
      setEmail(editingClient.email);
      setPhone(editingClient.phone);
      setActivePlan(editingClient.activePlan);
      setMonthlyFee(editingClient.monthlyFee.toString());
      setDueDay(editingClient.dueDay.toString());
      setContractStatus(editingClient.contractStatus);
    } else {
      resetForm();
    }
  }, [editingClient]);

  const resetForm = () => {
    setName('');
    setCnpj('');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setActivePlan('');
    setMonthlyFee('');
    setDueDay('');
    setContractStatus('Ativo');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !monthlyFee || !dueDay) return;

    const clientData: Client = {
      id: editingClient ? editingClient.id : generateId(),
      name,
      cnpj,
      contactPerson,
      email,
      phone,
      activePlan,
      monthlyFee: parseFloat(monthlyFee),
      dueDay: parseInt(dueDay),
      contractStatus,
    };

    if (editingClient) {
      onUpdateClient(clientData);
    } else {
      onAddClient(clientData);
    }
    
    // Only reset if not editing, or after update let parent handle clearing editingClient
    if (!editingClient) resetForm();
  };

  return (
    <form onSubmit={handleSubmit} className={`bg-vybe-card p-6 rounded-xl border shadow-lg mb-8 transition-colors ${editingClient ? 'border-vybe-accent/50' : 'border-gray-800'}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className={`w-1 h-6 rounded-full ${editingClient ? 'bg-vybe-green' : 'bg-vybe-accent'}`}></span>
          {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
        </h2>
        {editingClient && (
          <button 
            type="button" 
            onClick={onCancelEdit}
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1 border border-gray-700 px-2 py-1 rounded hover:bg-white/5 transition-all"
          >
            <X size={12} /> Cancelar Edição
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        {/* Company Name */}
        <div className="lg:col-span-4">
          <label className="block text-xs text-vybe-muted mb-1 font-medium">Nome da Empresa</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Tech Solutions Ltda"
            className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-vybe-accent focus:ring-1 focus:ring-vybe-accent transition-all placeholder-gray-600"
            required
          />
        </div>

        {/* CNPJ */}
        <div className="lg:col-span-3">
          <label className="block text-xs text-vybe-muted mb-1 font-medium">CNPJ</label>
          <input
            type="text"
            value={cnpj}
            onChange={(e) => setCnpj(e.target.value)}
            placeholder="00.000.000/0000-00"
            className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-vybe-accent focus:ring-1 focus:ring-vybe-accent transition-all placeholder-gray-600"
          />
        </div>

        {/* Contact Person */}
        <div className="lg:col-span-3">
          <label className="block text-xs text-vybe-muted mb-1 font-medium">Responsável</label>
          <input
            type="text"
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            placeholder="Ex: João da Silva"
            className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-vybe-accent focus:ring-1 focus:ring-vybe-accent transition-all placeholder-gray-600"
            required
          />
        </div>

        {/* Contract Status */}
        <div className="lg:col-span-2">
          <label className="block text-xs text-vybe-muted mb-1 font-medium">Status Contrato</label>
          <div className="relative">
            <select
              value={contractStatus}
              onChange={(e) => setContractStatus(e.target.value as any)}
              className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-vybe-accent focus:ring-1 focus:ring-vybe-accent transition-all appearance-none cursor-pointer"
            >
              <option value="Ativo">Ativo</option>
              <option value="Pendente">Pendente</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>
        </div>

        {/* --- Second Row --- */}

        {/* Email */}
        <div className="lg:col-span-3">
          <label className="block text-xs text-vybe-muted mb-1 font-medium">Email Comercial</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contato@empresa.com"
            className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-vybe-accent focus:ring-1 focus:ring-vybe-accent transition-all placeholder-gray-600"
          />
        </div>

        {/* Phone */}
        <div className="lg:col-span-2">
          <label className="block text-xs text-vybe-muted mb-1 font-medium">WhatsApp</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(00) 00000-0000"
            className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-vybe-accent focus:ring-1 focus:ring-vybe-accent transition-all placeholder-gray-600"
          />
        </div>

        {/* Active Plan */}
        <div className="lg:col-span-3">
          <label className="block text-xs text-vybe-muted mb-1 font-medium">Plano Ativo</label>
          <div className="relative">
             <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
             <input
              type="text"
              value={activePlan}
              onChange={(e) => setActivePlan(e.target.value)}
              placeholder="Ex: Gestão Redes Sociais"
              className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 pl-9 text-white focus:outline-none focus:border-vybe-accent focus:ring-1 focus:ring-vybe-accent transition-all placeholder-gray-600"
            />
          </div>
        </div>

         {/* Monthly Fee */}
         <div className="lg:col-span-2">
          <label className="block text-xs text-vybe-muted mb-1 font-medium">Fee Mensal (R$)</label>
          <div className="relative">
             <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
             <input
              type="number"
              value={monthlyFee}
              onChange={(e) => setMonthlyFee(e.target.value)}
              placeholder="0,00"
              className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 pl-9 text-white focus:outline-none focus:border-vybe-accent focus:ring-1 focus:ring-vybe-accent transition-all placeholder-gray-600"
              required
            />
          </div>
        </div>

        {/* Due Day */}
        <div className="lg:col-span-2">
          <label className="block text-xs text-vybe-muted mb-1 font-medium">Dia Venc.</label>
          <div className="relative">
             <CalendarClock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
             <input
              type="number"
              min="1"
              max="31"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              placeholder="Dia"
              className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 pl-9 text-white focus:outline-none focus:border-vybe-accent focus:ring-1 focus:ring-vybe-accent transition-all placeholder-gray-600"
              required
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="lg:col-span-12 flex justify-end mt-2">
          <button
            type="submit"
            className={`${editingClient ? 'bg-vybe-green hover:bg-green-600' : 'bg-vybe-accent hover:bg-[#E65C00]'} text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg`}
          >
            {editingClient ? <Save size={20} /> : <UserPlus size={20} />}
            <span>{editingClient ? 'Atualizar Cliente' : 'Salvar Cliente'}</span>
          </button>
        </div>
      </div>
    </form>
  );
};

export default ClientForm;