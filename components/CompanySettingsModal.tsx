import React, { useState, useEffect } from 'react';
import { CompanySettings } from '../types';
import { X, Building2, Save, Image as ImageIcon, Upload, LogOut } from 'lucide-react';
import { api } from '../src/services/api';

interface CompanySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CompanySettings;
  onSave: (settings: CompanySettings) => Promise<void> | void;
  onLogout?: () => void;
  userEmail?: string;
}

const CompanySettingsModal: React.FC<CompanySettingsModalProps> = ({ isOpen, onClose, settings, onSave, onLogout }) => {
  const [formData, setFormData] = useState<CompanySettings>(settings);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(settings.logoUrl || null);
  const [isUploading, setIsUploading] = useState(false);

  // Update form when settings prop changes
  useEffect(() => {
    setFormData(settings);
    setLogoPreview(settings.logoUrl || null);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      // Create local preview
      const objectUrl = URL.createObjectURL(file);
      setLogoPreview(objectUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      let finalLogoUrl = formData.logoUrl;

      // Upload new logo if selected
      if (logoFile) {
        // Import api here if not imported or pass as prop. Ideally imported.
        // Assuming api is available via imports. If not, we need to fix imports.
        // Checking imports... looks like we need to add api import.
        const uploadedUrl = await api.storage.uploadLogo(logoFile);
        if (uploadedUrl) finalLogoUrl = uploadedUrl;
      }

      onSave({ ...formData, logoUrl: finalLogoUrl });
      onClose();
    } catch (error: any) {
      console.error("Error saving settings:", error);
      alert(`Erro ao salvar configurações: ${error.message || error}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      <div className="relative bg-vybe-card border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-bar-grow origin-center max-h-[90vh] flex flex-col">

        <div className="bg-[#2A2A2A] p-4 flex justify-between items-center border-b border-gray-700 shrink-0">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Building2 className="text-vybe-accent" size={20} />
            Configurações da Empresa
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Logo Preview & Input */}
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
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="text-center">
                <p className="text-xs text-gray-400">Clique no ícone para alterar</p>
              </div>
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

            <div className="pt-6 border-t border-gray-800 flex justify-between items-center mt-4">
              {/* Logout Button */}
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
                className="bg-vybe-accent hover:bg-[#E65C00] text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transition-colors shadow-lg ml-auto"
              >
                <Save size={18} />
                Salvar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompanySettingsModal;