import React, { useState, useEffect, useMemo } from 'react';
import {
  Category,
  CategoryConfig,
  CompanySettings,
  Transaction,
  TransactionType,
  TransactionStatus,
  Client,
  PaymentMethod,
  BankAccount,
} from '../types';
import {
  inferTransactionTypeForCategory,
  resolveCategories,
  CLIENT_PAYMENT_LABEL,
} from '../src/services/categories';
import { generateId } from '../utils';
import { PlusCircle, CheckCircle, Clock, Link as LinkIcon, CreditCard, QrCode, Barcode, Banknote, Upload, FileText, X, TrendingUp, TrendingDown, Save } from 'lucide-react';
import { api } from '../src/services/api';
import { useToast } from './ToastProvider';

interface TransactionFormProps {
  onAddTransaction: (transaction: Transaction) => void;
  onUpdateTransaction?: (transaction: Transaction) => Promise<void>;
  editingTransaction?: Transaction | null;
  onCancelEdit?: () => void;
  initialData?: {
    description: string;
    amount: number;
    category: string;
    type?: TransactionType;
    clientId?: string;
  } | null;
  clients: Client[];
  bankAccounts?: BankAccount[];
  companySettings?: CompanySettings;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  onAddTransaction,
  onUpdateTransaction,
  editingTransaction,
  onCancelEdit,
  initialData,
  clients,
  bankAccounts = [],
  companySettings,
}) => {
  const toast = useToast();
  const isEditing = Boolean(editingTransaction);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const categoryOptions = useMemo(
    () => resolveCategories(companySettings),
    [companySettings],
  );
  const defaultCategory =
    categoryOptions.find((c) => c.label === CLIENT_PAYMENT_LABEL)?.label ??
    categoryOptions[0]?.label ??
    Category.CLIENT_PAYMENT;

  const [category, setCategory] = useState<string>(defaultCategory);
  const [type, setType] = useState<TransactionType>(TransactionType.INCOME);
  const [status, setStatus] = useState<TransactionStatus>(TransactionStatus.PAID);
  const [clientId, setClientId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [bankAccountId, setBankAccountId] = useState<string>('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const defaultBankAccountId = bankAccounts.find((a) => a.isDefault)?.id ?? bankAccounts[0]?.id ?? '';
  const [isUploading, setIsUploading] = useState(false);

  // Clients are now passed via props


  useEffect(() => {
    if (editingTransaction) {
      setDescription(editingTransaction.description);
      setAmount(editingTransaction.amount.toString());
      setDate(editingTransaction.date.split('T')[0]);
      setCategory(editingTransaction.category);
      setType(editingTransaction.type);
      setStatus(editingTransaction.status);
      setClientId(editingTransaction.clientId ?? '');
      setPaymentMethod(editingTransaction.paymentMethod);
      setBankAccountId(editingTransaction.bankAccountId ?? '');
      setReceiptFile(null);
      return;
    }
    if (initialData) {
      setDescription(initialData.description);
      setAmount(initialData.amount.toString());
      setCategory(initialData.category);
      setType(initialData.type ?? TransactionType.INCOME);
      setClientId(initialData.clientId ?? '');
      setBankAccountId(initialData.bankAccountId ?? defaultBankAccountId);
      setDate(new Date().toISOString().split('T')[0]);
      setStatus(TransactionStatus.PAID);
      return;
    }
    setBankAccountId(defaultBankAccountId);
  }, [initialData, editingTransaction, defaultBankAccountId]);

  useEffect(() => {
    setType(inferTransactionTypeForCategory(category, companySettings));
  }, [category, companySettings]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setReceiptFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description || !amount || !date) return;

    setIsUploading(true);
    let receiptUrl = editingTransaction?.receiptUrl;

    try {
      if (receiptFile) {
        const url = await api.storage.uploadReceipt(receiptFile);
        if (url) receiptUrl = url;
      }

      const payload: Transaction = {
        id: editingTransaction?.id ?? generateId(),
        description,
        amount: Number(amount),
        type,
        category,
        date,
        status,
        clientId: clientId || undefined,
        bankAccountId: bankAccountId || undefined,
        paymentMethod,
        receiptUrl: receiptUrl || undefined,
      };

      if (isEditing && onUpdateTransaction) {
        await onUpdateTransaction(payload);
        onCancelEdit?.();
      } else {
        await onAddTransaction(payload);
        setDescription('');
        setAmount('');
        setClientId('');
        setType(TransactionType.INCOME);
        setStatus(TransactionStatus.PAID);
        setPaymentMethod('PIX');
        setReceiptFile(null);
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      const errorMessage = (error as { message?: string })?.message || 'Erro desconhecido';
      const errorDetails = (error as { details?: string })?.details || '';
      toast.error(`Erro ao salvar transação: ${errorMessage} ${errorDetails}`.trim());
    } finally {
      setIsUploading(false);
    }
  };

  const getPaymentIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'PIX': return <QrCode size={16} />;
      case 'CARTAO': return <CreditCard size={16} />;
      case 'BOLETO': return <Barcode size={16} />;
      case 'DINHEIRO': return <Banknote size={16} />;
      default: return <CreditCard size={16} />;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-vybe-card p-6 rounded-xl border border-gray-800 shadow-lg mb-8 relative overflow-hidden">
      {initialData && !isEditing && (
        <div className="absolute top-0 right-0 bg-vybe-accent text-white text-[10px] px-2 py-1 rounded-bl-lg font-bold uppercase tracking-wider">
          Preenchimento Automático
        </div>
      )}
      {isEditing && (
        <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] px-2 py-1 rounded-bl-lg font-bold uppercase tracking-wider">
          Editando
        </div>
      )}
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <span className="w-1 h-6 bg-vybe-accent rounded-full"></span>
        {isEditing ? 'Editar Transação' : 'Nova Transação'}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">

        {/* Description */}
        <div className="lg:col-span-4">
          <label className="block text-xs text-vybe-muted mb-1 font-medium">Descrição</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Recebimento Cliente X"
            className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-vybe-accent focus:ring-1 focus:ring-vybe-accent transition-all placeholder-gray-600"
            required
          />
        </div>

        {/* Amount */}
        <div className="lg:col-span-2">
          <label className="block text-xs text-vybe-muted mb-1 font-medium">Valor (R$)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            step="0.01"
            min="0"
            className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-vybe-accent focus:ring-1 focus:ring-vybe-accent transition-all placeholder-gray-600"
            required
          />
        </div>

        {/* Category */}
        <div className="lg:col-span-3">
          <label className="block text-xs text-vybe-muted mb-1 font-medium">Categoria</label>
          <div className="relative">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-vybe-accent focus:ring-1 focus:ring-vybe-accent transition-all appearance-none cursor-pointer"
            >
              {categoryOptions.map((cat: CategoryConfig) => (
                <option key={cat.id} value={cat.label}>
                  {cat.label}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
            </div>
          </div>
        </div>

        {/* Date */}
        <div className="lg:col-span-3">
          <label className="block text-xs text-vybe-muted mb-1 font-medium">Data</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-vybe-accent focus:ring-1 focus:ring-vybe-accent transition-all [color-scheme:dark]"
            required
          />
        </div>

        {/* --- ROW 2 --- */}

        {/* Payment Method */}
        <div className="lg:col-span-3">
          <label className="block text-xs text-vybe-muted mb-1 font-medium">Forma de Pagto</label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
              {getPaymentIcon(paymentMethod)}
            </div>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 pl-10 text-white focus:outline-none focus:border-vybe-accent focus:ring-1 focus:ring-vybe-accent transition-all appearance-none cursor-pointer"
            >
              <option value="PIX">PIX</option>
              <option value="CARTAO">Cartão de Crédito</option>
              <option value="BOLETO">Boleto</option>
              <option value="DINHEIRO">Dinheiro</option>
              <option value="OUTRO">Outro</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
            </div>
          </div>
        </div>

        {bankAccounts.length > 0 && (
          <div className="lg:col-span-3">
            <label className="block text-xs text-vybe-muted mb-1 font-medium">Conta bancária</label>
            <select
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
              className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-vybe-accent focus:ring-1 focus:ring-vybe-accent transition-all appearance-none cursor-pointer"
            >
              <option value="">Sem conta</option>
              {bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.isDefault ? ' (padrão)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Type Toggle */}
        <div className="lg:col-span-3">
          <label className="block text-xs text-vybe-muted mb-1 font-medium">Tipo</label>
          <div className="flex bg-[#121212] p-1 rounded-lg border border-gray-700 h-[46px]">
            <button
              type="button"
              onClick={() => setType(TransactionType.INCOME)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-md text-xs font-bold transition-all ${type === TransactionType.INCOME ? 'bg-vybe-green text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <TrendingUp size={14} /> Entrada
            </button>
            <button
              type="button"
              onClick={() => setType(TransactionType.EXPENSE)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-md text-xs font-bold transition-all ${type === TransactionType.EXPENSE ? 'bg-vybe-red text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <TrendingDown size={14} /> Saída
            </button>
          </div>
        </div>

        {/* Status Toggle */}
        <div className="lg:col-span-3">
          <label className="block text-xs text-vybe-muted mb-1 font-medium">Status da Transação</label>
          <div className="flex bg-[#121212] p-1 rounded-lg border border-gray-700 h-[46px]">
            <button
              type="button"
              onClick={() => setStatus(TransactionStatus.PAID)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-md text-xs font-bold transition-all ${status === TransactionStatus.PAID ? 'bg-vybe-green text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <CheckCircle size={14} /> Pago
            </button>
            <button
              type="button"
              onClick={() => setStatus(TransactionStatus.PENDING)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-md text-xs font-bold transition-all ${status === TransactionStatus.PENDING ? 'bg-yellow-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Clock size={14} /> Pendente
            </button>
          </div>
        </div>

        {/* Client Link (Cost Center) */}
        <div className="lg:col-span-3">
          <label className="block text-xs text-vybe-muted mb-1 font-medium">Vincular Cliente (Centro de Custo)</label>
          <div className="relative">
            <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 pl-9 text-white focus:outline-none focus:border-vybe-accent transition-all appearance-none cursor-pointer"
            >
              <option value="">-- Nenhum Vínculo --</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Receipt Upload */}
        <div className="lg:col-span-12">
          <label className="block text-xs text-vybe-muted mb-1 font-medium">Anexar Comprovante</label>
          <div className="flex items-center gap-4">
            <label className="cursor-pointer bg-[#1E1E1E] border border-dashed border-gray-600 hover:border-vybe-accent hover:bg-vybe-accent/5 transition-all rounded-lg p-4 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-white min-w-[150px]">
              <Upload size={20} />
              <span className="text-xs">Clique para enviar</span>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {receiptFile && (
              <div className="flex items-center gap-3 bg-[#1E1E1E] p-3 rounded-lg border border-gray-700 animate-in fade-in slide-in-from-left-2">
                <div className="bg-vybe-accent/20 p-2 rounded-md text-vybe-accent">
                  <FileText size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-white font-medium max-w-[200px] truncate">{receiptFile.name}</span>
                  <span className="text-[10px] text-gray-500">{(receiptFile.size / 1024).toFixed(1)} KB</span>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="text-gray-500 hover:text-red-500 p-1"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="lg:col-span-2 flex items-end gap-2">
          {isEditing && onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-4 py-3 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 text-sm font-medium"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={isUploading}
            className="flex-1 bg-vybe-accent hover:bg-[#E65C00] text-white font-bold p-3 rounded-lg flex items-center justify-center transition-colors shadow-lg shadow-orange-900/20 gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <Clock className="animate-spin" size={20} />
            ) : isEditing ? (
              <Save size={20} />
            ) : (
              <PlusCircle size={20} />
            )}
            {isUploading ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Adicionar'}
          </button>
        </div>
      </div>

    </form>
  );
};

export default TransactionForm;