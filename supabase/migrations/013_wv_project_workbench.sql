-- Migration: 013_wv_project_workbench.sql
-- Description: Creates Project Workbench tables (project_folders, project_documents,
--              project_spreadsheets, project_files), composite foreign keys,
--              cycle-prevention trigger, immutability triggers, partial unique indexes,
--              storage bucket provisioning, and workspace-scoped RLS policies.

-- 1. Ensure composite unique constraints on parent tables for composite foreign key references
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_workspace_projects_id_workspace'
  ) THEN
    ALTER TABLE public.workspace_projects
      ADD CONSTRAINT uq_workspace_projects_id_workspace UNIQUE (id, workspace_id);
  END IF;
END;
$$;

-- 2. Project Folders Table
CREATE TABLE IF NOT EXISTS public.project_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  parent_folder_id UUID,
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,

  -- Composite Foreign Key to workspace_projects (guarantees workspace/project consistency)
  CONSTRAINT fk_project_folders_project
    FOREIGN KEY (project_id, workspace_id)
    REFERENCES public.workspace_projects(id, workspace_id)
    ON DELETE CASCADE,

  -- Composite Unique Constraint enabling composite FK references from child folders and artifacts
  CONSTRAINT uq_project_folders_id_ws_project
    UNIQUE (id, workspace_id, project_id),

  -- Composite Self-Referencing Foreign Key for nested folder hierarchy
  CONSTRAINT fk_project_folders_parent
    FOREIGN KEY (parent_folder_id, workspace_id, project_id)
    REFERENCES public.project_folders(id, workspace_id, project_id)
    ON DELETE CASCADE
);

-- 3. Partial Unique Indexes for Folder Names (Case-Insensitive within same parent location)
CREATE UNIQUE INDEX IF NOT EXISTS uq_project_folders_root_name
  ON public.project_folders(project_id, LOWER(name))
  WHERE parent_folder_id IS NULL AND archived_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_project_folders_sub_name
  ON public.project_folders(project_id, parent_folder_id, LOWER(name))
  WHERE parent_folder_id IS NOT NULL AND archived_at IS NULL;

-- 4. Project Documents Table
CREATE TABLE IF NOT EXISTS public.project_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  folder_id UUID,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{"type":"doc","content":[]}'::jsonb,
  content_format TEXT NOT NULL DEFAULT 'tiptap_json',
  plain_text TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,

  -- Composite Foreign Key to workspace_projects
  CONSTRAINT fk_project_documents_project
    FOREIGN KEY (project_id, workspace_id)
    REFERENCES public.workspace_projects(id, workspace_id)
    ON DELETE CASCADE,

  -- Composite Foreign Key to project_folders (guarantees folder belongs to same workspace & project)
  CONSTRAINT fk_project_documents_folder
    FOREIGN KEY (folder_id, workspace_id, project_id)
    REFERENCES public.project_folders(id, workspace_id, project_id)
    ON DELETE SET NULL
);

-- 5. Project Spreadsheets Table
CREATE TABLE IF NOT EXISTS public.project_spreadsheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  folder_id UUID,
  title TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{"version":1,"activeSheetId":"sheet-1","sheets":[{"id":"sheet-1","name":"Sheet1","rowCount":50,"columnCount":20,"columnWidths":{},"cells":{}}]}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,

  -- Composite Foreign Key to workspace_projects
  CONSTRAINT fk_project_spreadsheets_project
    FOREIGN KEY (project_id, workspace_id)
    REFERENCES public.workspace_projects(id, workspace_id)
    ON DELETE CASCADE,

  -- Composite Foreign Key to project_folders
  CONSTRAINT fk_project_spreadsheets_folder
    FOREIGN KEY (folder_id, workspace_id, project_id)
    REFERENCES public.project_folders(id, workspace_id, project_id)
    ON DELETE SET NULL
);

-- 6. Project Files Table
CREATE TABLE IF NOT EXISTS public.project_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  folder_id UUID,
  display_name TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  file_extension TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,

  -- Composite Foreign Key to workspace_projects
  CONSTRAINT fk_project_files_project
    FOREIGN KEY (project_id, workspace_id)
    REFERENCES public.workspace_projects(id, workspace_id)
    ON DELETE CASCADE,

  -- Composite Foreign Key to project_folders
  CONSTRAINT fk_project_files_folder
    FOREIGN KEY (folder_id, workspace_id, project_id)
    REFERENCES public.project_folders(id, workspace_id, project_id)
    ON DELETE SET NULL
);

-- 7. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_project_folders_lookup
  ON public.project_folders(workspace_id, project_id, parent_folder_id, archived_at);

CREATE INDEX IF NOT EXISTS idx_project_documents_lookup
  ON public.project_documents(workspace_id, project_id, folder_id, archived_at);
CREATE INDEX IF NOT EXISTS idx_project_documents_title
  ON public.project_documents(workspace_id, project_id, title);

CREATE INDEX IF NOT EXISTS idx_project_spreadsheets_lookup
  ON public.project_spreadsheets(workspace_id, project_id, folder_id, archived_at);
CREATE INDEX IF NOT EXISTS idx_project_spreadsheets_title
  ON public.project_spreadsheets(workspace_id, project_id, title);

CREATE INDEX IF NOT EXISTS idx_project_files_lookup
  ON public.project_files(workspace_id, project_id, folder_id, archived_at);
CREATE INDEX IF NOT EXISTS idx_project_files_name
  ON public.project_files(workspace_id, project_id, display_name);

-- 8. Updated_at Triggers
DROP TRIGGER IF EXISTS update_project_folders_updated_at ON public.project_folders;
CREATE TRIGGER update_project_folders_updated_at
  BEFORE UPDATE ON public.project_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_documents_updated_at ON public.project_documents;
CREATE TRIGGER update_project_documents_updated_at
  BEFORE UPDATE ON public.project_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_spreadsheets_updated_at ON public.project_spreadsheets;
CREATE TRIGGER update_project_spreadsheets_updated_at
  BEFORE UPDATE ON public.project_spreadsheets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_files_updated_at ON public.project_files;
CREATE TRIGGER update_project_files_updated_at
  BEFORE UPDATE ON public.project_files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 9. Folder Hierarchy Cycle Prevention Trigger
CREATE OR REPLACE FUNCTION wv_internal.check_project_folder_hierarchy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_curr_parent UUID;
BEGIN
  IF NEW.parent_folder_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 1. Folder cannot be its own parent
  IF NEW.parent_folder_id = NEW.id THEN
    RAISE EXCEPTION 'Folder hierarchy violation: A folder cannot be its own parent.';
  END IF;

  -- 2. Traverse up the parent chain to detect any cycles
  v_curr_parent := NEW.parent_folder_id;
  WHILE v_curr_parent IS NOT NULL LOOP
    IF v_curr_parent = NEW.id THEN
      RAISE EXCEPTION 'Folder hierarchy cycle detected: Cannot move a folder into one of its descendants.';
    END IF;
    SELECT parent_folder_id INTO v_curr_parent
    FROM public.project_folders
    WHERE id = v_curr_parent AND project_id = NEW.project_id;
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION wv_internal.check_project_folder_hierarchy() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_check_project_folder_hierarchy ON public.project_folders;
CREATE TRIGGER trg_check_project_folder_hierarchy
  BEFORE INSERT OR UPDATE OF parent_folder_id ON public.project_folders
  FOR EACH ROW
  EXECUTE FUNCTION wv_internal.check_project_folder_hierarchy();

-- 10. Immutability Triggers (Prevent workspace_id and project_id tampering)
CREATE OR REPLACE FUNCTION wv_internal.prevent_workbench_item_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.workspace_id <> NEW.workspace_id THEN
    RAISE EXCEPTION 'Workspace immutability violation: workspace_id cannot be modified.';
  END IF;
  IF OLD.project_id <> NEW.project_id THEN
    RAISE EXCEPTION 'Project immutability violation: project_id cannot be modified.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION wv_internal.prevent_workbench_item_tampering() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_prevent_project_folders_tampering ON public.project_folders;
CREATE TRIGGER trg_prevent_project_folders_tampering
  BEFORE UPDATE OF workspace_id, project_id ON public.project_folders
  FOR EACH ROW
  EXECUTE FUNCTION wv_internal.prevent_workbench_item_tampering();

DROP TRIGGER IF EXISTS trg_prevent_project_documents_tampering ON public.project_documents;
CREATE TRIGGER trg_prevent_project_documents_tampering
  BEFORE UPDATE OF workspace_id, project_id ON public.project_documents
  FOR EACH ROW
  EXECUTE FUNCTION wv_internal.prevent_workbench_item_tampering();

DROP TRIGGER IF EXISTS trg_prevent_project_spreadsheets_tampering ON public.project_spreadsheets;
CREATE TRIGGER trg_prevent_project_spreadsheets_tampering
  BEFORE UPDATE OF workspace_id, project_id ON public.project_spreadsheets
  FOR EACH ROW
  EXECUTE FUNCTION wv_internal.prevent_workbench_item_tampering();

DROP TRIGGER IF EXISTS trg_prevent_project_files_tampering ON public.project_files;
CREATE TRIGGER trg_prevent_project_files_tampering
  BEFORE UPDATE OF workspace_id, project_id ON public.project_files
  FOR EACH ROW
  EXECUTE FUNCTION wv_internal.prevent_workbench_item_tampering();

-- 11. Row Level Security (RLS)
ALTER TABLE public.project_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_spreadsheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

-- Policies for project_folders
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_folders' AND policyname = 'project_folders_select') THEN
    CREATE POLICY "project_folders_select" ON public.project_folders
      FOR SELECT TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_folders' AND policyname = 'project_folders_insert') THEN
    CREATE POLICY "project_folders_insert" ON public.project_folders
      FOR INSERT TO authenticated
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_folders' AND policyname = 'project_folders_update') THEN
    CREATE POLICY "project_folders_update" ON public.project_folders
      FOR UPDATE TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id))
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_folders' AND policyname = 'project_folders_delete') THEN
    CREATE POLICY "project_folders_delete" ON public.project_folders
      FOR DELETE TO authenticated
      USING (wv_internal.is_workspace_admin(workspace_id));
  END IF;
END;
$$;

-- Policies for project_documents
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_documents' AND policyname = 'project_documents_select') THEN
    CREATE POLICY "project_documents_select" ON public.project_documents
      FOR SELECT TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_documents' AND policyname = 'project_documents_insert') THEN
    CREATE POLICY "project_documents_insert" ON public.project_documents
      FOR INSERT TO authenticated
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_documents' AND policyname = 'project_documents_update') THEN
    CREATE POLICY "project_documents_update" ON public.project_documents
      FOR UPDATE TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id))
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_documents' AND policyname = 'project_documents_delete') THEN
    CREATE POLICY "project_documents_delete" ON public.project_documents
      FOR DELETE TO authenticated
      USING (wv_internal.is_workspace_admin(workspace_id));
  END IF;
END;
$$;

-- Policies for project_spreadsheets
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_spreadsheets' AND policyname = 'project_spreadsheets_select') THEN
    CREATE POLICY "project_spreadsheets_select" ON public.project_spreadsheets
      FOR SELECT TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_spreadsheets' AND policyname = 'project_spreadsheets_insert') THEN
    CREATE POLICY "project_spreadsheets_insert" ON public.project_spreadsheets
      FOR INSERT TO authenticated
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_spreadsheets' AND policyname = 'project_spreadsheets_update') THEN
    CREATE POLICY "project_spreadsheets_update" ON public.project_spreadsheets
      FOR UPDATE TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id))
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_spreadsheets' AND policyname = 'project_spreadsheets_delete') THEN
    CREATE POLICY "project_spreadsheets_delete" ON public.project_spreadsheets
      FOR DELETE TO authenticated
      USING (wv_internal.is_workspace_admin(workspace_id));
  END IF;
END;
$$;

-- Policies for project_files
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_files' AND policyname = 'project_files_select') THEN
    CREATE POLICY "project_files_select" ON public.project_files
      FOR SELECT TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_files' AND policyname = 'project_files_insert') THEN
    CREATE POLICY "project_files_insert" ON public.project_files
      FOR INSERT TO authenticated
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_files' AND policyname = 'project_files_update') THEN
    CREATE POLICY "project_files_update" ON public.project_files
      FOR UPDATE TO authenticated
      USING (wv_internal.is_workspace_member(workspace_id))
      WITH CHECK (wv_internal.is_workspace_member(workspace_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_files' AND policyname = 'project_files_delete') THEN
    CREATE POLICY "project_files_delete" ON public.project_files
      FOR DELETE TO authenticated
      USING (wv_internal.is_workspace_admin(workspace_id));
  END IF;
END;
$$;

-- 12. Storage Bucket Provisioning & Storage Policies
-- Create private 'vault_files' bucket if not already present
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('vault_files', 'vault_files', false, 26214400)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for 'vault_files' bucket
-- Storage path structure: workspaces/{workspace_id}/projects/{project_id}/{file_id}/{filename}
DO $$
BEGIN
  -- Storage SELECT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'vault_files_member_select'
  ) THEN
    CREATE POLICY "vault_files_member_select" ON storage.objects
      FOR SELECT TO authenticated
      USING (
        bucket_id = 'vault_files'
        AND (
          CASE
            WHEN name LIKE 'workspaces/%' AND length(split_part(name, '/', 2)) = 36
            THEN wv_internal.is_workspace_member(split_part(name, '/', 2)::uuid)
            ELSE false
          END
        )
      );
  END IF;

  -- Storage INSERT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'vault_files_member_insert'
  ) THEN
    CREATE POLICY "vault_files_member_insert" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'vault_files'
        AND (
          CASE
            WHEN name LIKE 'workspaces/%' AND length(split_part(name, '/', 2)) = 36
            THEN wv_internal.is_workspace_member(split_part(name, '/', 2)::uuid)
            ELSE false
          END
        )
      );
  END IF;

  -- Storage UPDATE policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'vault_files_member_update'
  ) THEN
    CREATE POLICY "vault_files_member_update" ON storage.objects
      FOR UPDATE TO authenticated
      USING (
        bucket_id = 'vault_files'
        AND (
          CASE
            WHEN name LIKE 'workspaces/%' AND length(split_part(name, '/', 2)) = 36
            THEN wv_internal.is_workspace_member(split_part(name, '/', 2)::uuid)
            ELSE false
          END
        )
      )
      WITH CHECK (
        bucket_id = 'vault_files'
        AND (
          CASE
            WHEN name LIKE 'workspaces/%' AND length(split_part(name, '/', 2)) = 36
            THEN wv_internal.is_workspace_member(split_part(name, '/', 2)::uuid)
            ELSE false
          END
        )
      );
  END IF;

  -- Storage DELETE policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'vault_files_admin_delete'
  ) THEN
    CREATE POLICY "vault_files_admin_delete" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'vault_files'
        AND (
          CASE
            WHEN name LIKE 'workspaces/%' AND length(split_part(name, '/', 2)) = 36
            THEN wv_internal.is_workspace_admin(split_part(name, '/', 2)::uuid)
            ELSE false
          END
        )
      );
  END IF;
END;
$$;
