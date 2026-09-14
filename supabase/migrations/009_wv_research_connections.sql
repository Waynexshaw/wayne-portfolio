-- Migration: 009_wv_research_connections.sql
-- Description: Creates public.research_connections table, composite foreign key targets,
--              enforces exactly-one-target constraint, workspace foreign-key integrity,
--              target immutability triggers, partial unique indexes, and RLS policies.

-- 1. Ensure composite unique constraints on opportunities and workspace_projects for composite FK references
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_opportunities_id_workspace'
  ) THEN
    ALTER TABLE public.opportunities
      ADD CONSTRAINT uq_opportunities_id_workspace UNIQUE (id, workspace_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_workspace_projects_id_workspace'
  ) THEN
    ALTER TABLE public.workspace_projects
      ADD CONSTRAINT uq_workspace_projects_id_workspace UNIQUE (id, workspace_id);
  END IF;
END;
$$;

-- 2. Research Connections Table
CREATE TABLE IF NOT EXISTS public.research_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  research_record_id UUID NOT NULL,

  -- Target Entity Columns (Strict Foreign Keys)
  contact_id UUID,
  company_id UUID,
  opportunity_id UUID,
  project_id UUID,

  -- Relationship Qualification
  relationship_type TEXT NOT NULL DEFAULT 'subject' CHECK (
    relationship_type IN (
      'subject',
      'stakeholder',
      'partner',
      'competitor',
      'due_diligence',
      'supporting'
    )
  ),
  notes TEXT,

  -- Provenance & Timestamps
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Database-level CHECK: Exactly one target column must be populated
  CONSTRAINT chk_research_connection_single_target CHECK (
    (CASE WHEN contact_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN company_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN opportunity_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN project_id IS NOT NULL THEN 1 ELSE 0 END) = 1
  ),

  -- Declarative Workspace Integrity: Composite FK to research_records
  CONSTRAINT fk_research_connection_record
    FOREIGN KEY (research_record_id, workspace_id)
    REFERENCES public.research_records(id, workspace_id)
    ON DELETE CASCADE,

  -- Workspace-scoped Foreign Keys to Operational Entities
  CONSTRAINT fk_research_connection_contact
    FOREIGN KEY (workspace_id, contact_id)
    REFERENCES public.workspace_contacts(workspace_id, contact_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_research_connection_company
    FOREIGN KEY (workspace_id, company_id)
    REFERENCES public.workspace_companies(workspace_id, company_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_research_connection_opportunity
    FOREIGN KEY (opportunity_id, workspace_id)
    REFERENCES public.opportunities(id, workspace_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_research_connection_project
    FOREIGN KEY (project_id, workspace_id)
    REFERENCES public.workspace_projects(id, workspace_id)
    ON DELETE CASCADE
);

-- 3. Partial Unique Indexes for Duplicate Protection
CREATE UNIQUE INDEX IF NOT EXISTS uq_research_conn_contact 
  ON public.research_connections(research_record_id, contact_id) 
  WHERE contact_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_research_conn_company 
  ON public.research_connections(research_record_id, company_id) 
  WHERE company_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_research_conn_opportunity 
  ON public.research_connections(research_record_id, opportunity_id) 
  WHERE opportunity_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_research_conn_project 
  ON public.research_connections(research_record_id, project_id) 
  WHERE project_id IS NOT NULL;

-- 4. Performance & Lookup Indexes (Bi-directional)
CREATE INDEX IF NOT EXISTS idx_research_conn_ws_record 
  ON public.research_connections(workspace_id, research_record_id);

CREATE INDEX IF NOT EXISTS idx_research_conn_ws_contact 
  ON public.research_connections(workspace_id, contact_id) 
  WHERE contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_research_conn_ws_company 
  ON public.research_connections(workspace_id, company_id) 
  WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_research_conn_ws_opp 
  ON public.research_connections(workspace_id, opportunity_id) 
  WHERE opportunity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_research_conn_ws_proj 
  ON public.research_connections(workspace_id, project_id) 
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_research_conn_created_at 
  ON public.research_connections(workspace_id, created_at DESC);

-- 5. Row Level Security (RLS)
ALTER TABLE public.research_connections ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'research_connections' AND policyname = 'research_connections_select') THEN
    CREATE POLICY "research_connections_select" ON public.research_connections
      FOR SELECT TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'research_connections' AND policyname = 'research_connections_insert') THEN
    CREATE POLICY "research_connections_insert" ON public.research_connections
      FOR INSERT TO authenticated
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'research_connections' AND policyname = 'research_connections_update') THEN
    CREATE POLICY "research_connections_update" ON public.research_connections
      FOR UPDATE TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id))
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'research_connections' AND policyname = 'research_connections_delete') THEN
    CREATE POLICY "research_connections_delete" ON public.research_connections
      FOR DELETE TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id));
  END IF;
END;
$$;

-- 6. Target and Hierarchy Immutability Trigger
CREATE OR REPLACE FUNCTION wv_internal.prevent_research_connection_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.workspace_id <> NEW.workspace_id THEN
    RAISE EXCEPTION 'Workspace immutability violation: research connection workspace_id cannot be modified';
  END IF;
  IF OLD.research_record_id <> NEW.research_record_id THEN
    RAISE EXCEPTION 'Hierarchy immutability violation: research connection research_record_id cannot be modified';
  END IF;
  IF OLD.contact_id IS DISTINCT FROM NEW.contact_id THEN
    RAISE EXCEPTION 'Target immutability violation: research connection contact_id cannot be modified';
  END IF;
  IF OLD.company_id IS DISTINCT FROM NEW.company_id THEN
    RAISE EXCEPTION 'Target immutability violation: research connection company_id cannot be modified';
  END IF;
  IF OLD.opportunity_id IS DISTINCT FROM NEW.opportunity_id THEN
    RAISE EXCEPTION 'Target immutability violation: research connection opportunity_id cannot be modified';
  END IF;
  IF OLD.project_id IS DISTINCT FROM NEW.project_id THEN
    RAISE EXCEPTION 'Target immutability violation: research connection project_id cannot be modified';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION wv_internal.prevent_research_connection_tampering() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_prevent_research_connection_tampering ON public.research_connections;
CREATE TRIGGER trg_prevent_research_connection_tampering
BEFORE UPDATE OF workspace_id, research_record_id, contact_id, company_id, opportunity_id, project_id ON public.research_connections
FOR EACH ROW
EXECUTE FUNCTION wv_internal.prevent_research_connection_tampering();

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_research_connections_updated_at ON public.research_connections;
CREATE TRIGGER update_research_connections_updated_at
BEFORE UPDATE ON public.research_connections
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
