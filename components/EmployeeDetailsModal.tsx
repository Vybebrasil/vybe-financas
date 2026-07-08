import React, { useState, useEffect, useMemo } from 'react';
import { Employee, EmployeeCompensationHistory, Transaction, TransactionType, TransactionStatus, Category } from '../types';
import { formatCurrency, formatDate, generateId } from '../utils';
import {
  computeEmployeeAmountToPay,
  getEmployeeTotalOverpaymentVales,
  isPayrollDeduction,
} from '../src/services/employeePayroll';
import { getCurrentMonthKey } from '../src/services/recurringLogic';
import { getTransactionFilterDate } from '../src/services/transactionDates';
import SettlementDateModal from './SettlementDateModal';
import EmployeeValeModal from './EmployeeValeModal';
import { useToast } from './ToastProvider';
import { X, User, Save, Edit2, FileText, DollarSign, Calendar, CreditCard, TrendingDown, ChevronDown, Clock, CheckCircle, History, Ticket } from 'lucide-react';

interface EmployeeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  transactions: Transaction[];
  compensationHistory?: EmployeeCompensationHistory[];
  onUpdateEmployee: (
    updatedEmployee: Employee,
    options?: { compensationEffectiveMonth?: string },
  ) => void;
  onAddTransaction?: (transaction: Transaction) => Promise<void>;
  /** Dar baixa (total/parcial) ou voltar para pendente, como no extrato. */
  onToggleStatus?: (id: string, paidDate?: string, partialAmount?: number) => void;
}

const EmployeeDetailsModal: React.FC<EmployeeDetailsModalProps> = ({ 
  isOpen, 
  onClose, 
  employee, 
  transactions,
  compensationHistory = [],
  onUpdateEmployee,
  onAddTransaction,
  onToggleStatus,
}) => {
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isValeModalOpen, setIsValeModalOpen] = useState(false);
  
  // Form States
  const [formData, setFormData] = useState<Employee | null>(null);
  const [compensationEffectiveMonth, setCompensationEffectiveMonth] = useState(getCurrentMonthKey());

  useEffect(() => {
    if (employee) {
      setFormData({ ...employee });
      setCompensationEffectiveMonth(getCurrentMonthKey());
    }
  }, [employee]);

  // Histórico do colaborador (mês atual na folha; geral na tabela)
  const monthKey = getCurrentMonthKey();

  const monthVales = useMemo(() => {
    if (!employee) return [];
    return transactions.filter((t) => isPayrollDeduction(t, employee.id, monthKey));
  }, [employee, transactions, monthKey]);

  // Salários e vales do colaborador (pagos e pendentes)
  const history = useMemo(() => {
    if (!employee) return [];
    return transactions
      .filter(
        (t) =>
          t.type === TransactionType.EXPENSE &&
          t.employeeId === employee.id,
      )
      .sort((a, b) => getTransactionFilterDate(b).localeCompare(getTransactionFilterDate(a)));
  }, [employee, transactions]);

  const totalPaid = useMemo(() => {
    return history
      .filter((t) => t.status === TransactionStatus.PAID)
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [history]);

  const totalOverpaymentVales = useMemo(() => {
    if (!employee) return 0;
    return getEmployeeTotalOverpaymentVales(employee, transactions, compensationHistory);
  }, [employee, transactions, compensationHistory]);

  const employeeSalaryHistory = useMemo(() => {
    if (!employee) return [];
    return compensationHistory
      .filter((entry) => entry.employeeId === employee.id && entry.effectiveMonth !== '1970-01')
      .sort((a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth));
  }, [employee, compensationHistory]);

  // Total de vales pendentes (qualquer mês)
  const pendingValesTotal = useMemo(() => {
    return history
      .filter(
        (t) =>
          t.status === TransactionStatus.PENDING &&
          t.category !== Category.SALARY,
      )
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [history]);

  const [settlingTransaction, setSettlingTransaction] = useState<Transaction | null>(null);

  // Histórico agrupado por mês (sanfona), do mais recente ao mais antigo
  const groupedHistory = useMemo(() => {
    const groups = new Map<string, { monthKey: string; items: Transaction[]; total: number }>();
    for (const t of history) {
      const key = getTransactionFilterDate(t).slice(0, 7);
      const group = groups.get(key) ?? { monthKey: key, items: [], total: 0 };
      group.items.push(t);
      group.total += t.amount;
      groups.set(key, group);
    }
    return [...groups.values()].sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [history]);

  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Ao abrir/trocar de colaborador, expande só o mês mais recente
    if (groupedHistory.length > 0) {
      setExpandedMonths(new Set([groupedHistory[0].monthKey]));
    } else {
      setExpandedMonths(new Set());
    }
  }, [employee?.id, groupedHistory.length > 0 ? groupedHistory[0].monthKey : '']);

  const toggleMonth = (key: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const formatMonthLabel = (monthKey: string) => {
    const [y, m] = monthKey.split('-').map(Number);
    const label = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  useEffect(() => {
    if (!isOpen) setIsValeModalOpen(false);
  }, [isOpen]);

  const payroll = useMemo(() => {
    if (!employee) return null;
    return computeEmployeeAmountToPay(employee, transactions);
  }, [employee, transactions]);

  if (!isOpen || !formData || !employee) return null;

  const handleSave = () => {
    if (!formData || !employee) return;
    const salaryChanged = formData.salary !== employee.salary;
    const bonusChanged = (formData.bonus ?? 0) !== (employee.bonus ?? 0);
    if (salaryChanged || bonusChanged) {
      onUpdateEmployee(formData, { compensationEffectiveMonth });
    } else {
      onUpdateEmployee(formData);
    }
    setIsEditing(false);
  };

  const handleStatusClick = (transaction: Transaction) => {
    if (!onToggleStatus) return;
    if (transaction.status === TransactionStatus.PENDING) {
      setSettlingTransaction(transaction);
      return;
    }
    onToggleStatus(transaction.id);
  };

  const handleConfirmSettlement = (paidDate: string, partialAmount?: number) => {
    if (!settlingTransaction || !onToggleStatus) return;
    onToggleStatus(settlingTransaction.id, paidDate, partialAmount);
    setSettlingTransaction(null);
  };

  const handleRegisterVale = async (payload: {
    description: string;
    amount: number;
    date: string;
    status: TransactionStatus;
  }) => {
    if (!employee || !onAddTransaction) return;
    await onAddTransaction({
      id: generateId(),
      description: payload.description,
      amount: payload.amount,
      category: Category.EMPLOYEE_VOUCHER,
      type: TransactionType.EXPENSE,
      date: payload.date,
      paidDate: payload.status === TransactionStatus.PAID ? payload.date : undefined,
      status: payload.status,
      paymentMethod: 'PIX',
      employeeId: employee.id,
    });
    toast.success(
      payload.status === TransactionStatus.PENDING
        ? 'Vale pendente registrado.'
        : 'Vale baixado e descontado da folha do mês.',
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <SettlementDateModal
        transaction={settlingTransaction}
        onClose={() => setSettlingTransaction(null)}
        onConfirm={handleConfirmSettlement}
      />
      <EmployeeValeModal
        isOpen={isValeModalOpen}
        employee={employee}
        amountToPay={payroll?.amountToPay ?? 0}
        heading="Baixar vale"
        submitPaidLabel="Baixar vale"
        onClose={() => setIsValeModalOpen(false)}
        onSubmit={handleRegisterVale}
      />
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-vybe-card border border-gray-700 rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden animate-bar-grow origin-center max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-[#2A2A2A] p-4 flex justify-between items-center border-b border-gray-700 shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-gradient-to-br from-vybe-accent to-orange-800 rounded-full flex items-center justify-center border border-gray-700 shadow-lg">
                <User className="text-white" size={20} />
             </div>
             <div>
                <h3 className="text-white font-bold text-lg">{employee.name}</h3>
                <p className="text-xs text-gray-400">{employee.role}</p>
             </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && onAddTransaction && (
              <button
                type="button"
                onClick={() => setIsValeModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-orange-900/30 hover:bg-orange-900/50 text-orange-300 rounded-lg text-xs font-medium transition-colors border border-orange-800/50"
              >
                <Ticket size={14} /> Baixar vale
              </button>
            )}
            {!isEditing ? (
                <button 
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium transition-colors border border-gray-700"
                >
                    <Edit2 size={14} /> Editar Dados
                </button>
            ) : (
                <button 
                    onClick={handleSave}
                    className="flex items-center gap-2 px-3 py-1.5 bg-vybe-green hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors shadow-lg shadow-green-900/20"
                >
                    <Save size={14} /> Salvar Alterações
                </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors bg-gray-800 p-2 rounded-full hover:bg-gray-700 ml-2">
                <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column: Details & Observations */}
                <div className="lg:col-span-1 space-y-6">
                    
                    {/* Personal Data Card */}
                    <div className="bg-[#121212] rounded-xl border border-gray-800 p-5">
                        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                            <User size={16} className="text-vybe-accent" /> Dados Cadastrais
                        </h4>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Nome Completo</label>
                                {isEditing ? (
                                    <input 
                                        className="w-full bg-vybe-card border border-gray-700 rounded p-2 text-sm text-white focus:border-vybe-accent outline-none"
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                    />
                                ) : (
                                    <p className="text-sm text-white font-medium">{formData.name}</p>
                                )}
                            </div>
                            
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Cargo / Função</label>
                                {isEditing ? (
                                    <input 
                                        className="w-full bg-vybe-card border border-gray-700 rounded p-2 text-sm text-white focus:border-vybe-accent outline-none"
                                        value={formData.role}
                                        onChange={e => setFormData({...formData, role: e.target.value})}
                                    />
                                ) : (
                                    <p className="text-sm text-white font-medium">{formData.role}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Salário</label>
                                    {isEditing ? (
                                        <input 
                                            type="number"
                                            className="w-full bg-vybe-card border border-gray-700 rounded p-2 text-sm text-white focus:border-vybe-accent outline-none"
                                            value={formData.salary}
                                            onChange={e => setFormData({...formData, salary: parseFloat(e.target.value) || 0})}
                                        />
                                    ) : (
                                        <div className="flex items-center gap-1 text-vybe-green font-bold text-sm">
                                            <DollarSign size={12} /> {formatCurrency(formData.salary)}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Bônus (mês)</label>
                                    {isEditing ? (
                                        <input 
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className="w-full bg-vybe-card border border-gray-700 rounded p-2 text-sm text-white focus:border-vybe-accent outline-none"
                                            value={formData.bonus ?? 0}
                                            onChange={e => setFormData({...formData, bonus: parseFloat(e.target.value) || 0})}
                                        />
                                    ) : (
                                        <div className="flex items-center gap-1 text-white text-sm">
                                            <DollarSign size={12} /> {formatCurrency(formData.bonus ?? 0)}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {isEditing && (
                              <div>
                                <label className="text-xs text-gray-500 block mb-1">
                                  Salário/bônus válidos a partir de
                                </label>
                                <input
                                  type="month"
                                  className="w-full bg-vybe-card border border-gray-700 rounded p-2 text-sm text-white focus:border-vybe-accent outline-none"
                                  value={compensationEffectiveMonth}
                                  onChange={(e) => setCompensationEffectiveMonth(e.target.value)}
                                />
                                <p className="text-[10px] text-gray-600 mt-1">
                                  Usado no cálculo de vales de meses anteriores e futuros.
                                </p>
                              </div>
                            )}

                            {!isEditing && employeeSalaryHistory.length > 0 && (
                              <div className="bg-[#1E1E1E] rounded-lg border border-gray-800 p-3">
                                <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1">
                                  <History size={10} /> Histórico salarial
                                </p>
                                <ul className="space-y-1">
                                  {employeeSalaryHistory.map((entry) => (
                                    <li
                                      key={`${entry.employeeId}-${entry.effectiveMonth}`}
                                      className="flex justify-between text-xs text-gray-400"
                                    >
                                      <span>{formatMonthLabel(entry.effectiveMonth)}</span>
                                      <span className="text-white">
                                        {formatCurrency(entry.salary)}
                                        {(entry.bonus ?? 0) > 0 && (
                                          <span className="text-gray-500">
                                            {' '}+ {formatCurrency(entry.bonus)} bônus
                                          </span>
                                        )}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {payroll && (
                              <div className="bg-[#1E1E1E] rounded-lg border border-amber-900/30 p-3 space-y-1">
                                <div className="flex justify-between items-center gap-2">
                                  <span className="text-xs text-gray-500">Folha do mês</span>
                                  {onAddTransaction && !isEditing && (
                                    <button
                                      type="button"
                                      onClick={() => setIsValeModalOpen(true)}
                                      className="text-[10px] text-orange-400 hover:text-orange-300 underline"
                                    >
                                      Baixar vale
                                    </button>
                                  )}
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-500">Vales do mês (pagos)</span>
                                  <span className="text-orange-400/90">− {formatCurrency(payroll.linkedExpenses)}</span>
                                </div>
                                {monthVales.length > 0 && (
                                  <ul className="text-[10px] text-gray-600 space-y-0.5 pl-1 border-l border-gray-700 ml-1">
                                    {monthVales.map((v) => (
                                      <li key={v.id} className="truncate">
                                        {v.description} · {formatCurrency(v.amount)}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                {payroll.salaryPaid > 0 && (
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Salário pago (mês)</span>
                                    <span className="text-gray-300">− {formatCurrency(payroll.salaryPaid)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between text-sm font-bold border-t border-gray-700 pt-2">
                                  <span className={payroll.amountToPay <= 0 ? 'text-green-400/90' : 'text-amber-400/90'}>
                                    A pagar
                                  </span>
                                  <span className={payroll.amountToPay <= 0 ? 'text-green-400' : 'text-amber-400'}>
                                    {formatCurrency(payroll.amountToPay)}
                                  </span>
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-1 gap-3">
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Dia Pagto.</label>
                                    {isEditing ? (
                                        <input 
                                            type="number"
                                            className="w-full bg-vybe-card border border-gray-700 rounded p-2 text-sm text-white focus:border-vybe-accent outline-none"
                                            value={formData.paymentDay}
                                            onChange={e => setFormData({...formData, paymentDay: parseInt(e.target.value)})}
                                        />
                                    ) : (
                                        <div className="flex items-center gap-1 text-white text-sm">
                                            <Calendar size={12} /> Dia {formData.paymentDay}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Chave PIX</label>
                                {isEditing ? (
                                    <input 
                                        className="w-full bg-vybe-card border border-gray-700 rounded p-2 text-sm text-white focus:border-vybe-accent outline-none"
                                        value={formData.pixKey}
                                        onChange={e => setFormData({...formData, pixKey: e.target.value})}
                                    />
                                ) : (
                                    <div className="flex items-center gap-2 bg-[#1E1E1E] p-2 rounded border border-gray-700">
                                        <CreditCard size={14} className="text-gray-400" />
                                        <span className="text-xs text-gray-300 break-all">{formData.pixKey || 'Não informada'}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Observations Card */}
                    <div className="bg-[#121212] rounded-xl border border-gray-800 p-5 flex-1 flex flex-col">
                        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                            <FileText size={16} className="text-vybe-accent" /> Observações
                        </h4>
                        <textarea
                            className="w-full bg-vybe-card border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-vybe-accent outline-none resize-none h-32 custom-scrollbar"
                            placeholder="Adicione notas sobre desempenho, aumentos, férias, etc..."
                            value={formData.observations || ''}
                            onChange={(e) => setFormData({...formData, observations: e.target.value})}
                        ></textarea>
                         {!isEditing && (
                            <div className="mt-2 text-right">
                                <button 
                                    onClick={handleSave}
                                    className="text-xs text-vybe-accent hover:text-white underline"
                                >
                                    Salvar Nota
                                </button>
                            </div>
                         )}
                    </div>
                </div>

                {/* Right Column: Financial History */}
                <div className="lg:col-span-2">
                    <div className="bg-[#121212] rounded-xl border border-gray-800 h-full flex flex-col">
                        <div className="p-5 border-b border-gray-800 flex flex-wrap justify-between items-center gap-2">
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                <TrendingDown size={16} className="text-vybe-red" /> Pagamentos e vales
                            </h4>
                            <div className="flex flex-wrap items-center gap-3 text-xs">
                                {pendingValesTotal > 0 && (
                                    <span
                                        className="flex items-center gap-1 text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-2 py-1 rounded-full font-bold"
                                        title="Soma dos vales pendentes (clique no status do lançamento para dar baixa)"
                                    >
                                        <Clock size={12} /> Vales pendentes: {formatCurrency(pendingValesTotal)}
                                    </span>
                                )}
                                <span>
                                    <span className="text-gray-500">Total em vales: </span>
                                    <span className="text-yellow-400 font-bold">{formatCurrency(totalOverpaymentVales)}</span>
                                </span>
                                <span>
                                    <span className="text-gray-500">Total Pago: </span>
                                    <span className="text-white font-bold">{formatCurrency(totalPaid)}</span>
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                            {history.length === 0 ? (
                                <div className="h-48 flex flex-col items-center justify-center text-gray-500">
                                    <p className="text-sm">Nenhum pagamento registrado.</p>
                                    <p className="text-xs mt-1">Registre vales em Despesas ou pague o salário pelo botão $.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-800">
                                    {groupedHistory.map((group) => {
                                        const isExpanded = expandedMonths.has(group.monthKey);
                                        return (
                                            <div key={group.monthKey}>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleMonth(group.monthKey)}
                                                    className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-[#1E1E1E] hover:bg-[#252525] transition-colors sticky top-0"
                                                    aria-expanded={isExpanded}
                                                >
                                                    <span className="flex items-center gap-2 text-sm font-bold text-white">
                                                        <ChevronDown
                                                            size={16}
                                                            className={`text-gray-500 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                                                        />
                                                        {formatMonthLabel(group.monthKey)}
                                                        <span className="text-[10px] font-medium text-gray-500 bg-[#121212] px-1.5 py-0.5 rounded-full border border-gray-700">
                                                            {group.items.length} {group.items.length === 1 ? 'lançamento' : 'lançamentos'}
                                                        </span>
                                                    </span>
                                                    <span className="text-sm font-bold text-vybe-red whitespace-nowrap">
                                                        - {formatCurrency(group.total)}
                                                    </span>
                                                </button>

                                                {isExpanded && (
                                                    <table className="w-full text-left border-collapse">
                                                        <tbody className="divide-y divide-gray-800/70">
                                                            {group.items.map(t => {
                                                                const isPaid = t.status === TransactionStatus.PAID;
                                                                return (
                                                                <tr key={t.id} className="hover:bg-gray-800/50 transition-colors">
                                                                    <td className="p-3 pl-10 text-xs text-gray-400 font-mono whitespace-nowrap w-28">{formatDate(t.date)}</td>
                                                                    <td className="p-3 text-sm text-white">{t.description}</td>
                                                                    <td className="p-3 text-center whitespace-nowrap w-28">
                                                                        {onToggleStatus ? (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleStatusClick(t)}
                                                                                className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border transition-all ${
                                                                                    isPaid
                                                                                        ? 'bg-vybe-green/10 text-vybe-green border-vybe-green/20 hover:bg-vybe-green hover:text-white'
                                                                                        : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500 hover:text-white'
                                                                                }`}
                                                                                title={isPaid ? 'Pago — clique para voltar a pendente' : 'Pendente — clique para dar baixa (total ou parcial)'}
                                                                            >
                                                                                {isPaid ? <CheckCircle size={10} /> : <Clock size={10} />}
                                                                                {isPaid ? 'Pago' : 'Pendente'}
                                                                            </button>
                                                                        ) : (
                                                                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                                                                isPaid
                                                                                    ? 'bg-vybe-green/10 text-vybe-green border-vybe-green/20'
                                                                                    : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                                                            }`}>
                                                                                {isPaid ? <CheckCircle size={10} /> : <Clock size={10} />}
                                                                                {isPaid ? 'Pago' : 'Pendente'}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className={`p-3 text-sm font-bold text-right whitespace-nowrap ${isPaid ? 'text-vybe-red' : 'text-yellow-500'}`}>
                                                                        - {formatCurrency(t.amount)}
                                                                    </td>
                                                                </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="p-3 border-t border-gray-800 bg-[#1E1E1E] rounded-b-xl">
                            <p className="text-[10px] text-gray-500 text-center">
                                Salários e vales do colaborador. Clique no status para dar baixa total ou parcial.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetailsModal;