-- ============================================================================
-- Migration 017: Waynex Vault — SHAW Intelligence Core V1 (Batch 1)
--
-- Introduces:
-- 1. shaw_conversations: Workspace-scoped persistent conversation threads
-- 2. shaw_messages: Ordered conversation dialogue with model & provenance tags
-- 3. shaw_ai_runs: Intelligence execution audit ledger (tokens, latency, cost)
-- 4. shaw_user_preferences: Routing preferences, paid fallback, and voice settings
--
-- Security & Invariants:
-- - Strict workspace multi-tenancy & composite foreign keys
-- - Row Level Security (RLS) enforcing wv_internal.is_workspace_member
-- - Zero API secret storage in database
-- ============================================================================

-- ============================================================================
-- 1. Table: public.shaw_conversations
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.shaw_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  identity_id UUID REFERENCES public.identities(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  routing_mode TEXT NOT NULL DEFAULT 'auto_free_first' CHECK (
    routing_mode IN ('auto_free_first', 'gemini', 'groq', 'manual')
  ),
  selected_model TEXT,
  capability TEXT NOT NULL DEFAULT 'ask' CHECK (
    capability IN ('ask', 'create', 'research', 'analyze')
  ),
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_shaw_conversations_id_ws
    UNIQUE (id, workspace_id)
);

-- ============================================================================
-- 2. Table: public.shaw_messages
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.shaw_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  model_provider TEXT,
  model_name TEXT,
  citations JSONB NOT NULL DEFAULT '[]'::jsonb,
  proposed_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  tokens_in INTEGER,
  tokens_out INTEGER,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_shaw_messages_conv_ws
    FOREIGN KEY (conversation_id, workspace_id)
    REFERENCES public.shaw_conversations(id, workspace_id)
    ON DELETE CASCADE
);

-- ============================================================================
-- 3. Table: public.shaw_ai_runs
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.shaw_ai_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.shaw_conversations(id) ON DELETE SET NULL,
  capability TEXT NOT NULL CHECK (
    capability IN ('ask', 'create', 'research', 'analyze', 'voice_compliance')
  ),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('started', 'streaming', 'completed', 'failed', 'fallback')
  ),
  tokens_in INTEGER,
  tokens_out INTEGER,
  estimated_cost_usd NUMERIC(10, 6) DEFAULT 0,
  latency_ms INTEGER,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. Table: public.shaw_user_preferences
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.shaw_user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  routing_mode TEXT NOT NULL DEFAULT 'auto_free_first' CHECK (
    routing_mode IN ('auto_free_first', 'gemini', 'groq', 'manual')
  ),
  allow_paid_fallback BOOLEAN NOT NULL DEFAULT FALSE,
  default_voice_profile TEXT NOT NULL DEFAULT 'defiwaynex',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_shaw_user_preferences_user_ws
    UNIQUE (user_id, workspace_id)
);

-- ============================================================================
-- 5. Performance Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_shaw_conversations_ws_created
  ON public.shaw_conversations (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shaw_conversations_ws_archived
  ON public.shaw_conversations (workspace_id, is_archived);

CREATE INDEX IF NOT EXISTS idx_shaw_messages_conv_created
  ON public.shaw_messages (conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_shaw_messages_ws
  ON public.shaw_messages (workspace_id);

CREATE INDEX IF NOT EXISTS idx_shaw_ai_runs_ws_created
  ON public.shaw_ai_runs (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shaw_ai_runs_conv
  ON public.shaw_ai_runs (conversation_id);

CREATE INDEX IF NOT EXISTS idx_shaw_user_prefs_lookup
  ON public.shaw_user_preferences (workspace_id, user_id);

-- ============================================================================
-- 6. Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.shaw_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shaw_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shaw_ai_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shaw_user_preferences ENABLE ROW LEVEL SECURITY;

-- shaw_conversations Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shaw_conversations' AND policyname = 'shaw_conversations_select') THEN
    CREATE POLICY "shaw_conversations_select" ON public.shaw_conversations
      FOR SELECT TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shaw_conversations' AND policyname = 'shaw_conversations_insert') THEN
    CREATE POLICY "shaw_conversations_insert" ON public.shaw_conversations
      FOR INSERT TO authenticated
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shaw_conversations' AND policyname = 'shaw_conversations_update') THEN
    CREATE POLICY "shaw_conversations_update" ON public.shaw_conversations
      FOR UPDATE TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id))
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shaw_conversations' AND policyname = 'shaw_conversations_delete') THEN
    CREATE POLICY "shaw_conversations_delete" ON public.shaw_conversations
      FOR DELETE TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id));
  END IF;
END $$;

-- shaw_messages Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shaw_messages' AND policyname = 'shaw_messages_select') THEN
    CREATE POLICY "shaw_messages_select" ON public.shaw_messages
      FOR SELECT TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shaw_messages' AND policyname = 'shaw_messages_insert') THEN
    CREATE POLICY "shaw_messages_insert" ON public.shaw_messages
      FOR INSERT TO authenticated
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shaw_messages' AND policyname = 'shaw_messages_update') THEN
    CREATE POLICY "shaw_messages_update" ON public.shaw_messages
      FOR UPDATE TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id))
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shaw_messages' AND policyname = 'shaw_messages_delete') THEN
    CREATE POLICY "shaw_messages_delete" ON public.shaw_messages
      FOR DELETE TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id));
  END IF;
END $$;

-- shaw_ai_runs Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shaw_ai_runs' AND policyname = 'shaw_ai_runs_select') THEN
    CREATE POLICY "shaw_ai_runs_select" ON public.shaw_ai_runs
      FOR SELECT TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shaw_ai_runs' AND policyname = 'shaw_ai_runs_insert') THEN
    CREATE POLICY "shaw_ai_runs_insert" ON public.shaw_ai_runs
      FOR INSERT TO authenticated
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shaw_ai_runs' AND policyname = 'shaw_ai_runs_update') THEN
    CREATE POLICY "shaw_ai_runs_update" ON public.shaw_ai_runs
      FOR UPDATE TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id))
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;
END $$;

-- shaw_user_preferences Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shaw_user_preferences' AND policyname = 'shaw_user_preferences_select') THEN
    CREATE POLICY "shaw_user_preferences_select" ON public.shaw_user_preferences
      FOR SELECT TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id) AND user_id = (SELECT auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shaw_user_preferences' AND policyname = 'shaw_user_preferences_insert') THEN
    CREATE POLICY "shaw_user_preferences_insert" ON public.shaw_user_preferences
      FOR INSERT TO authenticated
      WITH CHECK (wv_internal.is_workspace_member(workspace_id) AND user_id = (SELECT auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shaw_user_preferences' AND policyname = 'shaw_user_preferences_update') THEN
    CREATE POLICY "shaw_user_preferences_update" ON public.shaw_user_preferences
      FOR UPDATE TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id) AND user_id = (SELECT auth.uid()))
      WITH CHECK (wv_internal.is_workspace_member(workspace_id) AND user_id = (SELECT auth.uid()));
  END IF;
END $$;

-- 6. Updated At Triggers
-- ============================================================================

DROP TRIGGER IF EXISTS update_shaw_conversations_updated_at ON public.shaw_conversations;
CREATE TRIGGER update_shaw_conversations_updated_at
  BEFORE UPDATE ON public.shaw_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shaw_user_preferences_updated_at ON public.shaw_user_preferences;
CREATE TRIGGER update_shaw_user_preferences_updated_at
  BEFORE UPDATE ON public.shaw_user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
