-- ============================================================================
-- Migration 016: Waynex Vault — Automation System V1 (Batch 1: Engine & Approval Core)
--
-- Introduces:
-- 1. automation_rules: Workspace-scoped automation rules with parameterization
-- 2. automation_event_log: Durable log of domain occurrences
-- 3. automation_runs: Execution and audit ledger with idempotency
-- 4. automation_approvals: Human authorization queue for consequential actions
-- 5. workspace_notifications: Internal in-app notification ledger
--
-- Security & Structural Isolation:
-- - Strict workspace multi-tenancy & composite foreign keys
-- - Workspace immutability triggers on all entities
-- - Row Level Security (RLS) allowing authenticated workspace members
-- - Zero anonymous or public access
-- ============================================================================

-- ============================================================================
-- 1. Table: public.automation_rules
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  template_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  conditions JSONB NOT NULL DEFAULT '{"conjunction": "AND", "predicates": []}'::jsonb,
  action_type TEXT NOT NULL,
  action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,

  CONSTRAINT uq_automation_rules_id_workspace
    UNIQUE (id, workspace_id)
);

-- ============================================================================
-- 2. Table: public.automation_event_log
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.automation_event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,

  CONSTRAINT uq_automation_event_log_id_workspace
    UNIQUE (id, workspace_id)
);

-- ============================================================================
-- 3. Table: public.automation_runs
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  rule_id UUID,
  rule_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  trigger_event_id UUID,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN (
      'pending',
      'awaiting_approval',
      'approved',
      'rejected',
      'running',
      'succeeded',
      'failed',
      'skipped',
      'cancelled'
    )
  ),
  target_entity_type TEXT NOT NULL,
  target_entity_id UUID,
  execution_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_details TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_automation_runs_id_workspace
    UNIQUE (id, workspace_id),

  CONSTRAINT uq_automation_runs_ws_idempotency
    UNIQUE (workspace_id, idempotency_key),

  -- Composite Foreign Key ensuring rule belongs to the same workspace
  CONSTRAINT fk_automation_runs_rule
    FOREIGN KEY (rule_id, workspace_id)
    REFERENCES public.automation_rules(id, workspace_id)
    ON DELETE SET NULL,

  -- Composite Foreign Key ensuring event belongs to the same workspace
  CONSTRAINT fk_automation_runs_event
    FOREIGN KEY (trigger_event_id, workspace_id)
    REFERENCES public.automation_event_log(id, workspace_id)
    ON DELETE SET NULL
);

-- ============================================================================
-- 4. Table: public.automation_approvals
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.automation_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  run_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  proposed_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  modified_payload JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'rejected', 'expired')
  ),
  source_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_automation_approvals_id_workspace
    UNIQUE (id, workspace_id),

  -- At most one approval per automation run
  CONSTRAINT uq_automation_approvals_run
    UNIQUE (workspace_id, run_id),

  -- Composite Foreign Key ensuring run belongs to the same workspace
  CONSTRAINT fk_automation_approvals_run
    FOREIGN KEY (run_id, workspace_id)
    REFERENCES public.automation_runs(id, workspace_id)
    ON DELETE CASCADE
);

-- ============================================================================
-- 5. Table: public.workspace_notifications
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.workspace_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (
    category IN ('approval_required', 'automation_alert', 'reminder', 'system')
  ),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_url TEXT,
  source_run_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,

  CONSTRAINT uq_workspace_notifications_id_workspace
    UNIQUE (id, workspace_id),

  -- Composite Foreign Key ensuring source run belongs to the same workspace
  CONSTRAINT fk_workspace_notifications_run
    FOREIGN KEY (source_run_id, workspace_id)
    REFERENCES public.automation_runs(id, workspace_id)
    ON DELETE SET NULL
);

-- ============================================================================
-- 6. Performance & Lookup Indexes
-- ============================================================================

-- Rules
CREATE INDEX IF NOT EXISTS idx_auto_rules_ws_trigger
  ON public.automation_rules(workspace_id, trigger_type)
  WHERE archived_at IS NULL AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_auto_rules_ws_archived
  ON public.automation_rules(workspace_id, archived_at);

-- Event log
CREATE INDEX IF NOT EXISTS idx_auto_event_log_unprocessed
  ON public.automation_event_log(workspace_id, processed_at)
  WHERE processed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_auto_event_log_created
  ON public.automation_event_log(workspace_id, created_at DESC);

-- Runs
CREATE INDEX IF NOT EXISTS idx_auto_runs_ws_status
  ON public.automation_runs(workspace_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auto_runs_rule
  ON public.automation_runs(workspace_id, rule_id)
  WHERE rule_id IS NOT NULL;

-- Approvals
CREATE INDEX IF NOT EXISTS idx_auto_approvals_ws_status
  ON public.automation_approvals(workspace_id, status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_auto_approvals_run
  ON public.automation_approvals(workspace_id, run_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_auto_notifs_ws_unread
  ON public.workspace_notifications(workspace_id, is_read, created_at DESC)
  WHERE is_read = false;

-- ============================================================================
-- 7. Updated At & Immutability Triggers
-- ============================================================================

DROP TRIGGER IF EXISTS update_automation_rules_updated_at ON public.automation_rules;
CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Shared workspace immutability check
CREATE OR REPLACE FUNCTION wv_internal.prevent_automation_item_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.workspace_id <> NEW.workspace_id THEN
    RAISE EXCEPTION 'Workspace immutability violation: workspace_id cannot be modified.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION wv_internal.prevent_automation_item_tampering() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_prevent_auto_rules_tampering ON public.automation_rules;
CREATE TRIGGER trg_prevent_auto_rules_tampering
  BEFORE UPDATE OF workspace_id ON public.automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION wv_internal.prevent_automation_item_tampering();

DROP TRIGGER IF EXISTS trg_prevent_auto_event_log_tampering ON public.automation_event_log;
CREATE TRIGGER trg_prevent_auto_event_log_tampering
  BEFORE UPDATE OF workspace_id ON public.automation_event_log
  FOR EACH ROW
  EXECUTE FUNCTION wv_internal.prevent_automation_item_tampering();

DROP TRIGGER IF EXISTS trg_prevent_auto_runs_tampering ON public.automation_runs;
CREATE TRIGGER trg_prevent_auto_runs_tampering
  BEFORE UPDATE OF workspace_id ON public.automation_runs
  FOR EACH ROW
  EXECUTE FUNCTION wv_internal.prevent_automation_item_tampering();

DROP TRIGGER IF EXISTS trg_prevent_ws_notifs_tampering ON public.workspace_notifications;
CREATE TRIGGER trg_prevent_ws_notifs_tampering
  BEFORE UPDATE OF workspace_id ON public.workspace_notifications
  FOR EACH ROW
  EXECUTE FUNCTION wv_internal.prevent_automation_item_tampering();

-- Specialized approval immutability trigger (locks workspace_id and run_id)
CREATE OR REPLACE FUNCTION wv_internal.prevent_automation_approval_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.workspace_id <> NEW.workspace_id THEN
    RAISE EXCEPTION 'Workspace immutability violation: workspace_id cannot be modified.';
  END IF;
  IF OLD.run_id <> NEW.run_id THEN
    RAISE EXCEPTION 'Run immutability violation: run_id cannot be modified.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION wv_internal.prevent_automation_approval_tampering() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_prevent_auto_approvals_tampering ON public.automation_approvals;
CREATE TRIGGER trg_prevent_auto_approvals_tampering
  BEFORE UPDATE OF workspace_id, run_id ON public.automation_approvals
  FOR EACH ROW
  EXECUTE FUNCTION wv_internal.prevent_automation_approval_tampering();

-- ============================================================================
-- 8. Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_event_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_notifications ENABLE ROW LEVEL SECURITY;

-- automation_rules policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'automation_rules' AND policyname = 'auto_rules_select') THEN
    CREATE POLICY "auto_rules_select" ON public.automation_rules
      FOR SELECT TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'automation_rules' AND policyname = 'auto_rules_insert') THEN
    CREATE POLICY "auto_rules_insert" ON public.automation_rules
      FOR INSERT TO authenticated
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'automation_rules' AND policyname = 'auto_rules_update') THEN
    CREATE POLICY "auto_rules_update" ON public.automation_rules
      FOR UPDATE TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id))
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'automation_rules' AND policyname = 'auto_rules_delete') THEN
    CREATE POLICY "auto_rules_delete" ON public.automation_rules
      FOR DELETE TO authenticated
      USING (wv_internal.is_workspace_admin(workspace_id));
  END IF;
END;
$$;

-- automation_event_log policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'automation_event_log' AND policyname = 'auto_event_log_select') THEN
    CREATE POLICY "auto_event_log_select" ON public.automation_event_log
      FOR SELECT TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'automation_event_log' AND policyname = 'auto_event_log_insert') THEN
    CREATE POLICY "auto_event_log_insert" ON public.automation_event_log
      FOR INSERT TO authenticated
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'automation_event_log' AND policyname = 'auto_event_log_update') THEN
    CREATE POLICY "auto_event_log_update" ON public.automation_event_log
      FOR UPDATE TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id))
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'automation_event_log' AND policyname = 'auto_event_log_delete') THEN
    CREATE POLICY "auto_event_log_delete" ON public.automation_event_log
      FOR DELETE TO authenticated
      USING (wv_internal.is_workspace_admin(workspace_id));
  END IF;
END;
$$;

-- automation_runs policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'automation_runs' AND policyname = 'auto_runs_select') THEN
    CREATE POLICY "auto_runs_select" ON public.automation_runs
      FOR SELECT TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'automation_runs' AND policyname = 'auto_runs_insert') THEN
    CREATE POLICY "auto_runs_insert" ON public.automation_runs
      FOR INSERT TO authenticated
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'automation_runs' AND policyname = 'auto_runs_update') THEN
    CREATE POLICY "auto_runs_update" ON public.automation_runs
      FOR UPDATE TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id))
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'automation_runs' AND policyname = 'auto_runs_delete') THEN
    CREATE POLICY "auto_runs_delete" ON public.automation_runs
      FOR DELETE TO authenticated
      USING (wv_internal.is_workspace_admin(workspace_id));
  END IF;
END;
$$;

-- automation_approvals policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'automation_approvals' AND policyname = 'auto_approvals_select') THEN
    CREATE POLICY "auto_approvals_select" ON public.automation_approvals
      FOR SELECT TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'automation_approvals' AND policyname = 'auto_approvals_insert') THEN
    CREATE POLICY "auto_approvals_insert" ON public.automation_approvals
      FOR INSERT TO authenticated
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'automation_approvals' AND policyname = 'auto_approvals_update') THEN
    CREATE POLICY "auto_approvals_update" ON public.automation_approvals
      FOR UPDATE TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id))
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'automation_approvals' AND policyname = 'auto_approvals_delete') THEN
    CREATE POLICY "auto_approvals_delete" ON public.automation_approvals
      FOR DELETE TO authenticated
      USING (wv_internal.is_workspace_admin(workspace_id));
  END IF;
END;
$$;

-- workspace_notifications policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_notifications' AND policyname = 'ws_notifs_select') THEN
    CREATE POLICY "ws_notifs_select" ON public.workspace_notifications
      FOR SELECT TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_notifications' AND policyname = 'ws_notifs_insert') THEN
    CREATE POLICY "ws_notifs_insert" ON public.workspace_notifications
      FOR INSERT TO authenticated
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_notifications' AND policyname = 'ws_notifs_update') THEN
    CREATE POLICY "ws_notifs_update" ON public.workspace_notifications
      FOR UPDATE TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id))
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_notifications' AND policyname = 'ws_notifs_delete') THEN
    CREATE POLICY "ws_notifs_delete" ON public.workspace_notifications
      FOR DELETE TO authenticated
      USING (wv_internal.is_workspace_admin(workspace_id));
  END IF;
END;
$$;
