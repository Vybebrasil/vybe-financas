import React from 'react';
import { CompanySettings } from '../types';
import { X, Building2 } from 'lucide-react';
import CompanySettingsForm from './CompanySettingsForm';

interface CompanySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CompanySettings;
  onSave: (settings: CompanySettings) => Promise<void> | void;
  onLogout?: () => void;
  userEmail?: string;
}

const CompanySettingsModal: React.FC<CompanySettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  onLogout,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

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
          <CompanySettingsForm
            settings={settings}
            onSave={onSave}
            onLogout={onLogout}
            onSaved={onClose}
            syncWhen={isOpen}
          />
        </div>
      </div>
    </div>
  );
};

export default CompanySettingsModal;
