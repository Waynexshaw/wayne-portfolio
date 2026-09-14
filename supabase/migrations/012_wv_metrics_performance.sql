-- Migration: 012_wv_metrics_performance.sql
-- Description: Creates private operational metrics system for Waynex Vault:
--              1. public.workspace_metrics (definitions)
--              2. public.workspace_metric_targets (historical expectations)
--              3. public.workspace_metric_observations (empirical measurements)
--              Includes composite workspace foreign keys, immutability triggers,
--              performance indexes, and member-scoped RLS policies.

-- ============================================================================
-- 1. Table: public.workspace_metrics (Metric Definitions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.workspace_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID,

  name TEXT NOT NULL,
  key TEXT NOT NULL,
  description TEXT,

  -- Category taxonomy
  category TEXT NOT NULL CHECK (
    category IN (
      'growth',
      'financial',
      'operational',
      'product',
      'marketing',
      'community',
      'other'
    )
  ),

  -- Unit and formatting
  unit_type TEXT NOT NULL CHECK (
    unit_type IN ('count', 'currency', 'percentage', 'duration', 'score')
  ),
  unit_symbol TEXT,

  -- Performance semantics
  direction TEXT NOT NULL DEFAULT 'higher_is_better' CHECK (
    direction IN ('higher_is_better', 'lower_is_better', 'neutral')
  ),
  measurement_type TEXT NOT NULL CHECK (
    measurement_type IN ('point', 'period')
  ),
  cadence TEXT CHECK (
    cadence IS NULL OR cadence IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'ad_hoc')
  ),

  -- Lifecycle status
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'paused', 'archived')
  ),

  -- Provenance & Timestamps
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,

  -- Constraint 1: Unique machine key within workspace
  CONSTRAINT uq_workspace_metrics_ws_key UNIQUE (workspace_id, key),

  -- Constraint 2: Composite identity for foreign key references
  CONSTRAINT uq_workspace_metrics_id_workspace UNIQUE (id, workspace_id),

  -- Constraint 3: Optional project scope within same workspace
  CONSTRAINT fk_workspace_metric_project
    FOREIGN KEY (project_id, workspace_id)
    REFERENCES public.workspace_projects(id, workspace_id)
    ON DELETE RESTRICT
);

-- ============================================================================
-- 2. Table: public.workspace_metric_targets (Expectations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.workspace_metric_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  metric_id UUID NOT NULL,

  target_value NUMERIC(15, 4) NOT NULL,
  baseline_value NUMERIC(15, 4),

  period_start DATE,
  period_end DATE,

  notes TEXT,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Period validity check
  CONSTRAINT chk_metric_target_period CHECK (
    period_start IS NULL OR period_end IS NULL OR period_end >= period_start
  ),

  -- Composite foreign key to parent metric
  CONSTRAINT fk_metric_target_metric
    FOREIGN KEY (metric_id, workspace_id)
    REFERENCES public.workspace_metrics(id, workspace_id)
    ON DELETE CASCADE
);

-- ============================================================================
-- 3. Table: public.workspace_metric_observations (Measurements)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.workspace_metric_observations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  metric_id UUID NOT NULL,

  value NUMERIC(15, 4) NOT NULL,

  observed_at DATE NOT NULL DEFAULT CURRENT_DATE,

  period_start DATE,
  period_end DATE,

  notes TEXT,
  source_label TEXT,
  source_url TEXT,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Period validity check
  CONSTRAINT chk_metric_observation_period CHECK (
    period_start IS NULL OR period_end IS NULL OR period_end >= period_start
  ),

  -- Composite foreign key to parent metric
  CONSTRAINT fk_metric_observation_metric
    FOREIGN KEY (metric_id, workspace_id)
    REFERENCES public.workspace_metrics(id, workspace_id)
    ON DELETE CASCADE
);

-- ============================================================================
-- 4. Performance Indexes
-- ============================================================================
-- Metrics
CREATE INDEX IF NOT EXISTS idx_ws_metrics_ws_status
  ON public.workspace_metrics(workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_ws_metrics_ws_category
  ON public.workspace_metrics(workspace_id, category);

CREATE INDEX IF NOT EXISTS idx_ws_metrics_ws_project
  ON public.workspace_metrics(workspace_id, project_id)
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ws_metrics_ws_created
  ON public.workspace_metrics(workspace_id, created_at DESC);

-- Targets
CREATE INDEX IF NOT EXISTS idx_metric_targets_ws_metric
  ON public.workspace_metric_targets(workspace_id, metric_id);

CREATE INDEX IF NOT EXISTS idx_metric_targets_metric_dates
  ON public.workspace_metric_targets(metric_id, period_start, period_end);

-- Observations
CREATE INDEX IF NOT EXISTS idx_metric_obs_ws_metric
  ON public.workspace_metric_observations(workspace_id, metric_id);

CREATE INDEX IF NOT EXISTS idx_metric_obs_metric_observed
  ON public.workspace_metric_observations(metric_id, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_metric_obs_metric_dates
  ON public.workspace_metric_observations(metric_id, period_start, period_end);

-- ============================================================================
-- 5. Immutability Triggers
-- ============================================================================
-- 5a. Workspace Metric Immutability
CREATE OR REPLACE FUNCTION wv_internal.prevent_workspace_metric_transfer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.workspace_id <> NEW.workspace_id THEN
    RAISE EXCEPTION 'Workspace immutability violation: metric workspace_id cannot be modified';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION wv_internal.prevent_workspace_metric_transfer() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_prevent_workspace_metric_transfer ON public.workspace_metrics;
CREATE TRIGGER trg_prevent_workspace_metric_transfer
BEFORE UPDATE OF workspace_id ON public.workspace_metrics
FOR EACH ROW
EXECUTE FUNCTION wv_internal.prevent_workspace_metric_transfer();

-- 5b. Metric Target Immutability
CREATE OR REPLACE FUNCTION wv_internal.prevent_metric_target_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.workspace_id <> NEW.workspace_id THEN
    RAISE EXCEPTION 'Workspace immutability violation: target workspace_id cannot be modified';
  END IF;
  IF OLD.metric_id <> NEW.metric_id THEN
    RAISE EXCEPTION 'Hierarchy immutability violation: target metric_id cannot be modified';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION wv_internal.prevent_metric_target_tampering() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_prevent_metric_target_tampering ON public.workspace_metric_targets;
CREATE TRIGGER trg_prevent_metric_target_tampering
BEFORE UPDATE OF workspace_id, metric_id ON public.workspace_metric_targets
FOR EACH ROW
EXECUTE FUNCTION wv_internal.prevent_metric_target_tampering();

-- 5c. Metric Observation Immutability
CREATE OR REPLACE FUNCTION wv_internal.prevent_metric_observation_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.workspace_id <> NEW.workspace_id THEN
    RAISE EXCEPTION 'Workspace immutability violation: observation workspace_id cannot be modified';
  END IF;
  IF OLD.metric_id <> NEW.metric_id THEN
    RAISE EXCEPTION 'Hierarchy immutability violation: observation metric_id cannot be modified';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION wv_internal.prevent_metric_observation_tampering() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_prevent_metric_observation_tampering ON public.workspace_metric_observations;
CREATE TRIGGER trg_prevent_metric_observation_tampering
BEFORE UPDATE OF workspace_id, metric_id ON public.workspace_metric_observations
FOR EACH ROW
EXECUTE FUNCTION wv_internal.prevent_metric_observation_tampering();

-- ============================================================================
-- 6. Updated_at Triggers
-- ============================================================================
DROP TRIGGER IF EXISTS update_workspace_metrics_updated_at ON public.workspace_metrics;
CREATE TRIGGER update_workspace_metrics_updated_at
BEFORE UPDATE ON public.workspace_metrics
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workspace_metric_targets_updated_at ON public.workspace_metric_targets;
CREATE TRIGGER update_workspace_metric_targets_updated_at
BEFORE UPDATE ON public.workspace_metric_targets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workspace_metric_observations_updated_at ON public.workspace_metric_observations;
CREATE TRIGGER update_workspace_metric_observations_updated_at
BEFORE UPDATE ON public.workspace_metric_observations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. Row Level Security (RLS)
-- ============================================================================
ALTER TABLE public.workspace_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_metric_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_metric_observations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- workspace_metrics policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_metrics' AND policyname = 'workspace_metrics_select') THEN
    CREATE POLICY "workspace_metrics_select" ON public.workspace_metrics
      FOR SELECT TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_metrics' AND policyname = 'workspace_metrics_insert') THEN
    CREATE POLICY "workspace_metrics_insert" ON public.workspace_metrics
      FOR INSERT TO authenticated
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_metrics' AND policyname = 'workspace_metrics_update') THEN
    CREATE POLICY "workspace_metrics_update" ON public.workspace_metrics
      FOR UPDATE TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id))
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_metrics' AND policyname = 'workspace_metrics_delete') THEN
    CREATE POLICY "workspace_metrics_delete" ON public.workspace_metrics
      FOR DELETE TO authenticated
      USING (wv_internal.is_workspace_admin(workspace_id));
  END IF;

  -- workspace_metric_targets policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_metric_targets' AND policyname = 'workspace_metric_targets_select') THEN
    CREATE POLICY "workspace_metric_targets_select" ON public.workspace_metric_targets
      FOR SELECT TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_metric_targets' AND policyname = 'workspace_metric_targets_insert') THEN
    CREATE POLICY "workspace_metric_targets_insert" ON public.workspace_metric_targets
      FOR INSERT TO authenticated
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_metric_targets' AND policyname = 'workspace_metric_targets_update') THEN
    CREATE POLICY "workspace_metric_targets_update" ON public.workspace_metric_targets
      FOR UPDATE TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id))
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_metric_targets' AND policyname = 'workspace_metric_targets_delete') THEN
    CREATE POLICY "workspace_metric_targets_delete" ON public.workspace_metric_targets
      FOR DELETE TO authenticated
      USING (wv_internal.is_workspace_admin(workspace_id));
  END IF;

  -- workspace_metric_observations policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_metric_observations' AND policyname = 'workspace_metric_observations_select') THEN
    CREATE POLICY "workspace_metric_observations_select" ON public.workspace_metric_observations
      FOR SELECT TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_metric_observations' AND policyname = 'workspace_metric_observations_insert') THEN
    CREATE POLICY "workspace_metric_observations_insert" ON public.workspace_metric_observations
      FOR INSERT TO authenticated
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_metric_observations' AND policyname = 'workspace_metric_observations_update') THEN
    CREATE POLICY "workspace_metric_observations_update" ON public.workspace_metric_observations
      FOR UPDATE TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id))
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_metric_observations' AND policyname = 'workspace_metric_observations_delete') THEN
    CREATE POLICY "workspace_metric_observations_delete" ON public.workspace_metric_observations
      FOR DELETE TO authenticated
      USING (wv_internal.is_workspace_admin(workspace_id));
  END IF;
END;
$$;
