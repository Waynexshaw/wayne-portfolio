-- ============================================================================
-- Waynex Vault (WV) Phase 1 Consolidated Deployment Bundle
-- ============================================================================
-- Target Database: Supabase PostgreSQL
-- Description: Core Schema, Workspaces, RBAC, Projects, Global CRM, and Activities
-- Safety: Fully transactional, idempotent (IF NOT EXISTS), zero impact on public portfolio tables
-- Notice: This bundle is an exact concatenation of canonical migrations 002 through 006.
-- ============================================================================

BEGIN;

-- >>> SECTION: 002: Core Schema, Profiles & Identities <<<
-- Migration: 002_wv_core_schema_and_helpers.sql
-- Description: Creates wv_internal private schema, user_profiles, identities, and their base RLS policies

-- 1. Private internal schema for security functions (never exposed to PostgREST)
CREATE SCHEMA IF NOT EXISTS wv_internal;
REVOKE ALL ON SCHEMA wv_internal FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA wv_internal TO authenticated, service_role;

-- 2. User Profiles (extending auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Identities (Personal, Pseudonymous, Corporate/Entity)
CREATE TABLE IF NOT EXISTS public.identities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  handle TEXT,
  type TEXT NOT NULL CHECK (type IN ('personal', 'pseudonymous', 'entity', 'brand')),
  bio TEXT,
  avatar_url TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_identities_user_name UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_identities_user_id ON public.identities(user_id);

-- 4. Row Level Security: user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profiles_select" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "user_profiles_insert" ON public.user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "user_profiles_update" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "user_profiles_delete" ON public.user_profiles
  FOR DELETE TO authenticated
  USING (id = (SELECT auth.uid()));

-- 5. Row Level Security: identities
ALTER TABLE public.identities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "identities_select" ON public.identities
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "identities_insert" ON public.identities
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "identities_update" ON public.identities
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "identities_delete" ON public.identities
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- >>> SECTION: 003: Workspaces, Members & RBAC <<<
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

-- >>> SECTION: 004: Workspace Projects <<<
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

-- >>> SECTION: 005: Global CRM & Workspace Links <<<
-- Migration: 005_wv_global_crm.sql
-- Description: Creates global companies, global contacts, workspace relationship tables, social profiles, CRM ownership helpers, cross-owner triggers, and RLS

-- 1. Global Companies (One record per company owned by auth user)
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT,
  industry TEXT,
  website TEXT,
  linkedin_url TEXT,
  x_handle TEXT,
  description TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_companies_owner_name UNIQUE (owner_id, name)
);

-- 2. Workspace Companies (Workspace-specific relationship to a global company)
CREATE TABLE IF NOT EXISTS public.workspace_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  tier TEXT NOT NULL DEFAULT 'tier_2' CHECK (tier IN ('tier_1', 'tier_2', 'tier_3', 'archived')),
  status TEXT NOT NULL DEFAULT 'prospect' CHECK (status IN ('prospect', 'active', 'partner', 'portfolio', 'vendor', 'past')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_workspace_company UNIQUE (workspace_id, company_id)
);

-- 3. Global Contacts (One record per contact owned by auth user)
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role_title TEXT,
  location TEXT,
  bio TEXT,
  avatar_url TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Workspace Contacts (Workspace-specific relationship to a global contact)
CREATE TABLE IF NOT EXISTS public.workspace_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE RESTRICT,
  primary_identity_id UUID REFERENCES public.identities(id) ON DELETE SET NULL,
  relationship_type TEXT DEFAULT 'professional' CHECK (relationship_type IN ('founder', 'investor', 'advisor', 'partner', 'client', 'vendor', 'colleague', 'professional')),
  relationship_stage TEXT NOT NULL DEFAULT 'lead' CHECK (relationship_stage IN ('lead', 'outreach', 'connected', 'in_discussion', 'partner', 'investor', 'client', 'dormant', 'archived')),
  relationship_score INTEGER NOT NULL DEFAULT 5 CHECK (relationship_score BETWEEN 1 AND 10),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  notes TEXT,
  last_contacted_at TIMESTAMPTZ,
  next_follow_up_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_workspace_contact UNIQUE (workspace_id, contact_id)
);

-- 5. Social Profiles (Multi-channel handles attached to a contact)
CREATE TABLE IF NOT EXISTS public.social_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('x', 'telegram', 'linkedin', 'discord', 'farcaster', 'github', 'other')),
  handle TEXT NOT NULL,
  profile_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_social_profiles_contact_platform UNIQUE (contact_id, platform, handle)
);

-- 6. Contact & Company Ownership Helper Functions (SECURITY DEFINER, search_path = '')

-- Helper: Verify contact belongs to the workspace owner
CREATE OR REPLACE FUNCTION wv_internal.contact_belongs_to_workspace_owner(p_contact_id UUID, p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.contacts c
    JOIN public.workspaces w ON w.id = p_workspace_id
    WHERE c.id = p_contact_id
    AND c.owner_id = w.owner_id
  );
$$;

-- Helper: Verify company belongs to the workspace owner
CREATE OR REPLACE FUNCTION wv_internal.company_belongs_to_workspace_owner(p_company_id UUID, p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.companies cmp
    JOIN public.workspaces w ON w.id = p_workspace_id
    WHERE cmp.id = p_company_id
    AND cmp.owner_id = w.owner_id
  );
$$;

REVOKE ALL ON FUNCTION wv_internal.contact_belongs_to_workspace_owner(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION wv_internal.company_belongs_to_workspace_owner(UUID, UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION wv_internal.contact_belongs_to_workspace_owner(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION wv_internal.company_belongs_to_workspace_owner(UUID, UUID) TO authenticated, service_role;

-- 7. Cross-Owner Enforcement Triggers

-- Validate Contact's Company belongs to same owner
CREATE OR REPLACE FUNCTION wv_internal.validate_contact_company_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.companies
      WHERE id = NEW.company_id
      AND owner_id = NEW.owner_id
    ) THEN
      RAISE EXCEPTION 'Cross-owner violation: Company % does not belong to contact owner %', NEW.company_id, NEW.owner_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION wv_internal.validate_contact_company_ownership() FROM PUBLIC;

CREATE TRIGGER trg_validate_contact_company_ownership
BEFORE INSERT OR UPDATE OF company_id, owner_id ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION wv_internal.validate_contact_company_ownership();

-- Validate Workspace Company belongs to workspace owner
CREATE OR REPLACE FUNCTION wv_internal.validate_workspace_company_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT wv_internal.company_belongs_to_workspace_owner(NEW.company_id, NEW.workspace_id) THEN
    RAISE EXCEPTION 'Cross-owner violation: Company % does not belong to owner of workspace %', NEW.company_id, NEW.workspace_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION wv_internal.validate_workspace_company_ownership() FROM PUBLIC;

CREATE TRIGGER trg_validate_workspace_company_ownership
BEFORE INSERT OR UPDATE OF company_id, workspace_id ON public.workspace_companies
FOR EACH ROW
EXECUTE FUNCTION wv_internal.validate_workspace_company_ownership();

-- Validate Workspace Contact & Primary Identity belongs to workspace owner
CREATE OR REPLACE FUNCTION wv_internal.validate_workspace_contact_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT wv_internal.contact_belongs_to_workspace_owner(NEW.contact_id, NEW.workspace_id) THEN
    RAISE EXCEPTION 'Cross-owner violation: Contact % does not belong to owner of workspace %', NEW.contact_id, NEW.workspace_id;
  END IF;

  IF NEW.primary_identity_id IS NOT NULL THEN
    IF NOT wv_internal.identity_belongs_to_workspace_owner(NEW.primary_identity_id, NEW.workspace_id) THEN
      RAISE EXCEPTION 'Cross-owner violation: Identity % does not belong to owner of workspace %', NEW.primary_identity_id, NEW.workspace_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION wv_internal.validate_workspace_contact_ownership() FROM PUBLIC;

CREATE TRIGGER trg_validate_workspace_contact_ownership
BEFORE INSERT OR UPDATE OF contact_id, primary_identity_id, workspace_id ON public.workspace_contacts
FOR EACH ROW
EXECUTE FUNCTION wv_internal.validate_workspace_contact_ownership();

-- 8. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_companies_owner_archived ON public.companies(owner_id, archived_at);
CREATE INDEX IF NOT EXISTS idx_contacts_owner_archived ON public.contacts(owner_id, archived_at);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON public.contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_ws_companies_lookup ON public.workspace_companies(workspace_id, company_id);
CREATE INDEX IF NOT EXISTS idx_ws_contacts_lookup ON public.workspace_contacts(workspace_id, contact_id);
CREATE INDEX IF NOT EXISTS idx_ws_contacts_stage ON public.workspace_contacts(workspace_id, relationship_stage);
CREATE INDEX IF NOT EXISTS idx_ws_contacts_score ON public.workspace_contacts(workspace_id, relationship_score);
CREATE INDEX IF NOT EXISTS idx_ws_contacts_follow_up ON public.workspace_contacts(workspace_id, next_follow_up_at);
CREATE INDEX IF NOT EXISTS idx_social_profiles_contact ON public.social_profiles(contact_id);

-- 9. Row Level Security: companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies_select" ON public.companies
  FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()));

CREATE POLICY "companies_insert" ON public.companies
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()));

CREATE POLICY "companies_update" ON public.companies
  FOR UPDATE TO authenticated
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));

CREATE POLICY "companies_delete" ON public.companies
  FOR DELETE TO authenticated
  USING (owner_id = (SELECT auth.uid()));

-- 10. Row Level Security: workspace_companies
ALTER TABLE public.workspace_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_companies_select" ON public.workspace_companies
  FOR SELECT TO authenticated
  USING (wv_internal.is_workspace_member(workspace_id));

CREATE POLICY "workspace_companies_insert" ON public.workspace_companies
  FOR INSERT TO authenticated
  WITH CHECK (
    wv_internal.is_workspace_member(workspace_id)
    AND wv_internal.company_belongs_to_workspace_owner(company_id, workspace_id)
  );

CREATE POLICY "workspace_companies_update" ON public.workspace_companies
  FOR UPDATE TO authenticated
  USING (wv_internal.is_workspace_member(workspace_id))
  WITH CHECK (
    wv_internal.is_workspace_member(workspace_id)
    AND wv_internal.company_belongs_to_workspace_owner(company_id, workspace_id)
  );

CREATE POLICY "workspace_companies_delete" ON public.workspace_companies
  FOR DELETE TO authenticated
  USING (wv_internal.is_workspace_admin(workspace_id));

-- 11. Row Level Security: contacts
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_select" ON public.contacts
  FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()));

CREATE POLICY "contacts_insert" ON public.contacts
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND (
      company_id IS NULL 
      OR EXISTS (
        SELECT 1 FROM public.companies 
        WHERE id = company_id 
        AND owner_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY "contacts_update" ON public.contacts
  FOR UPDATE TO authenticated
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND (
      company_id IS NULL 
      OR EXISTS (
        SELECT 1 FROM public.companies 
        WHERE id = company_id 
        AND owner_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY "contacts_delete" ON public.contacts
  FOR DELETE TO authenticated
  USING (owner_id = (SELECT auth.uid()));

-- 12. Row Level Security: workspace_contacts
ALTER TABLE public.workspace_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_contacts_select" ON public.workspace_contacts
  FOR SELECT TO authenticated
  USING (wv_internal.is_workspace_member(workspace_id));

CREATE POLICY "workspace_contacts_insert" ON public.workspace_contacts
  FOR INSERT TO authenticated
  WITH CHECK (
    wv_internal.is_workspace_member(workspace_id)
    AND wv_internal.contact_belongs_to_workspace_owner(contact_id, workspace_id)
    AND (
      primary_identity_id IS NULL 
      OR wv_internal.identity_belongs_to_workspace_owner(primary_identity_id, workspace_id)
    )
  );

CREATE POLICY "workspace_contacts_update" ON public.workspace_contacts
  FOR UPDATE TO authenticated
  USING (wv_internal.is_workspace_member(workspace_id))
  WITH CHECK (
    wv_internal.is_workspace_member(workspace_id)
    AND wv_internal.contact_belongs_to_workspace_owner(contact_id, workspace_id)
    AND (
      primary_identity_id IS NULL 
      OR wv_internal.identity_belongs_to_workspace_owner(primary_identity_id, workspace_id)
    )
  );

CREATE POLICY "workspace_contacts_delete" ON public.workspace_contacts
  FOR DELETE TO authenticated
  USING (wv_internal.is_workspace_admin(workspace_id));

-- 13. Row Level Security: social_profiles
ALTER TABLE public.social_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "social_profiles_select" ON public.social_profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts
      WHERE id = contact_id
      AND owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "social_profiles_insert" ON public.social_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contacts
      WHERE id = contact_id
      AND owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "social_profiles_update" ON public.social_profiles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts
      WHERE id = contact_id
      AND owner_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contacts
      WHERE id = contact_id
      AND owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "social_profiles_delete" ON public.social_profiles
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts
      WHERE id = contact_id
      AND owner_id = (SELECT auth.uid())
    )
  );

-- >>> SECTION: 006: CRM Activities & History <<<
-- Migration: 006_wv_crm_activities.sql
-- Description: Creates interactions, follow_ups, opportunities, activity triggers, and RLS

-- 1. Interactions (Rich contextual touchpoints)
CREATE TABLE IF NOT EXISTS public.interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE RESTRICT,
  identity_id UUID REFERENCES public.identities(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('x', 'telegram', 'linkedin', 'email', 'call', 'meeting', 'in_person', 'other')),
  direction TEXT NOT NULL DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound', 'internal_note')),
  purpose TEXT,
  subject TEXT,
  content TEXT NOT NULL,
  response TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('planned', 'completed', 'cancelled', 'no_response')),
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'critical')),
  next_action TEXT,
  follow_up_at TIMESTAMPTZ,
  notes TEXT,
  interaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Follow-Ups (Scheduled relationship action items)
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE RESTRICT,
  interaction_id UUID REFERENCES public.interactions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'rescheduled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Opportunities (Deals, advisory, partnerships, and mandates)
CREATE TABLE IF NOT EXISTS public.opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE RESTRICT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'growth_strategy' CHECK (type IN ('growth_strategy', 'defi_research', 'tokenomics', 'advisory', 'pevra_partnership', 'investment', 'collaboration', 'other')),
  description TEXT,
  value_estimate NUMERIC(15, 2),
  currency TEXT NOT NULL DEFAULT 'USD',
  pipeline_stage TEXT NOT NULL DEFAULT 'lead' CHECK (pipeline_stage IN ('lead', 'discovery', 'proposal', 'negotiation', 'won', 'lost', 'on_hold')),
  probability INTEGER NOT NULL DEFAULT 20 CHECK (probability BETWEEN 0 AND 100),
  next_action TEXT,
  expected_close_date DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Cross-Owner Enforcement Triggers

-- Validate Interactions Contact & Identity
CREATE OR REPLACE FUNCTION wv_internal.validate_interaction_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT wv_internal.contact_belongs_to_workspace_owner(NEW.contact_id, NEW.workspace_id) THEN
    RAISE EXCEPTION 'Cross-owner violation: Contact % does not belong to owner of workspace %', NEW.contact_id, NEW.workspace_id;
  END IF;

  IF NEW.identity_id IS NOT NULL THEN
    IF NOT wv_internal.identity_belongs_to_workspace_owner(NEW.identity_id, NEW.workspace_id) THEN
      RAISE EXCEPTION 'Cross-owner violation: Identity % does not belong to owner of workspace %', NEW.identity_id, NEW.workspace_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION wv_internal.validate_interaction_ownership() FROM PUBLIC;

CREATE TRIGGER trg_validate_interaction_ownership
BEFORE INSERT OR UPDATE OF contact_id, identity_id, workspace_id ON public.interactions
FOR EACH ROW
EXECUTE FUNCTION wv_internal.validate_interaction_ownership();

-- Validate Follow-Ups Contact
CREATE OR REPLACE FUNCTION wv_internal.validate_follow_up_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT wv_internal.contact_belongs_to_workspace_owner(NEW.contact_id, NEW.workspace_id) THEN
    RAISE EXCEPTION 'Cross-owner violation: Contact % does not belong to owner of workspace %', NEW.contact_id, NEW.workspace_id;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION wv_internal.validate_follow_up_ownership() FROM PUBLIC;

CREATE TRIGGER trg_validate_follow_up_ownership
BEFORE INSERT OR UPDATE OF contact_id, workspace_id ON public.follow_ups
FOR EACH ROW
EXECUTE FUNCTION wv_internal.validate_follow_up_ownership();

-- Validate Opportunities Contact & Company
CREATE OR REPLACE FUNCTION wv_internal.validate_opportunity_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.contact_id IS NOT NULL THEN
    IF NOT wv_internal.contact_belongs_to_workspace_owner(NEW.contact_id, NEW.workspace_id) THEN
      RAISE EXCEPTION 'Cross-owner violation: Contact % does not belong to owner of workspace %', NEW.contact_id, NEW.workspace_id;
    END IF;
  END IF;

  IF NEW.company_id IS NOT NULL THEN
    IF NOT wv_internal.company_belongs_to_workspace_owner(NEW.company_id, NEW.workspace_id) THEN
      RAISE EXCEPTION 'Cross-owner violation: Company % does not belong to owner of workspace %', NEW.company_id, NEW.workspace_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION wv_internal.validate_opportunity_ownership() FROM PUBLIC;

CREATE TRIGGER trg_validate_opportunity_ownership
BEFORE INSERT OR UPDATE OF contact_id, company_id, workspace_id ON public.opportunities
FOR EACH ROW
EXECUTE FUNCTION wv_internal.validate_opportunity_ownership();

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_interactions_ws_date ON public.interactions(workspace_id, interaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_contact ON public.interactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_interactions_identity ON public.interactions(identity_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_ws_status ON public.follow_ups(workspace_id, status, due_date ASC);
CREATE INDEX IF NOT EXISTS idx_follow_ups_contact ON public.follow_ups(contact_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_ws_stage ON public.opportunities(workspace_id, pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_opportunities_type ON public.opportunities(workspace_id, type);
CREATE INDEX IF NOT EXISTS idx_opportunities_contact ON public.opportunities(contact_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_company ON public.opportunities(company_id);

-- 6. Row Level Security: interactions
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "interactions_select" ON public.interactions
  FOR SELECT TO authenticated
  USING (wv_internal.is_workspace_member(workspace_id));

CREATE POLICY "interactions_insert" ON public.interactions
  FOR INSERT TO authenticated
  WITH CHECK (
    wv_internal.is_workspace_member(workspace_id)
    AND wv_internal.contact_belongs_to_workspace_owner(contact_id, workspace_id)
    AND (
      identity_id IS NULL 
      OR wv_internal.identity_belongs_to_workspace_owner(identity_id, workspace_id)
    )
  );

CREATE POLICY "interactions_update" ON public.interactions
  FOR UPDATE TO authenticated
  USING (wv_internal.is_workspace_member(workspace_id))
  WITH CHECK (
    wv_internal.is_workspace_member(workspace_id)
    AND wv_internal.contact_belongs_to_workspace_owner(contact_id, workspace_id)
    AND (
      identity_id IS NULL 
      OR wv_internal.identity_belongs_to_workspace_owner(identity_id, workspace_id)
    )
  );

CREATE POLICY "interactions_delete" ON public.interactions
  FOR DELETE TO authenticated
  USING (wv_internal.is_workspace_admin(workspace_id));

-- 7. Row Level Security: follow_ups
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follow_ups_select" ON public.follow_ups
  FOR SELECT TO authenticated
  USING (wv_internal.is_workspace_member(workspace_id));

CREATE POLICY "follow_ups_insert" ON public.follow_ups
  FOR INSERT TO authenticated
  WITH CHECK (
    wv_internal.is_workspace_member(workspace_id)
    AND wv_internal.contact_belongs_to_workspace_owner(contact_id, workspace_id)
  );

CREATE POLICY "follow_ups_update" ON public.follow_ups
  FOR UPDATE TO authenticated
  USING (wv_internal.is_workspace_member(workspace_id))
  WITH CHECK (
    wv_internal.is_workspace_member(workspace_id)
    AND wv_internal.contact_belongs_to_workspace_owner(contact_id, workspace_id)
  );

CREATE POLICY "follow_ups_delete" ON public.follow_ups
  FOR DELETE TO authenticated
  USING (wv_internal.is_workspace_admin(workspace_id));

-- 8. Row Level Security: opportunities
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "opportunities_select" ON public.opportunities
  FOR SELECT TO authenticated
  USING (wv_internal.is_workspace_member(workspace_id));

CREATE POLICY "opportunities_insert" ON public.opportunities
  FOR INSERT TO authenticated
  WITH CHECK (
    wv_internal.is_workspace_member(workspace_id)
    AND (
      contact_id IS NULL 
      OR wv_internal.contact_belongs_to_workspace_owner(contact_id, workspace_id)
    )
    AND (
      company_id IS NULL 
      OR wv_internal.company_belongs_to_workspace_owner(company_id, workspace_id)
    )
  );

CREATE POLICY "opportunities_update" ON public.opportunities
  FOR UPDATE TO authenticated
  USING (wv_internal.is_workspace_member(workspace_id))
  WITH CHECK (
    wv_internal.is_workspace_member(workspace_id)
    AND (
      contact_id IS NULL 
      OR wv_internal.contact_belongs_to_workspace_owner(contact_id, workspace_id)
    )
    AND (
      company_id IS NULL 
      OR wv_internal.company_belongs_to_workspace_owner(company_id, workspace_id)
    )
  );

CREATE POLICY "opportunities_delete" ON public.opportunities
  FOR DELETE TO authenticated
  USING (wv_internal.is_workspace_admin(workspace_id));

COMMIT;
