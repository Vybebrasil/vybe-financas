import React, { useEffect, useRef, useState } from 'react';
import { WorkspaceMember, WorkspaceRole } from '../types';
import { Users, Plus, Trash2, Mail, Shield } from 'lucide-react';
import { useToast } from './ToastProvider';

interface TeamSectionProps {
  members: WorkspaceMember[];
  teamEnabled?: boolean;
  currentUserEmail: string;
  currentRole: WorkspaceRole;
  onInvite: (email: string, role: Exclude<WorkspaceRole, 'owner'>) => Promise<void>;
  onRemove: (memberId: string) => Promise<void>;
  onRoleChange: (memberId: string, role: Exclude<WorkspaceRole, 'owner'>) => Promise<void>;
  onRefreshTeam?: () => Promise<void>;
}

const roleLabel: Record<WorkspaceRole, string> = {
  owner: 'Dono',
  admin: 'Administrador',
  member: 'Membro',
};

const TeamSection: React.FC<TeamSectionProps> = ({
  members,
  teamEnabled = true,
  currentUserEmail,
  currentRole,
  onInvite,
  onRemove,
  onRoleChange,
  onRefreshTeam,
}) => {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState(false);
  const autoRefreshDone = useRef(false);

  useEffect(() => {
    if (!teamEnabled && onRefreshTeam && !autoRefreshDone.current) {
      autoRefreshDone.current = true;
      void onRefreshTeam();
    }
  }, [teamEnabled, onRefreshTeam]);

  useEffect(() => {
    if (teamEnabled) autoRefreshDone.current = false;
  }, [teamEnabled]);

  const canManage = currentRole === 'owner' || currentRole === 'admin';
  const canChangeRoles = currentRole === 'owner';

  const handleInvite = async () => {
    if (!canManage) return;
    setLoading(true);
    try {
      await onInvite(email, role);
      setEmail('');
    } catch {
      // toast exibido no AppDataContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="pt-6 border-t border-gray-800">
      <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
        <Users size={16} className="text-vybe-accent" />
        Equipe da conta
      </h4>
      <p className="text-xs text-gray-500 mb-4">
        Todos os membros compartilham os mesmos dados financeiros. Convide por e-mail — a pessoa
        precisa usar o mesmo e-mail no cadastro ou login.
      </p>

      {!teamEnabled && (
        <div className="text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 mb-4 space-y-2">
          <p>
            Equipe ainda não ativa. Se ainda não rodou no Supabase, execute{' '}
            <code className="text-amber-200">20260520000009_bootstrap_email_param.sql</code> no SQL
            Editor.
          </p>
          {onRefreshTeam && (
            <button
              type="button"
              disabled={activating}
              onClick={async () => {
                setActivating(true);
                try {
                  await onRefreshTeam();
                } finally {
                  setActivating(false);
                }
              }}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-md text-xs font-bold disabled:opacity-50"
            >
              {activating ? 'Ativando…' : 'Ativar equipe agora'}
            </button>
          )}
        </div>
      )}

      {canManage && teamEnabled && (
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="flex-1 relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@empresa.com"
              className="w-full bg-[#121212] border border-gray-700 rounded-lg py-2.5 pl-9 pr-3 text-sm text-white focus:border-vybe-accent outline-none"
            />
          </div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
            className="bg-[#121212] border border-gray-700 rounded-lg px-3 text-sm text-white"
          >
            <option value="member">Membro</option>
            <option value="admin">Administrador</option>
          </select>
          <button
            type="button"
            disabled={loading}
            onClick={handleInvite}
            className="px-4 py-2 bg-vybe-accent hover:bg-[#E65C00] text-white rounded-lg text-sm font-bold flex items-center justify-center gap-1 shrink-0 disabled:opacity-50"
          >
            <Plus size={16} /> Convidar
          </button>
        </div>
      )}

      <ul className="space-y-2">
        {members.map((m) => {
          const isSelf = m.email.toLowerCase() === currentUserEmail.toLowerCase();
          return (
            <li
              key={m.id}
              className="flex flex-wrap items-center gap-2 bg-[#121212] border border-gray-800 rounded-lg px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate flex items-center gap-1.5">
                  {m.role === 'owner' && <Shield size={12} className="text-amber-400 shrink-0" />}
                  {m.email}
                  {isSelf && <span className="text-[10px] text-gray-500">(você)</span>}
                </p>
                <p className="text-[10px] text-gray-500">
                  {roleLabel[m.role]}
                  {m.status === 'pending' ? ' · aguardando primeiro login' : ''}
                </p>
              </div>
              {canChangeRoles && m.role !== 'owner' && !isSelf && (
                <select
                  value={m.role}
                  onChange={(e) =>
                    onRoleChange(m.id, e.target.value as Exclude<WorkspaceRole, 'owner'>)
                  }
                  className="bg-[#1E1E1E] border border-gray-700 rounded text-xs text-white px-2 py-1"
                >
                  <option value="admin">Admin</option>
                  <option value="member">Membro</option>
                </select>
              )}
              {canManage && m.role !== 'owner' && !isSelf && (
                <button
                  type="button"
                  onClick={() => onRemove(m.id)}
                  className="p-1.5 text-gray-500 hover:text-red-400 rounded"
                  title="Remover"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default TeamSection;
