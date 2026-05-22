import { supabase } from './supabase';
import { AuditLogEntry } from '../../types';
import { requireWorkspace } from './workspace';

export type AuditAction =
  | 'transaction.create'
  | 'transaction.update'
  | 'transaction.delete'
  | 'transaction.status'
  | 'client.create'
  | 'client.update'
  | 'client.delete'
  | 'employee.create'
  | 'employee.update'
  | 'employee.delete'
  | 'subscription.create'
  | 'subscription.update'
  | 'subscription.delete'
  | 'bank_account.create'
  | 'bank_account.update'
  | 'bank_account.delete'
  | 'settings.update'
  | 'member.invite'
  | 'member.remove'
  | 'member.role';

export interface LogAuditParams {
  action: AuditAction;
  summary: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

function mapRow(row: Record<string, unknown>): AuditLogEntry {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    actorUserId: (row.actor_user_id as string) || undefined,
    actorEmail: (row.actor_email as string) || undefined,
    action: row.action as string,
    entityType: (row.entity_type as string) || undefined,
    entityId: (row.entity_id as string) || undefined,
    summary: row.summary as string,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at),
  };
}

export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    const ctx = await requireWorkspace();
    const { error } = await supabase.from('audit_logs').insert({
      workspace_id: ctx.workspaceId,
      actor_user_id: ctx.user.id,
      actor_email: ctx.email,
      action: params.action,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      summary: params.summary,
      metadata: params.metadata ?? {},
    });
    if (error) console.warn('Audit log:', error.message);
  } catch (e) {
    console.warn('Audit log skipped:', e);
  }
}

export async function listAuditLogs(limit = 100): Promise<AuditLogEntry[]> {
  const ctx = await requireWorkspace();
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('workspace_id', ctx.workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
      return [];
    }
    throw error;
  }
  return (data ?? []).map(mapRow);
}
