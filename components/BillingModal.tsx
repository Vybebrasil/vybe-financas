import React from 'react';
import { Client } from '../types';
import { formatCurrency, generateWhatsAppLink } from '../utils';
import { X, MessageCircle, CheckCircle, Smartphone } from 'lucide-react';

interface BillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  onConfirmToFinance: (client: Client) => void;
}

const BillingModal: React.FC<BillingModalProps> = ({ isOpen, onClose, client, onConfirmToFinance }) => {
  if (!isOpen || !client) return null;

  const handleSendWhatsApp = () => {
    const link = generateWhatsAppLink(client);
    window.open(link, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-vybe-card border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-bar-grow origin-center">
        
        {/* Header */}
        <div className="bg-[#2A2A2A] p-4 flex justify-between items-center border-b border-gray-700">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Smartphone className="text-vybe-accent" size={20} />
            Cobrança via WhatsApp
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-3 border border-gray-700">
               <span className="text-2xl font-bold text-white">{client.name.charAt(0)}</span>
            </div>
            <h2 className="text-lg font-bold text-white text-center">{client.name}</h2>
            <p className="text-sm text-gray-400">{client.activePlan}</p>
          </div>

          <div className="bg-[#121212] rounded-lg p-4 mb-6 border border-gray-800">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">Valor da Fatura:</span>
              <span className="text-xl font-bold text-vybe-green">{formatCurrency(client.monthlyFee)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Vencimento:</span>
              <span className="text-sm text-white font-medium">Dia {client.dueDay} deste mês</span>
            </div>
          </div>

          <p className="text-xs text-center text-gray-500 mb-6 px-4">
             Isso abrirá o WhatsApp Web com uma mensagem personalizada contendo os detalhes acima.
          </p>

          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={handleSendWhatsApp}
              className="w-full bg-[#25D366] hover:bg-[#1faa53] text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg"
            >
              <MessageCircle size={20} />
              Enviar no WhatsApp
            </button>

            <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-700"></div>
                <span className="flex-shrink mx-4 text-gray-500 text-xs">E TAMBÉM</span>
                <div className="flex-grow border-t border-gray-700"></div>
            </div>

            <button
              onClick={() => onConfirmToFinance(client)}
              className="w-full bg-vybe-card border border-vybe-accent text-vybe-accent hover:bg-vybe-accent hover:text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all"
            >
              <CheckCircle size={20} />
              Lançar no Financeiro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingModal;