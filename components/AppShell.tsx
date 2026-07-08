import React, { Suspense, lazy } from 'react';
import {
  Wallet,
  LayoutDashboard,
  Users,
  CreditCard,
  PieChart,
  Building2,
  ChevronDown,
  Loader2,
  Settings,
  FileSignature,
} from 'lucide-react';
import { useAppData } from '../src/context/AppDataContext';
import { DEFAULT_SERVICE_PLANS, DEFAULT_MESSAGE_TEMPLATES } from '../constants';
import { getCategoryLabels } from '../src/services/categories';
import { tabToPath } from '../src/navigation/tabRoutes';
import DashboardView from './DashboardView';
import TransactionForm from './TransactionForm';
import TransferForm from './TransferForm';
import TransactionList from './TransactionList';
import ClientForm from './ClientForm';
import ClientList from './ClientList';
import BillingModal from './BillingModal';
import ClientHistoryModal from './ClientHistoryModal';
import EmployeeDetailsModal from './EmployeeDetailsModal';
import ReceiptModal from './ReceiptModal';
import CompanySettingsModal from './CompanySettingsModal';
import ConfirmDialog from './ConfirmDialog';
import DelinquencyPanel from './DelinquencyPanel';
import ReconciliationPanel from './ReconciliationPanel';
import MonthCloseWizard from './MonthCloseWizard';
import { AppTab } from '../src/context/AppDataContext';
import { TransactionType } from '../types';

const ExpensesView = lazy(() => import('./ExpensesView'));
const ContractsView = lazy(() => import('./ContractsView'));
const ReportsView = lazy(() => import('./ReportsView'));
const SettingsView = lazy(() => import('./SettingsView'));

const TabLoader: React.FC = () => (
  <div className="flex justify-center py-16 print:hidden">
    <Loader2 className="animate-spin text-vybe-accent" size={32} />
  </div>
);

const AppShell: React.FC = () => {
  const {
    userEmail,
    workspaceOwnerId,
    isLoadingData,
    activeTab,
    setActiveTab,
    tabBeforeSettings,
    setTabBeforeSettings,
    transactions,
    clients,
    contracts,
    employees,
    employeeCompensationHistory,
    handleAddContract,
    handleUpdateContract,
    handleDeleteContract,
    subscriptions,
    companySettings,
    preFilledTransaction,
    editingTransaction,
    editingClient,
    isCompanySettingsOpen,
    setIsCompanySettingsOpen,
    isBillingModalOpen,
    billingClient,
    isHistoryModalOpen,
    historyClient,
    isEmployeeModalOpen,
    selectedEmployee,
    isReceiptModalOpen,
    receiptTransaction,
    receiptClient,
    confirmDialog,
    setConfirmDialog,
    handleLogout,
    handleUpdateCompanySettings,
    handlePersistCategories,
    handleAddTransaction,
    handleDeleteTransaction,
    handleUpdateTransaction,
    handleEditTransaction,
    handleToggleTransactionStatus,
    handleAddClient,
    handleUpdateClient,
    handleDeleteClient,
    handleAddEmployee,
    handleDeleteEmployee,
    handleUpdateEmployee,
    handleOpenEmployeeDetails,
    handleAddSubscription,
    handleUpdateSubscription,
    handleDeleteSubscription,
    bankAccounts,
    handleAddBankAccount,
    handleUpdateBankAccount,
    handleDeleteBankAccount,
    workspaceMembers,
    workspaceTeamActive,
    workspaceRole,
    auditLogs,
    isLoadingTeam,
    handleInviteMember,
    handleRemoveMember,
    handleUpdateMemberRole,
    handleRefreshTeam,
    handleOpenBillingModal,
    handleConfirmToFinance,
    handleOpenHistory,
    handleQuickExpense,
    handleGenerateReceipt,
    setEditingTransaction,
    setEditingClient,
    setIsBillingModalOpen,
    setIsHistoryModalOpen,
    setIsEmployeeModalOpen,
    setIsReceiptModalOpen,
    fetchData,
    monthlyBudgets,
    periodClosures,
    refreshBudgetsAndClosures,
    handleSharePortalLink,
  } = useAppData();

  const budgetMonthKey = new Date().toISOString().slice(0, 7);

  const goToTab = (tab: AppTab) => {
    if (tab === 'settings' && activeTab !== 'settings') {
      setTabBeforeSettings(activeTab === 'settings' ? tabBeforeSettings : activeTab);
    }
    // Workaround: em produção, alguns casos ficam "presos" na rota /configuracoes.
    // Forçar troca via reload evita ficar com a UI dessincronizada da rota.
    if (activeTab === 'settings' && tab !== 'settings') {
      window.location.assign(tabToPath(tab));
      return;
    }

    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-vybe-bg pb-12 font-sans selection:bg-vybe-accent selection:text-white relative">
      <ConfirmDialog
        isOpen={!!confirmDialog}
        title={confirmDialog?.title ?? ''}
        message={confirmDialog?.message ?? ''}
        variant="danger"
        confirmLabel="Excluir"
        onConfirm={() => confirmDialog?.onConfirm()}
        onCancel={() => setConfirmDialog(null)}
      />

      <CompanySettingsModal
        isOpen={isCompanySettingsOpen}
        onClose={() => setIsCompanySettingsOpen(false)}
        settings={companySettings}
        onSave={handleUpdateCompanySettings}
        onLogout={handleLogout}
        userEmail={userEmail}
      />

      <BillingModal
        isOpen={isBillingModalOpen}
        client={billingClient}
        companyName={companySettings.name}
        paymentSettings={companySettings.integrations?.payment}
        messageTemplates={companySettings.messageTemplates ?? DEFAULT_MESSAGE_TEMPLATES}
        onClose={() => setIsBillingModalOpen(false)}
        onConfirmToFinance={handleConfirmToFinance}
      />

      <ClientHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        client={historyClient}
        transactions={transactions}
        onToggleStatus={handleToggleTransactionStatus}
      />

      <EmployeeDetailsModal
        onToggleStatus={handleToggleTransactionStatus}
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        employee={selectedEmployee}
        transactions={transactions}
        compensationHistory={employeeCompensationHistory}
        onUpdateEmployee={handleUpdateEmployee}
      />

      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        transaction={receiptTransaction}
        client={receiptClient}
        companySettings={companySettings}
      />

      <header className="bg-[#121212] border-b border-gray-800 sticky top-0 z-50 backdrop-blur-md bg-opacity-90 print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4 md:mb-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-vybe-accent to-orange-700 rounded-lg flex items-center justify-center text-white shadow-lg shadow-orange-900/40">
                <span className="font-bold text-xl">V</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white hidden sm:block">
                Vybe <span className="text-vybe-accent">Finanças</span>
              </h1>
              {isLoadingData && (
                <span className="ml-2 text-xs text-gray-500 flex items-center gap-1">
                  <Loader2 className="animate-spin" size={12} /> Sincronizando...
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCompanySettingsOpen(true)}
                className="group flex items-center gap-3 bg-[#1E1E1E] hover:bg-[#252525] pl-1 pr-4 py-1 rounded-full border border-gray-800 transition-all hover:border-gray-600"
              >
                <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden border border-gray-600 group-hover:border-vybe-accent transition-colors flex items-center justify-center">
                  {companySettings.logoUrl ? (
                    <img src={companySettings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 size={14} className="text-gray-300" />
                  )}
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-xs font-bold text-white max-w-[120px] truncate">
                    {companySettings.name}
                  </span>
                  <span className="text-[10px] text-gray-500 flex items-center gap-1">
                    Editar Perfil <ChevronDown size={8} />
                  </span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (activeTab !== 'settings') {
                    setTabBeforeSettings(activeTab);
                  }
                  goToTab('settings');
                }}
                title="Configurações do sistema"
                className={`p-2.5 rounded-full border transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-vybe-accent/20 border-vybe-accent text-vybe-accent'
                    : 'bg-[#1E1E1E] border-gray-800 text-gray-400 hover:text-white hover:border-gray-600'
                }`}
              >
                <Settings size={18} />
              </button>
            </div>
          </div>

          <div className="flex justify-center md:justify-center mt-4 overflow-x-auto">
            <div className="bg-[#1E1E1E] p-1 rounded-full border border-gray-800 flex items-center whitespace-nowrap">
              {(
                [
                  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
                  { id: 'finance' as const, label: 'Financeiro', icon: Wallet },
                  { id: 'clients' as const, label: 'Clientes', icon: Users },
                  { id: 'contracts' as const, label: 'Contratos', icon: FileSignature },
                  { id: 'expenses' as const, label: 'Despesas', icon: CreditCard },
                  { id: 'reports' as const, label: 'Relatórios', icon: PieChart },
                ] as const
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => goToTab(id)}
                  className={`flex items-center gap-2 px-4 md:px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    activeTab === id
                      ? 'bg-vybe-accent text-white shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 animate-bar-grow origin-top">
        {activeTab === 'dashboard' && <DashboardView />}

        {activeTab === 'finance' && (
          <div className="grid grid-cols-1 gap-8 print:hidden">
            <DelinquencyPanel
              clients={clients}
              transactions={transactions}
              onGenerateCharge={handleOpenBillingModal}
            />
            <MonthCloseWizard
              transactions={transactions}
              closures={periodClosures}
              onClosed={() => void refreshBudgetsAndClosures()}
            />
            <ReconciliationPanel
              transactions={transactions}
              bankAccounts={bankAccounts}
              onReconciled={() => void fetchData()}
              onToggleStatus={handleToggleTransactionStatus}
            />
            <TransferForm
              bankAccounts={bankAccounts}
              onAddTransfer={handleAddTransaction}
              onUpdateTransfer={handleUpdateTransaction}
              editingTransaction={
                editingTransaction?.type === TransactionType.TRANSFER ? editingTransaction : null
              }
              onCancelEdit={() => setEditingTransaction(null)}
            />
            {editingTransaction?.type !== TransactionType.TRANSFER && (
              <TransactionForm
                onAddTransaction={handleAddTransaction}
                onUpdateTransaction={handleUpdateTransaction}
                editingTransaction={editingTransaction}
                onCancelEdit={() => setEditingTransaction(null)}
                initialData={preFilledTransaction}
                clients={clients}
                employees={employees}
                bankAccounts={bankAccounts}
                companySettings={companySettings}
              />
            )}
            <TransactionList
              transactions={transactions}
              clients={clients}
              bankAccounts={bankAccounts}
              categoryLabels={getCategoryLabels(companySettings)}
              onDeleteTransaction={handleDeleteTransaction}
              onEditTransaction={handleEditTransaction}
              onGenerateReceipt={handleGenerateReceipt}
              onToggleStatus={handleToggleTransactionStatus}
            />
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="grid grid-cols-1 gap-8">
            <ClientForm
              onAddClient={handleAddClient}
              onUpdateClient={handleUpdateClient}
              editingClient={editingClient}
              onCancelEdit={() => setEditingClient(null)}
              plans={companySettings.plans ?? DEFAULT_SERVICE_PLANS}
            />
            <ClientList
              clients={clients}
              transactions={transactions}
              onDeleteClient={handleDeleteClient}
              onEditClient={setEditingClient}
              onGenerateCharge={handleOpenBillingModal}
              onViewHistory={handleOpenHistory}
              onSharePortalLink={(client) => void handleSharePortalLink(client)}
            />
          </div>
        )}

        {activeTab === 'contracts' && (
          <Suspense fallback={<TabLoader />}>
            <ContractsView
              contracts={contracts}
              clients={clients}
              companySettings={companySettings}
              onAddContract={handleAddContract}
              onUpdateContract={handleUpdateContract}
              onDeleteContract={handleDeleteContract}
            />
          </Suspense>
        )}

        {activeTab === 'expenses' && (
          <Suspense fallback={<TabLoader />}>
            <ExpensesView
              employees={employees}
              subscriptions={subscriptions}
              transactions={transactions}
              onAddEmployee={handleAddEmployee}
              onDeleteEmployee={handleDeleteEmployee}
              onAddSubscription={handleAddSubscription}
              onUpdateSubscription={handleUpdateSubscription}
              onDeleteSubscription={handleDeleteSubscription}
              onQuickExpense={handleQuickExpense}
              onAddTransaction={handleAddTransaction}
              onViewEmployee={handleOpenEmployeeDetails}
            />
          </Suspense>
        )}

        {activeTab === 'reports' && (
          <Suspense fallback={<TabLoader />}>
            <ReportsView
              transactions={transactions}
              clients={clients}
              companySettings={companySettings}
            />
          </Suspense>
        )}

        {activeTab === 'settings' && (
          <Suspense fallback={<TabLoader />}>
            <SettingsView
              settings={companySettings}
              userEmail={userEmail}
              workspaceOwnerId={workspaceOwnerId}
              bankAccounts={bankAccounts}
              transactions={transactions}
              onAddBankAccount={handleAddBankAccount}
              onUpdateBankAccount={handleUpdateBankAccount}
              onDeleteBankAccount={handleDeleteBankAccount}
              onSave={handleUpdateCompanySettings}
              onPersistCategories={handlePersistCategories}
              onLogout={handleLogout}
              onBack={() => goToTab(tabBeforeSettings)}
              workspaceMembers={workspaceMembers}
              workspaceTeamActive={workspaceTeamActive}
              workspaceRole={workspaceRole}
              auditLogs={auditLogs}
              isLoadingTeam={isLoadingTeam}
              onInviteMember={handleInviteMember}
              onRemoveMember={handleRemoveMember}
              onUpdateMemberRole={handleUpdateMemberRole}
              onRefreshTeam={handleRefreshTeam}
              monthlyBudgets={monthlyBudgets}
              budgetMonthKey={budgetMonthKey}
              onBudgetsSaved={() => void refreshBudgetsAndClosures()}
            />
          </Suspense>
        )}
      </main>

      <footer className="text-center text-gray-600 text-sm py-6 print:hidden">
        <p>&copy; {new Date().getFullYear()} Vybe Finanças. Sistema de Gestão Financeira.</p>
      </footer>
    </div>
  );
};

export default AppShell;
