-- Se a equipe ainda não ativar: rode este script (corrige e-mail no bootstrap)

DROP FUNCTION IF EXISTS public.bootstrap_owned_workspace(text);

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
