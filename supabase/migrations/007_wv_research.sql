-- Migration: 007_wv_research.sql
-- Description: Creates public.research_records table, performance indexes, and workspace-scoped RLS policies.

-- 1. Research Records Table
CREATE TABLE IF NOT EXISTS public.research_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  research_type TEXT NOT NULL DEFAULT 'market' CHECK (
    research_type IN (
      'protocol',
      'market',
      'tokenomics',
      'growth',
      'company',
      'person',
      'product',
      'technology',
      'regulatory',
      'pevra',
      'other'
    )
  ),
  status TEXT NOT NULL DEFAULT 'planning' CHECK (
    status IN ('planning', 'active', 'paused', 'completed', 'archived')
  ),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (
    priority IN ('low', 'medium', 'high', 'urgent')
  ),
  research_question TEXT,
  objective TEXT,
  summary TEXT,
  findings TEXT,
  conclusion TEXT,
  next_action TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_research_records_ws_status ON public.research_records(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_research_records_ws_type ON public.research_records(workspace_id, research_type);
CREATE INDEX IF NOT EXISTS idx_research_records_ws_priority ON public.research_records(workspace_id, priority);
CREATE INDEX IF NOT EXISTS idx_research_records_created_at ON public.research_records(workspace_id, created_at DESC);

-- 3. Row Level Security
ALTER TABLE public.research_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "research_records_select" ON public.research_records
  FOR SELECT TO authenticated
  USING (wv_internal.is_workspace_member(workspace_id));

CREATE POLICY "research_records_insert" ON public.research_records
  FOR INSERT TO authenticated
  WITH CHECK (wv_internal.is_workspace_member(workspace_id));

CREATE POLICY "research_records_update" ON public.research_records
  FOR UPDATE TO authenticated
  USING (wv_internal.is_workspace_member(workspace_id))
  WITH CHECK (wv_internal.is_workspace_member(workspace_id));

CREATE POLICY "research_records_delete" ON public.research_records
  FOR DELETE TO authenticated
  USING (wv_internal.is_workspace_admin(workspace_id));

-- 4. Workspace Immutability Enforcement Trigger
CREATE OR REPLACE FUNCTION wv_internal.prevent_research_record_workspace_transfer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.workspace_id <> NEW.workspace_id THEN
    RAISE EXCEPTION 'Workspace immutability violation: research record workspace_id cannot be modified';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION wv_internal.prevent_research_record_workspace_transfer() FROM PUBLIC;

CREATE TRIGGER trg_prevent_research_record_workspace_transfer
BEFORE UPDATE OF workspace_id ON public.research_records
FOR EACH ROW
EXECUTE FUNCTION wv_internal.prevent_research_record_workspace_transfer();

