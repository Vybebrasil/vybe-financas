import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, FileText, ExternalLink, Copy, Check } from 'lucide-react';
import { supabaseUrl } from '../src/services/supabase';
import { formatCurrency, formatDate } from '../utils';

interface PortalData {
  companyName: string;
  client: {
    name: string;
    contactPerson: string;
    activePlan: string;
    monthlyFee: number;
    dueDay: number;
  };
  payment: {
    pixKey: string | null;
    paymentLink: string | null;
    instructions: string | null;
  };
  pendingCharge: {
    description: string;
    amount: number;
    dueDate: string;
  } | null;
  transactions: Array<{
    description: string;
    amount: number;
    date: string;
    status: string;
    type: string;
  }>;
  contracts: Array<{
    title: string;
    status: string;
    pdfUrl: string | null;
    pdfFileName: string | null;
    startDate: string;
    endDate: string | null;
  }>;
}

const ClientPortalPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Link inválido');
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const res = await fetch(
          `${supabaseUrl}/functions/v1/client-portal?token=${encodeURIComponent(token)}`,
        );
        const body = await res.json();
        if (!res.ok) {
          setError(body.error ?? 'Não foi possível carregar o portal');
          return;
        }
        setData(body as PortalData);
      } catch {
        setError('Erro de conexão. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token]);

  const copyPix = async () => {
    if (!data?.payment.pixKey) return;
    await navigator.clipboard.writeText(data.payment.pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center text-white">
        <Loader2 className="animate-spin text-[#FF6600]" size={40} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-[#1E1E1E] border border-gray-800 rounded-2xl p-8">
          <h1 className="text-xl font-bold text-white mb-2">Portal indisponível</h1>
          <p className="text-gray-400 text-sm">{error ?? 'Link inválido ou expirado.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white font-sans">
      <header className="border-b border-gray-800 bg-[#1A1A1A]">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <p className="text-xs text-gray-500 uppercase tracking-wider">{data.companyName}</p>
          <h1 className="text-2xl font-bold mt-1">Olá, {data.client.contactPerson || data.client.name}</h1>
          <p className="text-sm text-gray-400 mt-1">
            Plano {data.client.activePlan} · Vencimento dia {data.client.dueDay}
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {data.pendingCharge && (
          <section className="bg-gradient-to-br from-[#FF6600]/20 to-orange-900/10 border border-[#FF6600]/30 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[#FF6600] uppercase tracking-wide mb-2">
              Fatura em aberto
            </h2>
            <p className="text-lg font-bold">{data.pendingCharge.description}</p>
            <p className="text-3xl font-bold text-white mt-2">
              {formatCurrency(data.pendingCharge.amount)}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Vencimento: {formatDate(data.pendingCharge.dueDate)}
            </p>
          </section>
        )}

        {(data.payment.pixKey || data.payment.paymentLink) && (
          <section className="bg-[#1E1E1E] border border-gray-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
              Formas de pagamento
            </h2>
            {data.payment.pixKey && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-1">Chave PIX</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-[#121212] px-3 py-2 rounded-lg text-sm break-all border border-gray-700">
                    {data.payment.pixKey}
                  </code>
                  <button
                    type="button"
                    onClick={() => void copyPix()}
                    className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                    title="Copiar PIX"
                  >
                    {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                  </button>
                </div>
              </div>
            )}
            {data.payment.paymentLink && (
              <a
                href={data.payment.paymentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF6600] hover:bg-orange-600 rounded-lg text-sm font-medium transition-colors"
              >
                Pagar online <ExternalLink size={16} />
              </a>
            )}
            {data.payment.instructions && (
              <p className="text-sm text-gray-400 mt-4 whitespace-pre-wrap">{data.payment.instructions}</p>
            )}
          </section>
        )}

        {data.contracts.length > 0 && (
          <section className="bg-[#1E1E1E] border border-gray-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
              Contratos
            </h2>
            <ul className="space-y-3">
              {data.contracts.map((c, i) => (
                <li key={i} className="flex items-center justify-between gap-4 py-2 border-b border-gray-800 last:border-0">
                  <div>
                    <p className="font-medium">{c.title}</p>
                    <p className="text-xs text-gray-500">
                      {c.status} · desde {formatDate(c.startDate)}
                    </p>
                  </div>
                  {c.pdfUrl && (
                    <a
                      href={c.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-[#FF6600] hover:underline shrink-0"
                    >
                      <FileText size={16} /> PDF
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="bg-[#1E1E1E] border border-gray-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
            Histórico de pagamentos
          </h2>
          {data.transactions.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum lançamento registrado.</p>
          ) : (
            <ul className="divide-y divide-gray-800">
              {data.transactions.map((t, i) => (
                <li key={i} className="flex justify-between items-center py-3 text-sm">
                  <div>
                    <p className="text-white">{t.description}</p>
                    <p className="text-xs text-gray-500">{formatDate(t.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className={t.type === 'INCOME' ? 'text-green-400 font-medium' : 'text-red-400'}>
                      {t.type === 'INCOME' ? '+' : '-'}
                      {formatCurrency(t.amount)}
                    </p>
                    <p className="text-[10px] text-gray-500">{t.status === 'PAID' ? 'Pago' : 'Pendente'}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="text-center py-8 text-xs text-gray-600">
        Portal seguro · {data.companyName}
      </footer>
    </div>
  );
};

export default ClientPortalPage;
