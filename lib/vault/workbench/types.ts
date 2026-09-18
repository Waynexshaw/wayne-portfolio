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
export type CellAlign = 'left' | 'center' | 'right'

export interface SpreadsheetCell {
  raw: string | number
  type: CellValueType
  align?: CellAlign
  format?: string | null
}

export interface CellMergeRange {
  id: string // e.g. "A1:C2"
  startCol: number // 0-based column index
  startRow: number // 0-based row index (row 1 is 0)
  endCol: number
  endRow: number
}

export interface SelectionRange {
  startCol: number // 0-based
  startRow: number // 0-based
  endCol: number
  endRow: number
}

export interface SpreadsheetSheet {
  id: string
  name: string
  rowCount: number
  columnCount: number
  columnWidths: Record<string, number>
  rowHeights: Record<string, number>
  merges: CellMergeRange[]
  cells: Record<string, SpreadsheetCell>
}

export interface SpreadsheetData {
  version: number // version 2
  activeSheetId: string
  sheets: SpreadsheetSheet[]
}

export function normalizeSpreadsheetData(input: any): SpreadsheetData {
  if (!input || !Array.isArray(input.sheets) || input.sheets.length === 0) {
    return {
      version: 2,
      activeSheetId: 'sheet-1',
      sheets: [
        {
          id: 'sheet-1',
          name: 'Sheet1',
          rowCount: 50,
          columnCount: 20,
          columnWidths: {},
          rowHeights: {},
          merges: [],
          cells: {},
        },
      ],
    }
  }

  return {
    version: 2,
    activeSheetId: input.activeSheetId || input.sheets[0].id || 'sheet-1',
    sheets: input.sheets.map((s: any) => ({
      id: s.id || 'sheet-1',
      name: s.name || 'Sheet1',
      rowCount: Math.min(Math.max(typeof s.rowCount === 'number' ? s.rowCount : 50, 1), 200),
      columnCount: Math.min(Math.max(typeof s.columnCount === 'number' ? s.columnCount : 20, 1), 26),
      columnWidths: s.columnWidths && typeof s.columnWidths === 'object' ? s.columnWidths : {},
      rowHeights: s.rowHeights && typeof s.rowHeights === 'object' ? s.rowHeights : {},
      merges: Array.isArray(s.merges)
        ? s.merges.map((m: any) => ({
            id: m.id || `${m.startCol},${m.startRow}-${m.endCol},${m.endRow}`,
            startCol: Number(m.startCol),
            startRow: Number(m.startRow),
            endCol: Number(m.endCol),
            endRow: Number(m.endRow),
          }))
        : [],
      cells: s.cells && typeof s.cells === 'object' ? s.cells : {},
    })),
  }
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
