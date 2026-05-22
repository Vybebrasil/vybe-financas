-- Corrige "column reference workspace_id is ambiguous" nas políticas RLS (join com workspaces)

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

DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
CREATE POLICY "audit_logs_select" ON audit_logs
  FOR SELECT TO authenticated
  USING (audit_logs.workspace_id IN (SELECT public.user_workspace_ids()));

DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (audit_logs.workspace_id IN (SELECT public.user_workspace_ids()));
