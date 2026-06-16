import React, { useMemo, useState } from 'react';
import { Client } from '../types';
import { formatCurrency } from '../utils';
import { Trash2, Phone, User, DollarSign, Calendar, Pencil, Search, AlertCircle, FileText, ArrowUpDown, Link2 } from 'lucide-react';

type ClientSortBy = 'dueDay' | 'name' | 'monthlyFee';

interface ClientListProps {
  clients: Client[];
  onDeleteClient: (id: string) => void;
  onEditClient: (client: Client) => void;
  onGenerateCharge: (client: Client) => void;
  onViewHistory: (client: Client) => void;
  onSharePortalLink: (client: Client) => void;
}

const ClientList: React.FC<ClientListProps> = ({ clients, onDeleteClient, onEditClient, onGenerateCharge, onViewHistory, onSharePortalLink }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<ClientSortBy>('dueDay');

  const filteredClients = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const filtered = clients.filter(client =>
      client.name.toLowerCase().includes(term) ||
      client.contactPerson.toLowerCase().includes(term) ||
      client.email.toLowerCase().includes(term) ||
      client.cnpj.includes(term)
    );

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
        case 'monthlyFee':
          return a.monthlyFee - b.monthlyFee;
        case 'dueDay':
        default:
          return a.dueDay - b.dueDay;
      }
    });
  }, [clients, searchTerm, sortBy]);

  const checkIsDueSoon = (dueDay: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    let targetDate = new Date(currentYear, currentMonth, dueDay);

    if (targetDate < today) {
      targetDate = new Date(currentYear, currentMonth + 1, dueDay);
    }

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays >= 0 && diffDays <= 7;
  };

  return (
    <div className="bg-vybe-card rounded-xl border border-gray-800 shadow-lg overflow-hidden">
      <div className="p-6 border-b border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 whitespace-nowrap">
            <span className="w-1 h-6 bg-vybe-accent rounded-full"></span>
            Carteira de Clientes
          </h2>
          <span className="bg-[#121212] px-3 py-1 rounded-full text-xs text-gray-400 border border-gray-700">
            {filteredClients.length}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-56">
            <ArrowUpDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as ClientSortBy)}
              className="w-full appearance-none bg-[#121212] border border-gray-700 rounded-full py-2 pl-9 pr-8 text-sm text-white focus:outline-none focus:border-vybe-accent transition-colors cursor-pointer"
              aria-label="Ordenar clientes"
            >
              <option value="dueDay">Data de vencimento</option>
              <option value="name">Nome (A → Z)</option>
              <option value="monthlyFee">Valor do contrato</option>
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar (Nome, CNPJ, Email)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#121212] border border-gray-700 rounded-full py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-vybe-accent transition-colors placeholder-gray-600"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        {filteredClients.length === 0 ? (
          <div className="text-center py-12 text-vybe-muted">
            {searchTerm ? 'Nenhum cliente encontrado para sua busca.' : 'Nenhum cliente cadastrado.'}
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#2A2A2A] text-vybe-muted text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Empresa / Plano</th>
                <th className="p-4 font-semibold">Contato</th>
                <th className="p-4 font-semibold hidden md:table-cell">Contrato</th>
                <th className="p-4 font-semibold text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => {
                const isDueSoon = checkIsDueSoon(client.dueDay);

                return (
                  <tr
                    key={client.id}
                    className="border-b border-gray-800 hover:bg-[#252525] transition-colors group"
                  >
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-white text-base">{client.name}</span>
                        <span className="text-[10px] text-gray-500 font-mono mb-1">{client.cnpj}</span>
                        <span className="text-xs text-gray-400 flex items-center gap-1 w-fit">
                          <span className="bg-[#121212] px-1 rounded border border-gray-700">{client.activePlan}</span>
                        </span>
                        <div className="text-xs text-gray-500 mt-2 md:hidden">
                          Fee: {formatCurrency(client.monthlyFee)} | Venc: dia {client.dueDay}
                          {isDueSoon && <span className="text-amber-500 font-bold ml-1">(! Próximo)</span>}
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <User size={14} className="text-vybe-accent" />
                          {client.contactPerson}
                        </div>
                        <div className="hidden md:flex items-center gap-2 text-xs text-gray-500">
                          <Phone size={12} /> {client.phone || '-'}
                        </div>
                      </div>
                    </td>

                    <td className="p-4 hidden md:table-cell">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm text-vybe-green font-medium">
                          <DollarSign size={14} />
                          {formatCurrency(client.monthlyFee)}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Calendar size={12} className={isDueSoon ? 'text-amber-500' : ''} />
                          <span>Vencimento: dia {client.dueDay}</span>
                          {isDueSoon && (
                            <div className="flex items-center gap-1 text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20" title="Vence nos próximos 7 dias">
                              <AlertCircle size={10} />
                              <span className="text-[10px] font-bold">Vence em breve</span>
                            </div>
                          )}
                        </div>

                        <span className={`text-[10px] w-fit px-2 py-0.5 rounded-full mt-1 ${client.contractStatus === 'Ativo' ? 'bg-vybe-green/10 text-vybe-green' : 'bg-red-500/10 text-red-500'}`}>
                          {client.contractStatus}
                        </span>
                      </div>
                    </td>

                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onGenerateCharge(client)}
                          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border ${isDueSoon ? 'bg-vybe-accent text-white border-vybe-accent shadow-lg shadow-orange-900/40 hover:bg-[#E65C00]' : 'bg-vybe-accent/10 hover:bg-vybe-accent hover:text-white text-vybe-accent border-vybe-accent/20'}`}
                          title="Gerar Cobrança"
                        >
                          <DollarSign size={14} />
                          <span className="hidden lg:inline">Cobrar</span>
                        </button>

                        <button
                          onClick={() => onViewHistory(client)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-all"
                          title="Ver Histórico Financeiro"
                        >
                          <FileText size={16} />
                        </button>

                        <button
                          onClick={() => onSharePortalLink(client)}
                          className="p-2 text-gray-400 hover:text-[#FF6600] hover:bg-orange-500/10 rounded-full transition-all"
                          title="Copiar link do portal do cliente"
                        >
                          <Link2 size={16} />
                        </button>

                        <button
                          onClick={() => {
                            onEditClient(client);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="p-2 text-gray-500 hover:text-white hover:bg-gray-700 rounded-full transition-all"
                          title="Editar Cliente"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          onClick={() => onDeleteClient(client.id)}
                          className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all"
                          title="Excluir Cliente"
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
        )}
      </div>
    </div>
  );
};

export default ClientList;
