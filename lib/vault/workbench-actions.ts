'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  ProjectFolder,
  ProjectDocument,
  ProjectSpreadsheet,
  ProjectFile,
  WorkbenchDirectoryItem,
  WorkbenchStats,
  FolderBreadcrumb,
  SpreadsheetData,
} from './workbench/types'
import {
  WORKBENCH_MAX_FILE_SIZE_BYTES,
  ALLOWED_EXTENSIONS,
  BLOCKED_EXTENSIONS,
  DEFAULT_EMPTY_DOCUMENT,
  DEFAULT_EMPTY_SPREADSHEET,
  SIGNED_URL_EXPIRY_SECONDS,
} from './workbench/constants'
import { extractPlainTextFromTipTap } from './workbench/document-utils'

// Helper to verify user and workspace membership
async function requireWorkspaceAccess(workspaceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: membership } = await (supabase as any)
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) throw new Error('Unauthorized')
  return { supabase, user, role: membership.role }
}

// Helper to verify project belongs to workspace
async function requireProjectAccess(projectId: string, workspaceId: string) {
  const { supabase, user, role } = await requireWorkspaceAccess(workspaceId)

  const { data: project, error } = await (supabase as any)
    .from('workspace_projects')
    .select('id, workspace_id, title')
    .eq('id', projectId)
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (error || !project) throw new Error('Project not found')
  return { supabase, user, role, project }
}

// ==========================================
// 1. WORKBENCH DIRECTORY & STATS
// ==========================================

export async function getProjectWorkbenchStats(
  projectId: string,
  workspaceId: string
): Promise<WorkbenchStats> {
  const { supabase } = await requireProjectAccess(projectId, workspaceId)

  const [foldersRes, docsRes, sheetsRes, filesRes] = await Promise.all([
    (supabase as any)
      .from('project_folders')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('workspace_id', workspaceId)
      .is('archived_at', null),
    (supabase as any)
      .from('project_documents')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('workspace_id', workspaceId)
      .is('archived_at', null),
    (supabase as any)
      .from('project_spreadsheets')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('workspace_id', workspaceId)
      .is('archived_at', null),
    (supabase as any)
      .from('project_files')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('workspace_id', workspaceId)
      .is('archived_at', null),
  ])

  const foldersCount = foldersRes.count || 0
  const documentsCount = docsRes.count || 0
  const spreadsheetsCount = sheetsRes.count || 0
  const filesCount = filesRes.count || 0

  return {
    foldersCount,
    documentsCount,
    spreadsheetsCount,
    filesCount,
    totalCount: foldersCount + documentsCount + spreadsheetsCount + filesCount,
  }
}

export async function getProjectWorkbenchDirectory(
  projectId: string,
  workspaceId: string,
  folderId?: string | null,
  options?: {
    showArchived?: boolean
    search?: string
    typeFilter?: 'all' | 'documents' | 'spreadsheets' | 'files'
  }
): Promise<{
  items: WorkbenchDirectoryItem[]
  currentFolder: ProjectFolder | null
  breadcrumbs: FolderBreadcrumb[]
  stats: WorkbenchStats
}> {
  const { supabase } = await requireProjectAccess(projectId, workspaceId)
  const showArchived = !!options?.showArchived
  const search = options?.search?.trim().toLowerCase() || ''
  const typeFilter = options?.typeFilter || 'all'

  // Resolve current folder if specified
  let currentFolder: ProjectFolder | null = null
  const breadcrumbs: FolderBreadcrumb[] = [{ id: null, name: 'Workbench' }]

  if (folderId) {
    const { data: folder } = await (supabase as any)
      .from('project_folders')
      .select('*')
      .eq('id', folderId)
      .eq('project_id', projectId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    if (folder) {
      currentFolder = folder as ProjectFolder

      // Traverse breadcrumbs upward
      const chain: FolderBreadcrumb[] = []
      let parentId = folder.parent_folder_id
      chain.unshift({ id: folder.id, name: folder.name })

      while (parentId) {
        const { data: parent } = await (supabase as any)
          .from('project_folders')
          .select('id, name, parent_folder_id')
          .eq('id', parentId)
          .eq('project_id', projectId)
          .maybeSingle()
        if (!parent) break
        chain.unshift({ id: parent.id, name: parent.name })
        parentId = parent.parent_folder_id
      }
      breadcrumbs.push(...chain)
    }
  }

  // Fetch data in parallel
  const isSearching = search.length > 0

  // 1. Folders query
  let folderQuery = (supabase as any)
    .from('project_folders')
    .select('*')
    .eq('project_id', projectId)
    .eq('workspace_id', workspaceId)
    .order('name', { ascending: true })

  if (showArchived) {
    folderQuery = folderQuery.not('archived_at', 'is', null)
  } else {
    folderQuery = folderQuery.is('archived_at', null)
    if (!isSearching) {
      if (folderId) {
        folderQuery = folderQuery.eq('parent_folder_id', folderId)
      } else {
        folderQuery = folderQuery.is('parent_folder_id', null)
      }
    }
  }

  // 2. Documents query
  let docQuery = (supabase as any)
    .from('project_documents')
    .select('id, title, folder_id, plain_text, created_at, updated_at, archived_at')
    .eq('project_id', projectId)
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })

  if (showArchived) {
    docQuery = docQuery.not('archived_at', 'is', null)
  } else {
    docQuery = docQuery.is('archived_at', null)
    if (!isSearching) {
      if (folderId) {
        docQuery = docQuery.eq('folder_id', folderId)
      } else {
        docQuery = docQuery.is('folder_id', null)
      }
    }
  }

  // 3. Spreadsheets query
  let sheetQuery = (supabase as any)
    .from('project_spreadsheets')
    .select('id, title, folder_id, created_at, updated_at, archived_at')
    .eq('project_id', projectId)
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })

  if (showArchived) {
    sheetQuery = sheetQuery.not('archived_at', 'is', null)
  } else {
    sheetQuery = sheetQuery.is('archived_at', null)
    if (!isSearching) {
      if (folderId) {
        sheetQuery = sheetQuery.eq('folder_id', folderId)
      } else {
        sheetQuery = sheetQuery.is('folder_id', null)
      }
    }
  }

  // 4. Files query
  let fileQuery = (supabase as any)
    .from('project_files')
    .select('id, display_name, original_filename, folder_id, storage_path, mime_type, size_bytes, file_extension, created_at, updated_at, archived_at')
    .eq('project_id', projectId)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (showArchived) {
    fileQuery = fileQuery.not('archived_at', 'is', null)
  } else {
    fileQuery = fileQuery.is('archived_at', null)
    if (!isSearching) {
      if (folderId) {
        fileQuery = fileQuery.eq('folder_id', folderId)
      } else {
        fileQuery = fileQuery.is('folder_id', null)
      }
    }
  }

  const [foldersRes, docsRes, sheetsRes, filesRes, stats] = await Promise.all([
    folderQuery,
    typeFilter === 'all' || typeFilter === 'documents' ? docQuery : Promise.resolve({ data: [] }),
    typeFilter === 'all' || typeFilter === 'spreadsheets' ? sheetQuery : Promise.resolve({ data: [] }),
    typeFilter === 'all' || typeFilter === 'files' ? fileQuery : Promise.resolve({ data: [] }),
    getProjectWorkbenchStats(projectId, workspaceId),
  ])

  const items: WorkbenchDirectoryItem[] = []

  // Add folders (folders remain visible as context unless searching/filtering specifies otherwise)
  if (typeFilter === 'all' && foldersRes.data) {
    for (const f of foldersRes.data) {
      if (isSearching && !f.name.toLowerCase().includes(search)) continue
      items.push({
        id: f.id,
        type: 'folder',
        name: f.name,
        folderId: f.parent_folder_id,
        createdAt: f.created_at,
        updatedAt: f.updated_at,
        archivedAt: f.archived_at,
      })
    }
  }

  // Add documents
  if (docsRes.data) {
    for (const d of docsRes.data) {
      if (
        isSearching &&
        !d.title.toLowerCase().includes(search) &&
        !d.plain_text?.toLowerCase().includes(search)
      ) {
        continue
      }
      items.push({
        id: d.id,
        type: 'document',
        name: d.title,
        folderId: d.folder_id,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
        archivedAt: d.archived_at,
        plainTextSnippet: d.plain_text ? d.plain_text.slice(0, 140) : '',
      })
    }
  }

  // Add spreadsheets
  if (sheetsRes.data) {
    for (const s of sheetsRes.data) {
      if (isSearching && !s.title.toLowerCase().includes(search)) continue
      items.push({
        id: s.id,
        type: 'spreadsheet',
        name: s.title,
        folderId: s.folder_id,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
        archivedAt: s.archived_at,
      })
    }
  }

  // Add files
  if (filesRes.data) {
    for (const fl of filesRes.data) {
      if (
        isSearching &&
        !fl.display_name.toLowerCase().includes(search) &&
        !fl.original_filename.toLowerCase().includes(search)
      ) {
        continue
      }
      items.push({
        id: fl.id,
        type: 'file',
        name: fl.display_name,
        folderId: fl.folder_id,
        createdAt: fl.created_at,
        updatedAt: fl.updated_at,
        archivedAt: fl.archived_at,
        sizeBytes: fl.size_bytes,
        mimeType: fl.mime_type,
        storagePath: fl.storage_path,
      })
    }
  }

  return {
    items,
    currentFolder,
    breadcrumbs,
    stats,
  }
}

export async function getProjectFolders(
  projectId: string,
  workspaceId: string
): Promise<ProjectFolder[]> {
  const { supabase } = await requireProjectAccess(projectId, workspaceId)
  const { data, error } = await (supabase as any)
    .from('project_folders')
    .select('*')
    .eq('project_id', projectId)
    .eq('workspace_id', workspaceId)
    .is('archived_at', null)
    .order('name', { ascending: true })

  if (error || !data) return []
  return data as ProjectFolder[]
}

// ==========================================
// 2. FOLDERS ACTIONS
// ==========================================

export async function createProjectFolder(
  projectId: string,
  workspaceId: string,
  data: { name: string; parentFolderId?: string | null }
): Promise<ProjectFolder> {
  const { supabase, user } = await requireProjectAccess(projectId, workspaceId)
  const trimmedName = data.name.trim()
  if (!trimmedName) throw new Error('Folder name is required')

  const { data: created, error } = await (supabase as any)
    .from('project_folders')
    .insert({
      workspace_id: workspaceId,
      project_id: projectId,
      parent_folder_id: data.parentFolderId || null,
      name: trimmedName,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('A folder with this name already exists in this location')
    }
    throw new Error(error.message || 'Failed to create folder')
  }

  revalidatePath(`/vault/projects/${projectId}/workbench`)
  return created as ProjectFolder
}

export async function updateProjectFolder(
  folderId: string,
  projectId: string,
  workspaceId: string,
  data: { name: string }
): Promise<ProjectFolder> {
  const { supabase } = await requireProjectAccess(projectId, workspaceId)
  const trimmedName = data.name.trim()
  if (!trimmedName) throw new Error('Folder name is required')

  const { data: updated, error } = await (supabase as any)
    .from('project_folders')
    .update({ name: trimmedName })
    .eq('id', folderId)
    .eq('project_id', projectId)
    .eq('workspace_id', workspaceId)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('A folder with this name already exists in this location')
    }
    throw new Error(error.message || 'Failed to rename folder')
  }

  revalidatePath(`/vault/projects/${projectId}/workbench`)
  return updated as ProjectFolder
}

export async function moveProjectFolder(
  folderId: string,
  newParentFolderId: string | null,
  projectId: string,
  workspaceId: string
): Promise<void> {
  const { supabase } = await requireProjectAccess(projectId, workspaceId)

  const { error } = await (supabase as any)
    .from('project_folders')
    .update({ parent_folder_id: newParentFolderId })
    .eq('id', folderId)
    .eq('project_id', projectId)
    .eq('workspace_id', workspaceId)

  if (error) {
    throw new Error(error.message || 'Failed to move folder')
  }

  revalidatePath(`/vault/projects/${projectId}/workbench`)
}

export async function archiveProjectFolder(
  folderId: string,
  projectId: string,
  workspaceId: string
): Promise<void> {
  const { supabase } = await requireProjectAccess(projectId, workspaceId)

  const { error } = await (supabase as any)
    .from('project_folders')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', folderId)
    .eq('project_id', projectId)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message || 'Failed to archive folder')
  revalidatePath(`/vault/projects/${projectId}/workbench`)
}

export async function restoreProjectFolder(
  folderId: string,
  projectId: string,
  workspaceId: string
): Promise<void> {
  const { supabase } = await requireProjectAccess(projectId, workspaceId)

  const { error } = await (supabase as any)
    .from('project_folders')
    .update({ archived_at: null })
    .eq('id', folderId)
    .eq('project_id', projectId)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message || 'Failed to restore folder')
  revalidatePath(`/vault/projects/${projectId}/workbench`)
}

// ==========================================
// 3. DOCUMENTS ACTIONS
// ==========================================

export async function getProjectDocument(
  documentId: string,
  projectId: string,
  workspaceId: string
): Promise<ProjectDocument | null> {
  const { supabase } = await requireProjectAccess(projectId, workspaceId)

  const { data, error } = await (supabase as any)
    .from('project_documents')
    .select('*')
    .eq('id', documentId)
    .eq('project_id', projectId)
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (error || !data) return null
  return data as ProjectDocument
}

export async function createProjectDocument(
  projectId: string,
  workspaceId: string,
  data: { title: string; folderId?: string | null; content?: any }
): Promise<ProjectDocument> {
  const { supabase, user } = await requireProjectAccess(projectId, workspaceId)
  const trimmedTitle = data.title.trim() || 'Untitled Document'
  const initialContent = data.content || DEFAULT_EMPTY_DOCUMENT
  const plainText = extractPlainTextFromTipTap(initialContent)

  const { data: created, error } = await (supabase as any)
    .from('project_documents')
    .insert({
      workspace_id: workspaceId,
      project_id: projectId,
      folder_id: data.folderId || null,
      title: trimmedTitle,
      content: initialContent,
      content_format: 'tiptap_json',
      plain_text: plainText,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) throw new Error(error.message || 'Failed to create document')

  revalidatePath(`/vault/projects/${projectId}/workbench`)
  return created as ProjectDocument
}

export async function updateProjectDocument(
  documentId: string,
  projectId: string,
  workspaceId: string,
  data: { title?: string; content?: any }
): Promise<ProjectDocument> {
  const { supabase } = await requireProjectAccess(projectId, workspaceId)

  const updatePayload: any = {}
  if (data.title !== undefined) {
    updatePayload.title = data.title.trim() || 'Untitled Document'
  }
  if (data.content !== undefined) {
    updatePayload.content = data.content
    updatePayload.plain_text = extractPlainTextFromTipTap(data.content)
  }

  const { data: updated, error } = await (supabase as any)
    .from('project_documents')
    .update(updatePayload)
    .eq('id', documentId)
    .eq('project_id', projectId)
    .eq('workspace_id', workspaceId)
    .select()
    .single()

  if (error) throw new Error(error.message || 'Failed to update document')

  revalidatePath(`/vault/projects/${projectId}/documents/${documentId}`)
  revalidatePath(`/vault/projects/${projectId}/workbench`)
  return updated as ProjectDocument
}

export async function moveProjectDocument(
  documentId: string,
  newFolderId: string | null,
  projectId: string,
  workspaceId: string
): Promise<void> {
  const { supabase } = await requireProjectAccess(projectId, workspaceId)

  const { error } = await (supabase as any)
    .from('project_documents')
    .update({ folder_id: newFolderId })
    .eq('id', documentId)
    .eq('project_id', projectId)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message || 'Failed to move document')
  revalidatePath(`/vault/projects/${projectId}/workbench`)
}

export async function archiveProjectDocument(
  documentId: string,
  projectId: string,
  workspaceId: string
): Promise<void> {
  const { supabase } = await requireProjectAccess(projectId, workspaceId)

  const { error } = await (supabase as any)
    .from('project_documents')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', documentId)
    .eq('project_id', projectId)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message || 'Failed to archive document')
  revalidatePath(`/vault/projects/${projectId}/workbench`)
}

export async function restoreProjectDocument(
  documentId: string,
  projectId: string,
  workspaceId: string
): Promise<void> {
  const { supabase } = await requireProjectAccess(projectId, workspaceId)

  const { error } = await (supabase as any)
    .from('project_documents')
    .update({ archived_at: null })
    .eq('id', documentId)
    .eq('project_id', projectId)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message || 'Failed to restore document')
  revalidatePath(`/vault/projects/${projectId}/workbench`)
}

// ==========================================
// 4. SPREADSHEETS ACTIONS
// ==========================================

export async function getProjectSpreadsheet(
  spreadsheetId: string,
  projectId: string,
  workspaceId: string
): Promise<ProjectSpreadsheet | null> {
  const { supabase } = await requireProjectAccess(projectId, workspaceId)

  const { data, error } = await (supabase as any)
    .from('project_spreadsheets')
    .select('*')
    .eq('id', spreadsheetId)
    .eq('project_id', projectId)
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (error || !data) return null
  return data as ProjectSpreadsheet
}

export async function createProjectSpreadsheet(
  projectId: string,
  workspaceId: string,
  data: { title: string; folderId?: string | null; data?: SpreadsheetData }
): Promise<ProjectSpreadsheet> {
  const { supabase, user } = await requireProjectAccess(projectId, workspaceId)
  const trimmedTitle = data.title.trim() || 'Untitled Spreadsheet'
  const initialData = data.data || DEFAULT_EMPTY_SPREADSHEET

  const { data: created, error } = await (supabase as any)
    .from('project_spreadsheets')
    .insert({
      workspace_id: workspaceId,
      project_id: projectId,
      folder_id: data.folderId || null,
      title: trimmedTitle,
      data: initialData,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) throw new Error(error.message || 'Failed to create spreadsheet')

  revalidatePath(`/vault/projects/${projectId}/workbench`)
  return created as ProjectSpreadsheet
}

export async function updateProjectSpreadsheet(
  spreadsheetId: string,
  projectId: string,
  workspaceId: string,
  data: { title?: string; data?: SpreadsheetData }
): Promise<ProjectSpreadsheet> {
  const { supabase } = await requireProjectAccess(projectId, workspaceId)

  const updatePayload: any = {}
  if (data.title !== undefined) {
    updatePayload.title = data.title.trim() || 'Untitled Spreadsheet'
  }
  if (data.data !== undefined) {
    updatePayload.data = data.data
  }

  const { data: updated, error } = await (supabase as any)
    .from('project_spreadsheets')
    .update(updatePayload)
    .eq('id', spreadsheetId)
    .eq('project_id', projectId)
    .eq('workspace_id', workspaceId)
    .select()
    .single()

  if (error) throw new Error(error.message || 'Failed to update spreadsheet')

  revalidatePath(`/vault/projects/${projectId}/spreadsheets/${spreadsheetId}`)
  revalidatePath(`/vault/projects/${projectId}/workbench`)
  return updated as ProjectSpreadsheet
}

export async function moveProjectSpreadsheet(
  spreadsheetId: string,
  newFolderId: string | null,
  projectId: string,
  workspaceId: string
): Promise<void> {
  const { supabase } = await requireProjectAccess(projectId, workspaceId)

  const { error } = await (supabase as any)
    .from('project_spreadsheets')
    .update({ folder_id: newFolderId })
    .eq('id', spreadsheetId)
    .eq('project_id', projectId)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message || 'Failed to move spreadsheet')
  revalidatePath(`/vault/projects/${projectId}/workbench`)
}

export async function archiveProjectSpreadsheet(
  spreadsheetId: string,
  projectId: string,
  workspaceId: string
): Promise<void> {
  const { supabase } = await requireProjectAccess(projectId, workspaceId)

  const { error } = await (supabase as any)
    .from('project_spreadsheets')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', spreadsheetId)
    .eq('project_id', projectId)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message || 'Failed to archive spreadsheet')
  revalidatePath(`/vault/projects/${projectId}/workbench`)
}

export async function restoreProjectSpreadsheet(
  spreadsheetId: string,
  projectId: string,
  workspaceId: string
): Promise<void> {
  const { supabase } = await requireProjectAccess(projectId, workspaceId)

  const { error } = await (supabase as any)
    .from('project_spreadsheets')
    .update({ archived_at: null })
    .eq('id', spreadsheetId)
    .eq('project_id', projectId)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message || 'Failed to restore spreadsheet')
  revalidatePath(`/vault/projects/${projectId}/workbench`)
}

// ==========================================
// 5. PROJECT FILES ACTIONS
// ==========================================

export async function getProjectFile(
  fileId: string,
  projectId: string,
  workspaceId: string
): Promise<ProjectFile | null> {
  const { supabase } = await requireProjectAccess(projectId, workspaceId)

  const { data, error } = await (supabase as any)
    .from('project_files')
    .select('*')
    .eq('id', fileId)
    .eq('project_id', projectId)
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (error || !data) return null
  return data as ProjectFile
}

export async function prepareProjectFileUpload(
  projectId: string,
  workspaceId: string,
  fileInfo: {
    originalFilename: string
    mimeType: string
    sizeBytes: number
  }
): Promise<{ fileId: string; storagePath: string; sanitizedFilename: string }> {
  await requireProjectAccess(projectId, workspaceId)

  // 1. Validate file size
  if (fileInfo.sizeBytes > WORKBENCH_MAX_FILE_SIZE_BYTES) {
    throw new Error(`File size exceeds maximum limit of ${WORKBENCH_MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`)
  }

  // 2. Validate file extension
  const ext = fileInfo.originalFilename.split('.').pop()?.toLowerCase() || ''
  if ((BLOCKED_EXTENSIONS as readonly string[]).includes(ext)) {
    throw new Error(`File type .${ext} is blocked for security reasons`)
  }
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
    throw new Error(`File type .${ext} is not supported`)
  }

  // 3. Generate file identity and storage path
  const fileId = crypto.randomUUID()
  const sanitized = fileInfo.originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `workspaces/${workspaceId}/projects/${projectId}/${fileId}/${sanitized}`

  return {
    fileId,
    storagePath,
    sanitizedFilename: sanitized,
  }
}

export async function createProjectFileRecord(
  projectId: string,
  workspaceId: string,
  data: {
    fileId: string
    folderId?: string | null
    displayName: string
    originalFilename: string
    storagePath: string
    mimeType: string
    sizeBytes: number
    fileExtension: string
  }
): Promise<ProjectFile> {
  const { supabase, user } = await requireProjectAccess(projectId, workspaceId)

  const { data: created, error } = await (supabase as any)
    .from('project_files')
    .insert({
      id: data.fileId,
      workspace_id: workspaceId,
      project_id: projectId,
      folder_id: data.folderId || null,
      display_name: data.displayName.trim() || data.originalFilename,
      original_filename: data.originalFilename,
      storage_path: data.storagePath,
      mime_type: data.mimeType,
      size_bytes: data.sizeBytes,
      file_extension: data.fileExtension.toLowerCase(),
      created_by: user.id,
    })
    .select()
    .single()

  if (error) throw new Error(error.message || 'Failed to record file metadata')

  revalidatePath(`/vault/projects/${projectId}/workbench`)
  return created as ProjectFile
}

export async function updateProjectFile(
  fileId: string,
  projectId: string,
  workspaceId: string,
  data: { displayName: string }
): Promise<ProjectFile> {
  const { supabase } = await requireProjectAccess(projectId, workspaceId)
  const trimmedName = data.displayName.trim()
  if (!trimmedName) throw new Error('Display name is required')

  const { data: updated, error } = await (supabase as any)
    .from('project_files')
    .update({ display_name: trimmedName })
    .eq('id', fileId)
    .eq('project_id', projectId)
    .eq('workspace_id', workspaceId)
    .select()
    .single()

  if (error) throw new Error(error.message || 'Failed to update file')

  revalidatePath(`/vault/projects/${projectId}/workbench`)
  return updated as ProjectFile
}

export async function moveProjectFile(
  fileId: string,
  newFolderId: string | null,
  projectId: string,
  workspaceId: string
): Promise<void> {
  const { supabase } = await requireProjectAccess(projectId, workspaceId)

  const { error } = await (supabase as any)
    .from('project_files')
    .update({ folder_id: newFolderId })
    .eq('id', fileId)
    .eq('project_id', projectId)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message || 'Failed to move file')
  revalidatePath(`/vault/projects/${projectId}/workbench`)
}

export async function archiveProjectFile(
  fileId: string,
  projectId: string,
  workspaceId: string
): Promise<void> {
  const { supabase } = await requireProjectAccess(projectId, workspaceId)

  const { error } = await (supabase as any)
    .from('project_files')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', fileId)
    .eq('project_id', projectId)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message || 'Failed to archive file')
  revalidatePath(`/vault/projects/${projectId}/workbench`)
}

export async function restoreProjectFile(
  fileId: string,
  projectId: string,
  workspaceId: string
): Promise<void> {
  const { supabase } = await requireProjectAccess(projectId, workspaceId)

  const { error } = await (supabase as any)
    .from('project_files')
    .update({ archived_at: null })
    .eq('id', fileId)
    .eq('project_id', projectId)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message || 'Failed to restore file')
  revalidatePath(`/vault/projects/${projectId}/workbench`)
}

export async function getProjectFileDownloadUrl(
  fileId: string,
  projectId: string,
  workspaceId: string
): Promise<{ signedUrl: string; file: ProjectFile }> {
  const { supabase } = await requireProjectAccess(projectId, workspaceId)

  const { data: file, error: fileError } = await (supabase as any)
    .from('project_files')
    .select('*')
    .eq('id', fileId)
    .eq('project_id', projectId)
    .eq('workspace_id', workspaceId)
    .single()

  if (fileError || !file) throw new Error('File not found')

  const { data: signedData, error: storageError } = await supabase.storage
    .from('vault_files')
    .createSignedUrl(file.storage_path, SIGNED_URL_EXPIRY_SECONDS)

  if (storageError || !signedData?.signedUrl) {
    throw new Error(storageError?.message || 'Failed to generate download URL')
  }

  return {
    signedUrl: signedData.signedUrl,
    file: file as ProjectFile,
  }
}
