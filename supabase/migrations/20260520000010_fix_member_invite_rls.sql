-- Corrige convite de membros (INSERT em workspace_members)

DROP POLICY IF EXISTS "workspace_members_insert" ON workspace_members;
CREATE POLICY "workspace_members_insert" ON workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IN (SELECT public.user_workspace_ids())
    AND (
      EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = workspace_id AND w.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM workspace_members me
        WHERE me.workspace_id = workspace_id
          AND me.user_id = auth.uid()
          AND me.status = 'active'
          AND me.role IN ('owner', 'admin')
      )
    )
  );
