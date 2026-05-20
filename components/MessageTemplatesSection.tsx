import React, { useState } from 'react';
import { MessageTemplate, MessageChannel, BillingStage } from '../types';
import { BILLING_STAGE_LABELS, TEMPLATE_VARIABLES } from '../messageTemplates';
import { createMessageTemplate } from '../constants';
import { Mail, MessageCircle, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from './ToastProvider';

interface MessageTemplatesSectionProps {
  templates: MessageTemplate[];
  onChange: (templates: MessageTemplate[]) => void;
}

const STAGE_OPTIONS: BillingStage[] = ['pre_due', 'on_due', 'overdue', 'custom'];

const MessageTemplatesSection: React.FC<MessageTemplatesSectionProps> = ({ templates, onChange }) => {
  const toast = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState<MessageChannel>('whatsapp');

  const channelTemplates = templates.filter((t) => t.channel === activeChannel);

  const updateTemplate = (id: string, patch: Partial<MessageTemplate>) => {
    onChange(templates.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const removeTemplate = (id: string) => {
    setConfirmRemoveId(id);
  };

  const confirmRemove = () => {
    if (!confirmRemoveId) return;
    onChange(templates.filter((t) => t.id !== confirmRemoveId));
    if (expandedId === confirmRemoveId) setExpandedId(null);
    setConfirmRemoveId(null);
    toast.success('Template removido.');
  };

  const addTemplate = () => {
    const next = createMessageTemplate(activeChannel);
    onChange([...templates, next]);
    setExpandedId(next.id);
  };

  return (
    <div className="pt-6 border-t border-gray-800">
      <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
        <MessageCircle size={16} className="text-vybe-accent" />
        Templates de mensagens — Régua de cobrança
      </h4>
      <p className="text-xs text-gray-500 mb-4">
        Personalize mensagens de WhatsApp e e-mail usadas na cobrança. Use as variáveis abaixo no texto.
      </p>

      <div className="bg-[#121212] border border-gray-800 rounded-lg p-3 mb-4">
        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Variáveis disponíveis</p>
        <div className="flex flex-wrap gap-2">
          {TEMPLATE_VARIABLES.map((v) => (
            <code
              key={v.key}
              className="text-[10px] bg-black/40 border border-gray-700 text-vybe-accent px-2 py-0.5 rounded"
              title={v.label}
            >
              {v.key}
            </code>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setActiveChannel('whatsapp')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 border transition-colors ${
            activeChannel === 'whatsapp'
              ? 'bg-[#25D366]/20 border-[#25D366] text-[#25D366]'
              : 'bg-[#121212] border-gray-700 text-gray-400 hover:text-white'
          }`}
        >
          <MessageCircle size={16} /> WhatsApp
        </button>
        <button
          type="button"
          onClick={() => setActiveChannel('email')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 border transition-colors ${
            activeChannel === 'email'
              ? 'bg-blue-500/20 border-blue-500 text-blue-400'
              : 'bg-[#121212] border-gray-700 text-gray-400 hover:text-white'
          }`}
        >
          <Mail size={16} /> E-mail
        </button>
      </div>

      <div className="space-y-2 mb-3">
        {channelTemplates.length === 0 ? (
          <p className="text-xs text-gray-500 italic py-2">Nenhum template para este canal.</p>
        ) : (
          channelTemplates.map((template) => {
            const isOpen = expandedId === template.id;
            return (
              <div
                key={template.id}
                className="bg-[#121212] border border-gray-800 rounded-lg overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : template.id)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
                >
                  <div>
                    <span className="text-sm text-white font-medium block">{template.name}</span>
                    <span className="text-[10px] text-gray-500">
                      {BILLING_STAGE_LABELS[template.stage]}
                    </span>
                  </div>
                  {isOpen ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                </button>

                {isOpen && (
                  <div className="px-3 pb-3 space-y-3 border-t border-gray-800 pt-3">
                    <div>
                      <label className="block text-xs text-vybe-muted mb-1">Nome do template</label>
                      <input
                        type="text"
                        value={template.name}
                        onChange={(e) => updateTemplate(template.id, { name: e.target.value })}
                        className="w-full bg-black/30 border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-vybe-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-vybe-muted mb-1">Etapa da régua</label>
                      <select
                        value={template.stage}
                        onChange={(e) =>
                          updateTemplate(template.id, { stage: e.target.value as BillingStage })
                        }
                        className="w-full bg-black/30 border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-vybe-accent"
                      >
                        {STAGE_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {BILLING_STAGE_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                    {template.channel === 'email' && (
                      <div>
                        <label className="block text-xs text-vybe-muted mb-1">Assunto do e-mail</label>
                        <input
                          type="text"
                          value={template.subject || ''}
                          onChange={(e) => updateTemplate(template.id, { subject: e.target.value })}
                          className="w-full bg-black/30 border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-vybe-accent"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs text-vybe-muted mb-1">Corpo da mensagem</label>
                      <textarea
                        value={template.body}
                        onChange={(e) => updateTemplate(template.id, { body: e.target.value })}
                        rows={8}
                        className="w-full bg-black/30 border border-gray-700 rounded-lg p-2 text-sm text-white font-mono focus:outline-none focus:border-vybe-accent resize-y min-h-[120px]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTemplate(template.id)}
                      className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Remover template
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <button
        type="button"
        onClick={addTemplate}
        className="w-full py-2 border border-dashed border-gray-600 rounded-lg text-sm text-gray-400 hover:text-white hover:border-vybe-accent flex items-center justify-center gap-2 transition-colors"
      >
        <Plus size={16} /> Adicionar template {activeChannel === 'whatsapp' ? 'WhatsApp' : 'de E-mail'}
      </button>

      {confirmRemoveId && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60">
          <div className="bg-vybe-card border border-gray-700 rounded-xl p-5 max-w-sm w-full shadow-xl">
            <p className="text-white font-bold mb-2">Remover template?</p>
            <p className="text-sm text-gray-400 mb-4">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setConfirmRemoveId(null)}
                className="px-3 py-2 text-sm text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmRemove}
                className="px-3 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageTemplatesSection;

