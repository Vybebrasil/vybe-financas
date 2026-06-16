import React from 'react';
import { Transaction, TransactionType, Client, CompanySettings } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { getTransactionCashDate } from '../src/services/transactionDates';
import { X, Printer, FileCheck, Download } from 'lucide-react';
import { useToast } from './ToastProvider';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  client?: Client | null;
  companySettings: CompanySettings; // Adiciona settings
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, transaction, client, companySettings }) => {
  const toast = useToast();

  if (!isOpen || !transaction) return null;

  const isIncome = transaction.type === TransactionType.INCOME;
  const companyName = companySettings.name;
  const companyCNPJ = companySettings.cnpj;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const win = window as any;
    if (!win.jspdf) {
      toast.info('Biblioteca PDF carregando...');
      return;
    }

    const { jsPDF } = win.jspdf;
    const doc = new jsPDF();
    
    // Configurações visuais
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    // --- Borda Decorativa ---
    doc.setLineWidth(0.5);
    doc.setDrawColor(50, 50, 50);
    doc.rect(10, 10, pageWidth - 20, 277); // Borda da página A4
    doc.rect(12, 12, pageWidth - 24, 273); // Borda interna dupla

    // --- Cabeçalho ---
    let yPos = 30;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0);
    const title = isIncome ? 'RECIBO DE PAGAMENTO' : 'COMPROVANTE DE PAGAMENTO';
    doc.text(title, pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Nº Transação: #${transaction.id}`, pageWidth / 2, yPos, { align: 'center' });

    // --- Linha Divisória ---
    yPos += 15;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);

    // --- Valor e Data ---
    yPos += 20;
    
    // Caixa do Valor
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margin, yPos, 80, 25, 3, 3, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Valor", margin + 5, yPos + 8);
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(transaction.amount), margin + 5, yPos + 19);

    // Data (Alinhada a direita)
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text("Data do Pagamento", pageWidth - margin, yPos + 8, { align: 'right' });
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(formatDate(getTransactionCashDate(transaction)), pageWidth - margin, yPos + 19, { align: 'right' });

    // Forma de Pagamento
    yPos += 25;
    if (transaction.paymentMethod) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.setFont("helvetica", "normal");
        doc.text("Forma de Pagamento: " + transaction.paymentMethod, margin, yPos);
    }

    // --- Corpo do Texto ---
    yPos += 20;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);

    let bodyText = "";
    if (isIncome) {
        const pagador = client ? `${client.name} (CNPJ: ${client.cnpj})` : 'Cliente / Pagador não identificado';
        bodyText = `Recebemos de ${pagador}, a importância supra de ${formatCurrency(transaction.amount)}, referente a: ${transaction.description}.`;
    } else {
        const beneficiario = transaction.description;
        bodyText = `Pagamos a ${beneficiario}, a importância supra de ${formatCurrency(transaction.amount)}, referente a serviços/produtos prestados.`;
    }

    // Quebra de linha automática
    const splitText = doc.splitTextToSize(bodyText, contentWidth);
    doc.text(splitText, margin, yPos);

    yPos += (splitText.length * 7) + 10;
    doc.text("Para maior clareza, firmamos o presente.", margin, yPos);

    // --- Assinaturas ---
    const bottomY = 220;
    
    // Assinatura 1 (Esquerda)
    doc.setDrawColor(0, 0, 0);
    doc.line(margin, bottomY, margin + 70, bottomY);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(companyName, margin + 35, bottomY + 5, { align: 'center' });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(companyCNPJ, margin + 35, bottomY + 10, { align: 'center' });
    doc.text("Emitente", margin + 35, bottomY + 15, { align: 'center' });

    // Assinatura 2 (Direita)
    doc.line(pageWidth - margin - 70, bottomY, pageWidth - margin, bottomY);
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    const signName = isIncome ? (client ? client.contactPerson : 'Cliente') : 'Beneficiário';
    doc.text(signName, pageWidth - margin - 35, bottomY + 5, { align: 'center' });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(isIncome ? 'Pagador' : 'Recebedor', pageWidth - margin - 35, bottomY + 15, { align: 'center' });

    // --- Rodapé ---
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Gerado via Vybe Finanças", pageWidth / 2, 280, { align: 'center' });

    doc.save(`Recibo_${transaction.id}.pdf`);
  };

  // Texto descritivo para visualização HTML
  const getBodyText = () => {
    if (isIncome) {
      return (
        <>
          Recebemos de <strong>{client ? client.name : 'Cliente / Pagador não identificado'}</strong> {client?.cnpj ? `(CNPJ: ${client.cnpj})` : ''}, 
          a importância de <strong>{formatCurrency(transaction.amount)}</strong>, 
          referente a {transaction.description}.
        </>
      );
    } else {
      return (
        <>
          Pagamos a <strong>{transaction.description}</strong>, 
          a importância de <strong>{formatCurrency(transaction.amount)}</strong>, 
          referente a serviços/produtos prestados.
        </>
      );
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop (Hidden on print) */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity print:hidden" 
        onClick={onClose}
      ></div>

      {/* Modal Content - Agora com fundo cinza e mais largo */}
      <div className="relative bg-[#E5E7EB] text-black rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-bar-grow origin-center flex flex-col max-h-[90vh] print:shadow-none print:w-full print:max-w-none print:rounded-none print:absolute print:inset-0 print:animate-none print:bg-white print:h-full">
        
        {/* Actions Header (Hidden on print) */}
        <div className="bg-[#1E1E1E] p-4 flex justify-between items-center shrink-0 border-b border-gray-700 print:hidden">
          <h3 className="text-white font-bold flex items-center gap-2">
            <FileCheck className="text-vybe-accent" size={20} />
            Visualizar Recibo
          </h3>
          <div className="flex items-center gap-2">
            <button 
                onClick={handleDownloadPDF}
                className="bg-[#2A2A2A] hover:bg-[#333] text-white border border-gray-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm transition-colors"
                title="Baixar PDF"
            >
                <Download size={16} /> PDF
            </button>
            <button 
                onClick={handlePrint}
                className="bg-vybe-accent hover:bg-[#E65C00] text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm transition-colors shadow-lg"
            >
                <Printer size={16} /> Imprimir
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors bg-gray-800 p-2 rounded-full hover:bg-gray-700">
                <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center print:p-0 print:overflow-visible">
            
            {/* The Paper Sheet */}
            <div className="bg-white p-8 md:p-12 shadow-xl w-full max-w-[210mm] text-black font-serif relative receipt-container min-h-[297mm] md:min-h-[600px] flex flex-col justify-between print:shadow-none print:w-full print:max-w-none print:min-h-0 print:h-full">
                
                {/* Border for aesthetics */}
                <div className="border-4 border-double border-gray-800 p-8 h-full flex flex-col justify-between relative">
                    
                    {/* Header */}
                    <div className="text-center border-b-2 border-gray-800 pb-6 mb-8 relative">
                         {/* Optional Logo in Receipt Header */}
                         {companySettings.logoUrl && (
                             <img src={companySettings.logoUrl} alt="Logo" className="w-16 h-16 object-contain absolute left-0 top-0 hidden md:block" />
                         )}

                        <h1 className="text-3xl font-bold uppercase tracking-widest mb-2">
                            {isIncome ? 'Recibo de Pagamento' : 'Comprovante'}
                        </h1>
                        <p className="text-sm text-gray-600 font-sans">Nº Transação: #{transaction.id}</p>
                    </div>

                    {/* Amount & Date */}
                    <div className="flex justify-between items-center mb-8 font-sans">
                        <div className="bg-gray-100 p-4 rounded border border-gray-300">
                            <span className="text-sm text-gray-500 block">Valor</span>
                            <span className="text-2xl font-bold">{formatCurrency(transaction.amount)}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-sm text-gray-500 block">Data do Pagamento</span>
                            <span className="text-xl font-bold">{formatDate(getTransactionCashDate(transaction))}</span>
                            {transaction.paymentMethod && (
                                <span className="text-xs text-gray-500 block mt-1 uppercase">Via {transaction.paymentMethod}</span>
                            )}
                        </div>
                    </div>

                    {/* Body Text */}
                    <div className="text-lg leading-relaxed mb-12 text-justify">
                        {getBodyText()}
                        <br /><br />
                        Para maior clareza, firmamos o presente.
                    </div>

                    {/* Footer / Signatures */}
                    <div className="mt-auto">
                        <div className="flex justify-between items-end gap-12">
                             <div className="flex-1 text-center">
                                <div className="border-b border-black mb-2"></div>
                                <p className="font-bold text-sm">{companyName}</p>
                                <p className="text-xs text-gray-500">{companyCNPJ}</p>
                                <p className="text-[10px] text-gray-400 font-sans mt-1">Emitente</p>
                             </div>
                             
                             <div className="flex-1 text-center">
                                <div className="border-b border-black mb-2"></div>
                                <p className="font-bold text-sm">
                                    {isIncome 
                                        ? (client ? client.contactPerson : 'Assinatura do Cliente') 
                                        : (client ? client.contactPerson : 'Beneficiário')
                                    }
                                </p>
                                <p className="text-[10px] text-gray-400 font-sans mt-1">
                                    {isIncome ? 'Pagador' : 'Recebedor'}
                                </p>
                             </div>
                        </div>
                        
                        <div className="mt-8 pt-4 border-t border-gray-200 text-center">
                            <p className="text-xs text-gray-400 font-sans italic">
                                Este documento não possui valor fiscal, servindo apenas para controle financeiro e conferência.
                            </p>
                            <p className="text-[10px] text-gray-300 font-sans mt-1">
                                Gerado em {new Date().toLocaleDateString()} às {new Date().toLocaleTimeString()} via Vybe Finanças.
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          /* Override global hide for receipt */
          .receipt-container, .receipt-container * {
            visibility: visible;
          }
          .receipt-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            background: white;
            color: black;
            z-index: 9999;
          }
          /* Hide scrollbars */
          ::-webkit-scrollbar { display: none; }
          
          /* Remove print margins set globally if needed for full page receipt */
          @page { margin: 0.5cm; }
        }
      `}</style>
    </div>
  );
};

export default ReceiptModal;