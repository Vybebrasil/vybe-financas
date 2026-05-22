-- Corrige RLS de workspaces (erro ao criar conta compartilhada no primeiro login)

-- Sempre permite ver os próprios dados, mesmo antes do workspace existir
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

-- Cria workspace + membro dono (bypass RLS de insert na primeira vez)
CREATE OR REPLACE FUNCTION public.bootstrap_owned_workspace(
  p_name text DEFAULT 'Minha empresa',
  p_email text DEFAULT NULL
)
RETURNS TABLE (
  workspace_id uuid,
  owner_id uuid,
  workspace_name text,
  member_role text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := lower(trim(coalesce(nullif(p_email, ''), auth.jwt() ->> 'email', '')));
  v_ws workspaces%ROWTYPE;
  v_label text := coalesce(nullif(trim(p_name), ''), 'Minha empresa');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF v_email = '' THEN
    RAISE EXCEPTION 'email_required';
  END IF;

  SELECT * INTO v_ws FROM workspaces WHERE workspaces.owner_id = v_uid LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO workspaces (owner_id, name) VALUES (v_uid, v_label) RETURNING * INTO v_ws;
  END IF;

  INSERT INTO workspace_members (workspace_id, user_id, email, role, status, joined_at)
  VALUES (v_ws.id, v_uid, v_email, 'owner', 'active', now())
  ON CONFLICT (workspace_id, email) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    role = 'owner',
    status = 'active',
    joined_at = COALESCE(workspace_members.joined_at, EXCLUDED.joined_at);

  RETURN QUERY SELECT v_ws.id, v_ws.owner_id, v_ws.name, 'owner'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_owned_workspace(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_owned_workspace(text, text) TO authenticated;

-- Grants explícitos (às vezes faltam após criar tabelas manualmente)
GRANT SELECT, INSERT, UPDATE ON workspaces TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON workspace_members TO authenticated;
GRANT SELECT, INSERT ON audit_logs TO authenticated;

-- Workspaces
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspaces_select" ON workspaces;
CREATE POLICY "workspaces_select" ON workspaces
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.user_workspace_ids()));

DROP POLICY IF EXISTS "workspaces_insert" ON workspaces;
CREATE POLICY "workspaces_insert" ON workspaces
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "workspaces_update" ON workspaces;
CREATE POLICY "workspaces_update" ON workspaces
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Membros
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_members_select" ON workspace_members;
CREATE POLICY "workspace_members_select" ON workspace_members
  FOR SELECT TO authenticated
  USING (
    workspace_members.workspace_id IN (SELECT public.user_workspace_ids())
    OR lower(workspace_members.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

DROP POLICY IF EXISTS "workspace_members_insert" ON workspace_members;
CREATE POLICY "workspace_members_insert" ON workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (
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
  FOR UPDATE TO authenticated
  USING (
    workspace_members.workspace_id IN (SELECT public.user_workspace_ids())
    AND (
      workspace_members.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM workspace_members me
        WHERE me.workspace_id = workspace_members.workspace_id
          AND me.user_id = auth.uid()
          AND me.role IN ('owner', 'admin')
      )
      OR lower(workspace_members.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

DROP POLICY IF EXISTS "workspace_members_delete" ON workspace_members;
CREATE POLICY "workspace_members_delete" ON workspace_members
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members me
      WHERE me.workspace_id = workspace_members.workspace_id
        AND me.user_id = auth.uid()
        AND me.role IN ('owner', 'admin')
    )
    AND workspace_members.role <> 'owner'
  );

-- Audit
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
CREATE POLICY "audit_logs_select" ON audit_logs
  FOR SELECT TO authenticated
  USING (audit_logs.workspace_id IN (SELECT public.user_workspace_ids()));

DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (audit_logs.workspace_id IN (SELECT public.user_workspace_ids()));
