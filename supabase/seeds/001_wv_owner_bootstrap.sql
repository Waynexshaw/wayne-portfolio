-- Seed: 001_wv_owner_bootstrap.sql
-- Description: Parameterized, idempotent bootstrap script for initializing owner profile, identities, and workspaces.
-- Usage: Execute in SQL Editor after setting the session parameter:
--   SET app.owner_uuid = 'YOUR_AUTH_USER_UUID_HERE';

DO $$
DECLARE
  v_owner_param TEXT := current_setting('app.owner_uuid', true);
  v_owner_id UUID;
  v_id_defiwaynex UUID;
  v_id_joseph UUID;
  v_id_pevra UUID;
  v_ws_pevra UUID;
  v_ws_defiwaynex UUID;
  v_ws_joseph UUID;
BEGIN
  -- 1. Validation of explicit parameter
  IF v_owner_param IS NULL OR trim(v_owner_param) = '' THEN
    RAISE EXCEPTION 'BOOTSTRAP FAILED: Session setting "app.owner_uuid" is not set. Execute "SET app.owner_uuid = ''<UUID>'';" before running this seed.';
  END IF;

  BEGIN
    v_owner_id := v_owner_param::UUID;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'BOOTSTRAP FAILED: "app.owner_uuid" value "%" is not a valid UUID format.', v_owner_param;
  END;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_owner_id) THEN
    RAISE EXCEPTION 'BOOTSTRAP FAILED: Specified owner UUID % was not found in auth.users table.', v_owner_id;
  END IF;

  -- 2. User Profile (Idempotent upsert)
  INSERT INTO public.user_profiles (id, full_name, display_name, bio)
  VALUES (v_owner_id, 'Joseph Henshaw', 'Wayne', 'Web3 Growth Strategist, Researcher & Founder')
  ON CONFLICT (id) DO UPDATE 
    SET full_name = EXCLUDED.full_name,
        display_name = EXCLUDED.display_name,
        bio = EXCLUDED.bio,
        updated_at = NOW();

  -- 3. Identities (Idempotent upsert per UNIQUE(user_id, name))
  -- Identity 1: DeFiwayneX
  INSERT INTO public.identities (user_id, name, handle, type, bio, is_default)
  VALUES (v_owner_id, 'DeFiwayneX', '@defiwaynex', 'pseudonymous', 'Web3 Growth Strategist, Researcher & Operator', TRUE)
  ON CONFLICT (user_id, name) DO UPDATE 
    SET handle = EXCLUDED.handle,
        type = EXCLUDED.type,
        bio = EXCLUDED.bio,
        updated_at = NOW()
  RETURNING id INTO v_id_defiwaynex;

  -- Identity 2: Joseph Henshaw
  INSERT INTO public.identities (user_id, name, handle, type, bio, is_default)
  VALUES (v_owner_id, 'Joseph Henshaw', 'joseph-henshaw', 'personal', 'Founder of PEVRA, researcher, builder', FALSE)
  ON CONFLICT (user_id, name) DO UPDATE 
    SET handle = EXCLUDED.handle,
        type = EXCLUDED.type,
        bio = EXCLUDED.bio,
        updated_at = NOW()
  RETURNING id INTO v_id_joseph;

  -- Identity 3: PEVRA
  INSERT INTO public.identities (user_id, name, handle, type, bio, is_default)
  VALUES (v_owner_id, 'PEVRA', '@pevraHQ', 'entity', 'Blockchain telecommunications platform on Polygon', FALSE)
  ON CONFLICT (user_id, name) DO UPDATE 
    SET handle = EXCLUDED.handle,
        type = EXCLUDED.type,
        bio = EXCLUDED.bio,
        updated_at = NOW()
  RETURNING id INTO v_id_pevra;

  -- 4. Workspaces (Idempotent upsert per UNIQUE(owner_id, slug))
  -- Note: trg_workspace_auto_owner_member automatically inserts owner membership on INSERT!
  
  -- Workspace 1: PEVRA
  INSERT INTO public.workspaces (owner_id, primary_identity_id, name, slug, workspace_type, is_default)
  VALUES (v_owner_id, v_id_pevra, 'PEVRA', 'pevra', 'venture', TRUE)
  ON CONFLICT (owner_id, slug) DO UPDATE 
    SET primary_identity_id = EXCLUDED.primary_identity_id,
        name = EXCLUDED.name,
        workspace_type = EXCLUDED.workspace_type,
        updated_at = NOW()
  RETURNING id INTO v_ws_pevra;

  -- Workspace 2: DeFiwayneX
  INSERT INTO public.workspaces (owner_id, primary_identity_id, name, slug, workspace_type, is_default)
  VALUES (v_owner_id, v_id_defiwaynex, 'DeFiwayneX', 'defiwaynex', 'advisory', FALSE)
  ON CONFLICT (owner_id, slug) DO UPDATE 
    SET primary_identity_id = EXCLUDED.primary_identity_id,
        name = EXCLUDED.name,
        workspace_type = EXCLUDED.workspace_type,
        updated_at = NOW()
  RETURNING id INTO v_ws_defiwaynex;

  -- Workspace 3: Joseph Henshaw
  INSERT INTO public.workspaces (owner_id, primary_identity_id, name, slug, workspace_type, is_default)
  VALUES (v_owner_id, v_id_joseph, 'Joseph Henshaw', 'joseph-henshaw', 'personal', FALSE)
  ON CONFLICT (owner_id, slug) DO UPDATE 
    SET primary_identity_id = EXCLUDED.primary_identity_id,
        name = EXCLUDED.name,
        workspace_type = EXCLUDED.workspace_type,
        updated_at = NOW()
  RETURNING id INTO v_ws_joseph;

  -- Explicit fallback to guarantee owner membership exists even on repeated seed runs
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES 
    (v_ws_pevra, v_owner_id, 'owner'),
    (v_ws_defiwaynex, v_owner_id, 'owner'),
    (v_ws_joseph, v_owner_id, 'owner')
  ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'owner', updated_at = NOW();

  RAISE NOTICE 'SUCCESS: Waynex Vault successfully bootstrapped for owner: %', v_owner_id;
END $$;