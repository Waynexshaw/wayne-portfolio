// lib/vault/workbench/types.ts

export type WorkbenchItemType = 'folder' | 'document' | 'spreadsheet' | 'file'

export interface ProjectFolder {
  id: string
  workspace_id: string
  project_id: string
  parent_folder_id: string | null
  name: string
  created_by: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
  child_folders_count?: number
  items_count?: number
}

export interface ProjectDocument {
  id: string
  workspace_id: string
  project_id: string
  folder_id: string | null
  title: string
  content: any // TipTap JSON object
  content_format: 'tiptap_json'
  plain_text: string
  metadata: Record<string, any>
  created_by: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
}

export type CellValueType = 'text' | 'number' | 'date'

export interface SpreadsheetCell {
  raw: string | number
  type: CellValueType
  format?: string | null
}

export interface SpreadsheetSheet {
  id: string
  name: string
  rowCount: number
  columnCount: number
  columnWidths: Record<string, number>
  cells: Record<string, SpreadsheetCell>
}

export interface SpreadsheetData {
  version: number
  activeSheetId: string
  sheets: SpreadsheetSheet[]
}

export interface ProjectSpreadsheet {
  id: string
  workspace_id: string
  project_id: string
  folder_id: string | null
  title: string
  data: SpreadsheetData
  metadata: Record<string, any>
  created_by: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
}

export interface ProjectFile {
  id: string
  workspace_id: string
  project_id: string
  folder_id: string | null
  display_name: string
  original_filename: string
  storage_path: string
  mime_type: string
  size_bytes: number
  file_extension: string
  metadata: Record<string, any>
  created_by: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
}

export interface WorkbenchDirectoryItem {
  id: string
  type: WorkbenchItemType
  name: string
  folderId: string | null
  createdAt: string
  updatedAt: string
  archivedAt: string | null
  // Type-specific extras
  sizeBytes?: number
  mimeType?: string
  plainTextSnippet?: string
  storagePath?: string
  itemCount?: number
}

export interface WorkbenchStats {
  foldersCount: number
  documentsCount: number
  spreadsheetsCount: number
  filesCount: number
  totalCount: number
}

export interface FolderBreadcrumb {
  id: string | null
  name: string
}
