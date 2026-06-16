import React, { useMemo, useState } from 'react';
import { Employee, Subscription, Category, Transaction, TransactionType, TransactionStatus, PaymentMethod } from '../types';
import { formatCurrency, generateId } from '../utils';
import { computeEmployeeAmountToPay } from '../src/services/employeePayroll';
import { getCurrentMonthKey, salaryDescriptionForEmployee, todayIsoDate } from '../src/services/recurringLogic';
import { Users, Plus, Trash2, Laptop, ShoppingBag, DollarSign, Eye, Pencil, X, Save, History, Pin, Ticket } from 'lucide-react';
import SubscriptionHistoryModal from './SubscriptionHistoryModal';
import EmployeeValeModal from './EmployeeValeModal';
import { useToast } from './ToastProvider';

interface ExpensesViewProps {
  employees: Employee[];
  subscriptions: Subscription[];
  transactions?: Transaction[];
  onAddEmployee: (emp: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onAddSubscription: (sub: Subscription) => void;
  onUpdateSubscription: (sub: Subscription) => void;
  onDeleteSubscription: (id: string) => void;
  onQuickExpense: (transaction: Transaction) => void;
  onAddTransaction: (transaction: Transaction) => Promise<void>;
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
  onAddTransaction,
  onViewEmployee,
}) => {
  const toast = useToast();
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
  const [valeEmployee, setValeEmployee] = useState<Employee | null>(null);
  const [payingEmployeeId, setPayingEmployeeId] = useState<string | null>(null);

  const [variableDesc, setVariableDesc] = useState('');
  const [variableCost, setVariableCost] = useState('');
  const [fixedDesc, setFixedDesc] = useState('');
  const [fixedCost, setFixedCost] = useState('');

  const monthKey = getCurrentMonthKey();

  const isVariableExpenseCategory = (category: string) =>
    category === Category.VARIABLE_EXPENSE || category === Category.SUPPLIES;

  const variableMonthTotal = useMemo(
    () =>
      transactions
        .filter(
          (t) =>
            t.type === TransactionType.EXPENSE &&
            t.date.startsWith(monthKey) &&
            isVariableExpenseCategory(t.category),
        )
        .reduce((sum, t) => sum + t.amount, 0),
    [transactions, monthKey],
  );

  const fixedMonthTotal = useMemo(
    () =>
      transactions
        .filter(
          (t) =>
            t.type === TransactionType.EXPENSE &&
            t.date.startsWith(monthKey) &&
            t.category === Category.FIXED_EXPENSE,
        )
        .reduce((sum, t) => sum + t.amount, 0),
    [transactions, monthKey],
  );

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

  const handleAddVariableExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!variableDesc || !variableCost) return;
    onQuickExpense({
      id: generateId(),
      description: variableDesc,
      amount: parseFloat(variableCost),
      category: Category.VARIABLE_EXPENSE,
      type: TransactionType.EXPENSE,
      date: new Date().toISOString().split('T')[0],
      status: TransactionStatus.PAID,
      paymentMethod: 'PIX',
    });
    setVariableDesc('');
    setVariableCost('');
  };

  const handleAddFixedExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fixedDesc || !fixedCost) return;
    onQuickExpense({
      id: generateId(),
      description: fixedDesc,
      amount: parseFloat(fixedCost),
      category: Category.FIXED_EXPENSE,
      type: TransactionType.EXPENSE,
      date: new Date().toISOString().split('T')[0],
      status: TransactionStatus.PAID,
      paymentMethod: 'PIX',
    });
    setFixedDesc('');
    setFixedCost('');
  };

  const handlePayEmployee = async (emp: Employee) => {
    const { amountToPay } = computeEmployeeAmountToPay(emp, transactions);
    if (amountToPay <= 0) return;

    setPayingEmployeeId(emp.id);
    try {
      await onAddTransaction({
        id: generateId(),
        description: salaryDescriptionForEmployee(emp.name),
        amount: amountToPay,
        category: Category.SALARY,
        type: TransactionType.EXPENSE,
        date: todayIsoDate(),
        status: TransactionStatus.PAID,
        paymentMethod: 'PIX',
        employeeId: emp.id,
      });
      toast.success(`Pagamento de ${emp.name} registrado.`);
    } catch {
      toast.error('Erro ao registrar pagamento.');
    } finally {
      setPayingEmployeeId(null);
    }
  };

  const handleRegisterVale = async (
    payload: {
      description: string;
      amount: number;
      date: string;
      status: TransactionStatus;
    },
  ) => {
    if (!valeEmployee) return;
    await onAddTransaction({
      id: generateId(),
      description: payload.description,
      amount: payload.amount,
      category: Category.EMPLOYEE_VOUCHER,
      type: TransactionType.EXPENSE,
      date: payload.date,
      status: payload.status,
      paymentMethod: 'PIX',
      employeeId: valeEmployee.id,
    });
    toast.success(
      payload.status === TransactionStatus.PENDING
        ? 'Vale pendente registrado.'
        : 'Vale registrado e descontado da folha.',
    );
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

      <EmployeeValeModal
        isOpen={!!valeEmployee}
        employee={valeEmployee}
        amountToPay={
          valeEmployee
            ? computeEmployeeAmountToPay(valeEmployee, transactions).amountToPay
            : 0
        }
        onClose={() => setValeEmployee(null)}
        onSubmit={handleRegisterVale}
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
            <div
              className={`bg-[#121212] px-4 py-2 rounded-lg border ${
                totalAmountToPay <= 0 ? 'border-green-900/40' : 'border-amber-900/40'
              }`}
            >
              <span className="text-xs text-gray-400 block">A pagar (mês)</span>
              <span
                className={`text-lg font-bold ${
                  totalAmountToPay <= 0 ? 'text-green-400' : 'text-amber-400'
                }`}
              >
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
                    <span
                      className={`block font-bold text-sm ${
                        payroll.amountToPay <= 0 ? 'text-green-400' : 'text-amber-400'
                      }`}
                    >
                      {formatCurrency(payroll.amountToPay)}
                    </span>
                    {payroll.linkedExpenses > 0 && (
                      <span className="block text-[10px] text-orange-400/90 mt-0.5" title={payroll.vales.map((v) => v.description).join(', ')}>
                        −{formatCurrency(payroll.linkedExpenses)} em vales
                        {payroll.vales.length > 1 ? ` (${payroll.vales.length})` : ''}
                      </span>
                    )}
                    {payroll.salaryPaid > 0 && (
                      <span className="block text-[10px] text-gray-600 mt-0.5">
                        −{formatCurrency(payroll.salaryPaid)} pago no mês
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {onViewEmployee && (
                        <button onClick={() => onViewEmployee(emp)} title="Ver Detalhes" className="p-2 bg-gray-800 text-gray-400 rounded hover:bg-gray-700 hover:text-white border border-gray-700 transition-colors">
                            <Eye size={16} />
                        </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setValeEmployee(emp)}
                      title="Registrar vale (transporte, refeição, adiantamento...)"
                      className="p-2 bg-orange-900/20 text-orange-400 rounded hover:bg-orange-900/40 border border-orange-900/50 transition-colors"
                    >
                      <Ticket size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handlePayEmployee(emp)}
                      disabled={payroll.amountToPay <= 0 || payingEmployeeId === emp.id}
                      title={
                        payroll.amountToPay <= 0
                          ? 'Salário do mês já quitado'
                          : 'Registrar pagamento do salário (valor A pagar)'
                      }
                      className="p-2 bg-green-900/20 text-green-500 rounded hover:bg-green-900/40 border border-green-900/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
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

      {/* SECTION 3: GASTOS VARIÁVEIS */}
      <section className="bg-vybe-card border border-gray-800 rounded-xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShoppingBag className="text-vybe-accent" />
              Gastos Variáveis
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Despesas pontuais do mês (material, transporte, refeições, etc.)
            </p>
          </div>
          <div className="bg-[#121212] px-4 py-2 rounded-lg border border-gray-700">
            <span className="text-xs text-gray-400 block">Total no mês</span>
            <span className="text-lg font-bold text-teal-400">
              {formatCurrency(variableMonthTotal)}
            </span>
          </div>
        </div>
        <form
          onSubmit={handleAddVariableExpense}
          className="flex flex-col md:flex-row gap-4 items-end bg-[#121212] p-4 rounded-lg border border-gray-800"
        >
          <div className="w-full md:flex-1">
            <label className="text-xs text-gray-500 mb-1 block">Descrição</label>
            <input
              value={variableDesc}
              onChange={(e) => setVariableDesc(e.target.value)}
              placeholder="Ex: Uber, almoço, material de escritório..."
              className="w-full bg-vybe-card border border-gray-700 rounded-lg p-3 text-white focus:border-vybe-accent outline-none"
              required
            />
          </div>
          <div className="w-full md:w-48">
            <label className="text-xs text-gray-500 mb-1 block">Valor (R$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={variableCost}
              onChange={(e) => setVariableCost(e.target.value)}
              placeholder="0,00"
              className="w-full bg-vybe-card border border-gray-700 rounded-lg p-3 text-white focus:border-vybe-accent outline-none"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full md:w-auto px-6 py-3 bg-vybe-red hover:bg-red-600 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <DollarSign size={18} /> Lançar saída
          </button>
        </form>
      </section>

      {/* SECTION 4: GASTOS FIXOS */}
      <section className="bg-vybe-card border border-gray-800 rounded-xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Pin className="text-vybe-accent" />
              Gastos Fixos
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Despesas recorrentes (aluguel, internet, contador, energia, etc.)
            </p>
          </div>
          <div className="bg-[#121212] px-4 py-2 rounded-lg border border-indigo-900/40">
            <span className="text-xs text-gray-400 block">Total no mês</span>
            <span className="text-lg font-bold text-indigo-400">
              {formatCurrency(fixedMonthTotal)}
            </span>
          </div>
        </div>
        <form
          onSubmit={handleAddFixedExpense}
          className="flex flex-col md:flex-row gap-4 items-end bg-[#121212] p-4 rounded-lg border border-gray-800"
        >
          <div className="w-full md:flex-1">
            <label className="text-xs text-gray-500 mb-1 block">Descrição</label>
            <input
              value={fixedDesc}
              onChange={(e) => setFixedDesc(e.target.value)}
              placeholder="Ex: Aluguel, internet, contabilidade..."
              className="w-full bg-vybe-card border border-gray-700 rounded-lg p-3 text-white focus:border-vybe-accent outline-none"
              required
            />
          </div>
          <div className="w-full md:w-48">
            <label className="text-xs text-gray-500 mb-1 block">Valor (R$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={fixedCost}
              onChange={(e) => setFixedCost(e.target.value)}
              placeholder="0,00"
              className="w-full bg-vybe-card border border-gray-700 rounded-lg p-3 text-white focus:border-vybe-accent outline-none"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full md:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <DollarSign size={18} /> Lançar saída
          </button>
        </form>
      </section>

    </div>
  );
};

export default ExpensesView;