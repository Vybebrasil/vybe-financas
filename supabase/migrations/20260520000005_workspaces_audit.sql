-- Workspace (conta compartilhada) + membros + log de ações

CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Minha empresa',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS workspaces_owner_id_idx ON workspaces(owner_id);

CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  UNIQUE(workspace_id, email)
);

CREATE INDEX IF NOT EXISTS workspace_members_user_id_idx ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS workspace_members_workspace_id_idx ON workspace_members(workspace_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  summary TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_workspace_created_idx
  ON audit_logs(workspace_id, created_at DESC);

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper: IDs de workspaces que o usuário pode acessar
CREATE OR REPLACE FUNCTION public.user_workspace_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT w.id
  FROM workspaces w
  WHERE w.owner_id = auth.uid()
  UNION
  SELECT wm.workspace_id
  FROM workspace_members wm
  WHERE wm.user_id = auth.uid() AND wm.status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.user_data_owner_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT x.owner_id
  FROM (
    SELECT auth.uid() AS owner_id
    UNION ALL
    SELECT w.owner_id FROM workspaces w WHERE w.owner_id = auth.uid()
    UNION ALL
    SELECT w.owner_id
    FROM workspace_members wm
    JOIN workspaces w ON w.id = wm.workspace_id
    WHERE wm.user_id = auth.uid() AND wm.status = 'active'
  ) x
  WHERE x.owner_id IS NOT NULL;
$$;

-- Workspaces
DROP POLICY IF EXISTS "workspaces_select" ON workspaces;
CREATE POLICY "workspaces_select" ON workspaces
  FOR SELECT USING (id IN (SELECT public.user_workspace_ids()));

DROP POLICY IF EXISTS "workspaces_insert" ON workspaces;
CREATE POLICY "workspaces_insert" ON workspaces
  FOR INSERT WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "workspaces_update" ON workspaces;
CREATE POLICY "workspaces_update" ON workspaces
  FOR UPDATE USING (owner_id = auth.uid());

-- Members
DROP POLICY IF EXISTS "workspace_members_select" ON workspace_members;
CREATE POLICY "workspace_members_select" ON workspace_members
  FOR SELECT USING (
    workspace_members.workspace_id IN (SELECT public.user_workspace_ids())
  );

DROP POLICY IF EXISTS "workspace_members_insert" ON workspace_members;
CREATE POLICY "workspace_members_insert" ON workspace_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = workspace_members.workspace_id AND w.owner_id = auth.uid()
    )
    OR (
      workspace_members.workspace_id IN (SELECT public.user_workspace_ids())
      AND EXISTS (
        SELECT 1 FROM workspace_members me
        WHERE me.workspace_id = workspace_members.workspace_id
          AND me.user_id = auth.uid()
          AND me.status = 'active'
          AND me.role IN ('owner', 'admin')
      )
    )
  );

DROP POLICY IF EXISTS "workspace_members_update" ON workspace_members;
CREATE POLICY "workspace_members_update" ON workspace_members
  FOR UPDATE USING (
    workspace_members.workspace_id IN (SELECT public.user_workspace_ids())
    AND (
      workspace_members.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM workspace_members me
        WHERE me.workspace_id = workspace_members.workspace_id
          AND me.user_id = auth.uid()
          AND me.role IN ('owner', 'admin')
      )
    )
  );

DROP POLICY IF EXISTS "workspace_members_delete" ON workspace_members;
CREATE POLICY "workspace_members_delete" ON workspace_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workspace_members me
      WHERE me.workspace_id = workspace_members.workspace_id
        AND me.user_id = auth.uid()
        AND me.role IN ('owner', 'admin')
    )
    AND workspace_members.role <> 'owner'
  );

-- Audit logs
DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
CREATE POLICY "audit_logs_select" ON audit_logs
  FOR SELECT USING (audit_logs.workspace_id IN (SELECT public.user_workspace_ids()));

DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT WITH CHECK (audit_logs.workspace_id IN (SELECT public.user_workspace_ids()));

-- Dados financeiros: dono OU membro do workspace
DROP POLICY IF EXISTS "transactions_own" ON transactions;
CREATE POLICY "transactions_workspace" ON transactions
  FOR ALL USING (user_id IN (SELECT public.user_data_owner_ids()))
  WITH CHECK (user_id IN (SELECT public.user_data_owner_ids()));

DROP POLICY IF EXISTS "clients_own" ON clients;
CREATE POLICY "clients_workspace" ON clients
  FOR ALL USING (user_id IN (SELECT public.user_data_owner_ids()))
  WITH CHECK (user_id IN (SELECT public.user_data_owner_ids()));

DROP POLICY IF EXISTS "employees_own" ON employees;
CREATE POLICY "employees_workspace" ON employees
  FOR ALL USING (user_id IN (SELECT public.user_data_owner_ids()))
  WITH CHECK (user_id IN (SELECT public.user_data_owner_ids()));

DROP POLICY IF EXISTS "subscriptions_own" ON subscriptions;
CREATE POLICY "subscriptions_workspace" ON subscriptions
  FOR ALL USING (user_id IN (SELECT public.user_data_owner_ids()))
  WITH CHECK (user_id IN (SELECT public.user_data_owner_ids()));

DROP POLICY IF EXISTS "bank_accounts_own" ON bank_accounts;
CREATE POLICY "bank_accounts_workspace" ON bank_accounts
  FOR ALL USING (user_id IN (SELECT public.user_data_owner_ids()))
  WITH CHECK (user_id IN (SELECT public.user_data_owner_ids()));

DROP POLICY IF EXISTS "company_settings_own" ON company_settings;
CREATE POLICY "company_settings_workspace" ON company_settings
  FOR ALL USING (user_id IN (SELECT public.user_data_owner_ids()))
  WITH CHECK (user_id IN (SELECT public.user_data_owner_ids()));

DROP POLICY IF EXISTS "recurring_log_own" ON recurring_generation_log;
CREATE POLICY "recurring_log_workspace" ON recurring_generation_log
  FOR ALL USING (user_id IN (SELECT public.user_data_owner_ids()))
  WITH CHECK (user_id IN (SELECT public.user_data_owner_ids()));
