'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  SpreadsheetSheet,
  SpreadsheetCell,
  SelectionRange,
} from '@/lib/vault/workbench/types'
import {
  DEFAULT_COL_WIDTH,
  DEFAULT_ROW_HEIGHT,
  SPREADSHEET_MAX_ROWS,
  SPREADSHEET_MAX_COLS,
} from '@/lib/vault/workbench/constants'
import { colIndexToLetter, letterToColIndex } from '@/lib/vault/workbench/csv-utils'
import {
  coordToIndices,
  indicesToCoord,
  normalizeRange,
  rangeContains,
  getCoveredCellsSet,
  findMergeForCell,
  expandRangeForMerges,
  insertRow,
  deleteRow,
  moveRow,
  insertColumn,
  deleteColumn,
  moveColumn,
} from '@/lib/vault/workbench/spreadsheet-transforms'
import {
  ChevronDown,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  RotateCcw,
} from 'lucide-react'

interface SpreadsheetGridProps {
  sheet: SpreadsheetSheet
  onChange: (updatedSheet: SpreadsheetSheet) => void
  onActiveCellChange?: (coord: string, cell: SpreadsheetCell | null) => void
  selectedRange?: SelectionRange | null
  onRangeSelect?: (range: SelectionRange | null) => void
  onNotification?: (msg: string) => void
}

export function SpreadsheetGrid({
  sheet,
  onChange,
  onActiveCellChange,
  selectedRange: controlledRange,
  onRangeSelect,
  onNotification,
}: SpreadsheetGridProps) {
  const [activeCell, setActiveCell] = useState<string>('A1')
  const [internalRange, setInternalRange] = useState<SelectionRange | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')

  // Column and Row dimensions
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    sheet.columnWidths || {}
  )
  const [rowHeights, setRowHeights] = useState<Record<string, number>>(
    sheet.rowHeights || {}
  )

  // Header menu state
  const [activeColMenu, setActiveColMenu] = useState<number | null>(null)
  const [activeRowMenu, setActiveRowMenu] = useState<number | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const dragStateRef = useRef<{
    mode: 'cells' | 'cols' | 'rows'
    anchorCol: number
    anchorRow: number
  } | null>(null)

  // Sync width and height state if sheet props change
  useEffect(() => {
    if (sheet.columnWidths) setColumnWidths(sheet.columnWidths)
  }, [sheet.columnWidths])

  useEffect(() => {
    if (sheet.rowHeights) setRowHeights(sheet.rowHeights)
  }, [sheet.rowHeights])

  const selectedRange = controlledRange !== undefined ? controlledRange : internalRange

  const normalizedSelectedRange = useMemo(() => {
    return selectedRange ? normalizeRange(selectedRange) : null
  }, [selectedRange])

  const setRange = useCallback(
    (range: SelectionRange | null) => {
      setInternalRange(range)
      if (onRangeSelect) onRangeSelect(range)
    },
    [onRangeSelect]
  )

  const rowCount = Math.max(1, Math.min(sheet.rowCount || 50, SPREADSHEET_MAX_ROWS))
  const colCount = Math.max(1, Math.min(sheet.columnCount || 20, SPREADSHEET_MAX_COLS))

  // Covered cells set for skipping non-anchor merged cells
  const coveredCells = useMemo(() => {
    return getCoveredCellsSet(sheet.merges || [])
  }, [sheet.merges])

  // Report active cell change to parent
  useEffect(() => {
    if (onActiveCellChange) {
      const cell = sheet.cells[activeCell] || null
      onActiveCellChange(activeCell, cell)
    }
  }, [activeCell, sheet.cells, onActiveCellChange])

  // Focus edit input when editing starts
  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [isEditing])

  const getCell = useCallback(
    (coord: string): SpreadsheetCell | undefined => {
      return sheet.cells[coord]
    },
    [sheet.cells]
  )

  const startEditing = useCallback(
    (coord: string, initialChar?: string) => {
      setActiveCell(coord)
      const cell = sheet.cells[coord]
      const val =
        initialChar !== undefined
          ? initialChar
          : cell?.raw !== undefined && cell?.raw !== null
          ? String(cell.raw)
          : ''
      setEditValue(val)
      setIsEditing(true)
    },
    [sheet.cells]
  )

  const commitEdit = useCallback(() => {
    if (!isEditing) return

    const trimmed = editValue.trim()
    const updatedCells = { ...sheet.cells }

    if (trimmed === '') {
      delete updatedCells[activeCell]
    } else {
      const isNum = !isNaN(Number(trimmed)) && !/^0[0-9]+/.test(trimmed)
      const existingCell = sheet.cells[activeCell]
      updatedCells[activeCell] = {
        ...(existingCell || {}),
        raw: isNum ? Number(trimmed) : trimmed,
        type: isNum ? 'number' : 'text',
      }
    }

    setIsEditing(false)
    onChange({
      ...sheet,
      cells: updatedCells,
    })
  }, [isEditing, editValue, activeCell, sheet, onChange])

  const cancelEdit = useCallback(() => {
    setIsEditing(false)
    setEditValue('')
  }, [])

  // Move active cell by delta
  const moveActiveCell = useCallback(
    (deltaCol: number, deltaRow: number, extendSelection = false) => {
      const curr = coordToIndices(activeCell)

      if (extendSelection) {
        const anchor = selectedRange
          ? { col: selectedRange.startCol, row: selectedRange.startRow }
          : curr
        const currentEndCol = selectedRange ? selectedRange.endCol : curr.col
        const currentEndRow = selectedRange ? selectedRange.endRow : curr.row
        const newCol = Math.max(0, Math.min(colCount - 1, currentEndCol + deltaCol))
        const newRow = Math.max(0, Math.min(rowCount - 1, currentEndRow + deltaRow))
        const rawRange: SelectionRange = {
          startCol: anchor.col,
          startRow: anchor.row,
          endCol: newCol,
          endRow: newRow,
        }
        setRange(expandRangeForMerges(rawRange, sheet.merges))
      } else {
        const newCol = Math.max(0, Math.min(colCount - 1, curr.col + deltaCol))
        const newRow = Math.max(0, Math.min(rowCount - 1, curr.row + deltaRow))
        const newCoord = indicesToCoord(newCol, newRow)
        const merge = findMergeForCell(sheet.merges || [], newCol, newRow)
        setActiveCell(newCoord)
        const rawRange: SelectionRange = {
          startCol: merge ? merge.startCol : newCol,
          startRow: merge ? merge.startRow : newRow,
          endCol: merge ? merge.endCol : newCol,
          endRow: merge ? merge.endRow : newRow,
        }
        setRange(expandRangeForMerges(rawRange, sheet.merges))
      }
    },
    [activeCell, colCount, rowCount, selectedRange, setRange, sheet.merges]
  )

  // Keyboard navigation & Shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isEditing) {
        if (e.key === 'Enter') {
          e.preventDefault()
          commitEdit()
          moveActiveCell(0, 1)
        } else if (e.key === 'Escape') {
          e.preventDefault()
          cancelEdit()
        } else if (e.key === 'Tab') {
          e.preventDefault()
          commitEdit()
          moveActiveCell(e.shiftKey ? -1 : 1, 0)
        }
        return
      }

      // Not editing
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        moveActiveCell(0, -1, e.shiftKey)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        moveActiveCell(0, 1, e.shiftKey)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        moveActiveCell(-1, 0, e.shiftKey)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        moveActiveCell(1, 0, e.shiftKey)
      } else if (e.key === 'Tab') {
        e.preventDefault()
        moveActiveCell(e.shiftKey ? -1 : 1, 0)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        startEditing(activeCell)
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        // Clear cells in selected range or active cell
        const activeIndices = coordToIndices(activeCell)
        const range: SelectionRange = selectedRange || {
          startCol: activeIndices.col,
          startRow: activeIndices.row,
          endCol: activeIndices.col,
          endRow: activeIndices.row,
        }
        const norm = normalizeRange(range)
        const updatedCells = { ...sheet.cells }
        let changed = false

        for (let r = norm.startRow; r <= norm.endRow; r++) {
          for (let c = norm.startCol; c <= norm.endCol; c++) {
            const coord = indicesToCoord(c, r)
            if (updatedCells[coord]) {
              delete updatedCells[coord]
              changed = true
            }
          }
        }
        if (changed) {
          onChange({ ...sheet, cells: updatedCells })
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        startEditing(activeCell, e.key)
      }
    },
    [
      isEditing,
      commitEdit,
      cancelEdit,
      moveActiveCell,
      startEditing,
      activeCell,
      selectedRange,
      sheet,
      onChange,
    ]
  )

  // Column Resizing
  const handleColResizeStart = (
    colLetter: string,
    startX: number,
    startWidth: number
  ) => {
    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX
      const newWidth = Math.max(50, startWidth + delta)
      setColumnWidths((prev) => ({ ...prev, [colLetter]: newWidth }))
    }

    const handleMouseUp = (e: MouseEvent) => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      const delta = e.clientX - startX
      const finalWidth = Math.max(50, startWidth + delta)
      const updatedWidths = { ...columnWidths, [colLetter]: finalWidth }
      setColumnWidths(updatedWidths)
      onChange({
        ...sheet,
        columnWidths: updatedWidths,
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  // Row Resizing
  const handleRowResizeStart = (
    rowNum: number,
    startY: number,
    startHeight: number
  ) => {
    const rowKey = String(rowNum)
    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientY - startY
      const newHeight = Math.max(20, startHeight + delta)
      setRowHeights((prev) => ({ ...prev, [rowKey]: newHeight }))
    }

    const handleMouseUp = (e: MouseEvent) => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      const delta = e.clientY - startY
      const finalHeight = Math.max(20, startHeight + delta)
      const updatedHeights = { ...rowHeights, [rowKey]: finalHeight }
      setRowHeights(updatedHeights)
      onChange({
        ...sheet,
        rowHeights: updatedHeights,
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  // Double click reset column width
  const handleColResetWidth = (colLetter: string) => {
    const updatedWidths = { ...columnWidths }
    delete updatedWidths[colLetter]
    setColumnWidths(updatedWidths)
    onChange({
      ...sheet,
      columnWidths: updatedWidths,
    })
  }

  // Double click reset row height
  const handleRowResetHeight = (rowNum: number) => {
    const updatedHeights = { ...rowHeights }
    delete updatedHeights[String(rowNum)]
    setRowHeights(updatedHeights)
    onChange({
      ...sheet,
      rowHeights: updatedHeights,
    })
  }

  // Header Selection Handlers (with Shift+Click and Pointer Drag support)
  const handleColHeaderPointerDown = (colIdx: number, e: React.PointerEvent) => {
    if (e.button !== 0) return
    if (isEditing) commitEdit()

    if (e.shiftKey) {
      const anchorCol =
        selectedRange !== null && selectedRange !== undefined
          ? selectedRange.startCol
          : coordToIndices(activeCell).col
      const rawRange: SelectionRange = {
        startCol: anchorCol,
        startRow: 0,
        endCol: colIdx,
        endRow: rowCount - 1,
      }
      setRange(expandRangeForMerges(rawRange, sheet.merges))
      return
    }

    setActiveCell(indicesToCoord(colIdx, 0))
    const rawRange: SelectionRange = {
      startCol: colIdx,
      startRow: 0,
      endCol: colIdx,
      endRow: rowCount - 1,
    }
    setRange(expandRangeForMerges(rawRange, sheet.merges))
    dragStateRef.current = {
      mode: 'cols',
      anchorCol: colIdx,
      anchorRow: 0,
    }
    setIsSelecting(true)
  }

  const handleRowHeaderPointerDown = (rowIdx: number, e: React.PointerEvent) => {
    if (e.button !== 0) return
    if (isEditing) commitEdit()

    if (e.shiftKey) {
      const anchorRow =
        selectedRange !== null && selectedRange !== undefined
          ? selectedRange.startRow
          : coordToIndices(activeCell).row
      const rawRange: SelectionRange = {
        startCol: 0,
        startRow: anchorRow,
        endCol: colCount - 1,
        endRow: rowIdx,
      }
      setRange(expandRangeForMerges(rawRange, sheet.merges))
      return
    }

    setActiveCell(indicesToCoord(0, rowIdx))
    const rawRange: SelectionRange = {
      startCol: 0,
      startRow: rowIdx,
      endCol: colCount - 1,
      endRow: rowIdx,
    }
    setRange(expandRangeForMerges(rawRange, sheet.merges))
    dragStateRef.current = {
      mode: 'rows',
      anchorCol: 0,
      anchorRow: rowIdx,
    }
    setIsSelecting(true)
  }

  const selectEntireColumn = (colIdx: number) => {
    setActiveCell(indicesToCoord(colIdx, 0))
    const rawRange: SelectionRange = {
      startCol: colIdx,
      startRow: 0,
      endCol: colIdx,
      endRow: rowCount - 1,
    }
    setRange(expandRangeForMerges(rawRange, sheet.merges))
  }

  const selectEntireRow = (rowIdx: number) => {
    setActiveCell(indicesToCoord(0, rowIdx))
    const rawRange: SelectionRange = {
      startCol: 0,
      startRow: rowIdx,
      endCol: colCount - 1,
      endRow: rowIdx,
    }
    setRange(expandRangeForMerges(rawRange, sheet.merges))
  }

  const selectAll = () => {
    setActiveCell('A1')
    setRange({
      startCol: 0,
      startRow: 0,
      endCol: colCount - 1,
      endRow: rowCount - 1,
    })
  }

  // Cell Pointer Interaction (Rectangular Selection Dragging & Shift+Click)
  const handleCellPointerDown = (colIdx: number, rowIdx: number, e: React.PointerEvent) => {
    if (e.button !== 0) return // only left click
    if (isEditing) commitEdit()

    const merge = findMergeForCell(sheet.merges || [], colIdx, rowIdx)
    const effectiveCol = merge ? merge.startCol : colIdx
    const effectiveRow = merge ? merge.startRow : rowIdx
    const targetCoord = indicesToCoord(effectiveCol, effectiveRow)

    if (e.shiftKey) {
      const anchor = selectedRange
        ? { col: selectedRange.startCol, row: selectedRange.startRow }
        : coordToIndices(activeCell)
      const rawRange: SelectionRange = {
        startCol: anchor.col,
        startRow: anchor.row,
        endCol: merge ? (colIdx <= anchor.col ? merge.startCol : merge.endCol) : colIdx,
        endRow: merge ? (rowIdx <= anchor.row ? merge.startRow : merge.endRow) : rowIdx,
      }
      setRange(expandRangeForMerges(rawRange, sheet.merges))
      return
    }

    setActiveCell(targetCoord)
    const rawRange: SelectionRange = {
      startCol: effectiveCol,
      startRow: effectiveRow,
      endCol: merge ? merge.endCol : colIdx,
      endRow: merge ? merge.endRow : rowIdx,
    }
    setRange(expandRangeForMerges(rawRange, sheet.merges))
    dragStateRef.current = {
      mode: 'cells',
      anchorCol: effectiveCol,
      anchorRow: effectiveRow,
    }
    setIsSelecting(true)
  }

  // Global Pointer Event Listeners for smooth rectangular drag hit-testing
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const drag = dragStateRef.current
      if (!drag) return

      e.preventDefault()
      const el = document.elementFromPoint(e.clientX, e.clientY)
      if (!el) return

      if (drag.mode === 'cells') {
        const cellEl = el.closest('[data-cell-coord]') as HTMLElement | null
        if (cellEl) {
          const c = parseInt(cellEl.dataset.col || '0', 10)
          const r = parseInt(cellEl.dataset.row || '0', 10)
          const endC =
            cellEl.dataset.endCol !== undefined ? parseInt(cellEl.dataset.endCol, 10) : c
          const endR =
            cellEl.dataset.endRow !== undefined ? parseInt(cellEl.dataset.endRow, 10) : r

          const targetCol = c < drag.anchorCol ? c : endC
          const targetRow = r < drag.anchorRow ? r : endR

          const rawRange: SelectionRange = {
            startCol: drag.anchorCol,
            startRow: drag.anchorRow,
            endCol: targetCol,
            endRow: targetRow,
          }
          setRange(expandRangeForMerges(rawRange, sheet.merges))
        }
      } else if (drag.mode === 'cols') {
        const colEl = el.closest('[data-col-header]') as HTMLElement | null
        if (colEl) {
          const targetCol = parseInt(colEl.dataset.col || '0', 10)
          const rawRange: SelectionRange = {
            startCol: drag.anchorCol,
            startRow: 0,
            endCol: targetCol,
            endRow: rowCount - 1,
          }
          setRange(expandRangeForMerges(rawRange, sheet.merges))
        }
      } else if (drag.mode === 'rows') {
        const rowEl = el.closest('[data-row-header]') as HTMLElement | null
        if (rowEl) {
          const targetRow = parseInt(rowEl.dataset.row || '0', 10)
          const rawRange: SelectionRange = {
            startCol: 0,
            startRow: drag.anchorRow,
            endCol: colCount - 1,
            endRow: targetRow,
          }
          setRange(expandRangeForMerges(rawRange, sheet.merges))
        }
      }
    }

    const handlePointerUp = () => {
      if (dragStateRef.current) {
        dragStateRef.current = null
        setIsSelecting(false)
      }
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [sheet.merges, rowCount, colCount, setRange])

  // Close menus on outside click
  useEffect(() => {
    const handleOutside = () => {
      setActiveColMenu(null)
      setActiveRowMenu(null)
    }
    window.addEventListener('click', handleOutside)
    return () => window.removeEventListener('click', handleOutside)
  }, [])

  // Structural actions with user feedback
  const handleTransformResult = (res: { success: boolean; error?: string; updatedSheet?: SpreadsheetSheet }) => {
    if (!res.success) {
      if (onNotification && res.error) {
        onNotification(res.error)
      } else {
        alert(res.error || 'Operation failed')
      }
    } else if (res.updatedSheet) {
      onChange(res.updatedSheet)
    }
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="w-full h-full overflow-auto bg-card border border-border rounded-lg outline-none select-none focus:ring-1 focus:ring-primary/40 text-xs font-mono relative"
    >
      <table className="border-collapse table-fixed w-max min-w-full">
        {/* Header Row: Corner + Columns (A, B, C...) */}
        <thead className="sticky top-0 z-20 bg-muted/80 backdrop-blur-sm shadow-sm">
          <tr>
            {/* Corner Cell: Select All */}
            <th
              onPointerDown={(e) => {
                e.stopPropagation()
                selectAll()
              }}
              onClick={selectAll}
              title="Select all cells"
              className="w-12 min-w-12 h-7 border-b border-r border-border bg-muted/90 text-center font-mono text-[10px] text-muted-foreground select-none sticky left-0 z-30 cursor-pointer hover:bg-primary/20 transition-colors"
            >
              #
            </th>

            {Array.from({ length: colCount }).map((_, colIdx) => {
              const letter = colIndexToLetter(colIdx)
              const width = columnWidths[letter] || DEFAULT_COL_WIDTH
              const isColSelected =
                normalizedSelectedRange !== null &&
                colIdx >= normalizedSelectedRange.startCol &&
                colIdx <= normalizedSelectedRange.endCol

              return (
                <th
                  key={letter}
                  data-col-header=""
                  data-col={colIdx}
                  style={{ width, minWidth: width }}
                  onPointerDown={(e) => handleColHeaderPointerDown(colIdx, e)}
                  className={`h-7 border-b border-r border-border px-2 text-center text-[11px] font-mono relative select-none cursor-pointer transition-colors group ${
                    isColSelected
                      ? 'bg-primary/20 text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center justify-between h-full">
                    <span className="flex-1 text-center">{letter}</span>
                    {/* Column Dropdown Menu Trigger */}
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveColMenu(activeColMenu === colIdx ? null : colIdx)
                        setActiveRowMenu(null)
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:bg-background/80 p-0.5 rounded text-muted-foreground transition-opacity"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Column Context Menu */}
                  {activeColMenu === colIdx && (
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-full mt-1 w-44 bg-popover text-popover-foreground border border-border rounded-md shadow-md py-1 z-50 text-left font-sans text-xs font-normal"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveColMenu(null)
                          handleTransformResult(insertColumn(sheet, colIdx, 'left'))
                        }}
                        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-accent text-left"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Insert 1 Left</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveColMenu(null)
                          handleTransformResult(insertColumn(sheet, colIdx, 'right'))
                        }}
                        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-accent text-left"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Insert 1 Right</span>
                      </button>
                      <div className="h-px bg-border my-1" />
                      <button
                        type="button"
                        disabled={colIdx === 0}
                        onClick={() => {
                          setActiveColMenu(null)
                          handleTransformResult(moveColumn(sheet, colIdx, 'left'))
                        }}
                        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-accent text-left disabled:opacity-40"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Move Left</span>
                      </button>
                      <button
                        type="button"
                        disabled={colIdx === colCount - 1}
                        onClick={() => {
                          setActiveColMenu(null)
                          handleTransformResult(moveColumn(sheet, colIdx, 'right'))
                        }}
                        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-accent text-left disabled:opacity-40"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>Move Right</span>
                      </button>
                      <div className="h-px bg-border my-1" />
                      <button
                        type="button"
                        onClick={() => {
                          setActiveColMenu(null)
                          handleColResetWidth(letter)
                        }}
                        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-accent text-left"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Width ({DEFAULT_COL_WIDTH}px)</span>
                      </button>
                      <div className="h-px bg-border my-1" />
                      <button
                        type="button"
                        disabled={colCount <= 1}
                        onClick={() => {
                          setActiveColMenu(null)
                          handleTransformResult(deleteColumn(sheet, colIdx))
                        }}
                        className="w-full px-3 py-1.5 flex items-center gap-2 text-destructive hover:bg-destructive/10 text-left disabled:opacity-40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Column</span>
                      </button>
                    </div>
                  )}

                  {/* Resize Handle */}
                  <div
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      handleColResizeStart(letter, e.clientX, width)
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      handleColResetWidth(letter)
                    }}
                    title="Drag to resize, double-click to reset"
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/50 transition-colors z-10"
                  />
                </th>
              )
            })}
          </tr>
        </thead>

        {/* Rows (1..rowCount) */}
        <tbody>
          {Array.from({ length: rowCount }).map((_, rowIdx) => {
            const rowNum = rowIdx + 1
            const rowKey = String(rowNum)
            const height = rowHeights[rowKey] || DEFAULT_ROW_HEIGHT
            const isRowSelected =
              normalizedSelectedRange !== null &&
              rowIdx >= normalizedSelectedRange.startRow &&
              rowIdx <= normalizedSelectedRange.endRow

            return (
              <tr key={rowNum} style={{ height }}>
                {/* Row Header (sticky left) */}
                <td
                  data-row-header=""
                  data-row={rowIdx}
                  style={{ height }}
                  onPointerDown={(e) => handleRowHeaderPointerDown(rowIdx, e)}
                  className={`border-b border-r border-border text-center text-[10px] font-mono sticky left-0 z-10 select-none cursor-pointer transition-colors group ${
                    isRowSelected
                      ? 'bg-primary/20 text-primary font-semibold'
                      : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center justify-between h-full px-1">
                    <span className="flex-1 text-center">{rowNum}</span>
                    {/* Row Dropdown Trigger */}
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveRowMenu(activeRowMenu === rowIdx ? null : rowIdx)
                        setActiveColMenu(null)
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:bg-background/80 p-0.5 rounded text-muted-foreground transition-opacity"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Row Context Menu */}
                  {activeRowMenu === rowIdx && (
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-full top-0 ml-1 w-44 bg-popover text-popover-foreground border border-border rounded-md shadow-md py-1 z-50 text-left font-sans text-xs font-normal"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveRowMenu(null)
                          handleTransformResult(insertRow(sheet, rowIdx, 'above'))
                        }}
                        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-accent text-left"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Insert 1 Above</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveRowMenu(null)
                          handleTransformResult(insertRow(sheet, rowIdx, 'below'))
                        }}
                        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-accent text-left"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Insert 1 Below</span>
                      </button>
                      <div className="h-px bg-border my-1" />
                      <button
                        type="button"
                        disabled={rowIdx === 0}
                        onClick={() => {
                          setActiveRowMenu(null)
                          handleTransformResult(moveRow(sheet, rowIdx, 'up'))
                        }}
                        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-accent text-left disabled:opacity-40"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                        <span>Move Up</span>
                      </button>
                      <button
                        type="button"
                        disabled={rowIdx === rowCount - 1}
                        onClick={() => {
                          setActiveRowMenu(null)
                          handleTransformResult(moveRow(sheet, rowIdx, 'down'))
                        }}
                        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-accent text-left disabled:opacity-40"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                        <span>Move Down</span>
                      </button>
                      <div className="h-px bg-border my-1" />
                      <button
                        type="button"
                        onClick={() => {
                          setActiveRowMenu(null)
                          handleRowResetHeight(rowNum)
                        }}
                        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-accent text-left"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Height ({DEFAULT_ROW_HEIGHT}px)</span>
                      </button>
                      <div className="h-px bg-border my-1" />
                      <button
                        type="button"
                        disabled={rowCount <= 1}
                        onClick={() => {
                          setActiveRowMenu(null)
                          handleTransformResult(deleteRow(sheet, rowIdx))
                        }}
                        className="w-full px-3 py-1.5 flex items-center gap-2 text-destructive hover:bg-destructive/10 text-left disabled:opacity-40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Row</span>
                      </button>
                    </div>
                  )}

                  {/* Row Resize Handle */}
                  <div
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      handleRowResizeStart(rowNum, e.clientY, height)
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      handleRowResetHeight(rowNum)
                    }}
                    title="Drag to resize, double-click to reset"
                    className="absolute left-0 right-0 bottom-0 h-2 cursor-row-resize hover:bg-primary/50 transition-colors z-10"
                  />
                </td>

                {/* Cells in Row */}
                {Array.from({ length: colCount }).map((_, colIdx) => {
                  const letter = colIndexToLetter(colIdx)
                  const coord = `${letter}${rowNum}`

                  // Skip covered cells from DOM rendering
                  if (coveredCells.has(coord)) {
                    return null
                  }

                  const cell = getCell(coord)
                  const isActive = activeCell === coord
                  const isCurrentlyEditing = isActive && isEditing
                  const width = columnWidths[letter] || DEFAULT_COL_WIDTH

                  // Check if cell is an anchor for a merge
                  const merge = findMergeForCell(sheet.merges || [], colIdx, rowIdx)
                  const isAnchor =
                    merge && merge.startCol === colIdx && merge.startRow === rowIdx
                  const colSpan = isAnchor ? merge.endCol - merge.startCol + 1 : 1
                  const rowSpan = isAnchor ? merge.endRow - merge.startRow + 1 : 1

                  // Check if cell is within current selection range
                  const isInSelection =
                    normalizedSelectedRange !== null &&
                    colIdx >= normalizedSelectedRange.startCol &&
                    colIdx <= normalizedSelectedRange.endCol &&
                    rowIdx >= normalizedSelectedRange.startRow &&
                    rowIdx <= normalizedSelectedRange.endRow

                  // Text alignment
                  const align =
                    cell?.align || (cell?.type === 'number' ? 'right' : 'left')
                  const alignClass =
                    align === 'center'
                      ? 'text-center'
                      : align === 'right'
                      ? 'text-right'
                      : 'text-left'

                  return (
                    <td
                      key={coord}
                      data-cell-coord={coord}
                      data-col={colIdx}
                      data-row={rowIdx}
                      data-end-col={merge ? merge.endCol : colIdx}
                      data-end-row={merge ? merge.endRow : rowIdx}
                      colSpan={colSpan}
                      rowSpan={rowSpan}
                      style={{
                        width: colSpan > 1 ? undefined : width,
                        minWidth: colSpan > 1 ? undefined : width,
                        height,
                      }}
                      onPointerDown={(e) => handleCellPointerDown(colIdx, rowIdx, e)}
                      onDoubleClick={() => startEditing(coord)}
                      className={`border-b border-r border-border/80 px-2 py-0 text-foreground overflow-hidden text-ellipsis whitespace-nowrap relative cursor-cell select-none ${
                        isActive
                          ? 'ring-2 ring-primary ring-inset bg-primary/10 z-10'
                          : isInSelection
                          ? 'bg-primary/15'
                          : 'hover:bg-muted/30'
                      }`}
                    >
                      {isCurrentlyEditing ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          className="absolute inset-0 w-full h-full px-2 py-0 bg-background text-foreground border-none outline-none font-mono text-xs z-20"
                          style={{ fontSize: '13px' }}
                        />
                      ) : (
                        <div className={`truncate ${alignClass}`}>
                          {cell?.raw !== undefined && cell?.raw !== null
                            ? String(cell.raw)
                            : ''}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}