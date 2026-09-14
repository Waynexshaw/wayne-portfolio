-- Migration: 008_wv_research_sources_evidence.sql
-- Description: Creates public.research_sources and public.research_evidence tables,
--              enforces multi-level relational integrity (workspace and record consistency),
--              adds immutability triggers, performance indexes, and workspace RLS policies.

-- 1. Ensure composite unique constraint on public.research_records for composite foreign key references
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_research_records_id_workspace'
  ) THEN
    ALTER TABLE public.research_records
      ADD CONSTRAINT uq_research_records_id_workspace UNIQUE (id, workspace_id);
  END IF;
END;
$$;

-- 2. Research Sources Table
CREATE TABLE IF NOT EXISTS public.research_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  research_record_id UUID NOT NULL REFERENCES public.research_records(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'article' CHECK (
    source_type IN (
      'article',
      'research_report',
      'documentation',
      'whitepaper',
      'official_website',
      'social_post',
      'interview',
      'dataset',
      'academic_paper',
      'regulatory_document',
      'video',
      'other'
    )
  ),
  url TEXT,
  publisher TEXT,
  author TEXT,
  published_at DATE,
  accessed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  archived_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Composite Foreign Key enforcing that source workspace_id strictly matches the research_record workspace_id
  CONSTRAINT fk_research_sources_record_ws
    FOREIGN KEY (research_record_id, workspace_id)
    REFERENCES public.research_records(id, workspace_id)
    ON DELETE CASCADE,
  -- Composite Unique Constraint enabling composite FK reference from research_evidence
  CONSTRAINT uq_research_sources_id_ws_record UNIQUE (id, workspace_id, research_record_id)
);

-- 3. Research Evidence Table
CREATE TABLE IF NOT EXISTS public.research_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  research_record_id UUID NOT NULL REFERENCES public.research_records(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES public.research_sources(id) ON DELETE CASCADE,
  evidence_text TEXT NOT NULL,
  claim_summary TEXT,
  context_location TEXT,
  notes TEXT,
  archived_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Composite Foreign Key enforcing that evidence.workspace_id and evidence.research_record_id
  -- strictly match the source.workspace_id and source.research_record_id
  CONSTRAINT fk_research_evidence_source_hierarchy
    FOREIGN KEY (source_id, workspace_id, research_record_id)
    REFERENCES public.research_sources(id, workspace_id, research_record_id)
    ON DELETE CASCADE
);

-- 4. Performance Indexes
-- research_sources indexes
CREATE INDEX IF NOT EXISTS idx_research_sources_ws_record ON public.research_sources(workspace_id, research_record_id);
CREATE INDEX IF NOT EXISTS idx_research_sources_ws_type ON public.research_sources(workspace_id, source_type);
CREATE INDEX IF NOT EXISTS idx_research_sources_ws_archived ON public.research_sources(workspace_id, archived_at);
CREATE INDEX IF NOT EXISTS idx_research_sources_created_at ON public.research_sources(workspace_id, created_at DESC);

-- research_evidence indexes
CREATE INDEX IF NOT EXISTS idx_research_evidence_ws_record ON public.research_evidence(workspace_id, research_record_id);
CREATE INDEX IF NOT EXISTS idx_research_evidence_ws_source ON public.research_evidence(workspace_id, source_id);
CREATE INDEX IF NOT EXISTS idx_research_evidence_ws_archived ON public.research_evidence(workspace_id, archived_at);
CREATE INDEX IF NOT EXISTS idx_research_evidence_created_at ON public.research_evidence(workspace_id, created_at DESC);

-- 5. Row Level Security (RLS)
ALTER TABLE public.research_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_evidence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for research_sources
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'research_sources' AND policyname = 'research_sources_select') THEN
    CREATE POLICY "research_sources_select" ON public.research_sources
      FOR SELECT TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'research_sources' AND policyname = 'research_sources_insert') THEN
    CREATE POLICY "research_sources_insert" ON public.research_sources
      FOR INSERT TO authenticated
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'research_sources' AND policyname = 'research_sources_update') THEN
    CREATE POLICY "research_sources_update" ON public.research_sources
      FOR UPDATE TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id))
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'research_sources' AND policyname = 'research_sources_delete') THEN
    CREATE POLICY "research_sources_delete" ON public.research_sources
      FOR DELETE TO authenticated
      USING (wv_internal.is_workspace_admin(workspace_id));
  END IF;
END;
$$;

-- RLS Policies for research_evidence
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'research_evidence' AND policyname = 'research_evidence_select') THEN
    CREATE POLICY "research_evidence_select" ON public.research_evidence
      FOR SELECT TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'research_evidence' AND policyname = 'research_evidence_insert') THEN
    CREATE POLICY "research_evidence_insert" ON public.research_evidence
      FOR INSERT TO authenticated
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'research_evidence' AND policyname = 'research_evidence_update') THEN
    CREATE POLICY "research_evidence_update" ON public.research_evidence
      FOR UPDATE TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id))
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'research_evidence' AND policyname = 'research_evidence_delete') THEN
    CREATE POLICY "research_evidence_delete" ON public.research_evidence
      FOR DELETE TO authenticated
      USING (wv_internal.is_workspace_admin(workspace_id));
  END IF;
END;
$$;

-- 6. Immutability and Hierarchy Integrity Triggers
-- Prevent source workspace_id and research_record_id transfer
CREATE OR REPLACE FUNCTION wv_internal.prevent_research_source_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.workspace_id <> NEW.workspace_id THEN
    RAISE EXCEPTION 'Workspace immutability violation: research source workspace_id cannot be modified';
  END IF;
  IF OLD.research_record_id <> NEW.research_record_id THEN
    RAISE EXCEPTION 'Hierarchy immutability violation: research source research_record_id cannot be modified';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION wv_internal.prevent_research_source_tampering() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_prevent_research_source_tampering ON public.research_sources;
CREATE TRIGGER trg_prevent_research_source_tampering
BEFORE UPDATE OF workspace_id, research_record_id ON public.research_sources
FOR EACH ROW
EXECUTE FUNCTION wv_internal.prevent_research_source_tampering();

-- Prevent evidence workspace_id, research_record_id, and source_id transfer
CREATE OR REPLACE FUNCTION wv_internal.prevent_research_evidence_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.workspace_id <> NEW.workspace_id THEN
    RAISE EXCEPTION 'Workspace immutability violation: research evidence workspace_id cannot be modified';
  END IF;
  IF OLD.research_record_id <> NEW.research_record_id THEN
    RAISE EXCEPTION 'Hierarchy immutability violation: research evidence research_record_id cannot be modified';
  END IF;
  IF OLD.source_id <> NEW.source_id THEN
    RAISE EXCEPTION 'Hierarchy immutability violation: research evidence source_id cannot be modified';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION wv_internal.prevent_research_evidence_tampering() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_prevent_research_evidence_tampering ON public.research_evidence;
CREATE TRIGGER trg_prevent_research_evidence_tampering
BEFORE UPDATE OF workspace_id, research_record_id, source_id ON public.research_evidence
FOR EACH ROW
EXECUTE FUNCTION wv_internal.prevent_research_evidence_tampering();

-- Updated_at triggers
DROP TRIGGER IF EXISTS update_research_sources_updated_at ON public.research_sources;
CREATE TRIGGER update_research_sources_updated_at
BEFORE UPDATE ON public.research_sources
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_research_evidence_updated_at ON public.research_evidence;
CREATE TRIGGER update_research_evidence_updated_at
BEFORE UPDATE ON public.research_evidence
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
