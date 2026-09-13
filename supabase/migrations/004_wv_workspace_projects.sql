-- Migration: 004_wv_workspace_projects.sql
-- Description: Creates workspace_projects (internal WV projects), identity validation, and RLS

-- 1. Workspace Projects (Internal operations; public projects table remains untouched)
CREATE TABLE IF NOT EXISTS public.workspace_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  identity_id UUID REFERENCES public.identities(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('planning', 'active', 'paused', 'completed', 'archived')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  start_date DATE,
  target_date DATE,
  completed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_workspace_projects_ws_slug UNIQUE (workspace_id, slug)
);

-- 2. Cross-Owner Validation Trigger for Project Identity
CREATE OR REPLACE FUNCTION wv_internal.validate_workspace_project_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.identity_id IS NOT NULL THEN
    IF NOT wv_internal.identity_belongs_to_workspace_owner(NEW.identity_id, NEW.workspace_id) THEN
      RAISE EXCEPTION 'Cross-owner violation: Identity % does not belong to the owner of workspace %', NEW.identity_id, NEW.workspace_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION wv_internal.validate_workspace_project_identity() FROM PUBLIC;

CREATE TRIGGER trg_validate_workspace_project_identity
BEFORE INSERT OR UPDATE OF identity_id, workspace_id ON public.workspace_projects
FOR EACH ROW
EXECUTE FUNCTION wv_internal.validate_workspace_project_identity();

-- 3. Indexes for RLS and Filtering
CREATE INDEX IF NOT EXISTS idx_workspace_projects_ws ON public.workspace_projects(workspace_id, archived_at);
CREATE INDEX IF NOT EXISTS idx_workspace_projects_status ON public.workspace_projects(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_workspace_projects_identity ON public.workspace_projects(identity_id);

-- 4. Row Level Security: workspace_projects
ALTER TABLE public.workspace_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_projects_select" ON public.workspace_projects
  FOR SELECT TO authenticated
  USING (wv_internal.is_workspace_member(workspace_id));

CREATE POLICY "workspace_projects_insert" ON public.workspace_projects
  FOR INSERT TO authenticated
  WITH CHECK (
    wv_internal.is_workspace_member(workspace_id)
    AND (
      identity_id IS NULL 
      OR wv_internal.identity_belongs_to_workspace_owner(identity_id, workspace_id)
    )
  );

CREATE POLICY "workspace_projects_update" ON public.workspace_projects
  FOR UPDATE TO authenticated
  USING (wv_internal.is_workspace_member(workspace_id))
  WITH CHECK (
    wv_internal.is_workspace_member(workspace_id)
    AND (
      identity_id IS NULL 
      OR wv_internal.identity_belongs_to_workspace_owner(identity_id, workspace_id)
    )
  );

CREATE POLICY "workspace_projects_delete" ON public.workspace_projects
  FOR DELETE TO authenticated
  USING (wv_internal.is_workspace_admin(workspace_id));