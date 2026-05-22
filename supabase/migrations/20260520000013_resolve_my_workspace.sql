-- Fonte única de verdade: workspace do usuário logado (dono ou convidado)

CREATE OR REPLACE FUNCTION public.resolve_my_workspace(p_company_name text DEFAULT 'Minha empresa')
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
  v_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  v_ws workspaces%ROWTYPE;
  v_wm workspace_members%ROWTYPE;
  v_label text := coalesce(nullif(trim(p_company_name), ''), 'Minha empresa');
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  -- Membro ativo (convidado ou dono)
  SELECT wm.* INTO v_wm
  FROM workspace_members wm
  WHERE wm.user_id = v_uid AND wm.status = 'active'
  ORDER BY CASE WHEN wm.role = 'owner' THEN 0 ELSE 1 END
  LIMIT 1;

  IF FOUND THEN
    SELECT * INTO v_ws FROM workspaces WHERE id = v_wm.workspace_id;
    RETURN QUERY SELECT v_ws.id, v_ws.owner_id, v_ws.name, v_wm.role::text;
    RETURN;
  END IF;

  -- Convite pendente → ativa
  IF v_email <> '' THEN
    SELECT wm.* INTO v_wm
    FROM workspace_members wm
    WHERE lower(wm.email) = v_email AND wm.status = 'pending'
    ORDER BY wm.invited_at DESC
    LIMIT 1;

    IF FOUND THEN
      UPDATE workspace_members
      SET user_id = v_uid, status = 'active', joined_at = COALESCE(joined_at, now())
      WHERE id = v_wm.id;
      SELECT * INTO v_ws FROM workspaces WHERE id = v_wm.workspace_id;
      RETURN QUERY SELECT v_ws.id, v_ws.owner_id, v_ws.name, v_wm.role::text;
      RETURN;
    END IF;
  END IF;

  -- Dono com workspace sem linha em members
  SELECT * INTO v_ws FROM workspaces WHERE owner_id = v_uid LIMIT 1;

  IF FOUND THEN
    IF v_email <> '' THEN
      INSERT INTO workspace_members (workspace_id, user_id, email, role, status, joined_at)
      VALUES (v_ws.id, v_uid, v_email, 'owner', 'active', now())
      ON CONFLICT (workspace_id, email) DO UPDATE SET
        user_id = v_uid, role = 'owner', status = 'active',
        joined_at = COALESCE(workspace_members.joined_at, EXCLUDED.joined_at);
    END IF;
    RETURN QUERY SELECT v_ws.id, v_ws.owner_id, v_ws.name, 'owner'::text;
    RETURN;
  END IF;

  -- Nova conta: cria workspace
  IF v_email = '' THEN
    RETURN;
  END IF;

  INSERT INTO workspaces (owner_id, name) VALUES (v_uid, v_label) RETURNING * INTO v_ws;

  INSERT INTO workspace_members (workspace_id, user_id, email, role, status, joined_at)
  VALUES (v_ws.id, v_uid, v_email, 'owner', 'active', now())
  ON CONFLICT (workspace_id, email) DO NOTHING;

  RETURN QUERY SELECT v_ws.id, v_ws.owner_id, v_ws.name, 'owner'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_my_workspace(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_my_workspace(text) TO authenticated;
