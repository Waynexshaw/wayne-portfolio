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