-- Corrige "infinite recursion detected in policy for relation workspace_members"
-- Políticas passam a usar funções SECURITY DEFINER (sem auto-referência em RLS)

CREATE OR REPLACE FUNCTION public.is_workspace_owner(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = p_workspace_id AND w.owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_admin(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_workspace_owner(p_workspace_id)
  OR EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = p_workspace_id
      AND wm.user_id = auth.uid()
      AND wm.status = 'active'
      AND wm.role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_workspace_members(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_workspace_admin(p_workspace_id)
  OR EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = p_workspace_id
      AND wm.user_id = auth.uid()
      AND wm.status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.is_workspace_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_workspace_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_view_workspace_members(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_workspace_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_workspace_members(uuid) TO authenticated;

DROP POLICY IF EXISTS "workspace_members_select" ON workspace_members;
CREATE POLICY "workspace_members_select" ON workspace_members
  FOR SELECT TO authenticated
  USING (
    public.can_view_workspace_members(workspace_id)
    OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

DROP POLICY IF EXISTS "workspace_members_insert" ON workspace_members;
CREATE POLICY "workspace_members_insert" ON workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_admin(workspace_id));

DROP POLICY IF EXISTS "workspace_members_update" ON workspace_members;
CREATE POLICY "workspace_members_update" ON workspace_members
  FOR UPDATE TO authenticated
  USING (
    public.is_workspace_admin(workspace_id)
    OR user_id = auth.uid()
    OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

DROP POLICY IF EXISTS "workspace_members_delete" ON workspace_members;
CREATE POLICY "workspace_members_delete" ON workspace_members
  FOR DELETE TO authenticated
  USING (
    public.is_workspace_admin(workspace_id)
    AND role <> 'owner'
  );
