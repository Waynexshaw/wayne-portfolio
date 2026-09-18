-- Migration: 014_wv_operating_records.sql
-- Description: Creates Operating Records V1 tables (meetings, meeting_participants,
--              decisions, tasks), composite foreign keys, immutability triggers,
--              task completion sync trigger, participant identity check, and workspace-scoped RLS policies.

-- 1. Meetings Table
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID,
  company_id UUID,
  title TEXT NOT NULL,
  meeting_type TEXT NOT NULL DEFAULT 'internal' CHECK (meeting_type IN ('internal', 'external', 'other')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  location_or_channel TEXT,
  agenda TEXT,
  notes TEXT,
  outcomes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,

  -- Unique constraint for composite foreign key references
  CONSTRAINT uq_meetings_id_workspace
    UNIQUE (id, workspace_id),

  -- Composite Foreign Key to workspace_projects (guarantees workspace/project consistency)
  CONSTRAINT fk_meetings_project
    FOREIGN KEY (project_id, workspace_id)
    REFERENCES public.workspace_projects(id, workspace_id)
    ON DELETE SET NULL,

  -- Composite Foreign Key to workspace_companies (guarantees workspace/company consistency)
  CONSTRAINT fk_meetings_company
    FOREIGN KEY (workspace_id, company_id)
    REFERENCES public.workspace_companies(workspace_id, company_id)
    ON DELETE SET NULL (company_id),

  -- End time consistency
  CONSTRAINT chk_meeting_ended_at
    CHECK (ended_at IS NULL OR ended_at >= scheduled_at)
);

-- 2. Meeting Participants Table
CREATE TABLE IF NOT EXISTS public.meeting_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  guest_name TEXT,
  guest_email TEXT,
  role TEXT NOT NULL DEFAULT 'attendee' CHECK (role IN ('organizer', 'attendee', 'speaker', 'observer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Composite Foreign Key to meetings
  CONSTRAINT fk_meeting_participants_meeting
    FOREIGN KEY (meeting_id, workspace_id)
    REFERENCES public.meetings(id, workspace_id)
    ON DELETE CASCADE,

  -- Participant Identity Source Check (contact_id OR guest_name, never both, never neither)
  CONSTRAINT chk_participant_identity
    CHECK (
      (contact_id IS NOT NULL AND guest_name IS NULL AND guest_email IS NULL)
      OR
      (contact_id IS NULL AND guest_name IS NOT NULL AND btrim(guest_name) <> '')
    )
);

-- Unique index for contact participants per meeting
CREATE UNIQUE INDEX IF NOT EXISTS uq_meeting_participants_contact
  ON public.meeting_participants(meeting_id, contact_id)
  WHERE contact_id IS NOT NULL;

-- 3. Decisions Table
CREATE TABLE IF NOT EXISTS public.decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID,
  meeting_id UUID,
  title TEXT NOT NULL,
  decision TEXT NOT NULL,
  context TEXT,
  reasoning TEXT,
  alternatives_considered TEXT,
  consequences TEXT,
  decided_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,

  -- Unique constraint for composite foreign key references
  CONSTRAINT uq_decisions_id_workspace
    UNIQUE (id, workspace_id),

  -- Composite Foreign Key to workspace_projects
  CONSTRAINT fk_decisions_project
    FOREIGN KEY (project_id, workspace_id)
    REFERENCES public.workspace_projects(id, workspace_id)
    ON DELETE SET NULL,

  -- Composite Foreign Key to meetings
  CONSTRAINT fk_decisions_meeting
    FOREIGN KEY (meeting_id, workspace_id)
    REFERENCES public.meetings(id, workspace_id)
    ON DELETE SET NULL
);

-- 4. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID,
  meeting_id UUID,
  decision_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'blocked', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,

  -- Unique constraint for composite foreign key references
  CONSTRAINT uq_tasks_id_workspace
    UNIQUE (id, workspace_id),

  -- Composite Foreign Key to workspace_projects
  CONSTRAINT fk_tasks_project
    FOREIGN KEY (project_id, workspace_id)
    REFERENCES public.workspace_projects(id, workspace_id)
    ON DELETE SET NULL,

  -- Composite Foreign Key to meetings
  CONSTRAINT fk_tasks_meeting
    FOREIGN KEY (meeting_id, workspace_id)
    REFERENCES public.meetings(id, workspace_id)
    ON DELETE SET NULL,

  -- Composite Foreign Key to decisions
  CONSTRAINT fk_tasks_decision
    FOREIGN KEY (decision_id, workspace_id)
    REFERENCES public.decisions(id, workspace_id)
    ON DELETE SET NULL
);

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_meetings_ws_status_scheduled
  ON public.meetings(workspace_id, status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_meetings_ws_project
  ON public.meetings(workspace_id, project_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_meetings_ws_company
  ON public.meetings(workspace_id, company_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_meetings_ws_archived
  ON public.meetings(workspace_id, archived_at);

CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting
  ON public.meeting_participants(meeting_id);

CREATE INDEX IF NOT EXISTS idx_meeting_participants_contact
  ON public.meeting_participants(contact_id)
  WHERE contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_decisions_ws_decided
  ON public.decisions(workspace_id, decided_at DESC);

CREATE INDEX IF NOT EXISTS idx_decisions_ws_project
  ON public.decisions(workspace_id, project_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_decisions_ws_meeting
  ON public.decisions(workspace_id, meeting_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_decisions_ws_archived
  ON public.decisions(workspace_id, archived_at);

CREATE INDEX IF NOT EXISTS idx_tasks_ws_status_due
  ON public.tasks(workspace_id, status, due_date)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_ws_project
  ON public.tasks(workspace_id, project_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_ws_meeting
  ON public.tasks(workspace_id, meeting_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_ws_decision
  ON public.tasks(workspace_id, decision_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_ws_archived
  ON public.tasks(workspace_id, archived_at);

-- 6. Updated_at Triggers
DROP TRIGGER IF EXISTS update_meetings_updated_at ON public.meetings;
CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_decisions_updated_at ON public.decisions;
CREATE TRIGGER update_decisions_updated_at
  BEFORE UPDATE ON public.decisions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Task Completed_at Synchronization Trigger
CREATE OR REPLACE FUNCTION wv_internal.sync_task_completed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    IF OLD IS NULL OR OLD.status <> 'completed' OR NEW.completed_at IS NULL THEN
      NEW.completed_at := COALESCE(NEW.completed_at, NOW());
    END IF;
  ELSE
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION wv_internal.sync_task_completed_at() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_task_completion_timestamp ON public.tasks;
CREATE TRIGGER trg_task_completion_timestamp
  BEFORE INSERT OR UPDATE OF status, completed_at ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION wv_internal.sync_task_completed_at();

-- 8. Immutability Triggers (Prevent workspace_id tampering across operations records)
CREATE OR REPLACE FUNCTION wv_internal.prevent_operations_item_tampering()
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

REVOKE ALL ON FUNCTION wv_internal.prevent_operations_item_tampering() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_prevent_meetings_tampering ON public.meetings;
CREATE TRIGGER trg_prevent_meetings_tampering
  BEFORE UPDATE OF workspace_id ON public.meetings
  FOR EACH ROW
  EXECUTE FUNCTION wv_internal.prevent_operations_item_tampering();

DROP TRIGGER IF EXISTS trg_prevent_decisions_tampering ON public.decisions;
CREATE TRIGGER trg_prevent_decisions_tampering
  BEFORE UPDATE OF workspace_id ON public.decisions
  FOR EACH ROW
  EXECUTE FUNCTION wv_internal.prevent_operations_item_tampering();

DROP TRIGGER IF EXISTS trg_prevent_tasks_tampering ON public.tasks;
CREATE TRIGGER trg_prevent_tasks_tampering
  BEFORE UPDATE OF workspace_id ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION wv_internal.prevent_operations_item_tampering();

CREATE OR REPLACE FUNCTION wv_internal.prevent_participant_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.workspace_id <> NEW.workspace_id THEN
    RAISE EXCEPTION 'Workspace immutability violation: workspace_id cannot be modified.';
  END IF;
  IF OLD.meeting_id <> NEW.meeting_id THEN
    RAISE EXCEPTION 'Meeting immutability violation: meeting_id cannot be modified.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION wv_internal.prevent_participant_tampering() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_prevent_meeting_participants_tampering ON public.meeting_participants;
CREATE TRIGGER trg_prevent_meeting_participants_tampering
  BEFORE UPDATE OF workspace_id, meeting_id ON public.meeting_participants
  FOR EACH ROW
  EXECUTE FUNCTION wv_internal.prevent_participant_tampering();

-- 9. Row Level Security Policies
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Policies for meetings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meetings' AND policyname = 'meetings_select') THEN
    CREATE POLICY "meetings_select" ON public.meetings
      FOR SELECT TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meetings' AND policyname = 'meetings_insert') THEN
    CREATE POLICY "meetings_insert" ON public.meetings
      FOR INSERT TO authenticated
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meetings' AND policyname = 'meetings_update') THEN
    CREATE POLICY "meetings_update" ON public.meetings
      FOR UPDATE TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id))
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meetings' AND policyname = 'meetings_delete') THEN
    CREATE POLICY "meetings_delete" ON public.meetings
      FOR DELETE TO authenticated
      USING (wv_internal.is_workspace_admin(workspace_id));
  END IF;
END;
$$;

-- Policies for meeting_participants
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meeting_participants' AND policyname = 'meeting_participants_select') THEN
    CREATE POLICY "meeting_participants_select" ON public.meeting_participants
      FOR SELECT TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meeting_participants' AND policyname = 'meeting_participants_insert') THEN
    CREATE POLICY "meeting_participants_insert" ON public.meeting_participants
      FOR INSERT TO authenticated
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meeting_participants' AND policyname = 'meeting_participants_update') THEN
    CREATE POLICY "meeting_participants_update" ON public.meeting_participants
      FOR UPDATE TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id))
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meeting_participants' AND policyname = 'meeting_participants_delete') THEN
    CREATE POLICY "meeting_participants_delete" ON public.meeting_participants
      FOR DELETE TO authenticated
      USING (wv_internal.is_workspace_admin(workspace_id));
  END IF;
END;
$$;

-- Policies for decisions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'decisions' AND policyname = 'decisions_select') THEN
    CREATE POLICY "decisions_select" ON public.decisions
      FOR SELECT TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'decisions' AND policyname = 'decisions_insert') THEN
    CREATE POLICY "decisions_insert" ON public.decisions
      FOR INSERT TO authenticated
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'decisions' AND policyname = 'decisions_update') THEN
    CREATE POLICY "decisions_update" ON public.decisions
      FOR UPDATE TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id))
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'decisions' AND policyname = 'decisions_delete') THEN
    CREATE POLICY "decisions_delete" ON public.decisions
      FOR DELETE TO authenticated
      USING (wv_internal.is_workspace_admin(workspace_id));
  END IF;
END;
$$;

-- Policies for tasks
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'tasks_select') THEN
    CREATE POLICY "tasks_select" ON public.tasks
      FOR SELECT TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'tasks_insert') THEN
    CREATE POLICY "tasks_insert" ON public.tasks
      FOR INSERT TO authenticated
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'tasks_update') THEN
    CREATE POLICY "tasks_update" ON public.tasks
      FOR UPDATE TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id))
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'tasks_delete') THEN
    CREATE POLICY "tasks_delete" ON public.tasks
      FOR DELETE TO authenticated
      USING (wv_internal.is_workspace_admin(workspace_id));
  END IF;
END;
$$;
