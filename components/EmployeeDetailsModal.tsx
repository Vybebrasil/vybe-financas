import React, { useState, useEffect, useMemo } from 'react';
import { Employee, Transaction, TransactionType } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { computeEmployeeAmountToPay } from '../src/services/employeePayroll';
import { X, User, Save, Edit2, FileText, DollarSign, Calendar, CreditCard, TrendingDown } from 'lucide-react';

interface EmployeeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  transactions: Transaction[];
  onUpdateEmployee: (updatedEmployee: Employee) => void;
}

const EmployeeDetailsModal: React.FC<EmployeeDetailsModalProps> = ({ 
  isOpen, 
  onClose, 
  employee, 
  transactions,
  onUpdateEmployee 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  
  // Form States
  const [formData, setFormData] = useState<Employee | null>(null);

  useEffect(() => {
    if (employee) {
      setFormData({ ...employee });
    }
  }, [employee]);

  // Filter Transactions for History
  const history = useMemo(() => {
    if (!employee) return [];
    const term = employee.name.toLowerCase();
    return transactions.filter((t) => {
      if (t.type !== TransactionType.EXPENSE) return false;
      if (t.employeeId === employee.id) return true;
      return t.description.toLowerCase().includes(term);
    });
  }, [employee, transactions]);

  const totalPaid = useMemo(() => {
    return history.reduce((acc, curr) => acc + curr.amount, 0);
  }, [history]);

  const payroll = useMemo(() => {
    if (!employee) return null;
    return computeEmployeeAmountToPay(employee, transactions);
  }, [employee, transactions]);

  if (!isOpen || !formData || !employee) return null;

  const handleSave = () => {
    onUpdateEmployee(formData);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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

                            {payroll && (
                              <div className="bg-[#1E1E1E] rounded-lg border border-amber-900/30 p-3 space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-500">Despesas vinculadas (mês)</span>
                                  <span className="text-gray-300">− {formatCurrency(payroll.linkedExpenses)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold border-t border-gray-700 pt-2">
                                  <span className="text-amber-400/90">A pagar</span>
                                  <span className="text-amber-400">{formatCurrency(payroll.amountToPay)}</span>
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
                        <div className="p-5 border-b border-gray-800 flex justify-between items-center">
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                <TrendingDown size={16} className="text-vybe-red" /> Histórico de Pagamentos
                            </h4>
                            <div className="text-xs">
                                <span className="text-gray-500">Total Pago: </span>
                                <span className="text-white font-bold">{formatCurrency(totalPaid)}</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                            {history.length === 0 ? (
                                <div className="h-48 flex flex-col items-center justify-center text-gray-500">
                                    <p className="text-sm">Nenhum pagamento registrado.</p>
                                    <p className="text-xs mt-1">Lance o salário na aba "Despesas" para aparecer aqui.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-[#1E1E1E] sticky top-0">
                                        <tr className="text-gray-500 text-xs uppercase tracking-wider">
                                            <th className="p-3 font-medium">Data</th>
                                            <th className="p-3 font-medium">Descrição</th>
                                            <th className="p-3 font-medium text-right">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                        {history.map(t => (
                                            <tr key={t.id} className="hover:bg-gray-800/50 transition-colors">
                                                <td className="p-3 text-xs text-gray-400 font-mono">{formatDate(t.date)}</td>
                                                <td className="p-3 text-sm text-white">{t.description}</td>
                                                <td className="p-3 text-sm font-bold text-vybe-red text-right">
                                                    - {formatCurrency(t.amount)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="p-3 border-t border-gray-800 bg-[#1E1E1E] rounded-b-xl">
                            <p className="text-[10px] text-gray-500 text-center">
                                Histórico baseado em despesas que contenham "{employee.name}" na descrição.
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