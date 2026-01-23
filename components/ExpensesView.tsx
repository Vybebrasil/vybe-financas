import React, { useState } from 'react';
import { Employee, Subscription, Category, Transaction, TransactionType, TransactionStatus, PaymentMethod } from '../types';
import { formatCurrency, generateId } from '../utils';
import { Users, Plus, Trash2, CreditCard, Laptop, ShoppingBag, DollarSign, Eye, Pencil, X, Save, History } from 'lucide-react';
import SubscriptionHistoryModal from './SubscriptionHistoryModal';

interface ExpensesViewProps {
  employees: Employee[];
  subscriptions: Subscription[];
  transactions?: Transaction[]; // Opcional para manter compatibilidade, mas idealmente obrigatório
  onAddEmployee: (emp: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onAddSubscription: (sub: Subscription) => void;
  onUpdateSubscription: (sub: Subscription) => void;
  onDeleteSubscription: (id: string) => void;
  onQuickExpense: (transaction: Transaction) => void;
  onViewEmployee?: (emp: Employee) => void;
}

const ExpensesView: React.FC<ExpensesViewProps> = ({
  employees,
  subscriptions,
  transactions = [],
  onAddEmployee,
  onDeleteEmployee,
  onAddSubscription,
  onUpdateSubscription,
  onDeleteSubscription,
  onQuickExpense,
  onViewEmployee,
}) => {
  // State for forms
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('');
  const [newEmpSalary, setNewEmpSalary] = useState('');
  const [newEmpPix, setNewEmpPix] = useState('');

  // Subscription State (Add & Edit)
  const [subName, setSubName] = useState('');
  const [subCost, setSubCost] = useState('');
  const [subDay, setSubDay] = useState('');
  const [subMethod, setSubMethod] = useState<PaymentMethod>('CARTAO');
  const [editingSubId, setEditingSubId] = useState<string | null>(null);

  // Subscription History State
  const [viewingHistorySub, setViewingHistorySub] = useState<Subscription | null>(null);

  const [supplyDesc, setSupplyDesc] = useState('');
  const [supplyCost, setSupplyCost] = useState('');

  // Handlers
  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName || !newEmpSalary) return;
    onAddEmployee({
      id: generateId(),
      name: newEmpName,
      role: newEmpRole,
      salary: parseFloat(newEmpSalary),
      pixKey: newEmpPix,
      paymentDay: 5, // Default
    });
    setNewEmpName('');
    setNewEmpRole('');
    setNewEmpSalary('');
    setNewEmpPix('');
  };

  const handleSubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName || !subCost || !subDay) return;

    const subData: Subscription = {
      id: editingSubId || generateId(),
      name: subName,
      cost: parseFloat(subCost),
      renewalDay: parseInt(subDay),
      paymentMethod: subMethod,
      active: true,
    };

    if (editingSubId) {
        onUpdateSubscription(subData);
        setEditingSubId(null);
    } else {
        onAddSubscription(subData);
    }
    
    // Reset Form
    setSubName('');
    setSubCost('');
    setSubDay('');
    setSubMethod('CARTAO');
  };

  const startEditingSub = (sub: Subscription) => {
      setSubName(sub.name);
      setSubCost(sub.cost.toString());
      setSubDay(sub.renewalDay.toString());
      setSubMethod(sub.paymentMethod);
      setEditingSubId(sub.id);
  };

  const cancelEditingSub = () => {
      setEditingSubId(null);
      setSubName('');
      setSubCost('');
      setSubDay('');
      setSubMethod('CARTAO');
  }

  const handleAddSupply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplyDesc || !supplyCost) return;
    onQuickExpense({
      id: generateId(),
      description: supplyDesc,
      amount: parseFloat(supplyCost),
      category: Category.SUPPLIES,
      type: TransactionType.EXPENSE,
      date: new Date().toISOString().split('T')[0],
      status: TransactionStatus.PAID,
      paymentMethod: 'PIX',
    });
    setSupplyDesc('');
    setSupplyCost('');
  };

  const handlePayEmployee = (emp: Employee) => {
    onQuickExpense({
      id: generateId(),
      description: `Salário - ${emp.name}`,
      amount: emp.salary,
      category: Category.SALARY,
      type: TransactionType.EXPENSE,
      date: new Date().toISOString().split('T')[0],
      status: TransactionStatus.PAID,
      paymentMethod: 'PIX',
    });
  };

  const handlePaySub = (sub: Subscription) => {
    onQuickExpense({
      id: generateId(),
      description: `Assinatura - ${sub.name}`,
      amount: sub.cost,
      category: Category.TOOLS,
      type: TransactionType.EXPENSE,
      date: new Date().toISOString().split('T')[0],
      status: TransactionStatus.PAID,
      paymentMethod: sub.paymentMethod,
    });
  };

  const totalSalaries = employees.reduce((acc, curr) => acc + curr.salary, 0);
  const totalSubs = subscriptions.reduce((acc, curr) => acc + curr.cost, 0);

  return (
    <div className="space-y-8 animate-bar-grow origin-top">
      
      {/* Modal de Histórico */}
      <SubscriptionHistoryModal 
        isOpen={!!viewingHistorySub}
        onClose={() => setViewingHistorySub(null)}
        subscription={viewingHistorySub}
        transactions={transactions}
      />

      {/* SECTION 1: EMPLOYEES */}
      <section className="bg-vybe-card border border-gray-800 rounded-xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="text-vybe-accent" />
              Folha de Funcionários
            </h2>
            <p className="text-xs text-gray-500 mt-1">Gestão de equipe e pagamentos</p>
          </div>
          <div className="bg-[#121212] px-4 py-2 rounded-lg border border-gray-700">
            <span className="text-xs text-gray-400 block">Custo Mensal Estimado</span>
            <span className="text-lg font-bold text-white">{formatCurrency(totalSalaries)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Form */}
          <div className="lg:col-span-1 bg-[#121212] p-4 rounded-lg border border-gray-800 h-fit">
            <h3 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2">
              <Plus size={16} /> Novo Colaborador
            </h3>
            <form onSubmit={handleAddEmployee} className="space-y-3">
              <input value={newEmpName} onChange={e => setNewEmpName(e.target.value)} placeholder="Nome Completo" className="w-full bg-vybe-card border border-gray-700 rounded p-2 text-sm text-white focus:border-vybe-accent outline-none" required />
              <input value={newEmpRole} onChange={e => setNewEmpRole(e.target.value)} placeholder="Cargo" className="w-full bg-vybe-card border border-gray-700 rounded p-2 text-sm text-white focus:border-vybe-accent outline-none" />
              <input type="number" value={newEmpSalary} onChange={e => setNewEmpSalary(e.target.value)} placeholder="Salário (R$)" className="w-full bg-vybe-card border border-gray-700 rounded p-2 text-sm text-white focus:border-vybe-accent outline-none" required />
              <input value={newEmpPix} onChange={e => setNewEmpPix(e.target.value)} placeholder="Chave PIX" className="w-full bg-vybe-card border border-gray-700 rounded p-2 text-sm text-white focus:border-vybe-accent outline-none" />
              <button type="submit" className="w-full bg-vybe-accent hover:bg-[#E65C00] text-white font-bold py-2 rounded text-sm transition-colors">Cadastrar</button>
            </form>
          </div>

          {/* List */}
          <div className="lg:col-span-2 space-y-3">
            {employees.length === 0 && <p className="text-gray-500 text-sm italic">Nenhum funcionário cadastrado.</p>}
            {employees.map(emp => (
              <div key={emp.id} className="flex flex-col md:flex-row justify-between items-center bg-[#121212] p-4 rounded-lg border border-gray-800 hover:border-gray-600 transition-colors">
                <div className="flex items-center gap-3 w-full md:w-auto mb-3 md:mb-0">
                  <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-gray-400 font-bold">
                    {emp.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{emp.name}</h4>
                    <p className="text-xs text-gray-500">{emp.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-right">
                    <span className="block text-xs text-gray-400">Salário</span>
                    <span className="block font-bold text-vybe-red text-sm">{formatCurrency(emp.salary)}</span>
                  </div>
                  <div className="flex gap-2">
                    {onViewEmployee && (
                        <button onClick={() => onViewEmployee(emp)} title="Ver Detalhes" className="p-2 bg-gray-800 text-gray-400 rounded hover:bg-gray-700 hover:text-white border border-gray-700 transition-colors">
                            <Eye size={16} />
                        </button>
                    )}
                    <button onClick={() => handlePayEmployee(emp)} title="Lançar Pagamento" className="p-2 bg-green-900/20 text-green-500 rounded hover:bg-green-900/40 border border-green-900/50 transition-colors">
                      <DollarSign size={16} />
                    </button>
                    <button onClick={() => onDeleteEmployee(emp.id)} className="p-2 bg-red-900/20 text-red-500 rounded hover:bg-red-900/40 border border-red-900/50 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 2: SUBSCRIPTIONS */}
      <section className="bg-vybe-card border border-gray-800 rounded-xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Laptop className="text-vybe-accent" />
              Gestão de Aplicativos
            </h2>
            <p className="text-xs text-gray-500 mt-1">Softwares e Ferramentas Recorrentes</p>
          </div>
          <div className="bg-[#121212] px-4 py-2 rounded-lg border border-gray-700">
            <span className="text-xs text-gray-400 block">Custo Mensal</span>
            <span className="text-lg font-bold text-white">{formatCurrency(totalSubs)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Add/Edit Sub Card */}
          <div className={`bg-[#121212] p-4 rounded-lg border border-dashed flex flex-col justify-center ${editingSubId ? 'border-vybe-accent bg-vybe-accent/5' : 'border-gray-700'}`}>
             <div className="flex items-center justify-between mb-3">
                 <h3 className={`text-sm font-bold flex items-center gap-2 ${editingSubId ? 'text-vybe-accent' : 'text-gray-300'}`}>
                    {editingSubId ? <Pencil size={16} /> : <Plus size={16} />} 
                    {editingSubId ? 'Editar Software' : 'Adicionar Software'}
                 </h3>
                 {editingSubId && (
                     <button onClick={cancelEditingSub} className="text-xs text-gray-500 hover:text-white flex items-center gap-1">
                         <X size={12} /> Cancelar
                     </button>
                 )}
             </div>
             
             <form onSubmit={handleSubSubmit} className="space-y-2">
                <input 
                    value={subName} 
                    onChange={e => setSubName(e.target.value)} 
                    placeholder="Nome (ex: Adobe)" 
                    className="w-full bg-vybe-card border border-gray-700 rounded p-2 text-xs text-white outline-none focus:border-vybe-accent" 
                    required 
                />
                
                <div className="grid grid-cols-2 gap-2">
                    <input 
                        type="number" 
                        value={subCost} 
                        onChange={e => setSubCost(e.target.value)} 
                        placeholder="Valor (R$)" 
                        className="w-full bg-vybe-card border border-gray-700 rounded p-2 text-xs text-white outline-none focus:border-vybe-accent" 
                        required 
                    />
                    <input 
                        type="number"
                        min="1"
                        max="31" 
                        value={subDay} 
                        onChange={e => setSubDay(e.target.value)} 
                        placeholder="Dia Renov." 
                        className="w-full bg-vybe-card border border-gray-700 rounded p-2 text-xs text-white outline-none focus:border-vybe-accent" 
                        required 
                    />
                </div>

                <select
                    value={subMethod}
                    onChange={(e) => setSubMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-vybe-card border border-gray-700 rounded p-2 text-xs text-white outline-none focus:border-vybe-accent cursor-pointer"
                >
                    <option value="CARTAO">Cartão de Crédito</option>
                    <option value="PIX">PIX</option>
                    <option value="BOLETO">Boleto</option>
                </select>

                <button 
                    type="submit" 
                    className={`w-full font-bold py-2 rounded text-xs mt-2 transition-colors flex items-center justify-center gap-2 ${editingSubId ? 'bg-vybe-green hover:bg-green-600 text-white' : 'bg-vybe-accent hover:bg-[#E65C00] text-white'}`}
                >
                    {editingSubId ? ( <><Save size={14} /> Atualizar</> ) : ( 'Salvar' )}
                </button>
             </form>
          </div>

          {/* Sub List */}
          {subscriptions.map(sub => (
            <div key={sub.id} className={`bg-[#121212] p-4 rounded-lg border flex flex-col justify-between group transition-colors relative ${editingSubId === sub.id ? 'border-vybe-accent opacity-50 pointer-events-none' : 'border-gray-800 hover:border-gray-600'}`}>
               
               {/* Actions */}
               <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button 
                        onClick={() => setViewingHistorySub(sub)}
                        className="p-1.5 text-gray-500 hover:text-vybe-accent bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                        title="Ver Histórico de Pagamentos"
                    >
                        <History size={12} />
                    </button>
                    <button 
                        onClick={() => startEditingSub(sub)} 
                        className="p-1.5 text-gray-500 hover:text-white bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                        title="Editar"
                    >
                        <Pencil size={12} />
                    </button>
                    <button 
                        onClick={() => onDeleteSubscription(sub.id)} 
                        className="p-1.5 text-gray-500 hover:text-red-500 bg-gray-800 hover:bg-red-900/30 rounded transition-colors"
                        title="Excluir"
                    >
                        <Trash2 size={12} />
                    </button>
               </div>

               <div>
                 <div className="flex items-center gap-2 mb-2">
                    <div className="bg-vybe-card p-1.5 rounded border border-gray-700">
                      <CreditCard size={14} className="text-gray-400" />
                    </div>
                    <h4 className="font-bold text-white text-sm truncate pr-16">{sub.name}</h4>
                 </div>
                 <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                    <span>Renova dia {sub.renewalDay}</span>
                    <span className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700 text-[10px] uppercase">{sub.paymentMethod}</span>
                 </div>
               </div>
               
               <div className="mt-4 flex justify-between items-end border-t border-gray-800 pt-2">
                  <span className="font-bold text-white">{formatCurrency(sub.cost)}<span className="text-[10px] text-gray-500 font-normal">/mês</span></span>
                  <button onClick={() => handlePaySub(sub)} className="text-[10px] bg-white/5 hover:bg-white/10 text-white px-2 py-1 rounded border border-gray-700 transition-colors">
                    Lançar
                  </button>
               </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 3: QUICK EXPENSES */}
      <section className="bg-vybe-card border border-gray-800 rounded-xl p-6 shadow-lg">
         <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
            <ShoppingBag className="text-vybe-accent" />
            Lançamento de Insumos & Variáveis
         </h2>
         <form onSubmit={handleAddSupply} className="flex flex-col md:flex-row gap-4 items-end bg-[#121212] p-4 rounded-lg border border-gray-800">
            <div className="w-full md:flex-1">
               <label className="text-xs text-gray-500 mb-1 block">Descrição do Gasto</label>
               <input value={supplyDesc} onChange={e => setSupplyDesc(e.target.value)} placeholder="Ex: Material de Escritório, Lanche, Uber..." className="w-full bg-vybe-card border border-gray-700 rounded-lg p-3 text-white focus:border-vybe-accent outline-none" required />
            </div>
            <div className="w-full md:w-48">
               <label className="text-xs text-gray-500 mb-1 block">Valor (R$)</label>
               <input type="number" value={supplyCost} onChange={e => setSupplyCost(e.target.value)} placeholder="0,00" className="w-full bg-vybe-card border border-gray-700 rounded-lg p-3 text-white focus:border-vybe-accent outline-none" required />
            </div>
            <button type="submit" className="w-full md:w-auto px-6 py-3 bg-vybe-red hover:bg-red-600 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
               <DollarSign size={18} /> Lançar Saída
            </button>
         </form>
         <p className="text-xs text-gray-500 mt-2 ml-1">* Esta ação redirecionará para o formulário financeiro para confirmação.</p>
      </section>

    </div>
  );
};

export default ExpensesView;