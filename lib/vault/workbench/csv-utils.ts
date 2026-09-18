import { SpreadsheetSheet, SpreadsheetCell } from './types'
import { SPREADSHEET_MAX_ROWS, SPREADSHEET_MAX_COLS } from './constants'
import { getCoveredCellsSet } from './spreadsheet-transforms'

export function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false
  let i = 0
  const len = text.length

  while (i < len) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < len && text[i + 1] === '"') {
          currentField += '"'
          i += 2
          continue
        } else {
          inQuotes = false
          i++
          continue
        }
      } else {
        currentField += char
        i++
        continue
      }
    } else {
      if (char === '"') {
        inQuotes = true
        i++
        continue
      } else if (char === ',') {
        currentRow.push(currentField)
        currentField = ''
        i++
        continue
      } else if (char === '\r') {
        if (i + 1 < len && text[i + 1] === '\n') i++
        currentRow.push(currentField)
        currentField = ''
        rows.push(currentRow)
        currentRow = []
        i++
        continue
      } else if (char === '\n') {
        currentRow.push(currentField)
        currentField = ''
        rows.push(currentRow)
        currentRow = []
        i++
        continue
      } else {
        currentField += char
        i++
        continue
      }
    }
  }
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField)
    rows.push(currentRow)
  }
  return rows
}

export function colIndexToLetter(colIndex: number): string {
  let temp = colIndex
  let letter = ''
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter
    temp = Math.floor(temp / 26) - 1
  }
  return letter
}

export function letterToColIndex(letter: string): number {
  let col = 0
  const upper = letter.toUpperCase()
  for (let i = 0; i < upper.length; i++) {
    col = col * 26 + (upper.charCodeAt(i) - 64)
  }
  return col - 1
}

export function importCSVToSheet(
  csvText: string,
  existingSheet?: SpreadsheetSheet
): SpreadsheetSheet {
  const rows = parseCSV(csvText)
  // Clamp rows: minimum 50, maximum SPREADSHEET_MAX_ROWS (200)
  const maxRows = Math.min(Math.max(rows.length, existingSheet?.rowCount || 50), SPREADSHEET_MAX_ROWS)
  // Clamp cols: minimum 20, maximum SPREADSHEET_MAX_COLS (26)
  let maxCols = Math.min(Math.max(existingSheet?.columnCount || 20, 20), SPREADSHEET_MAX_COLS)

  for (const row of rows) {
    if (row.length > maxCols) {
      maxCols = Math.min(row.length, SPREADSHEET_MAX_COLS)
    }
  }

  const cells: Record<string, SpreadsheetCell> = existingSheet ? { ...existingSheet.cells } : {}

  for (let r = 0; r < rows.length && r < SPREADSHEET_MAX_ROWS; r++) {
    const row = rows[r]
    for (let c = 0; c < row.length && c < SPREADSHEET_MAX_COLS; c++) {
      const val = row[c].trim()
      const colLetter = colIndexToLetter(c)
      const coord = colLetter + (r + 1)

      if (val === '') {
        delete cells[coord]
        continue
      }

      const isNum = !isNaN(Number(val)) && val !== '' && !/^0[0-9]+/.test(val)
      if (isNum) {
        cells[coord] = {
          raw: Number(val),
          type: 'number',
        }
      } else {
        cells[coord] = {
          raw: val,
          type: 'text',
        }
      }
    }
  }

  return {
    id: existingSheet?.id || 'sheet-1',
    name: existingSheet?.name || 'Sheet1',
    rowCount: maxRows,
    columnCount: maxCols,
    columnWidths: existingSheet?.columnWidths || {},
    rowHeights: existingSheet?.rowHeights || {},
    merges: [], // Merges cleared on full CSV import to prevent data misalignment
    cells,
  }
}

export function exportSheetToCSV(sheet: SpreadsheetSheet): string {
  let maxR = 0
  let maxC = 0

  for (const coord of Object.keys(sheet.cells)) {
    const match = coord.match(/^([A-Z]+)([0-9]+)$/)
    if (match) {
      const colIdx = letterToColIndex(match[1])
      const rowIdx = parseInt(match[2], 10) - 1
      if (rowIdx > maxR) maxR = rowIdx
      if (colIdx > maxC) maxC = colIdx
    }
  }

  const covered = getCoveredCellsSet(sheet.merges || [])
  const lines: string[] = []

  for (let r = 0; r <= maxR; r++) {
    const rowValues: string[] = []
    for (let c = 0; c <= maxC; c++) {
      const coord = colIndexToLetter(c) + (r + 1)
      // Covered non-anchor cells export empty string
      if (covered.has(coord)) {
        rowValues.push('')
        continue
      }

      const cell = sheet.cells[coord]
      const rawVal = cell?.raw !== undefined && cell?.raw !== null ? String(cell.raw) : ''
      if (rawVal.includes('"') || rawVal.includes(',') || rawVal.includes('\n') || rawVal.includes('\r')) {
        rowValues.push('"' + rawVal.replace(/"/g, '""') + '"')
      } else {
        rowValues.push(rawVal)
      }
    }
    lines.push(rowValues.join(','))
  }
  return lines.join('\r\n')
}
