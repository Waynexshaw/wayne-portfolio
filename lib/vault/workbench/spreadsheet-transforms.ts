// lib/vault/workbench/spreadsheet-transforms.ts

import {
  SpreadsheetSheet,
  SpreadsheetCell,
  CellMergeRange,
  SelectionRange,
  CellAlign,
} from './types'
import {
  SPREADSHEET_MAX_ROWS,
  SPREADSHEET_MIN_ROWS,
  SPREADSHEET_MAX_COLS,
  SPREADSHEET_MIN_COLS,
} from './constants'
import { colIndexToLetter, letterToColIndex } from './csv-utils'

// ==========================================
// 1. COORDINATE & RANGE UTILITIES
// ==========================================

export function coordToIndices(coord: string): { col: number; row: number } {
  const match = coord.match(/^([A-Z]+)([0-9]+)$/)
  if (!match) return { col: 0, row: 0 }
  return {
    col: letterToColIndex(match[1]),
    row: parseInt(match[2], 10) - 1,
  }
}

export function indicesToCoord(col: number, row: number): string {
  return `${colIndexToLetter(col)}${row + 1}`
}

export function normalizeRange(r: SelectionRange): SelectionRange {
  return {
    startCol: Math.min(r.startCol, r.endCol),
    startRow: Math.min(r.startRow, r.endRow),
    endCol: Math.max(r.startCol, r.endCol),
    endRow: Math.max(r.startRow, r.endRow),
  }
}

export function rangeContains(r: SelectionRange, col: number, row: number): boolean {
  const norm = normalizeRange(r)
  return col >= norm.startCol && col <= norm.endCol && row >= norm.startRow && row <= norm.endRow
}

export function rangesIntersect(r1: SelectionRange, r2: SelectionRange): boolean {
  const n1 = normalizeRange(r1)
  const n2 = normalizeRange(r2)
  return !(
    n1.endCol < n2.startCol ||
    n1.startCol > n2.endCol ||
    n1.endRow < n2.startRow ||
    n1.startRow > n2.endRow
  )
}

export function expandRangeForMerges(
  range: SelectionRange,
  merges: CellMergeRange[] | undefined
): SelectionRange {
  if (!merges || merges.length === 0) return range

  let minC = Math.min(range.startCol, range.endCol)
  let maxC = Math.max(range.startCol, range.endCol)
  let minR = Math.min(range.startRow, range.endRow)
  let maxR = Math.max(range.startRow, range.endRow)

  let expanded = true
  while (expanded) {
    expanded = false
    for (const m of merges) {
      if (
        m.startCol <= maxC &&
        m.endCol >= minC &&
        m.startRow <= maxR &&
        m.endRow >= minR
      ) {
        if (m.startCol < minC) {
          minC = m.startCol
          expanded = true
        }
        if (m.endCol > maxC) {
          maxC = m.endCol
          expanded = true
        }
        if (m.startRow < minR) {
          minR = m.startRow
          expanded = true
        }
        if (m.endRow > maxR) {
          maxR = m.endRow
          expanded = true
        }
      }
    }
  }

  return {
    startCol: range.startCol <= range.endCol ? minC : maxC,
    endCol: range.startCol <= range.endCol ? maxC : minC,
    startRow: range.startRow <= range.endRow ? minR : maxR,
    endRow: range.startRow <= range.endRow ? maxR : minR,
  }
}

export function findMergeForCell(
  merges: CellMergeRange[] | undefined,
  col: number,
  row: number
): CellMergeRange | null {
  if (!merges || merges.length === 0) return null
  for (const m of merges) {
    if (col >= m.startCol && col <= m.endCol && row >= m.startRow && row <= m.endRow) {
      return m
    }
  }
  return null
}

export function getCoveredCellsSet(merges: CellMergeRange[] | undefined): Set<string> {
  const covered = new Set<string>()
  if (!merges) return covered

  for (const m of merges) {
    for (let r = m.startRow; r <= m.endRow; r++) {
      for (let c = m.startCol; c <= m.endCol; c++) {
        // Skip anchor cell
        if (c === m.startCol && r === m.startRow) continue
        covered.add(indicesToCoord(c, r))
      }
    }
  }
  return covered
}

// ==========================================
// 2. MERGE / UNMERGE OPERATIONS
// ==========================================

export function mergeCells(
  sheet: SpreadsheetSheet,
  range: SelectionRange
): { success: boolean; error?: string; sheet: SpreadsheetSheet; updatedSheet: SpreadsheetSheet } {
  const norm = normalizeRange(range)

  // 1. Single cell cannot be merged
  if (norm.startCol === norm.endCol && norm.startRow === norm.endRow) {
    return { success: false, error: 'Cannot merge a single cell.', sheet, updatedSheet: sheet }
  }

  // 2. Bounds check
  if (
    norm.startCol < 0 ||
    norm.endCol >= sheet.columnCount ||
    norm.startRow < 0 ||
    norm.endRow >= sheet.rowCount
  ) {
    return { success: false, error: 'Selected range is outside sheet bounds.', sheet, updatedSheet: sheet }
  }

  // 3. Overlap check with existing merges
  const currentMerges = sheet.merges || []
  for (const m of currentMerges) {
    if (rangesIntersect(norm, m)) {
      return { success: false, error: 'Selected range overlaps an existing merged cell.', sheet, updatedSheet: sheet }
    }
  }

  // 4. CRITICAL MERGE DATA-SAFETY RULE:
  // Inspect every non-anchor cell. If ANY non-anchor cell has data, DO NOT merge.
  for (let r = norm.startRow; r <= norm.endRow; r++) {
    for (let c = norm.startCol; c <= norm.endCol; c++) {
      if (c === norm.startCol && r === norm.startRow) continue // Anchor cell is allowed to have data
      const coord = indicesToCoord(c, r)
      const cell = sheet.cells[coord]
      if (cell && cell.raw !== undefined && cell.raw !== null && String(cell.raw).trim() !== '') {
        return {
          success: false,
          error: 'Some selected cells contain data. Clear them before merging.',
          sheet,
          updatedSheet: sheet,
        }
      }
    }
  }

  // 5. Create new merge definition
  const newMerge: CellMergeRange = {
    id: `${indicesToCoord(norm.startCol, norm.startRow)}:${indicesToCoord(norm.endCol, norm.endRow)}`,
    startCol: norm.startCol,
    startRow: norm.startRow,
    endCol: norm.endCol,
    endRow: norm.endRow,
  }

  const updatedSheet: SpreadsheetSheet = {
    ...sheet,
    merges: [...currentMerges, newMerge],
  }

  return {
    success: true,
    sheet: updatedSheet,
    updatedSheet,
  }
}

export function unmergeCells(
  sheet: SpreadsheetSheet,
  colOrId: number | string,
  row?: number
): { success: boolean; error?: string; sheet: SpreadsheetSheet; updatedSheet: SpreadsheetSheet } {
  const currentMerges = sheet.merges || []
  let targetId: string | null = null

  if (typeof colOrId === 'string') {
    targetId = colOrId
  } else if (typeof colOrId === 'number' && typeof row === 'number') {
    const target = findMergeForCell(currentMerges, colOrId, row)
    if (target) targetId = target.id
  }

  if (!targetId || !currentMerges.some((m) => m.id === targetId)) {
    return { success: false, error: 'Merge range not found.', sheet, updatedSheet: sheet }
  }

  const updatedSheet: SpreadsheetSheet = {
    ...sheet,
    merges: currentMerges.filter((m) => m.id !== targetId),
  }

  return {
    success: true,
    sheet: updatedSheet,
    updatedSheet,
  }
}

// ==========================================
// 3. ROW INSERT / DELETE / MOVE
// ==========================================

export function insertRow(
  sheet: SpreadsheetSheet,
  targetRowIdx: number,
  position: 'above' | 'below'
): { success: boolean; error?: string; sheet: SpreadsheetSheet } {
  if (sheet.rowCount >= SPREADSHEET_MAX_ROWS) {
    return { success: false, error: `Maximum sheet limit of ${SPREADSHEET_MAX_ROWS} rows reached.`, sheet }
  }

  const insertIdx = position === 'above' ? targetRowIdx : targetRowIdx + 1
  const updatedCells: Record<string, SpreadsheetCell> = {}

  // Shift cells down
  for (const [coord, cell] of Object.entries(sheet.cells)) {
    const { col, row } = coordToIndices(coord)
    if (row >= insertIdx) {
      updatedCells[indicesToCoord(col, row + 1)] = cell
    } else {
      updatedCells[coord] = cell
    }
  }

  // Shift row heights
  const updatedRowHeights: Record<string, number> = {}
  for (const [rStr, h] of Object.entries(sheet.rowHeights || {})) {
    const rIdx = parseInt(rStr, 10) - 1
    if (rIdx >= insertIdx) {
      updatedRowHeights[String(rIdx + 2)] = h
    } else {
      updatedRowHeights[rStr] = h
    }
  }

  // Remap merges
  const updatedMerges: CellMergeRange[] = (sheet.merges || [])
    .map((m) => {
      let startRow = m.startRow
      let endRow = m.endRow
      if (insertIdx <= m.startRow) {
        startRow = m.startRow + 1
        endRow = m.endRow + 1
      } else if (insertIdx > m.startRow && insertIdx <= m.endRow) {
        endRow = m.endRow + 1
      }
      return {
        id: `${indicesToCoord(m.startCol, startRow)}:${indicesToCoord(m.endCol, endRow)}`,
        startCol: m.startCol,
        startRow,
        endCol: m.endCol,
        endRow,
      }
    })

  return {
    success: true,
    sheet: {
      ...sheet,
      rowCount: sheet.rowCount + 1,
      cells: updatedCells,
      rowHeights: updatedRowHeights,
      merges: updatedMerges,
    },
  }
}

export function deleteRow(
  sheet: SpreadsheetSheet,
  targetRowIdx: number
): { success: boolean; error?: string; sheet: SpreadsheetSheet } {
  if (sheet.rowCount <= SPREADSHEET_MIN_ROWS) {
    return { success: false, error: 'Cannot delete the only remaining row.', sheet }
  }

  const deleteIdx = targetRowIdx
  const updatedCells: Record<string, SpreadsheetCell> = {}

  // Shift cells up, dropping deleted row
  for (const [coord, cell] of Object.entries(sheet.cells)) {
    const { col, row } = coordToIndices(coord)
    if (row === deleteIdx) {
      continue
    } else if (row > deleteIdx) {
      updatedCells[indicesToCoord(col, row - 1)] = cell
    } else {
      updatedCells[coord] = cell
    }
  }

  // Shift row heights
  const updatedRowHeights: Record<string, number> = {}
  for (const [rStr, h] of Object.entries(sheet.rowHeights || {})) {
    const rIdx = parseInt(rStr, 10) - 1
    if (rIdx === deleteIdx) {
      continue
    } else if (rIdx > deleteIdx) {
      updatedRowHeights[String(rIdx)] = h
    } else {
      updatedRowHeights[rStr] = h
    }
  }

  // Remap merges
  const updatedMerges: CellMergeRange[] = []
  for (const m of sheet.merges || []) {
    if (m.startRow === deleteIdx && m.endRow === deleteIdx) {
      // Single-row merge deleted entirely
      continue
    } else if (m.startRow === deleteIdx && m.endRow > deleteIdx) {
      // Anchor row deleted: contract top down, new anchor is next row
      const newStartRow = m.startRow
      const newEndRow = m.endRow - 1
      if (newEndRow >= newStartRow && (newEndRow > newStartRow || m.endCol > m.startCol)) {
        updatedMerges.push({
          id: `${indicesToCoord(m.startCol, newStartRow)}:${indicesToCoord(m.endCol, newEndRow)}`,
          startCol: m.startCol,
          startRow: newStartRow,
          endCol: m.endCol,
          endRow: newEndRow,
        })
      }
    } else if (m.startRow < deleteIdx && m.endRow >= deleteIdx) {
      // Non-anchor row inside merge deleted
      const newEndRow = m.endRow - 1
      if (newEndRow >= m.startRow && (newEndRow > m.startRow || m.endCol > m.startCol)) {
        updatedMerges.push({
          id: `${indicesToCoord(m.startCol, m.startRow)}:${indicesToCoord(m.endCol, newEndRow)}`,
          startCol: m.startCol,
          startRow: m.startRow,
          endCol: m.endCol,
          endRow: newEndRow,
        })
      }
    } else if (m.startRow > deleteIdx) {
      // Entire merge below delete row: shift up
      const newStartRow = m.startRow - 1
      const newEndRow = m.endRow - 1
      updatedMerges.push({
        id: `${indicesToCoord(m.startCol, newStartRow)}:${indicesToCoord(m.endCol, newEndRow)}`,
        startCol: m.startCol,
        startRow: newStartRow,
        endCol: m.endCol,
        endRow: newEndRow,
      })
    } else {
      // Entire merge above delete row: unchanged
      updatedMerges.push(m)
    }
  }

  return {
    success: true,
    sheet: {
      ...sheet,
      rowCount: sheet.rowCount - 1,
      cells: updatedCells,
      rowHeights: updatedRowHeights,
      merges: updatedMerges,
    },
  }
}

export function moveRow(
  sheet: SpreadsheetSheet,
  fromRowIdx: number,
  direction: 'up' | 'down'
): { success: boolean; error?: string; sheet: SpreadsheetSheet } {
  const toRowIdx = direction === 'up' ? fromRowIdx - 1 : fromRowIdx + 1
  if (toRowIdx < 0 || toRowIdx >= sheet.rowCount) {
    return { success: false, error: 'Cannot move row beyond sheet boundaries.', sheet }
  }

  // Check if either row is part of a multi-row merge
  for (const m of sheet.merges || []) {
    if (m.startRow !== m.endRow) {
      if (
        (fromRowIdx >= m.startRow && fromRowIdx <= m.endRow) ||
        (toRowIdx >= m.startRow && toRowIdx <= m.endRow)
      ) {
        return {
          success: false,
          error: 'Cannot move a row that is part of a multi-row merged range.',
          sheet,
        }
      }
    }
  }

  const updatedCells = { ...sheet.cells }
  // Swap cells between fromRowIdx and toRowIdx
  for (let c = 0; c < sheet.columnCount; c++) {
    const fromCoord = indicesToCoord(c, fromRowIdx)
    const toCoord = indicesToCoord(c, toRowIdx)
    const fromCell = sheet.cells[fromCoord]
    const toCell = sheet.cells[toCoord]

    if (fromCell) {
      updatedCells[toCoord] = fromCell
    } else {
      delete updatedCells[toCoord]
    }

    if (toCell) {
      updatedCells[fromCoord] = toCell
    } else {
      delete updatedCells[fromCoord]
    }
  }

  // Swap row heights
  const updatedRowHeights = { ...(sheet.rowHeights || {}) }
  const fromKey = String(fromRowIdx + 1)
  const toKey = String(toRowIdx + 1)
  const fromH = updatedRowHeights[fromKey]
  const toH = updatedRowHeights[toKey]

  if (fromH !== undefined) updatedRowHeights[toKey] = fromH
  else delete updatedRowHeights[toKey]

  if (toH !== undefined) updatedRowHeights[fromKey] = toH
  else delete updatedRowHeights[fromKey]

  // Update single-row merges that were moved
  const updatedMerges = (sheet.merges || []).map((m) => {
    if (m.startRow === fromRowIdx && m.endRow === fromRowIdx) {
      return { ...m, startRow: toRowIdx, endRow: toRowIdx }
    }
    if (m.startRow === toRowIdx && m.endRow === toRowIdx) {
      return { ...m, startRow: fromRowIdx, endRow: fromRowIdx }
    }
    return m
  })

  return {
    success: true,
    sheet: {
      ...sheet,
      cells: updatedCells,
      rowHeights: updatedRowHeights,
      merges: updatedMerges,
    },
  }
}

// ==========================================
// 4. COLUMN INSERT / DELETE / MOVE
// ==========================================

export function insertColumn(
  sheet: SpreadsheetSheet,
  targetColIdx: number,
  position: 'left' | 'right'
): { success: boolean; error?: string; sheet: SpreadsheetSheet } {
  if (sheet.columnCount >= SPREADSHEET_MAX_COLS) {
    return {
      success: false,
      error: `Maximum sheet limit of ${SPREADSHEET_MAX_COLS} columns (A-Z) reached.`,
      sheet,
    }
  }

  const insertIdx = position === 'left' ? targetColIdx : targetColIdx + 1
  const updatedCells: Record<string, SpreadsheetCell> = {}

  // Shift cells right
  for (const [coord, cell] of Object.entries(sheet.cells)) {
    const { col, row } = coordToIndices(coord)
    if (col >= insertIdx) {
      updatedCells[indicesToCoord(col + 1, row)] = cell
    } else {
      updatedCells[coord] = cell
    }
  }

  // Shift column widths
  const updatedColWidths: Record<string, number> = {}
  for (const [colLetter, w] of Object.entries(sheet.columnWidths || {})) {
    const cIdx = letterToColIndex(colLetter)
    if (cIdx >= insertIdx) {
      updatedColWidths[colIndexToLetter(cIdx + 1)] = w
    } else {
      updatedColWidths[colLetter] = w
    }
  }

  // Remap merges
  const updatedMerges: CellMergeRange[] = (sheet.merges || []).map((m) => {
    let startCol = m.startCol
    let endCol = m.endCol
    if (insertIdx <= m.startCol) {
      startCol = m.startCol + 1
      endCol = m.endCol + 1
    } else if (insertIdx > m.startCol && insertIdx <= m.endCol) {
      endCol = m.endCol + 1
    }
    return {
      id: `${indicesToCoord(startCol, m.startRow)}:${indicesToCoord(endCol, m.endRow)}`,
      startCol,
      startRow: m.startRow,
      endCol,
      endRow: m.endRow,
    }
  })

  return {
    success: true,
    sheet: {
      ...sheet,
      columnCount: sheet.columnCount + 1,
      cells: updatedCells,
      columnWidths: updatedColWidths,
      merges: updatedMerges,
    },
  }
}

export function deleteColumn(
  sheet: SpreadsheetSheet,
  targetColIdx: number
): { success: boolean; error?: string; sheet: SpreadsheetSheet } {
  if (sheet.columnCount <= SPREADSHEET_MIN_COLS) {
    return { success: false, error: 'Cannot delete the only remaining column.', sheet }
  }

  const deleteIdx = targetColIdx
  const updatedCells: Record<string, SpreadsheetCell> = {}

  // Shift cells left, dropping deleted column
  for (const [coord, cell] of Object.entries(sheet.cells)) {
    const { col, row } = coordToIndices(coord)
    if (col === deleteIdx) {
      continue
    } else if (col > deleteIdx) {
      updatedCells[indicesToCoord(col - 1, row)] = cell
    } else {
      updatedCells[coord] = cell
    }
  }

  // Shift column widths
  const updatedColWidths: Record<string, number> = {}
  for (const [colLetter, w] of Object.entries(sheet.columnWidths || {})) {
    const cIdx = letterToColIndex(colLetter)
    if (cIdx === deleteIdx) {
      continue
    } else if (cIdx > deleteIdx) {
      updatedColWidths[colIndexToLetter(cIdx - 1)] = w
    } else {
      updatedColWidths[colLetter] = w
    }
  }

  // Remap merges
  const updatedMerges: CellMergeRange[] = []
  for (const m of sheet.merges || []) {
    if (m.startCol === deleteIdx && m.endCol === deleteIdx) {
      // Single-column merge deleted entirely
      continue
    } else if (m.startCol === deleteIdx && m.endCol > deleteIdx) {
      // Anchor column deleted: contract left-to-right, new anchor is next col
      const newStartCol = m.startCol
      const newEndCol = m.endCol - 1
      if (newEndCol >= newStartCol && (newEndCol > newStartCol || m.endRow > m.startRow)) {
        updatedMerges.push({
          id: `${indicesToCoord(newStartCol, m.startRow)}:${indicesToCoord(newEndCol, m.endRow)}`,
          startCol: newStartCol,
          startRow: m.startRow,
          endCol: newEndCol,
          endRow: m.endRow,
        })
      }
    } else if (m.startCol < deleteIdx && m.endCol >= deleteIdx) {
      // Non-anchor column inside merge deleted
      const newEndCol = m.endCol - 1
      if (newEndCol >= m.startCol && (newEndCol > m.startCol || m.endRow > m.startRow)) {
        updatedMerges.push({
          id: `${indicesToCoord(m.startCol, m.startRow)}:${indicesToCoord(newEndCol, m.endRow)}`,
          startCol: m.startCol,
          startRow: m.startRow,
          endCol: newEndCol,
          endRow: m.endRow,
        })
      }
    } else if (m.startCol > deleteIdx) {
      // Entire merge to the right of delete column: shift left
      const newStartCol = m.startCol - 1
      const newEndCol = m.endCol - 1
      updatedMerges.push({
        id: `${indicesToCoord(newStartCol, m.startRow)}:${indicesToCoord(newEndCol, m.endRow)}`,
        startCol: newStartCol,
        startRow: m.startRow,
        endCol: newEndCol,
        endRow: m.endRow,
      })
    } else {
      // Entire merge to the left of delete column: unchanged
      updatedMerges.push(m)
    }
  }

  return {
    success: true,
    sheet: {
      ...sheet,
      columnCount: sheet.columnCount - 1,
      cells: updatedCells,
      columnWidths: updatedColWidths,
      merges: updatedMerges,
    },
  }
}

export function moveColumn(
  sheet: SpreadsheetSheet,
  fromColIdx: number,
  direction: 'left' | 'right'
): { success: boolean; error?: string; sheet: SpreadsheetSheet } {
  const toColIdx = direction === 'left' ? fromColIdx - 1 : fromColIdx + 1
  if (toColIdx < 0 || toColIdx >= sheet.columnCount) {
    return { success: false, error: 'Cannot move column beyond sheet boundaries.', sheet }
  }

  // Check if either column is part of a multi-column merge
  for (const m of sheet.merges || []) {
    if (m.startCol !== m.endCol) {
      if (
        (fromColIdx >= m.startCol && fromColIdx <= m.endCol) ||
        (toColIdx >= m.startCol && toColIdx <= m.endCol)
      ) {
        return {
          success: false,
          error: 'Cannot move a column that is part of a multi-column merged range.',
          sheet,
        }
      }
    }
  }

  const updatedCells = { ...sheet.cells }
  // Swap cells between fromColIdx and toColIdx
  for (let r = 0; r < sheet.rowCount; r++) {
    const fromCoord = indicesToCoord(fromColIdx, r)
    const toCoord = indicesToCoord(toColIdx, r)
    const fromCell = sheet.cells[fromCoord]
    const toCell = sheet.cells[toCoord]

    if (fromCell) {
      updatedCells[toCoord] = fromCell
    } else {
      delete updatedCells[toCoord]
    }

    if (toCell) {
      updatedCells[fromCoord] = toCell
    } else {
      delete updatedCells[fromCoord]
    }
  }

  // Swap column widths
  const updatedColWidths = { ...(sheet.columnWidths || {}) }
  const fromLetter = colIndexToLetter(fromColIdx)
  const toLetter = colIndexToLetter(toColIdx)
  const fromW = updatedColWidths[fromLetter]
  const toW = updatedColWidths[toLetter]

  if (fromW !== undefined) updatedColWidths[toLetter] = fromW
  else delete updatedColWidths[toLetter]

  if (toW !== undefined) updatedColWidths[fromLetter] = toW
  else delete updatedColWidths[fromLetter]

  // Update single-column merges that were moved
  const updatedMerges = (sheet.merges || []).map((m) => {
    if (m.startCol === fromColIdx && m.endCol === fromColIdx) {
      return { ...m, startCol: toColIdx, endCol: toColIdx }
    }
    if (m.startCol === toColIdx && m.endCol === toColIdx) {
      return { ...m, startCol: fromColIdx, endCol: fromColIdx }
    }
    return m
  })

  return {
    success: true,
    sheet: {
      ...sheet,
      cells: updatedCells,
      columnWidths: updatedColWidths,
      merges: updatedMerges,
    },
  }
}

// ==========================================
// 5. ALIGNMENT & RANGE CLEAR
// ==========================================

export function clearRange(sheet: SpreadsheetSheet, range: SelectionRange): SpreadsheetSheet {
  const norm = normalizeRange(range)
  const updatedCells = { ...sheet.cells }

  for (let r = norm.startRow; r <= norm.endRow; r++) {
    for (let c = norm.startCol; c <= norm.endCol; c++) {
      const coord = indicesToCoord(c, r)
      const existing = updatedCells[coord]
      if (existing) {
        if (existing.align) {
          updatedCells[coord] = { raw: '', type: 'text', align: existing.align }
        } else {
          delete updatedCells[coord]
        }
      }
    }
  }

  return {
    ...sheet,
    cells: updatedCells,
  }
}

export function setAlignment(
  sheet: SpreadsheetSheet,
  range: SelectionRange,
  align: CellAlign
): SpreadsheetSheet {
  const norm = normalizeRange(range)
  const updatedCells = { ...sheet.cells }

  for (let r = norm.startRow; r <= norm.endRow; r++) {
    for (let c = norm.startCol; c <= norm.endCol; c++) {
      const coord = indicesToCoord(c, r)
      const existing = updatedCells[coord]
      if (existing) {
        updatedCells[coord] = { ...existing, align }
      } else {
        updatedCells[coord] = { raw: '', type: 'text', align }
      }
    }
  }

  return {
    ...sheet,
    cells: updatedCells,
  }
}

// ==========================================
// 6. CLIPBOARD TSV SERIALIZER / PARSER
// ==========================================

export function serializeRangeToTSV(sheet: SpreadsheetSheet, range: SelectionRange): string {
  const norm = normalizeRange(range)
  const covered = getCoveredCellsSet(sheet.merges)
  const lines: string[] = []

  for (let r = norm.startRow; r <= norm.endRow; r++) {
    const rowValues: string[] = []
    for (let c = norm.startCol; c <= norm.endCol; c++) {
      const coord = indicesToCoord(c, r)
      if (covered.has(coord)) {
        rowValues.push('')
      } else {
        const cell = sheet.cells[coord]
        rowValues.push(cell?.raw !== undefined && cell?.raw !== null ? String(cell.raw) : '')
      }
    }
    lines.push(rowValues.join('\t'))
  }

  return lines.join('\r\n')
}

export function parseTSV(text: string): string[][] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  if (lines.length > 1 && lines[lines.length - 1] === '') {
    lines.pop()
  }

  return lines.map((line) => line.split('\t'))
}

// Alias serializeRangeToTSV as copyRangeToTSV
export const copyRangeToTSV = serializeRangeToTSV

export function pasteTSVToSheet(
  sheet: SpreadsheetSheet,
  tsvText: string,
  anchorCol: number,
  anchorRow: number,
  selectedRange?: SelectionRange
): { updatedSheet: SpreadsheetSheet; clipped: boolean; error?: string } {
  const tsvRows = parseTSV(tsvText)
  if (tsvRows.length === 0 || (tsvRows.length === 1 && tsvRows[0].length === 0)) {
    return { updatedSheet: sheet, clipped: false }
  }

  // Merge Invariant Safety Check:
  // If target paste range intersects any existing merged ranges, verify compatibility.
  // Single-cell paste into a merged anchor cell is permitted (updates the anchor value).
  // Multi-cell paste that intersects an existing merge is rejected to prevent corrupting merge structure.
  const currentMerges = sheet.merges || []
  if (currentMerges.length > 0) {
    const isSingleCellPaste = tsvRows.length === 1 && tsvRows[0].length === 1
    const targetRange: SelectionRange =
      isSingleCellPaste && selectedRange
        ? selectedRange
        : {
            startCol: anchorCol,
            startRow: anchorRow,
            endCol: Math.min(anchorCol + Math.max(...tsvRows.map((r) => r.length)) - 1, SPREADSHEET_MAX_COLS - 1),
            endRow: Math.min(anchorRow + tsvRows.length - 1, SPREADSHEET_MAX_ROWS - 1),
          }

    const normTarget = normalizeRange(targetRange)

    for (const m of currentMerges) {
      if (rangesIntersect(normTarget, m)) {
        // If it's a single cell paste directly targeting a single merged cell where normTarget matches anchor
        const isAnchorTarget =
          isSingleCellPaste &&
          anchorCol === m.startCol &&
          anchorRow === m.startRow &&
          (!selectedRange ||
            (selectedRange.startCol === m.startCol &&
              selectedRange.startRow === m.startRow &&
              (selectedRange.endCol === m.startCol || selectedRange.endCol === m.endCol) &&
              (selectedRange.endRow === m.startRow || selectedRange.endRow === m.endRow)))

        if (!isAnchorTarget) {
          return {
            updatedSheet: sheet,
            clipped: false,
            error: 'Cannot paste: target area intersects with merged cells.',
          }
        }
      }
    }
  }

  const updatedCells = { ...sheet.cells }
  let clipped = false

  // Case 1: Single cell clipboard pasted into a multi-cell selection -> Fill selected range
  if (
    tsvRows.length === 1 &&
    tsvRows[0].length === 1 &&
    selectedRange &&
    (selectedRange.startCol !== selectedRange.endCol || selectedRange.startRow !== selectedRange.endRow)
  ) {
    const norm = normalizeRange(selectedRange)
    const val = tsvRows[0][0].trim()
    const isNum = !isNaN(Number(val)) && val !== '' && !/^0[0-9]+/.test(val)

    for (let r = norm.startRow; r <= norm.endRow; r++) {
      for (let c = norm.startCol; c <= norm.endCol; c++) {
        const coord = indicesToCoord(c, r)
        if (val === '') {
          delete updatedCells[coord]
        } else {
          const existing = updatedCells[coord]
          updatedCells[coord] = {
            ...(existing || {}),
            raw: isNum ? Number(val) : val,
            type: isNum ? 'number' : 'text',
          }
        }
      }
    }

    return {
      updatedSheet: {
        ...sheet,
        cells: updatedCells,
      },
      clipped: false,
    }
  }

  // Case 2: Multi-cell paste or single cell paste into single cell
  for (let r = 0; r < tsvRows.length; r++) {
    const targetRow = anchorRow + r
    if (targetRow >= SPREADSHEET_MAX_ROWS) {
      clipped = true
      break
    }

    for (let c = 0; c < tsvRows[r].length; c++) {
      const targetCol = anchorCol + c
      if (targetCol >= SPREADSHEET_MAX_COLS) {
        clipped = true
        continue
      }

      const val = tsvRows[r][c].trim()
      const coord = indicesToCoord(targetCol, targetRow)

      if (val === '') {
        delete updatedCells[coord]
      } else {
        const isNum = !isNaN(Number(val)) && val !== '' && !/^0[0-9]+/.test(val)
        const existing = updatedCells[coord]
        updatedCells[coord] = {
          ...(existing || {}),
          raw: isNum ? Number(val) : val,
          type: isNum ? 'number' : 'text',
        }
      }
    }
  }

  // Auto-expand sheet rowCount or columnCount if pasted beyond current dimensions (within max limits)
  const maxPastedRow = Math.min(anchorRow + tsvRows.length, SPREADSHEET_MAX_ROWS)
  const maxPastedCols = Math.min(
    anchorCol + Math.max(...tsvRows.map((row) => row.length)),
    SPREADSHEET_MAX_COLS
  )

  const newRowCount = Math.max(sheet.rowCount, maxPastedRow)
  const newColCount = Math.max(sheet.columnCount, maxPastedCols)

  return {
    updatedSheet: {
      ...sheet,
      rowCount: newRowCount,
      columnCount: newColCount,
      cells: updatedCells,
    },
    clipped,
  }
}
