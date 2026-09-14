-- Migration: 010_wv_reviews.sql
-- Description: Creates public.reviews table, constraints, performance indexes,
--              workspace immutability trigger, and workspace-scoped RLS policies.

-- 1. Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,

  -- Review Type Classification
  review_type TEXT NOT NULL CHECK (
    review_type IN (
      'project',
      'campaign',
      'growth',
      'strategy',
      'opportunity',
      'partnership',
      'period',
      'other'
    )
  ),

  -- Status Lifecycle
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'completed', 'archived')
  ),

  -- Evaluated Timeframe
  period_start DATE,
  period_end DATE,

  -- Structured Reflection Fields
  objective TEXT,
  expected_outcome TEXT,
  actual_outcome TEXT,

  what_worked TEXT,
  what_did_not_work TEXT,
  why TEXT,

  lessons TEXT,
  next_changes TEXT,
  summary TEXT,

  -- Provenance & Timestamps
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,

  -- Period Integrity Constraint: period_start must be <= period_end if both exist
  CONSTRAINT chk_reviews_period CHECK (
    period_start IS NULL OR period_end IS NULL OR period_start <= period_end
  ),

  -- Composite Workspace Uniqueness (Foundation for future Review Connections)
  CONSTRAINT uq_reviews_id_workspace UNIQUE (id, workspace_id)
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_reviews_ws_status 
  ON public.reviews(workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_reviews_ws_type 
  ON public.reviews(workspace_id, review_type);

CREATE INDEX IF NOT EXISTS idx_reviews_ws_created_at 
  ON public.reviews(workspace_id, created_at DESC);

-- 3. Row Level Security (RLS)
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'reviews_select') THEN
    CREATE POLICY "reviews_select" ON public.reviews
      FOR SELECT TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'reviews_insert') THEN
    CREATE POLICY "reviews_insert" ON public.reviews
      FOR INSERT TO authenticated
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'reviews_update') THEN
    CREATE POLICY "reviews_update" ON public.reviews
      FOR UPDATE TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id))
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'reviews_delete') THEN
    CREATE POLICY "reviews_delete" ON public.reviews
      FOR DELETE TO authenticated
      USING (wv_internal.is_workspace_admin(workspace_id));
  END IF;
END;
$$;

-- 4. Workspace Immutability Enforcement Trigger
CREATE OR REPLACE FUNCTION wv_internal.prevent_review_workspace_transfer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.workspace_id <> NEW.workspace_id THEN
    RAISE EXCEPTION 'Workspace immutability violation: review workspace_id cannot be modified';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION wv_internal.prevent_review_workspace_transfer() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_prevent_review_workspace_transfer ON public.reviews;
CREATE TRIGGER trg_prevent_review_workspace_transfer
BEFORE UPDATE OF workspace_id ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION wv_internal.prevent_review_workspace_transfer();

-- 5. Updated_at Trigger
DROP TRIGGER IF EXISTS update_reviews_updated_at ON public.reviews;
CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
