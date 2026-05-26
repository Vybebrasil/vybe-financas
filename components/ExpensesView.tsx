import React, { useMemo, useState } from 'react';
import { Employee, Subscription, Category, Transaction, TransactionType, TransactionStatus, PaymentMethod } from '../types';
import { formatCurrency, generateId } from '../utils';
import { computeEmployeeAmountToPay } from '../src/services/employeePayroll';
import { Users, Plus, Trash2, Laptop, ShoppingBag, DollarSign, Eye, Pencil, X, Save, History } from 'lucide-react';
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
  const [newEmpBonus, setNewEmpBonus] = useState('');

  // Subscription State (Add & Edit)
  const [subName, setSubName] = useState('');
  const [subCost, setSubCost] = useState('');
  const [subDay, setSubDay] = useState('');
  const [subMethod, setSubMethod] = useState<PaymentMethod>('CARTAO');
  const [editingSubId, setEditingSubId] = useState<string | null>(null);

  // Subscription History State
  const [viewingHistorySub, setViewingHistorySub] = useState<Subscription | null>(null);

  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

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
      bonus: newEmpBonus ? parseFloat(newEmpBonus) : 0,
      pixKey: newEmpPix,
      paymentDay: 5, // Default
    });
    setNewEmpName('');
    setNewEmpRole('');
    setNewEmpSalary('');
    setNewEmpBonus('');
    setNewEmpPix('');
    setIsAddEmployeeOpen(false);
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
    } else {
      onAddSubscription(subData);
    }

    resetSubForm();
    setIsSubModalOpen(false);
  };

  const resetSubForm = () => {
    setEditingSubId(null);
    setSubName('');
    setSubCost('');
    setSubDay('');
    setSubMethod('CARTAO');
  };

  const openAddSubModal = () => {
    resetSubForm();
    setIsSubModalOpen(true);
  };

  const startEditingSub = (sub: Subscription) => {
    setSubName(sub.name);
    setSubCost(sub.cost.toString());
    setSubDay(sub.renewalDay.toString());
    setSubMethod(sub.paymentMethod);
    setEditingSubId(sub.id);
    setIsSubModalOpen(true);
  };

  const closeSubModal = () => {
    resetSubForm();
    setIsSubModalOpen(false);
  };

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
    const { amountToPay } = computeEmployeeAmountToPay(emp, transactions);
    onQuickExpense({
      id: generateId(),
      description: `Salário - ${emp.name}`,
      amount: amountToPay,
      category: Category.SALARY,
      type: TransactionType.EXPENSE,
      date: new Date().toISOString().split('T')[0],
      status: TransactionStatus.PAID,
      paymentMethod: 'PIX',
      employeeId: emp.id,
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

  const totalSubs = subscriptions.reduce((acc, curr) => acc + curr.cost, 0);

  const employeePayrollRows = useMemo(
    () =>
      employees.map((emp) => ({
        employee: emp,
        payroll: computeEmployeeAmountToPay(emp, transactions),
      })),
    [employees, transactions],
  );

  const totalAmountToPay = useMemo(
    () => employeePayrollRows.reduce((sum, row) => sum + row.payroll.amountToPay, 0),
    [employeePayrollRows],
  );

  return (
    <div className="space-y-8 animate-bar-grow origin-top">
      
      {/* Modal de Histórico */}
      <SubscriptionHistoryModal 
        isOpen={!!viewingHistorySub}
        onClose={() => setViewingHistorySub(null)}
        subscription={viewingHistorySub}
        transactions={transactions}
      />

      {/* Modal: Novo Colaborador */}
      {isAddEmployeeOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsAddEmployeeOpen(false)}
          />
          <div className="relative bg-vybe-card border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-bar-grow origin-center">
            <div className="bg-[#2A2A2A] p-4 flex justify-between items-center border-b border-gray-700">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Plus className="text-vybe-accent" size={20} />
                Novo Colaborador
              </h3>
              <button
                type="button"
                onClick={() => setIsAddEmployeeOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddEmployee} className="p-6 space-y-3">
              <input value={newEmpName} onChange={e => setNewEmpName(e.target.value)} placeholder="Nome Completo" className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-vybe-accent outline-none" required />
              <input value={newEmpRole} onChange={e => setNewEmpRole(e.target.value)} placeholder="Cargo" className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-vybe-accent outline-none" />
              <input type="number" value={newEmpSalary} onChange={e => setNewEmpSalary(e.target.value)} placeholder="Salário (R$)" className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-vybe-accent outline-none" required />
              <input type="number" min="0" step="0.01" value={newEmpBonus} onChange={e => setNewEmpBonus(e.target.value)} placeholder="Bônus do mês (R$, opcional)" className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-vybe-accent outline-none" />
              <input value={newEmpPix} onChange={e => setNewEmpPix(e.target.value)} placeholder="Chave PIX" className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-vybe-accent outline-none" />
              <button type="submit" className="w-full bg-vybe-accent hover:bg-[#E65C00] text-white font-bold py-3 rounded-lg text-sm transition-colors mt-2">
                Cadastrar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Novo / Editar Software */}
      {isSubModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeSubModal}
          />
          <div className="relative bg-vybe-card border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-bar-grow origin-center">
            <div className="bg-[#2A2A2A] p-4 flex justify-between items-center border-b border-gray-700">
              <h3 className="text-white font-bold flex items-center gap-2">
                {editingSubId ? <Pencil className="text-vybe-accent" size={20} /> : <Plus className="text-vybe-accent" size={20} />}
                {editingSubId ? 'Editar Software' : 'Novo Software'}
              </h3>
              <button
                type="button"
                onClick={closeSubModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubSubmit} className="p-6 space-y-3">
              <input
                value={subName}
                onChange={e => setSubName(e.target.value)}
                placeholder="Nome (ex: Adobe, Notion)"
                className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-vybe-accent outline-none"
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  value={subCost}
                  onChange={e => setSubCost(e.target.value)}
                  placeholder="Valor (R$)"
                  className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-vybe-accent outline-none"
                  required
                />
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={subDay}
                  onChange={e => setSubDay(e.target.value)}
                  placeholder="Dia renovação"
                  className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-vybe-accent outline-none"
                  required
                />
              </div>
              <select
                value={subMethod}
                onChange={e => setSubMethod(e.target.value as PaymentMethod)}
                className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-vybe-accent outline-none cursor-pointer"
              >
                <option value="CARTAO">Cartão de Crédito</option>
                <option value="PIX">PIX</option>
                <option value="BOLETO">Boleto</option>
              </select>
              <button
                type="submit"
                className="w-full bg-vybe-accent hover:bg-[#E65C00] text-white font-bold py-3 rounded-lg text-sm transition-colors mt-2 flex items-center justify-center gap-2"
              >
                {editingSubId ? <><Save size={16} /> Atualizar</> : 'Cadastrar'}
              </button>
            </form>
          </div>
        </div>
      )}

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
          <div className="flex items-center gap-3">
            <div className="bg-[#121212] px-4 py-2 rounded-lg border border-amber-900/40">
              <span className="text-xs text-gray-400 block">A pagar (mês)</span>
              <span className="text-lg font-bold text-amber-400">
                {formatCurrency(totalAmountToPay)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsAddEmployeeOpen(true)}
              title="Novo colaborador"
              className="p-3 bg-vybe-accent hover:bg-[#E65C00] text-white rounded-full transition-colors shadow-lg shadow-orange-900/30"
            >
              <Plus size={22} />
            </button>
          </div>
        </div>

        <div className="space-y-3">
            {employees.length === 0 && <p className="text-gray-500 text-sm italic">Nenhum funcionário cadastrado.</p>}
            {employeePayrollRows.map(({ employee: emp, payroll }) => (
              <div key={emp.id} className="flex flex-col md:flex-row justify-between items-center bg-[#121212] p-4 rounded-lg border border-gray-800 hover:border-gray-600 transition-colors">
                <div className="flex items-center gap-3 w-full md:w-auto mb-3 md:mb-0">
                  <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-gray-400 font-bold">
                    {emp.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{emp.name}</h4>
                    <p className="text-xs text-gray-500">
                      {emp.role}
                      {emp.paymentDay ? ` · Pagamento dia ${emp.paymentDay}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-right">
                    <span className="block text-xs text-gray-400">A pagar</span>
                    <span className="block font-bold text-amber-400 text-sm">
                      {formatCurrency(payroll.amountToPay)}
                    </span>
                    {payroll.linkedExpenses > 0 && (
                      <span className="block text-[10px] text-gray-600 mt-0.5">
                        −{formatCurrency(payroll.linkedExpenses)} vinculadas
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {onViewEmployee && (
                        <button onClick={() => onViewEmployee(emp)} title="Ver Detalhes" className="p-2 bg-gray-800 text-gray-400 rounded hover:bg-gray-700 hover:text-white border border-gray-700 transition-colors">
                            <Eye size={16} />
                        </button>
                    )}
                    <button onClick={() => handlePayEmployee(emp)} title="Lançar pagamento (valor A pagar)" className="p-2 bg-green-900/20 text-green-500 rounded hover:bg-green-900/40 border border-green-900/50 transition-colors">
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
          <div className="flex items-center gap-3">
            <div className="bg-[#121212] px-4 py-2 rounded-lg border border-gray-700">
              <span className="text-xs text-gray-400 block">Custo Mensal</span>
              <span className="text-lg font-bold text-white">{formatCurrency(totalSubs)}</span>
            </div>
            <button
              type="button"
              onClick={openAddSubModal}
              title="Novo software"
              className="p-3 bg-vybe-accent hover:bg-[#E65C00] text-white rounded-full transition-colors shadow-lg shadow-orange-900/30"
            >
              <Plus size={22} />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {subscriptions.length === 0 && (
            <p className="text-gray-500 text-sm italic">Nenhum software cadastrado.</p>
          )}
          {subscriptions.map(sub => (
            <div
              key={sub.id}
              className="flex flex-col md:flex-row justify-between items-center bg-[#121212] p-4 rounded-lg border border-gray-800 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center gap-3 w-full md:w-auto mb-3 md:mb-0">
                <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-gray-400">
                  <Laptop size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{sub.name}</h4>
                  <p className="text-xs text-gray-500">
                    Renova dia {sub.renewalDay} · {sub.paymentMethod}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                <div className="text-right">
                  <span className="block text-xs text-gray-400">Mensal</span>
                  <span className="block font-bold text-vybe-red text-sm">{formatCurrency(sub.cost)}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewingHistorySub(sub)}
                    title="Ver histórico"
                    className="p-2 bg-gray-800 text-gray-400 rounded hover:bg-gray-700 hover:text-white border border-gray-700 transition-colors"
                  >
                    <History size={16} />
                  </button>
                  <button
                    onClick={() => startEditingSub(sub)}
                    title="Editar"
                    className="p-2 bg-gray-800 text-gray-400 rounded hover:bg-gray-700 hover:text-white border border-gray-700 transition-colors"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handlePaySub(sub)}
                    title="Lançar pagamento"
                    className="p-2 bg-green-900/20 text-green-500 rounded hover:bg-green-900/40 border border-green-900/50 transition-colors"
                  >
                    <DollarSign size={16} />
                  </button>
                  <button
                    onClick={() => onDeleteSubscription(sub.id)}
                    className="p-2 bg-red-900/20 text-red-500 rounded hover:bg-red-900/40 border border-red-900/50 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
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