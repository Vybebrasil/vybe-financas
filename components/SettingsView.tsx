import React from 'react';
import {
  AuditLogEntry,
  BankAccount,
  CategoryConfig,
  CompanySettings,
  Transaction,
  WorkspaceMember,
  WorkspaceRole,
} from '../types';
import BankAccountsSection from './BankAccountsSection';
import TeamSection from './TeamSection';
import AuditLogSection from './AuditLogSection';
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
  onPersistCategories?: (categories: CategoryConfig[]) => Promise<void>;
  onLogout?: () => void;
  onBack: () => void;
  workspaceMembers: WorkspaceMember[];
  workspaceTeamActive?: boolean;
  workspaceRole: WorkspaceRole;
  auditLogs: AuditLogEntry[];
  isLoadingTeam?: boolean;
  onInviteMember: (email: string, role: Exclude<WorkspaceRole, 'owner'>) => Promise<void>;
  onRemoveMember: (memberId: string) => Promise<void>;
  onUpdateMemberRole: (
    memberId: string,
    role: Exclude<WorkspaceRole, 'owner'>,
  ) => Promise<void>;
  onRefreshTeam?: () => Promise<void>;
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
  onPersistCategories,
  onLogout,
  onBack,
  workspaceMembers,
  workspaceTeamActive = false,
  workspaceRole,
  auditLogs,
  isLoadingTeam,
  onInviteMember,
  onRemoveMember,
  onUpdateMemberRole,
  onRefreshTeam,
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
          onPersistCategories={onPersistCategories}
          onLogout={onLogout}
          userEmail={userEmail}
          showAccountEmail
          showPlansManager
          showCategoriesManager
          showMessageTemplates
          transactions={transactions}
          syncWhen
        />
        <BankAccountsSection
          accounts={bankAccounts}
          transactions={transactions}
          onAdd={onAddBankAccount}
          onUpdate={onUpdateBankAccount}
          onDelete={onDeleteBankAccount}
        />
        <TeamSection
          members={workspaceMembers}
          teamEnabled={workspaceTeamActive}
          currentUserEmail={userEmail ?? ''}
          currentRole={workspaceRole}
          onInvite={onInviteMember}
          onRemove={onRemoveMember}
          onRoleChange={onUpdateMemberRole}
          onRefreshTeam={onRefreshTeam}
        />
        <AuditLogSection logs={auditLogs} isLoading={isLoadingTeam} />
      </section>
    </div>
  );
};

export default SettingsView;
