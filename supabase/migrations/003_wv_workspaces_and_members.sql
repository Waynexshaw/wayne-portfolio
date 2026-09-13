-- Migration: 003_wv_workspaces_and_members.sql
-- Description: Creates workspaces, workspace_members, workspace helper functions, owner immutability trigger, identity validation, and RLS

-- 1. Workspaces
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  primary_identity_id UUID REFERENCES public.identities(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  workspace_type TEXT NOT NULL DEFAULT 'venture' CHECK (workspace_type IN ('venture', 'personal', 'research', 'advisory', 'client', 'content', 'community', 'product', 'campaign', 'project', 'custom')),
  icon TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_workspaces_owner_slug UNIQUE (owner_id, slug)
);

-- 2. Workspace Members (RBAC: owner, admin, member, viewer)
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_workspace_members_user UNIQUE (workspace_id, user_id)
);

-- 3. Workspace-Dependent Security Helpers (SECURITY DEFINER, search_path = '')

-- Helper: Check if current auth user is member of workspace
CREATE OR REPLACE FUNCTION wv_internal.is_workspace_member(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
    AND user_id = (SELECT auth.uid())
  );
$$;

-- Helper: Check if current auth user is admin or owner of workspace
CREATE OR REPLACE FUNCTION wv_internal.is_workspace_admin(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
    AND user_id = (SELECT auth.uid())
    AND role IN ('owner', 'admin')
  );
$$;

-- Helper: Check if current auth user is the owner of the workspace
CREATE OR REPLACE FUNCTION wv_internal.is_workspace_owner(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = p_workspace_id
    AND owner_id = (SELECT auth.uid())
  );
$$;

-- Helper: Verify identity belongs to the workspace owner
CREATE OR REPLACE FUNCTION wv_internal.identity_belongs_to_workspace_owner(p_identity_id UUID, p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.identities i
    JOIN public.workspaces w ON w.id = p_workspace_id
    WHERE i.id = p_identity_id
    AND i.user_id = w.owner_id
  );
$$;

-- Helper / Trigger: Automatically establish owner membership upon workspace creation
CREATE OR REPLACE FUNCTION wv_internal.handle_new_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Helper / Trigger: Cross-Owner Validation Trigger for Primary Identity
CREATE OR REPLACE FUNCTION wv_internal.validate_workspace_primary_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.primary_identity_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.identities
      WHERE id = NEW.primary_identity_id
      AND user_id = NEW.owner_id
    ) THEN
      RAISE EXCEPTION 'Cross-owner violation: Primary identity % does not belong to workspace owner %', NEW.primary_identity_id, NEW.owner_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Helper / Trigger: Prevent Workspace Owner Change via UPDATE
CREATE OR REPLACE FUNCTION wv_internal.prevent_workspace_owner_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.owner_id <> OLD.owner_id THEN
    RAISE EXCEPTION 'Transfer of workspace owner_id via UPDATE is not permitted';
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Tighten Execution Permissions on SECURITY DEFINER Functions
REVOKE ALL ON FUNCTION wv_internal.is_workspace_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION wv_internal.is_workspace_admin(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION wv_internal.is_workspace_owner(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION wv_internal.identity_belongs_to_workspace_owner(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION wv_internal.handle_new_workspace() FROM PUBLIC;
REVOKE ALL ON FUNCTION wv_internal.validate_workspace_primary_identity() FROM PUBLIC;
REVOKE ALL ON FUNCTION wv_internal.prevent_workspace_owner_change() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION wv_internal.is_workspace_member(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION wv_internal.is_workspace_admin(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION wv_internal.is_workspace_owner(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION wv_internal.identity_belongs_to_workspace_owner(UUID, UUID) TO authenticated, service_role;

-- 5. Triggers
CREATE TRIGGER trg_workspace_auto_owner_member
AFTER INSERT ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION wv_internal.handle_new_workspace();

CREATE TRIGGER trg_prevent_workspace_owner_change
BEFORE UPDATE OF owner_id ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION wv_internal.prevent_workspace_owner_change();

CREATE TRIGGER trg_validate_workspace_primary_identity
BEFORE INSERT OR UPDATE OF primary_identity_id, owner_id ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION wv_internal.validate_workspace_primary_identity();

-- 6. Indexes for Lookups and RLS
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_archived ON public.workspaces(owner_id, archived_at);
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON public.workspaces(slug);
CREATE INDEX IF NOT EXISTS idx_workspaces_primary_identity ON public.workspaces(primary_identity_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_lookup ON public.workspace_members(workspace_id, user_id, role);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id, workspace_id);

-- 7. Row Level Security: workspaces
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspaces_select" ON public.workspaces
  FOR SELECT TO authenticated
  USING (
    owner_id = (SELECT auth.uid()) 
    OR wv_internal.is_workspace_member(id)
  );

CREATE POLICY "workspaces_insert" ON public.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND (
      primary_identity_id IS NULL 
      OR EXISTS (
        SELECT 1 FROM public.identities 
        WHERE id = primary_identity_id 
        AND user_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY "workspaces_update" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (
    owner_id = (SELECT auth.uid()) 
    OR wv_internal.is_workspace_admin(id)
  )
  WITH CHECK (
    (
      owner_id = (SELECT auth.uid())
      AND (
        primary_identity_id IS NULL 
        OR EXISTS (
          SELECT 1 FROM public.identities 
          WHERE id = primary_identity_id 
          AND user_id = (SELECT auth.uid())
        )
      )
    )
    OR
    (
      wv_internal.is_workspace_admin(id)
      AND (
        primary_identity_id IS NULL 
        OR wv_internal.identity_belongs_to_workspace_owner(primary_identity_id, id)
      )
    )
  );

CREATE POLICY "workspaces_delete" ON public.workspaces
  FOR DELETE TO authenticated
  USING (owner_id = (SELECT auth.uid()));

-- 8. Row Level Security: workspace_members
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_select" ON public.workspace_members
  FOR SELECT TO authenticated
  USING (
    wv_internal.is_workspace_member(workspace_id) 
    OR wv_internal.is_workspace_owner(workspace_id)
  );

CREATE POLICY "workspace_members_insert" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (
    wv_internal.is_workspace_admin(workspace_id) 
    OR wv_internal.is_workspace_owner(workspace_id)
  );

CREATE POLICY "workspace_members_update" ON public.workspace_members
  FOR UPDATE TO authenticated
  USING (
    wv_internal.is_workspace_admin(workspace_id) 
    OR wv_internal.is_workspace_owner(workspace_id)
  )
  WITH CHECK (
    wv_internal.is_workspace_admin(workspace_id) 
    OR wv_internal.is_workspace_owner(workspace_id)
  );

CREATE POLICY "workspace_members_delete" ON public.workspace_members
  FOR DELETE TO authenticated
  USING (
    wv_internal.is_workspace_admin(workspace_id) 
    OR wv_internal.is_workspace_owner(workspace_id)
  );