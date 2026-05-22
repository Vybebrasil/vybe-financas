import React, { useState, useEffect } from 'react';
import { CategoryConfig, CompanySettings, Transaction } from '../types';
import CategoriesSection from './CategoriesSection';
import { DEFAULT_CATEGORIES, resolveCategories } from '../src/services/categories';
import { categoriesForStorage } from '../src/services/companySettingsMapper';
import { Save, Image as ImageIcon, Upload, LogOut, Plus, Trash2, Layers } from 'lucide-react';
import { api } from '../src/services/api';
import MessageTemplatesSection from './MessageTemplatesSection';
import { useToast } from './ToastProvider';

interface CompanySettingsFormProps {
  settings: CompanySettings;
  onSave: (settings: CompanySettings) => Promise<void> | void;
  onLogout?: () => void;
  onSaved?: () => void;
  userEmail?: string;
  showAccountEmail?: boolean;
  /** Exibe cadastro de planos (Configurações do Sistema) */
  showPlansManager?: boolean;
  /** Exibe templates de mensagens (régua de cobrança) */
  showMessageTemplates?: boolean;
  showCategoriesManager?: boolean;
  transactions?: Transaction[];
  /** Salva categorias no servidor ao editar a lista */
  onPersistCategories?: (categories: CategoryConfig[]) => Promise<void>;
  /** Re-sincroniza o formulário quando o pai reabre (ex.: modal) */
  syncWhen?: boolean;
}

const CompanySettingsForm: React.FC<CompanySettingsFormProps> = ({
  settings,
  onSave,
  onLogout,
  onSaved,
  userEmail,
  showAccountEmail = false,
  showPlansManager = false,
  showMessageTemplates = false,
  showCategoriesManager = false,
  transactions = [],
  onPersistCategories,
  syncWhen = true,
}) => {
  const toast = useToast();
  const [formData, setFormData] = useState<CompanySettings>(settings);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(settings.logoUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');

  useEffect(() => {
    if (!syncWhen) return;
    setFormData(settings);
    setLogoPreview(settings.logoUrl || null);
    setLogoFile(null);
    setNewPlanName('');
  }, [settings, syncWhen]);

  const plans = formData.plans ?? [];

  const handleAddPlan = () => {
    const name = newPlanName.trim();
    if (!name) return;
    if (plans.some((p) => p.toLowerCase() === name.toLowerCase())) {
      toast.info('Este plano já está cadastrado.');
      return;
    }
    setFormData({ ...formData, plans: [...plans, name] });
    setNewPlanName('');
  };

  const handleRemovePlan = (plan: string) => {
    setFormData({ ...formData, plans: plans.filter((p) => p !== plan) });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      let finalLogoUrl = formData.logoUrl;
      if (logoFile) {
        const uploadedUrl = await api.storage.uploadLogo(logoFile);
        if (uploadedUrl) finalLogoUrl = uploadedUrl;
      }

      const categoriesToSave = showCategoriesManager
        ? formData.categories
        : resolveCategories(settings);
      await onSave({
        ...formData,
        logoUrl: finalLogoUrl,
        categories: categoriesForStorage(categoriesToSave),
      });
      setLogoFile(null);
      onSaved?.();
    } catch (error: unknown) {
      console.error('Error saving settings:', error);
      const msg = error instanceof Error ? error.message : String(error);
      toast.error(`Erro ao salvar configurações: ${msg}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {showAccountEmail && userEmail && (
        <div className="bg-[#121212] border border-gray-800 rounded-lg p-4">
          <label className="block text-xs text-vybe-muted mb-1 font-medium">E-mail da conta</label>
          <p className="text-sm text-white">{userEmail}</p>
        </div>
      )}

      <div className="flex flex-col items-center gap-4 mb-6">
        <div className="relative group">
          <div className="w-24 h-24 rounded-full bg-[#121212] border-2 border-dashed border-gray-600 flex items-center justify-center overflow-hidden relative">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="text-gray-600" size={32} />
            )}
          </div>

          <label
            className="absolute bottom-0 right-0 bg-vybe-accent text-white p-2 rounded-full cursor-pointer hover:bg-orange-600 transition-colors shadow-lg transform translate-x-1/4 translate-y-1/4"
            title="Alterar Logo"
          >
            <Upload size={14} />
            <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
          </label>
        </div>
        <p className="text-xs text-gray-400">Clique no ícone para alterar</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs text-vybe-muted mb-1 font-medium">Nome da Empresa / Fantasia</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-vybe-accent"
            required
          />
        </div>

        <div className="col-span-2 md:col-span-1">
          <label className="block text-xs text-vybe-muted mb-1 font-medium">CNPJ</label>
          <input
            type="text"
            value={formData.cnpj}
            onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
            className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-vybe-accent"
            required
          />
        </div>

        <div className="col-span-2 md:col-span-1">
          <label className="block text-xs text-vybe-muted mb-1 font-medium">Telefone</label>
          <input
            type="text"
            value={formData.phone || ''}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-vybe-accent"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-xs text-vybe-muted mb-1 font-medium">Endereço (opcional)</label>
          <input
            type="text"
            value={formData.address || ''}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Rua, Número, Bairro, Cidade - UF"
            className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-vybe-accent"
          />
        </div>
      </div>

      {showPlansManager && (
        <div className="pt-6 border-t border-gray-800">
          <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Layers size={16} className="text-vybe-accent" />
            Planos de Serviço
          </h4>
          <p className="text-xs text-gray-500 mb-4">
            Os planos cadastrados aparecem no campo &quot;Plano Ativo&quot; ao criar ou editar clientes.
          </p>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPlan())}
              placeholder="Ex: Vybe OS, Gestão de Tráfego..."
              className="flex-1 bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-vybe-accent"
            />
            <button
              type="button"
              onClick={handleAddPlan}
              className="px-4 py-2 bg-vybe-accent hover:bg-[#E65C00] text-white rounded-lg font-bold text-sm flex items-center gap-1 shrink-0"
            >
              <Plus size={16} /> Adicionar
            </button>
          </div>
          {plans.length === 0 ? (
            <p className="text-xs text-gray-500 italic">Nenhum plano cadastrado.</p>
          ) : (
            <ul className="space-y-2">
              {plans.map((plan) => (
                <li
                  key={plan}
                  className="flex items-center justify-between bg-[#121212] border border-gray-800 rounded-lg px-3 py-2"
                >
                  <span className="text-sm text-white font-medium">{plan}</span>
                  <button
                    type="button"
                    onClick={() => handleRemovePlan(plan)}
                    className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                    title="Remover plano"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {showCategoriesManager && (
        <CategoriesSection
          categories={formData.categories ?? [...DEFAULT_CATEGORIES]}
          transactions={transactions}
          onChange={(categories) => setFormData({ ...formData, categories })}
          onPersist={onPersistCategories}
        />
      )}

      {showMessageTemplates && (
        <MessageTemplatesSection
          templates={formData.messageTemplates ?? []}
          onChange={(messageTemplates) => setFormData({ ...formData, messageTemplates })}
        />
      )}

      <div className="pt-6 border-t border-gray-800 flex justify-between items-center mt-4">
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="text-red-500 hover:text-red-400 text-xs font-bold flex items-center gap-1 transition-colors px-3 py-2 rounded-lg hover:bg-red-500/10"
          >
            <LogOut size={16} />
            Sair da Conta
          </button>
        )}

        <button
          type="submit"
          disabled={isUploading}
          className="bg-vybe-accent hover:bg-[#E65C00] text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transition-colors shadow-lg ml-auto disabled:opacity-50"
        >
          <Save size={18} />
          {isUploading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
};

export default CompanySettingsForm;
