import React, { useState, useEffect } from 'react';
import { Category, Transaction, TransactionType, TransactionStatus, Client, PaymentMethod } from '../types';
import { generateId } from '../utils';
import { PlusCircle, CheckCircle, Clock, Link as LinkIcon, CreditCard, QrCode, Barcode, Banknote, Upload, FileText, X } from 'lucide-react';
import { STORAGE_KEY_CLIENTS } from '../constants';
import { api } from '../src/services/api';

interface TransactionFormProps {
  onAddTransaction: (transaction: Transaction) => void;
  initialData?: {
    description: string;
    amount: number;
    category: Category;
  } | null;
  clients: Client[];
}

const TransactionForm: React.FC<TransactionFormProps> = ({ onAddTransaction, initialData, clients }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<Category>(Category.CLIENT_PAYMENT);
  const [type, setType] = useState<TransactionType>(TransactionType.INCOME);
  const [status, setStatus] = useState<TransactionStatus>(TransactionStatus.PAID);
  const [clientId, setClientId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Clients are now passed via props


  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      setDescription(initialData.description);
      setAmount(initialData.amount.toString());
      setCategory(initialData.category);
      setDate(new Date().toISOString().split('T')[0]);
      setStatus(TransactionStatus.PAID); // Default to paid when coming from quick actions
    }
  }, [initialData]);

  // Business Logic: Auto-assign type based on category
  useEffect(() => {
    switch (category) {
      case Category.CLIENT_PAYMENT:
        setType(TransactionType.INCOME);
        break;
      case Category.SALARY:
      case Category.ADS:
      case Category.TOOLS:
        setType(TransactionType.EXPENSE);
        break;
      default:
        break;
    }
  }, [category]);

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
    let receiptUrl = '';

    try {
      if (receiptFile) {
        // Upload File
        const url = await api.storage.uploadReceipt(receiptFile);
        if (url) receiptUrl = url;
      }

      const newTransaction: Transaction = {
        id: generateId(),
        description,
        amount: Number(amount),
        type,
        category,
        date,
        status,
        clientId: clientId || undefined,
        paymentMethod,
        receiptUrl: receiptUrl || undefined
      };

      await onAddTransaction(newTransaction);

      // Reset form
      setDescription('');
      setAmount('');
      setClientId('');
      setStatus(TransactionStatus.PAID);
      setPaymentMethod('PIX');
      setReceiptFile(null);
    } catch (error) {
      console.error("Error creating transaction:", error);
      console.error("Error creating transaction:", error);
      const errorMessage = (error as any)?.message || "Erro desconhecido";
      const errorDetails = (error as any)?.details || "";
      alert(`Erro ao criar transação: ${errorMessage} ${errorDetails}`);
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
      {initialData && (
        <div className="absolute top-0 right-0 bg-vybe-accent text-white text-[10px] px-2 py-1 rounded-bl-lg font-bold uppercase tracking-wider">
          Preenchimento Automático
        </div>
      )}
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <span className="w-1 h-6 bg-vybe-accent rounded-full"></span>
        Nova Transação
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
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-vybe-accent focus:ring-1 focus:ring-vybe-accent transition-all appearance-none cursor-pointer"
            >
              {Object.values(Category).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
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

        {/* Payment Method - NOVO CAMPO */}
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
        <div className="lg:col-span-4">
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
        <div className="lg:col-span-2 flex items-end">
          <button
            type="submit"
            disabled={isUploading}
            className="w-full bg-vybe-accent hover:bg-[#E65C00] text-white font-bold p-3 rounded-lg flex items-center justify-center transition-colors shadow-lg shadow-orange-900/20 gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? <Clock className="animate-spin" size={20} /> : <PlusCircle size={20} />}
            {isUploading ? 'Salvando...' : 'Adicionar'}
          </button>
        </div>
      </div>

      {/* Visual Indicator of Auto-Type */}
      <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
        <span className="font-semibold">Tipo:</span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${type === TransactionType.INCOME ? 'bg-vybe-green/20 text-vybe-green' : 'bg-vybe-red/20 text-vybe-red'}`}>
          {type === TransactionType.INCOME ? 'Entrada' : 'Saída'}
        </span>
      </div>
    </form>
  );
};

export default TransactionForm;