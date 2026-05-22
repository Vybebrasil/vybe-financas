import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';
import { WorkspaceMember, WorkspaceRole } from '../../types';
import {
  getErrorMessage,
  isMissingTableError,
  isRlsOrPolicyError,
} from '../utils/errorMessage';

export interface WorkspaceContext {
  user: User;
  workspaceId: string;
  ownerId: string;
  role: WorkspaceRole;
  email: string;
  workspaceName: string;
  /** Modo individual (sem workspace real no banco). */
  legacyMode?: boolean;
}

const WORKSPACE_MIGRATION_HINT =
  'Para ativar a equipe: no Supabase SQL Editor, execute o arquivo 20260520000009_bootstrap_email_param.sql e recarregue a página.';

export function isTeamWorkspaceActive(ctx: WorkspaceContext): boolean {
  return ctx.legacyMode !== true;
}

let lastBootstrapError: string | null = null;

export function getLastBootstrapError(): string | null {
  return lastBootstrapError;
}

function resolveUserEmail(user: User): string {
  return (
    user.email ??
    (user.user_metadata?.email as string | undefined) ??
    ''
  )
    .trim()
    .toLowerCase();
}

let cached: WorkspaceContext | null = null;
let workspaceTablesAvailable: boolean | null = null;
let forceLegacyWorkspace = false;
let setupWarning: string | null = null;

export function clearWorkspaceCache() {
  cached = null;
  workspaceTablesAvailable = null;
  forceLegacyWorkspace = false;
  setupWarning = null;
}

/** Mensagem única para exibir no toast (consumida uma vez). */
export function consumeWorkspaceSetupWarning(): string | null {
  const msg = setupWarning;
  setupWarning = null;
  return msg;
}

function legacyContext(user: User): WorkspaceContext {
  const email = resolveUserEmail(user);
  const name = (user.user_metadata?.company_name as string) || 'Minha empresa';
  return {
    user,
    workspaceId: user.id,
    ownerId: user.id,
    role: 'owner',
    email,
    workspaceName: name,
    legacyMode: true,
  };
}

function markWorkspaceReady(ctx: WorkspaceContext): WorkspaceContext {
  forceLegacyWorkspace = false;
  setupWarning = null;
  lastBootstrapError = null;
  cached = { ...ctx, legacyMode: false };
  return cached;
}

function useLegacy(user: User, warn?: string): WorkspaceContext {
  forceLegacyWorkspace = true;
  if (warn && !setupWarning) setupWarning = warn;
  cached = legacyContext(user);
  return cached;
}

function isRecoverableWorkspaceError(error: unknown): boolean {
  if (isMissingTableError(error)) return true;
  const msg = getErrorMessage(error).toLowerCase();
  return (
    isRlsOrPolicyError(error) ||
    msg.includes('row-level security') ||
    msg.includes('is ambiguous') ||
    msg.includes('bootstrap_owned_workspace') ||
    msg.includes('permission denied')
  );
}

async function probeWorkspaceTables(): Promise<boolean> {
  if (workspaceTablesAvailable !== null) return workspaceTablesAvailable;
  const { error } = await supabase.from('workspaces').select('id').limit(1);
  if (!error) {
    workspaceTablesAvailable = true;
    return true;
  }
  if (isMissingTableError(error)) {
    workspaceTablesAvailable = false;
    return false;
  }
  workspaceTablesAvailable = true;
  return true;
}

type BootstrapRpcRow = {
  workspace_id: string;
  owner_id: string;
  workspace_name: string;
  member_role: string;
};

function mapBootstrapRow(
  user: User,
  row: BootstrapRpcRow | undefined,
): WorkspaceContext | null {
  if (!row?.workspace_id) return null;
  const email = resolveUserEmail(user);
  return {
    user,
    workspaceId: row.workspace_id,
    ownerId: row.owner_id,
    role: (row.member_role as WorkspaceRole) || 'owner',
    email,
    workspaceName: row.workspace_name,
    legacyMode: false,
  };
}

/** RPC única: membro ativo, convite pendente ou workspace próprio (SECURITY DEFINER). */
async function resolveMyWorkspaceViaRpc(
  user: User,
  companyName: string,
): Promise<WorkspaceContext | null> {
  const { data, error } = await supabase.rpc('resolve_my_workspace', {
    p_company_name: companyName,
  });
  if (error) {
    if (!getErrorMessage(error).includes('Could not find the function')) {
      console.warn('resolve_my_workspace:', getErrorMessage(error));
    }
    return null;
  }
  const row = (Array.isArray(data) ? data[0] : data) as BootstrapRpcRow | undefined;
  return mapBootstrapRow(user, row);
}

async function bootstrapViaRpc(
  user: User,
  name: string,
  email: string,
): Promise<WorkspaceContext | null> {
  const attempts: Record<string, string>[] = [
    { p_name: name, p_email: email },
    { p_name: name },
  ];

  lastBootstrapError = null;

  for (const params of attempts) {
    const { data, error } = await supabase.rpc('bootstrap_owned_workspace', params);
    if (!error) {
      const row = (Array.isArray(data) ? data[0] : data) as BootstrapRpcRow | undefined;
      const ctx = mapBootstrapRow(user, row);
      if (ctx) return ctx;
      lastBootstrapError = 'A função bootstrap não retornou dados.';
    } else {
      lastBootstrapError = getErrorMessage(error);
      console.warn('bootstrap_owned_workspace:', lastBootstrapError, params);
      if (lastBootstrapError.includes('Could not find the function')) break;
    }
  }
  return null;
}

/** Cria workspace via API quando a RPC falha (políticas 006+ já aplicadas). */
async function createOwnedWorkspaceDirect(
  user: User,
  name: string,
  email: string,
): Promise<WorkspaceContext | null> {
  if (!email) {
    lastBootstrapError =
      'Sua conta precisa de um e-mail confirmado no Supabase Auth para ativar a equipe.';
    return null;
  }

  const { error: insertErr } = await supabase
    .from('workspaces')
    .insert({ owner_id: user.id, name });

  if (insertErr && insertErr.code !== '23505') {
    lastBootstrapError = getErrorMessage(insertErr);
    return null;
  }

  const { data: ws, error: fetchErr } = await supabase
    .from('workspaces')
    .select('id, owner_id, name')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (fetchErr || !ws) {
    lastBootstrapError = fetchErr ? getErrorMessage(fetchErr) : 'Workspace não encontrado após criar.';
    return null;
  }

  const { data: existingMember } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', ws.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existingMember) {
    const { error: memErr } = await supabase.from('workspace_members').insert({
      workspace_id: ws.id,
      user_id: user.id,
      email,
      role: 'owner',
      status: 'active',
      joined_at: new Date().toISOString(),
    });
    if (memErr) {
      lastBootstrapError = getErrorMessage(memErr);
      return null;
    }
  }

  return {
    user,
    workspaceId: ws.id,
    ownerId: ws.owner_id,
    role: 'owner',
    email,
    workspaceName: ws.name,
    legacyMode: false,
  };
}

/** Limpa cache e tenta ativar workspace + equipe de novo (ex.: após migration no Supabase). */
export async function refreshTeamWorkspace(): Promise<{
  ctx: WorkspaceContext;
  members: WorkspaceMember[];
}> {
  clearWorkspaceCache();
  workspaceTablesAvailable = null;
  forceLegacyWorkspace = false;
  setupWarning = null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const ctx = await resolveWorkspace(user);
  const members = await listWorkspaceMembers();
  return { ctx, members };
}

function mapMember(row: Record<string, unknown>): WorkspaceMember {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    userId: (row.user_id as string) || undefined,
    email: row.email as string,
    role: row.role as WorkspaceRole,
    status: row.status as 'pending' | 'active',
    invitedAt: row.invited_at ? String(row.invited_at) : undefined,
    joinedAt: row.joined_at ? String(row.joined_at) : undefined,
  };
}

async function activatePendingInviteViaRpc(
  user: User,
): Promise<WorkspaceContext | null> {
  const { data, error } = await supabase.rpc('activate_workspace_invite');
  if (error) {
    console.warn('activate_workspace_invite:', getErrorMessage(error));
    return null;
  }
  const row = (Array.isArray(data) ? data[0] : data) as BootstrapRpcRow | undefined;
  return mapBootstrapRow(user, row);
}

async function activatePendingInvite(user: User): Promise<WorkspaceMember | null> {
  const email = resolveUserEmail(user);
  if (!email) return null;

  const fromRpc = await activatePendingInviteViaRpc(user);
  if (fromRpc) {
    return {
      id: '',
      workspaceId: fromRpc.workspaceId,
      userId: user.id,
      email,
      role: fromRpc.role,
      status: 'active',
      joinedAt: new Date().toISOString(),
    };
  }

  const { data: pending, error } = await supabase
    .from('workspace_members')
    .select('id, workspace_id, email, role, status')
    .eq('email', email)
    .eq('status', 'pending')
    .maybeSingle();

  if (error || !pending) {
    if (error) console.warn('pending invite select:', getErrorMessage(error));
    return null;
  }

  const { data: updated, error: upErr } = await supabase
    .from('workspace_members')
    .update({
      user_id: user.id,
      status: 'active',
      joined_at: new Date().toISOString(),
    })
    .eq('id', pending.id)
    .select('id, workspace_id, user_id, email, role, status')
    .single();

  if (upErr) {
    console.warn('pending invite update:', getErrorMessage(upErr));
    return null;
  }
  return mapMember(updated);
}

async function loadOwnedWorkspace(
  user: User,
  email: string,
): Promise<WorkspaceContext | null> {
  const { data: owned, error: ownedErr } = await supabase
    .from('workspaces')
    .select('id, owner_id, name')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (ownedErr || !owned) return null;

  const { data: existingMember } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', owned.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existingMember && email) {
    await supabase.from('workspace_members').insert({
      workspace_id: owned.id,
      user_id: user.id,
      email,
      role: 'owner',
      status: 'active',
      joined_at: new Date().toISOString(),
    });
  }

  return {
    user,
    workspaceId: owned.id,
    ownerId: owned.owner_id,
    role: 'owner',
    email,
    workspaceName: owned.name,
    legacyMode: false,
  };
}

async function loadContextFromMember(
  user: User,
  member: Record<string, unknown>,
  email: string,
): Promise<WorkspaceContext | null> {
  const workspaceId = member.workspace_id as string;
  const { data: ws, error: wsErr } = await supabase
    .from('workspaces')
    .select('id, owner_id, name')
    .eq('id', workspaceId)
    .maybeSingle();

  if (wsErr || !ws) return null;

  return {
    user,
    workspaceId,
    ownerId: ws.owner_id as string,
    role: member.role as WorkspaceRole,
    email,
    workspaceName: ws.name as string,
    legacyMode: false,
  };
}

export async function resolveWorkspace(user: User): Promise<WorkspaceContext> {
  const tablesOk = await probeWorkspaceTables();
  if (!tablesOk) return legacyContext(user);

  const email = resolveUserEmail(user);
  const companyName =
    (user.user_metadata?.company_name as string) || 'Minha empresa';

  try {
    const fromResolveRpc = await resolveMyWorkspaceViaRpc(user, companyName);
    if (fromResolveRpc) return markWorkspaceReady(fromResolveRpc);

    const inviteRpc = await activatePendingInviteViaRpc(user);
    if (inviteRpc) return markWorkspaceReady(inviteRpc);

    const { data: activeMember, error: memberErr } = await supabase
      .from('workspace_members')
      .select('id, workspace_id, user_id, email, role, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!memberErr && activeMember?.workspace_id) {
      const ctx = await loadContextFromMember(user, activeMember, email);
      if (ctx) return markWorkspaceReady(ctx);
    }

    const activated = await activatePendingInvite(user);
    if (activated?.workspaceId) {
      const ctx = await loadContextFromMember(
        user,
        activated as unknown as Record<string, unknown>,
        email,
      );
      if (ctx) return markWorkspaceReady(ctx);
    }

    const fromRpc = await bootstrapViaRpc(user, companyName, email);
    if (fromRpc) return markWorkspaceReady(fromRpc);

    const afterRpcOwned = await loadOwnedWorkspace(user, email);
    if (afterRpcOwned) return markWorkspaceReady(afterRpcOwned);

    const ownedCtx = await loadOwnedWorkspace(user, email);
    if (ownedCtx) return markWorkspaceReady(ownedCtx);

    const retryRpc = await bootstrapViaRpc(user, companyName, email);
    if (retryRpc) return markWorkspaceReady(retryRpc);

    const direct = await createOwnedWorkspaceDirect(user, companyName, email);
    if (direct) return markWorkspaceReady(direct);

    return useLegacy(
      user,
      `${WORKSPACE_MIGRATION_HINT} Enquanto isso, seus dados continuam no modo individual.`,
    );
  } catch (err) {
    console.warn('resolveWorkspace:', err);
    if (isRecoverableWorkspaceError(err)) {
      return useLegacy(user, WORKSPACE_MIGRATION_HINT);
    }
    throw err;
  }
}

export async function requireWorkspace(): Promise<WorkspaceContext> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) {
    const { data: { user: u2 }, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!u2) throw new Error('Usuário não autenticado');
    if (!cached || cached.user.id !== u2.id || cached.legacyMode) {
      cached = await resolveWorkspace(u2);
    }
    return cached!;
  }
  if (!cached || cached.user.id !== user.id || cached.legacyMode) {
    cached = await resolveWorkspace(user);
  }
  return cached!;
}

export async function listWorkspaceMembers(): Promise<WorkspaceMember[]> {
  if (!(await probeWorkspaceTables()) || forceLegacyWorkspace) return [];
  try {
    const ctx = await requireWorkspace();
    if (forceLegacyWorkspace || !isTeamWorkspaceActive(ctx)) return [];

    const { data, error } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', ctx.workspaceId)
      .order('role', { ascending: true });

    if (error) {
      if (isMissingTableError(error) || isRecoverableWorkspaceError(error)) return [];
      throw error;
    }
    return (data ?? []).map(mapMember);
  } catch {
    return [];
  }
}

export async function inviteWorkspaceMember(
  email: string,
  role: Exclude<WorkspaceRole, 'owner'> = 'member',
): Promise<WorkspaceMember> {
  if (!(await probeWorkspaceTables())) {
    throw new Error(WORKSPACE_MIGRATION_HINT);
  }

  const ctx = await requireWorkspace();
  if (!isTeamWorkspaceActive(ctx)) {
    throw new Error(getLastBootstrapError() ?? WORKSPACE_MIGRATION_HINT);
  }
  if (ctx.role === 'member') {
    throw new Error('Apenas administradores podem convidar usuários.');
  }

  const normalized = email.trim().toLowerCase();
  if (!normalized) throw new Error('Informe um e-mail válido.');
  if (normalized === ctx.email) {
    throw new Error('Este e-mail já pertence à conta (você).');
  }

  const { error: insertErr } = await supabase.from('workspace_members').insert({
    workspace_id: ctx.workspaceId,
    email: normalized,
    role,
    status: 'pending',
  });

  if (insertErr) {
    if (insertErr.code === '23505') throw new Error('Este e-mail já foi convidado.');
    const msg = getErrorMessage(insertErr);
    if (msg.includes('violates foreign key')) {
      throw new Error('Workspace inválido. Recarregue a página (F5) e tente novamente.');
    }
    if (isRecoverableWorkspaceError(insertErr)) throw new Error(msg);
    throw new Error(msg || 'Não foi possível convidar este usuário.');
  }

  const { data, error: fetchErr } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', ctx.workspaceId)
    .eq('email', normalized)
    .maybeSingle();

  if (fetchErr || !data) {
    return {
      id: '',
      workspaceId: ctx.workspaceId,
      email: normalized,
      role,
      status: 'pending',
    };
  }
  return mapMember(data);
}

export async function removeWorkspaceMember(memberId: string): Promise<void> {
  const ctx = await requireWorkspace();
  if (ctx.role === 'member') {
    throw new Error('Apenas administradores podem remover usuários.');
  }

  const { data: target } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('id', memberId)
    .single();

  if (target?.role === 'owner') throw new Error('Não é possível remover o dono da conta.');

  const { error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('id', memberId)
    .eq('workspace_id', ctx.workspaceId);

  if (error) throw error;
}

export async function updateMemberRole(
  memberId: string,
  role: Exclude<WorkspaceRole, 'owner'>,
): Promise<void> {
  const ctx = await requireWorkspace();
  if (ctx.role !== 'owner') {
    throw new Error('Apenas o dono pode alterar permissões.');
  }

  const { error } = await supabase
    .from('workspace_members')
    .update({ role })
    .eq('id', memberId)
    .eq('workspace_id', ctx.workspaceId)
    .neq('role', 'owner');

  if (error) throw error;
}
