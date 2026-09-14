-- Migration: 011_wv_review_connections.sql
-- Description: Creates public.review_connections table with strict entity/relationship
--              compatibility matrix, composite workspace-scoped foreign keys,
--              target immutability trigger, partial unique indexes, and RLS policies.

-- 1. Review Connections Table
CREATE TABLE IF NOT EXISTS public.review_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  review_id UUID NOT NULL,

  -- Target Entity Columns (exactly one must be non-null)
  project_id UUID,
  opportunity_id UUID,
  research_record_id UUID,
  company_id UUID,
  contact_id UUID,

  -- Semantic Relationship Type
  relationship_type TEXT NOT NULL CHECK (
    relationship_type IN ('subject', 'informed_by', 'stakeholder', 'resulted_in')
  ),
  notes TEXT,

  -- Provenance & Timestamps
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraint 1: Exactly one target column must be populated
  CONSTRAINT chk_review_connection_single_target CHECK (
    (CASE WHEN project_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN opportunity_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN research_record_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN company_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN contact_id IS NOT NULL THEN 1 ELSE 0 END) = 1
  ),

  -- Constraint 2: Entity/Relationship Compatibility Matrix
  CONSTRAINT chk_review_connection_compatibility CHECK (
    (project_id IS NOT NULL AND relationship_type IN ('subject', 'resulted_in')) OR
    (opportunity_id IS NOT NULL AND relationship_type IN ('subject', 'resulted_in')) OR
    (research_record_id IS NOT NULL AND relationship_type IN ('informed_by', 'resulted_in')) OR
    (company_id IS NOT NULL AND relationship_type IN ('subject', 'stakeholder')) OR
    (contact_id IS NOT NULL AND relationship_type IN ('subject', 'stakeholder'))
  ),

  -- Composite Workspace Integrity Foreign Keys
  CONSTRAINT fk_review_connection_review
    FOREIGN KEY (review_id, workspace_id)
    REFERENCES public.reviews(id, workspace_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_review_connection_project
    FOREIGN KEY (project_id, workspace_id)
    REFERENCES public.workspace_projects(id, workspace_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_review_connection_opportunity
    FOREIGN KEY (opportunity_id, workspace_id)
    REFERENCES public.opportunities(id, workspace_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_review_connection_research
    FOREIGN KEY (research_record_id, workspace_id)
    REFERENCES public.research_records(id, workspace_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_review_connection_company
    FOREIGN KEY (workspace_id, company_id)
    REFERENCES public.workspace_companies(workspace_id, company_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_review_connection_contact
    FOREIGN KEY (workspace_id, contact_id)
    REFERENCES public.workspace_contacts(workspace_id, contact_id)
    ON DELETE CASCADE
);

-- 2. Partial Unique Indexes for Duplicate Protection (one target per review)
CREATE UNIQUE INDEX IF NOT EXISTS uq_review_conn_project
  ON public.review_connections(review_id, project_id)
  WHERE project_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_review_conn_opportunity
  ON public.review_connections(review_id, opportunity_id)
  WHERE opportunity_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_review_conn_research
  ON public.review_connections(review_id, research_record_id)
  WHERE research_record_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_review_conn_company
  ON public.review_connections(review_id, company_id)
  WHERE company_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_review_conn_contact
  ON public.review_connections(review_id, contact_id)
  WHERE contact_id IS NOT NULL;

-- 3. Performance & Reverse Query Indexes
CREATE INDEX IF NOT EXISTS idx_review_conn_ws_review
  ON public.review_connections(workspace_id, review_id);

CREATE INDEX IF NOT EXISTS idx_review_conn_ws_project
  ON public.review_connections(workspace_id, project_id)
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_review_conn_ws_opportunity
  ON public.review_connections(workspace_id, opportunity_id)
  WHERE opportunity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_review_conn_ws_research
  ON public.review_connections(workspace_id, research_record_id)
  WHERE research_record_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_review_conn_ws_company
  ON public.review_connections(workspace_id, company_id)
  WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_review_conn_ws_contact
  ON public.review_connections(workspace_id, contact_id)
  WHERE contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_review_conn_created_at
  ON public.review_connections(workspace_id, created_at DESC);

-- 4. Row Level Security (RLS)
ALTER TABLE public.review_connections ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'review_connections' AND policyname = 'review_connections_select') THEN
    CREATE POLICY "review_connections_select" ON public.review_connections
      FOR SELECT TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'review_connections' AND policyname = 'review_connections_insert') THEN
    CREATE POLICY "review_connections_insert" ON public.review_connections
      FOR INSERT TO authenticated
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'review_connections' AND policyname = 'review_connections_update') THEN
    CREATE POLICY "review_connections_update" ON public.review_connections
      FOR UPDATE TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id))
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'review_connections' AND policyname = 'review_connections_delete') THEN
    CREATE POLICY "review_connections_delete" ON public.review_connections
      FOR DELETE TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id));
  END IF;
END;
$$;

-- 5. Target and Hierarchy Immutability Trigger
CREATE OR REPLACE FUNCTION wv_internal.prevent_review_connection_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.workspace_id <> NEW.workspace_id THEN
    RAISE EXCEPTION 'Workspace immutability violation: review connection workspace_id cannot be modified';
  END IF;
  IF OLD.review_id <> NEW.review_id THEN
    RAISE EXCEPTION 'Hierarchy immutability violation: review connection review_id cannot be modified';
  END IF;
  IF OLD.project_id IS DISTINCT FROM NEW.project_id THEN
    RAISE EXCEPTION 'Target immutability violation: review connection project_id cannot be modified';
  END IF;
  IF OLD.opportunity_id IS DISTINCT FROM NEW.opportunity_id THEN
    RAISE EXCEPTION 'Target immutability violation: review connection opportunity_id cannot be modified';
  END IF;
  IF OLD.research_record_id IS DISTINCT FROM NEW.research_record_id THEN
    RAISE EXCEPTION 'Target immutability violation: review connection research_record_id cannot be modified';
  END IF;
  IF OLD.company_id IS DISTINCT FROM NEW.company_id THEN
    RAISE EXCEPTION 'Target immutability violation: review connection company_id cannot be modified';
  END IF;
  IF OLD.contact_id IS DISTINCT FROM NEW.contact_id THEN
    RAISE EXCEPTION 'Target immutability violation: review connection contact_id cannot be modified';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION wv_internal.prevent_review_connection_tampering() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_prevent_review_connection_tampering ON public.review_connections;
CREATE TRIGGER trg_prevent_review_connection_tampering
BEFORE UPDATE OF workspace_id, review_id, project_id, opportunity_id, research_record_id, company_id, contact_id ON public.review_connections
FOR EACH ROW
EXECUTE FUNCTION wv_internal.prevent_review_connection_tampering();

-- 6. Updated_at Trigger
DROP TRIGGER IF EXISTS update_review_connections_updated_at ON public.review_connections;
CREATE TRIGGER update_review_connections_updated_at
BEFORE UPDATE ON public.review_connections
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
