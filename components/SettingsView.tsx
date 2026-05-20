import React from 'react';
import { BankAccount, CompanySettings, Transaction } from '../types';
import BankAccountsSection from './BankAccountsSection';
import { ArrowLeft, Settings } from 'lucide-react';
import CompanySettingsForm from './CompanySettingsForm';

interface SettingsViewProps {
  settings: CompanySettings;
  userEmail?: string;
  bankAccounts: BankAccount[];
  transactions: Transaction[];
  onAddBankAccount: (account: BankAccount) => Promise<void>;
  onUpdateBankAccount: (account: BankAccount) => Promise<void>;
  onDeleteBankAccount: (id: string) => void;
  onSave: (settings: CompanySettings) => Promise<void> | void;
  onLogout?: () => void;
  onBack: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  userEmail,
  bankAccounts,
  transactions,
  onAddBankAccount,
  onUpdateBankAccount,
  onDeleteBankAccount,
  onSave,
  onLogout,
  onBack,
}) => {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-lg bg-[#1E1E1E] border border-gray-800 text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
          title="Voltar"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="text-vybe-accent" size={24} />
            Configurações do Sistema
          </h2>
          <p className="text-xs text-gray-500 mt-1">Dados da empresa e conta</p>
        </div>
      </div>

      <section className="bg-vybe-card border border-gray-800 rounded-xl p-6 shadow-lg">
        <CompanySettingsForm
          settings={settings}
          onSave={onSave}
          onLogout={onLogout}
          userEmail={userEmail}
          showAccountEmail
          showPlansManager
          showMessageTemplates
          syncWhen
        />
        <BankAccountsSection
          accounts={bankAccounts}
          transactions={transactions}
          onAdd={onAddBankAccount}
          onUpdate={onUpdateBankAccount}
          onDelete={onDeleteBankAccount}
        />
      </section>
    </div>
  );
};

export default SettingsView;
