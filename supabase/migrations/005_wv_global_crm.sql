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