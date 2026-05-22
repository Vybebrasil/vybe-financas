-- Convite pendente: ativa no login antes de criar workspace próprio

CREATE OR REPLACE FUNCTION public.activate_workspace_invite()
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
  v_row workspace_members%ROWTYPE;
  v_ws workspaces%ROWTYPE;
BEGIN
  IF v_uid IS NULL OR v_email = '' THEN
    RETURN;
  END IF;

  SELECT wm.* INTO v_row
  FROM workspace_members wm
  WHERE lower(wm.email) = v_email AND wm.status = 'pending'
  ORDER BY wm.invited_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE workspace_members
  SET user_id = v_uid, status = 'active', joined_at = COALESCE(joined_at, now())
  WHERE id = v_row.id;

  SELECT * INTO v_ws FROM workspaces WHERE id = v_row.workspace_id;

  RETURN QUERY SELECT v_ws.id, v_ws.owner_id, v_ws.name, v_row.role::text;
END;
$$;

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
  v_invite workspace_members%ROWTYPE;
  v_active_role text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF v_email = '' THEN
    RAISE EXCEPTION 'email_required';
  END IF;

  SELECT wm.* INTO v_invite
  FROM workspace_members wm
  WHERE lower(wm.email) = v_email AND wm.status = 'pending'
  ORDER BY wm.invited_at DESC
  LIMIT 1;

  IF FOUND THEN
    UPDATE workspace_members
    SET user_id = v_uid, status = 'active', joined_at = COALESCE(joined_at, now())
    WHERE id = v_invite.id;
    SELECT * INTO v_ws FROM workspaces WHERE id = v_invite.workspace_id;
    RETURN QUERY SELECT v_ws.id, v_ws.owner_id, v_ws.name, v_invite.role::text;
    RETURN;
  END IF;

  SELECT w.id, w.owner_id, w.name, wm.role INTO v_ws.id, v_ws.owner_id, v_ws.name, v_active_role
  FROM workspace_members wm
  JOIN workspaces w ON w.id = wm.workspace_id
  WHERE wm.user_id = v_uid AND wm.status = 'active'
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT v_ws.id, v_ws.owner_id, v_ws.name, v_active_role;
    RETURN;
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

REVOKE ALL ON FUNCTION public.activate_workspace_invite() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_workspace_invite() TO authenticated;

REVOKE ALL ON FUNCTION public.bootstrap_owned_workspace(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_owned_workspace(text, text) TO authenticated;
