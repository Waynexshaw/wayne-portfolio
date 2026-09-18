-- ============================================================================
-- Migration 015: Waynex Vault — Evidence & Portfolio Bridge V1
--
-- Introduces:
-- 1. workspace_evidence: Private professional evidence claims with dual-state approval
-- 2. workspace_evidence_sources: Normalized provenance junction to reviews, metrics, decisions, documents, files
-- 3. portfolio_evidence_bridges: Snapshot-based publication bridge to public projects & case studies
--
-- Security & Integrity:
-- - Strict workspace multi-tenancy & composite foreign keys
-- - Workspace immutability triggers
-- - Archive state single source of truth (archived_at IS NULL = active)
-- - Zero anonymous SELECT policies (evidence and bridges remain 100% private)
-- ============================================================================

-- ============================================================================
-- 0. Ensure Source Tables have Composite Unique Constraints for Isolation
-- ============================================================================

DO $$
BEGIN
  -- 0a. workspace_metric_observations (id, workspace_id)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_workspace_metric_observations_id_workspace'
  ) THEN
    ALTER TABLE public.workspace_metric_observations
      ADD CONSTRAINT uq_workspace_metric_observations_id_workspace UNIQUE (id, workspace_id);
  END IF;

  -- 0b. project_documents (id, workspace_id)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_project_documents_id_workspace'
  ) THEN
    ALTER TABLE public.project_documents
      ADD CONSTRAINT uq_project_documents_id_workspace UNIQUE (id, workspace_id);
  END IF;

  -- 0c. project_files (id, workspace_id)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_project_files_id_workspace'
  ) THEN
    ALTER TABLE public.project_files
      ADD CONSTRAINT uq_project_files_id_workspace UNIQUE (id, workspace_id);
  END IF;
END $$;

-- ============================================================================
-- 1. Table: public.workspace_evidence
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.workspace_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NULL,
  
  -- Core identification
  title TEXT NOT NULL,
  evidence_type TEXT NOT NULL CHECK (
    evidence_type IN ('contribution', 'result', 'deliverable', 'decision')
  ),

  -- Formulated claims (bridge-ready presentation)
  public_claim TEXT NOT NULL,
  public_summary TEXT NULL,
  result_statement TEXT NULL,

  -- Private context
  internal_notes TEXT NULL,

  -- Approval workflow (draft | approved)
  approval_status TEXT NOT NULL DEFAULT 'draft' CHECK (
    approval_status IN ('draft', 'approved')
  ),
  approved_at TIMESTAMPTZ NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Provenance & Timestamps
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ NULL,

  -- Composite identity constraint
  CONSTRAINT uq_workspace_evidence_id_workspace UNIQUE (id, workspace_id),

  -- Non-empty string checks
  CONSTRAINT chk_evidence_title_nonempty CHECK (length(trim(title)) > 0),
  CONSTRAINT chk_evidence_claim_nonempty CHECK (length(trim(public_claim)) > 0),

  -- Approval state consistency: if approved, approved_at must be populated
  CONSTRAINT chk_evidence_approval_timestamp CHECK (
    (approval_status = 'approved' AND approved_at IS NOT NULL) OR
    (approval_status = 'draft')
  ),

  -- Composite Foreign Key to workspace_projects (same workspace)
  CONSTRAINT fk_evidence_project
    FOREIGN KEY (project_id, workspace_id)
    REFERENCES public.workspace_projects(id, workspace_id)
    ON DELETE SET NULL
);

-- ============================================================================
-- 2. Table: public.workspace_evidence_sources
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.workspace_evidence_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  evidence_id UUID NOT NULL,

  -- Polymorphic target references (exactly one must be set)
  review_id UUID NULL,
  metric_observation_id UUID NULL,
  decision_id UUID NULL,
  document_id UUID NULL,
  file_id UUID NULL,

  -- Context / annotation on the connection
  notes TEXT NULL,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Composite FK to parent evidence
  CONSTRAINT fk_evidence_sources_evidence
    FOREIGN KEY (evidence_id, workspace_id)
    REFERENCES public.workspace_evidence(id, workspace_id)
    ON DELETE CASCADE,

  -- Composite FKs to source entities
  CONSTRAINT fk_evidence_sources_review
    FOREIGN KEY (review_id, workspace_id)
    REFERENCES public.reviews(id, workspace_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_evidence_sources_observation
    FOREIGN KEY (metric_observation_id, workspace_id)
    REFERENCES public.workspace_metric_observations(id, workspace_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_evidence_sources_decision
    FOREIGN KEY (decision_id, workspace_id)
    REFERENCES public.decisions(id, workspace_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_evidence_sources_document
    FOREIGN KEY (document_id, workspace_id)
    REFERENCES public.project_documents(id, workspace_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_evidence_sources_file
    FOREIGN KEY (file_id, workspace_id)
    REFERENCES public.project_files(id, workspace_id)
    ON DELETE CASCADE,

  -- Exactly one target must be populated
  CONSTRAINT chk_evidence_source_target_exactly_one CHECK (
    (CASE WHEN review_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN metric_observation_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN decision_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN document_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN file_id IS NOT NULL THEN 1 ELSE 0 END) = 1
  )
);

-- Unique source attachment per evidence claim
CREATE UNIQUE INDEX IF NOT EXISTS uq_evidence_source_review
  ON public.workspace_evidence_sources(evidence_id, review_id)
  WHERE review_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_evidence_source_observation
  ON public.workspace_evidence_sources(evidence_id, metric_observation_id)
  WHERE metric_observation_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_evidence_source_decision
  ON public.workspace_evidence_sources(evidence_id, decision_id)
  WHERE decision_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_evidence_source_document
  ON public.workspace_evidence_sources(evidence_id, document_id)
  WHERE document_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_evidence_source_file
  ON public.workspace_evidence_sources(evidence_id, file_id)
  WHERE file_id IS NOT NULL;

-- ============================================================================
-- 3. Table: public.portfolio_evidence_bridges
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.portfolio_evidence_bridges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  evidence_id UUID NOT NULL,

  -- Target public entity (exactly one must be set)
  public_project_id UUID NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  public_case_study_id UUID NULL REFERENCES public.case_studies(id) ON DELETE CASCADE,

  -- Snapshot values captured at bridge creation / explicit refresh
  snapshot_title TEXT NOT NULL,
  snapshot_claim TEXT NOT NULL,
  snapshot_summary TEXT NULL,
  snapshot_result TEXT NULL,
  snapshotted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Provenance & Timestamps
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Detach lifecycle (soft detachment)
  detached_at TIMESTAMPTZ NULL,

  -- Composite FK to parent evidence
  CONSTRAINT fk_bridge_evidence
    FOREIGN KEY (evidence_id, workspace_id)
    REFERENCES public.workspace_evidence(id, workspace_id)
    ON DELETE CASCADE,

  -- Exactly one target public entity must be set
  CONSTRAINT chk_bridge_target_exactly_one CHECK (
    (CASE WHEN public_project_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN public_case_study_id IS NOT NULL THEN 1 ELSE 0 END) = 1
  ),

  -- Non-empty snapshots
  CONSTRAINT chk_bridge_snapshot_title_nonempty CHECK (length(trim(snapshot_title)) > 0),
  CONSTRAINT chk_bridge_snapshot_claim_nonempty CHECK (length(trim(snapshot_claim)) > 0)
);

-- At most one active bridge per evidence item and target
CREATE UNIQUE INDEX IF NOT EXISTS uq_bridge_active_project
  ON public.portfolio_evidence_bridges(evidence_id, public_project_id)
  WHERE detached_at IS NULL AND public_project_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_bridge_active_case_study
  ON public.portfolio_evidence_bridges(evidence_id, public_case_study_id)
  WHERE detached_at IS NULL AND public_case_study_id IS NOT NULL;

-- ============================================================================
-- 4. Indexes for Performance & Common Queries
-- ============================================================================

-- Evidence
CREATE INDEX IF NOT EXISTS idx_ws_evidence_ws_archived
  ON public.workspace_evidence(workspace_id, archived_at);

CREATE INDEX IF NOT EXISTS idx_ws_evidence_ws_status
  ON public.workspace_evidence(workspace_id, approval_status);

CREATE INDEX IF NOT EXISTS idx_ws_evidence_ws_type
  ON public.workspace_evidence(workspace_id, evidence_type);

CREATE INDEX IF NOT EXISTS idx_ws_evidence_ws_project
  ON public.workspace_evidence(workspace_id, project_id)
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ws_evidence_created
  ON public.workspace_evidence(workspace_id, created_at DESC);

-- Sources
CREATE INDEX IF NOT EXISTS idx_evidence_sources_ws_evidence
  ON public.workspace_evidence_sources(workspace_id, evidence_id);

CREATE INDEX IF NOT EXISTS idx_evidence_sources_review
  ON public.workspace_evidence_sources(review_id)
  WHERE review_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_evidence_sources_obs
  ON public.workspace_evidence_sources(metric_observation_id)
  WHERE metric_observation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_evidence_sources_decision
  ON public.workspace_evidence_sources(decision_id)
  WHERE decision_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_evidence_sources_doc
  ON public.workspace_evidence_sources(document_id)
  WHERE document_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_evidence_sources_file
  ON public.workspace_evidence_sources(file_id)
  WHERE file_id IS NOT NULL;

-- Bridges
CREATE INDEX IF NOT EXISTS idx_portfolio_bridges_ws_evidence
  ON public.portfolio_evidence_bridges(workspace_id, evidence_id);

CREATE INDEX IF NOT EXISTS idx_portfolio_bridges_public_project
  ON public.portfolio_evidence_bridges(public_project_id)
  WHERE public_project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_portfolio_bridges_public_case_study
  ON public.portfolio_evidence_bridges(public_case_study_id)
  WHERE public_case_study_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_portfolio_bridges_detached
  ON public.portfolio_evidence_bridges(detached_at)
  WHERE detached_at IS NULL;

-- ============================================================================
-- 5. Immutability Triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION wv_internal.prevent_evidence_tampering()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.workspace_id <> OLD.workspace_id THEN
    RAISE EXCEPTION 'Workspace re-assignment is not permitted on evidence entities';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION wv_internal.prevent_evidence_source_tampering()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.workspace_id <> OLD.workspace_id THEN
    RAISE EXCEPTION 'Workspace re-assignment is not permitted on evidence sources';
  END IF;
  IF NEW.evidence_id <> OLD.evidence_id THEN
    RAISE EXCEPTION 'Evidence re-assignment is not permitted on evidence sources';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION wv_internal.prevent_portfolio_bridge_tampering()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.workspace_id <> OLD.workspace_id THEN
    RAISE EXCEPTION 'Workspace re-assignment is not permitted on portfolio bridges';
  END IF;
  IF NEW.evidence_id <> OLD.evidence_id THEN
    RAISE EXCEPTION 'Evidence re-assignment is not permitted on portfolio bridges';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_evidence_tampering ON public.workspace_evidence;
CREATE TRIGGER trg_prevent_evidence_tampering
  BEFORE UPDATE ON public.workspace_evidence
  FOR EACH ROW
  EXECUTE FUNCTION wv_internal.prevent_evidence_tampering();

DROP TRIGGER IF EXISTS trg_prevent_evidence_source_tampering ON public.workspace_evidence_sources;
CREATE TRIGGER trg_prevent_evidence_source_tampering
  BEFORE UPDATE ON public.workspace_evidence_sources
  FOR EACH ROW
  EXECUTE FUNCTION wv_internal.prevent_evidence_source_tampering();

DROP TRIGGER IF EXISTS trg_prevent_portfolio_bridge_tampering ON public.portfolio_evidence_bridges;
CREATE TRIGGER trg_prevent_portfolio_bridge_tampering
  BEFORE UPDATE ON public.portfolio_evidence_bridges
  FOR EACH ROW
  EXECUTE FUNCTION wv_internal.prevent_portfolio_bridge_tampering();

-- Updated_at auto triggers
DROP TRIGGER IF EXISTS trg_evidence_updated_at ON public.workspace_evidence;
CREATE TRIGGER trg_evidence_updated_at
  BEFORE UPDATE ON public.workspace_evidence
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_bridge_updated_at ON public.portfolio_evidence_bridges;
CREATE TRIGGER trg_bridge_updated_at
  BEFORE UPDATE ON public.portfolio_evidence_bridges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.workspace_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_evidence_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_evidence_bridges ENABLE ROW LEVEL SECURITY;

-- 6a. public.workspace_evidence
DROP POLICY IF EXISTS "workspace_evidence_select_member" ON public.workspace_evidence;
CREATE POLICY "workspace_evidence_select_member"
  ON public.workspace_evidence FOR SELECT TO authenticated
  USING (wv_internal.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "workspace_evidence_insert_member" ON public.workspace_evidence;
CREATE POLICY "workspace_evidence_insert_member"
  ON public.workspace_evidence FOR INSERT TO authenticated
  WITH CHECK (wv_internal.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "workspace_evidence_update_member" ON public.workspace_evidence;
CREATE POLICY "workspace_evidence_update_member"
  ON public.workspace_evidence FOR UPDATE TO authenticated
  USING (wv_internal.is_workspace_member(workspace_id))
  WITH CHECK (wv_internal.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "workspace_evidence_delete_admin" ON public.workspace_evidence;
CREATE POLICY "workspace_evidence_delete_admin"
  ON public.workspace_evidence FOR DELETE TO authenticated
  USING (wv_internal.is_workspace_admin(workspace_id));

-- 6b. public.workspace_evidence_sources
DROP POLICY IF EXISTS "workspace_evidence_sources_select_member" ON public.workspace_evidence_sources;
CREATE POLICY "workspace_evidence_sources_select_member"
  ON public.workspace_evidence_sources FOR SELECT TO authenticated
  USING (wv_internal.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "workspace_evidence_sources_insert_member" ON public.workspace_evidence_sources;
CREATE POLICY "workspace_evidence_sources_insert_member"
  ON public.workspace_evidence_sources FOR INSERT TO authenticated
  WITH CHECK (wv_internal.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "workspace_evidence_sources_update_member" ON public.workspace_evidence_sources;
CREATE POLICY "workspace_evidence_sources_update_member"
  ON public.workspace_evidence_sources FOR UPDATE TO authenticated
  USING (wv_internal.is_workspace_member(workspace_id))
  WITH CHECK (wv_internal.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "workspace_evidence_sources_delete_member" ON public.workspace_evidence_sources;
CREATE POLICY "workspace_evidence_sources_delete_member"
  ON public.workspace_evidence_sources FOR DELETE TO authenticated
  USING (wv_internal.is_workspace_member(workspace_id));

-- 6c. public.portfolio_evidence_bridges
DROP POLICY IF EXISTS "portfolio_evidence_bridges_select_member" ON public.portfolio_evidence_bridges;
CREATE POLICY "portfolio_evidence_bridges_select_member"
  ON public.portfolio_evidence_bridges FOR SELECT TO authenticated
  USING (wv_internal.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "portfolio_evidence_bridges_insert_member" ON public.portfolio_evidence_bridges;
CREATE POLICY "portfolio_evidence_bridges_insert_member"
  ON public.portfolio_evidence_bridges FOR INSERT TO authenticated
  WITH CHECK (wv_internal.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "portfolio_evidence_bridges_update_member" ON public.portfolio_evidence_bridges;
CREATE POLICY "portfolio_evidence_bridges_update_member"
  ON public.portfolio_evidence_bridges FOR UPDATE TO authenticated
  USING (wv_internal.is_workspace_member(workspace_id))
  WITH CHECK (wv_internal.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "portfolio_evidence_bridges_delete_admin" ON public.portfolio_evidence_bridges;
CREATE POLICY "portfolio_evidence_bridges_delete_admin"
  ON public.portfolio_evidence_bridges FOR DELETE TO authenticated
  USING (wv_internal.is_workspace_admin(workspace_id));

