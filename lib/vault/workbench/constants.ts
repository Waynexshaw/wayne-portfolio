// lib/vault/workbench/constants.ts
import { SpreadsheetData } from './types'

export const WORKBENCH_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024 // 25 MB

export const SIGNED_URL_EXPIRY_SECONDS = 300 // 5 minutes

export const ALLOWED_EXTENSIONS = [
  // Documents
  'pdf',
  'doc',
  'docx',
  'txt',
  'rtf',
  'md',
  // Data
  'xls',
  'xlsx',
  'csv',
  'json',
  // Presentations
  'ppt',
  'pptx',
  // Images
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  // Archives
  'zip',
] as const

export const BLOCKED_EXTENSIONS = [
  'svg', // Blocked in V1 due to embedded script / active content risks
  'exe',
  'bat',
  'cmd',
  'sh',
  'msi',
  'js',
  'jsx',
  'ts',
  'tsx',
  'py',
  'php',
  'vbs',
  'dll',
  'com',
] as const

export const DEFAULT_EMPTY_DOCUMENT = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
    },
  ],
}

export const SPREADSHEET_MIN_ROWS = 1
export const SPREADSHEET_MAX_ROWS = 200
export const SPREADSHEET_MIN_COLS = 1
export const SPREADSHEET_MAX_COLS = 26
export const DEFAULT_COL_WIDTH = 100
export const DEFAULT_ROW_HEIGHT = 28

export const DEFAULT_EMPTY_SPREADSHEET: SpreadsheetData = {
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
