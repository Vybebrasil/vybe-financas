import React, { useEffect, useMemo, useState } from 'react';
import {
  Client,
  CompanySettings,
  Contract,
  ContractParameters,
  ContractStatus,
} from '../types';
import { formatCurrency } from '../utils';
import { api } from '../src/services/api';
import { generateContractDocx } from '../src/services/contractDocx';
import { buildContractHtmlPreview } from '../src/services/contractPreview';
import {
  buildContractTemplateContext,
  DEFAULT_CONTRACT_PARAMETERS,
  mergeContractParameters,
  parametersFromClient,
  VYBE_CONTRACT_TEMPLATE_KEY,
} from '../src/services/contractTemplates';
import {
  Download,
  Eye,
  FileText,
  Loader2,
  Save,
  Settings2,
  Upload,
  FileUp,
  ExternalLink,
  Trash2,
  X,
} from 'lucide-react';
import ModalPortal from './ModalPortal';

const MAX_PDF_BYTES = 10 * 1024 * 1024;

interface ContractEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  clients: Client[];
  companySettings: CompanySettings;
  onSave: (contract: Contract, pdfFile?: File | null) => void | Promise<void>;
}

const STATUS_OPTIONS: ContractStatus[] = ['Pendente', 'Ativo', 'Encerrado', 'Cancelado'];

const emptyContract = (): Omit<Contract, 'id'> & { id?: string } => ({
  clientId: '',
  title: 'Contrato Vybe OS — Marketing Estratégico',
  amount: 0,
  status: 'Pendente',
  startDate: new Date().toISOString().slice(0, 10),
  dueDay: 20,
  templateKey: VYBE_CONTRACT_TEMPLATE_KEY,
  parameters: { ...DEFAULT_CONTRACT_PARAMETERS },
});

const ContractEditorModal: React.FC<ContractEditorModalProps> = ({
  isOpen,
  onClose,
  contract,
  clients,
  companySettings,
  onSave,
}) => {
  const [draft, setDraft] = useState(emptyContract());
  const [tab, setTab] = useState<'params' | 'preview'>('params');
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [removePdf, setRemovePdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTab('params');
    setError(null);
    setPdfFile(null);
    setRemovePdf(false);
    if (contract) {
      setDraft({
        ...contract,
        parameters: mergeContractParameters(contract.parameters),
        templateKey: contract.templateKey || VYBE_CONTRACT_TEMPLATE_KEY,
      });
    } else {
      setDraft(emptyContract());
    }
  }, [isOpen, contract]);

  const client = useMemo(
    () => clients.find((c) => c.id === draft.clientId),
    [clients, draft.clientId],
  );

  const templateContext = useMemo(() => {
    if (!draft.clientId) return null;
    const c: Contract = {
      id: contract?.id ?? 'draft',
      clientId: draft.clientId,
      title: draft.title,
      amount: Number(draft.amount) || 0,
      status: draft.status,
      startDate: draft.startDate,
      endDate: draft.endDate,
      dueDay: Number(draft.dueDay) || 1,
      parameters: draft.parameters,
      templateKey: draft.templateKey,
    };
    return buildContractTemplateContext(
      c,
      client,
      companySettings,
      mergeContractParameters(draft.parameters),
    );
  }, [draft, client, companySettings, contract?.id]);

  const previewHtml = useMemo(
    () => (templateContext ? buildContractHtmlPreview(templateContext) : ''),
    [templateContext],
  );

  const updateParams = (patch: Partial<ContractParameters>) => {
    setDraft((prev) => ({
      ...prev,
      parameters: { ...mergeContractParameters(prev.parameters), ...patch },
    }));
  };

  const handleClientChange = (clientId: string) => {
    const selected = clients.find((c) => c.id === clientId);
    setDraft((prev) => {
      const next = {
        ...prev,
        clientId,
        amount: selected?.monthlyFee ?? prev.amount,
        dueDay: selected?.dueDay ?? prev.dueDay,
        title: selected?.activePlan
          ? `Contrato Vybe OS — ${selected.activePlan}`
          : prev.title,
        parameters: {
          ...mergeContractParameters(prev.parameters),
          ...parametersFromClient(selected!),
        },
      };
      return next;
    });
  };

  const handlePdfPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setError('Envie apenas arquivos PDF.');
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setError('O PDF deve ter no máximo 10 MB.');
      return;
    }
    setPdfFile(file);
    setRemovePdf(false);
    setError(null);
  };

  const handleSave = async () => {
    if (!draft.clientId || !draft.title) {
      setError('Selecione o cliente e informe o título do contrato.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let pdfUrl = removePdf ? undefined : draft.pdfUrl;
      let pdfFileName = removePdf ? undefined : draft.pdfFileName;
      let pendingPdf: File | null = null;

      if (pdfFile) {
        if (contract?.id) {
          pdfUrl = await api.storage.uploadContractPdf(pdfFile, contract.id);
          pdfFileName = pdfFile.name;
        } else {
          pendingPdf = pdfFile;
        }
      }

      const payload: Contract = {
        id: contract?.id ?? '',
        clientId: draft.clientId,
        title: draft.title.trim(),
        amount: Number(draft.amount) || 0,
        status: draft.status,
        startDate: draft.startDate,
        endDate: draft.endDate || undefined,
        dueDay: Number(draft.dueDay) || 1,
        notes: draft.notes,
        templateKey: draft.templateKey || VYBE_CONTRACT_TEMPLATE_KEY,
        parameters: mergeContractParameters(draft.parameters),
        pdfUrl,
        pdfFileName,
        createdAt: contract?.createdAt,
      };

      await onSave(payload, pendingPdf);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar contrato.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!templateContext || !client) {
      setError('Selecione um cliente para gerar o DOCX.');
      return;
    }
    setDownloading(true);
    setError(null);
    try {
      const safeName = client.name.replace(/[^\w\s-]/g, '').trim().slice(0, 40);
      await generateContractDocx(
        templateContext,
        `Contrato-${safeName || 'cliente'}.docx`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao gerar DOCX.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="bg-vybe-card border border-gray-700 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[min(880px,calc(100vh-8rem))] flex flex-col overflow-hidden">
        <div className="bg-[#2A2A2A] p-4 flex justify-between items-center border-b border-gray-700 shrink-0">
          <div>
            <h3 className="text-white font-bold flex items-center gap-2">
              <FileText className="text-vybe-accent" size={20} />
              {contract ? 'Editar contrato' : 'Novo contrato'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Modelo Vybe OS — parâmetros substituíveis no DOCX
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex border-b border-gray-800 shrink-0">
          <button
            type="button"
            onClick={() => setTab('params')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
              tab === 'params'
                ? 'text-vybe-accent border-b-2 border-vybe-accent'
                : 'text-gray-500 hover:text-white'
            }`}
          >
            <Settings2 size={16} /> Parâmetros
          </button>
          <button
            type="button"
            onClick={() => setTab('preview')}
            disabled={!draft.clientId}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40 ${
              tab === 'preview'
                ? 'text-vybe-accent border-b-2 border-vybe-accent'
                : 'text-gray-500 hover:text-white'
            }`}
          >
            <Eye size={16} /> Pré-visualização
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {error && (
            <p className="mb-4 text-sm text-red-400 bg-red-900/20 border border-red-900/40 rounded-lg p-3">
              {error}
            </p>
          )}

          {tab === 'params' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="space-y-4">
                <h4 className="text-sm font-bold text-white border-b border-gray-800 pb-2">
                  Dados do contrato
                </h4>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Cliente</label>
                  <select
                    value={draft.clientId}
                    onChange={(e) => handleClientChange(e.target.value)}
                    className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-vybe-accent outline-none"
                    required
                  >
                    <option value="">Selecione</option>
                    {[...clients]
                      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Título</label>
                  <input
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-vybe-accent outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Valor mensal</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={draft.amount}
                      onChange={(e) =>
                        setDraft({ ...draft, amount: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-vybe-accent outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Dia pagamento</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={draft.dueDay}
                      onChange={(e) =>
                        setDraft({ ...draft, dueDay: parseInt(e.target.value, 10) || 1 })
                      }
                      className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-vybe-accent outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Início</label>
                    <input
                      type="date"
                      value={draft.startDate}
                      onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
                      className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-vybe-accent outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Prazo (meses)</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={draft.parameters?.prazoMeses ?? 6}
                      onChange={(e) =>
                        updateParams({ prazoMeses: parseInt(e.target.value, 10) || 6 })
                      }
                      className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-vybe-accent outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Status</label>
                  <select
                    value={draft.status}
                    onChange={(e) =>
                      setDraft({ ...draft, status: e.target.value as ContractStatus })
                    }
                    className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-vybe-accent outline-none"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              <section className="space-y-4">
                <h4 className="text-sm font-bold text-white border-b border-gray-800 pb-2">
                  Contratante (substituição no DOCX)
                </h4>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Representante legal</label>
                  <input
                    value={draft.parameters?.clienteRepresentante ?? ''}
                    onChange={(e) => updateParams({ clienteRepresentante: e.target.value })}
                    className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-vybe-accent outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">CPF do representante</label>
                  <input
                    value={draft.parameters?.clienteCpf ?? ''}
                    onChange={(e) => updateParams({ clienteCpf: e.target.value })}
                    placeholder="000.000.000-00"
                    className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-vybe-accent outline-none"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 block mb-1">Logradouro</label>
                    <input
                      value={draft.parameters?.clienteLogradouro ?? ''}
                      onChange={(e) => updateParams({ clienteLogradouro: e.target.value })}
                      className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-vybe-accent outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Nº</label>
                    <input
                      value={draft.parameters?.clienteNumero ?? ''}
                      onChange={(e) => updateParams({ clienteNumero: e.target.value })}
                      className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-vybe-accent outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Bairro</label>
                    <input
                      value={draft.parameters?.clienteBairro ?? ''}
                      onChange={(e) => updateParams({ clienteBairro: e.target.value })}
                      className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-vybe-accent outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">CEP</label>
                    <input
                      value={draft.parameters?.clienteCep ?? ''}
                      onChange={(e) => updateParams({ clienteCep: e.target.value })}
                      className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-vybe-accent outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Cidade</label>
                    <input
                      value={draft.parameters?.clienteCidade ?? ''}
                      onChange={(e) => updateParams({ clienteCidade: e.target.value })}
                      className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-vybe-accent outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">UF</label>
                    <input
                      value={draft.parameters?.clienteUf ?? ''}
                      onChange={(e) => updateParams({ clienteUf: e.target.value })}
                      maxLength={2}
                      className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-vybe-accent outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Foro / Cidade assinatura</label>
                  <input
                    value={draft.parameters?.cidadeForo ?? ''}
                    onChange={(e) => updateParams({ cidadeForo: e.target.value })}
                    className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-vybe-accent outline-none"
                  />
                </div>
                <h4 className="text-sm font-bold text-white border-b border-gray-800 pb-2 pt-2 flex items-center gap-2">
                  <Upload size={14} className="text-vybe-accent" />
                  Contrato em PDF
                </h4>
                <p className="text-xs text-gray-500">
                  Envie o contrato assinado ou documento final em PDF (máx. 10 MB).
                </p>
                {(pdfFile || (draft.pdfUrl && !removePdf)) && (
                  <div className="flex items-center justify-between gap-2 bg-[#121212] border border-gray-700 rounded-lg p-3">
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">
                        {pdfFile?.name ?? draft.pdfFileName ?? 'contrato.pdf'}
                      </p>
                      {pdfFile && (
                        <p className="text-[10px] text-gray-500">
                          {(pdfFile.size / 1024).toFixed(0)} KB — será enviado ao salvar
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {draft.pdfUrl && !removePdf && !pdfFile && (
                        <a
                          href={draft.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-indigo-400 hover:text-indigo-300"
                          title="Abrir PDF"
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setPdfFile(null);
                          setRemovePdf(true);
                        }}
                        className="p-2 text-red-400 hover:text-red-300"
                        title="Remover PDF"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-700 hover:border-vybe-accent/50 rounded-lg p-4 cursor-pointer transition-colors">
                  <FileUp className="text-gray-500" size={24} />
                  <span className="text-xs text-gray-400 text-center">
                    Clique para selecionar ou arrastar um PDF
                  </span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={handlePdfPick}
                  />
                </label>

                <h4 className="text-sm font-bold text-white border-b border-gray-800 pb-2 pt-2">
                  Testemunhas
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="Testemunha 1 — Nome"
                    value={draft.parameters?.testemunha1Nome ?? ''}
                    onChange={(e) => updateParams({ testemunha1Nome: e.target.value })}
                    className="bg-[#121212] border border-gray-700 rounded-lg p-2 text-sm text-white focus:border-vybe-accent outline-none"
                  />
                  <input
                    placeholder="CPF"
                    value={draft.parameters?.testemunha1Cpf ?? ''}
                    onChange={(e) => updateParams({ testemunha1Cpf: e.target.value })}
                    className="bg-[#121212] border border-gray-700 rounded-lg p-2 text-sm text-white focus:border-vybe-accent outline-none"
                  />
                  <input
                    placeholder="Testemunha 2 — Nome"
                    value={draft.parameters?.testemunha2Nome ?? ''}
                    onChange={(e) => updateParams({ testemunha2Nome: e.target.value })}
                    className="bg-[#121212] border border-gray-700 rounded-lg p-2 text-sm text-white focus:border-vybe-accent outline-none"
                  />
                  <input
                    placeholder="CPF"
                    value={draft.parameters?.testemunha2Cpf ?? ''}
                    onChange={(e) => updateParams({ testemunha2Cpf: e.target.value })}
                    className="bg-[#121212] border border-gray-700 rounded-lg p-2 text-sm text-white focus:border-vybe-accent outline-none"
                  />
                </div>
              </section>
            </div>
          )}

          {tab === 'preview' && templateContext && (
            <div
              className="contract-preview-wrap bg-white text-gray-900 rounded-lg p-6 md:p-10 max-w-3xl mx-auto shadow-inner text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          )}
        </div>

        <div className="p-4 border-t border-gray-800 flex flex-wrap gap-3 justify-end shrink-0 bg-[#1A1A1A]">
          {draft.clientId && (
            <p className="text-xs text-gray-500 mr-auto self-center">
              Valor no documento:{' '}
              <span className="text-vybe-accent font-bold">
                {formatCurrency(Number(draft.amount) || 0)}
              </span>
            </p>
          )}
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading || !draft.clientId}
            className="px-4 py-2 rounded-lg border border-indigo-800 text-indigo-300 hover:bg-indigo-900/30 disabled:opacity-40 flex items-center gap-2 text-sm font-medium"
          >
            {downloading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            Baixar DOCX
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-vybe-accent hover:bg-[#E65C00] disabled:opacity-50 text-white font-bold flex items-center gap-2 text-sm"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar
          </button>
        </div>
      </div>
    </ModalPortal>
  );
};

export default ContractEditorModal;
