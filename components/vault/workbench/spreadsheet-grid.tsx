'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { SpreadsheetSheet, SpreadsheetCell } from '@/lib/vault/workbench/types'
import { colIndexToLetter, letterToColIndex, parseCSV } from '@/lib/vault/workbench/csv-utils'

interface SpreadsheetGridProps {
  sheet: SpreadsheetSheet
  onChange: (updatedSheet: SpreadsheetSheet) => void
  onActiveCellChange?: (coord: string, cell: SpreadsheetCell | null) => void
}

export function SpreadsheetGrid({
  sheet,
  onChange,
  onActiveCellChange,
}: SpreadsheetGridProps) {
  const [activeCell, setActiveCell] = useState<string>('A1')
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    sheet.columnWidths || {}
  )

  const containerRef = useRef<HTMLDivElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  const rowCount = Math.max(sheet.rowCount || 50, 30)
  const colCount = Math.max(sheet.columnCount || 20, 15)

  // Report active cell change to parent (for active cell bar / status)
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
      const val = initialChar !== undefined ? initialChar : cell?.raw !== undefined ? String(cell.raw) : ''
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
      // Determine type: number vs text
      const isNum = !isNaN(Number(trimmed)) && !/^0[0-9]+/.test(trimmed)
      updatedCells[activeCell] = {
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

  // Move active cell by (deltaCol, deltaRow)
  const moveActiveCell = useCallback(
    (deltaCol: number, deltaRow: number) => {
      const match = activeCell.match(/^([A-Z]+)([0-9]+)$/)
      if (!match) return

      const currCol = letterToColIndex(match[1])
      const currRow = parseInt(match[2], 10) - 1

      const newCol = Math.max(0, Math.min(colCount - 1, currCol + deltaCol))
      const newRow = Math.max(0, Math.min(rowCount - 1, currRow + deltaRow))

      const newCoord = `${colIndexToLetter(newCol)}${newRow + 1}`
      setActiveCell(newCoord)
    },
    [activeCell, colCount, rowCount]
  )

  // Global keyboard navigation when not editing
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
        moveActiveCell(0, -1)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        moveActiveCell(0, 1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        moveActiveCell(-1, 0)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        moveActiveCell(1, 0)
      } else if (e.key === 'Tab') {
        e.preventDefault()
        moveActiveCell(e.shiftKey ? -1 : 1, 0)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        startEditing(activeCell)
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        if (sheet.cells[activeCell]) {
          const updatedCells = { ...sheet.cells }
          delete updatedCells[activeCell]
          onChange({ ...sheet, cells: updatedCells })
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Direct character typing starts edit
        e.preventDefault()
        startEditing(activeCell, e.key)
      }
    },
    [isEditing, commitEdit, cancelEdit, moveActiveCell, startEditing, activeCell, sheet, onChange]
  )

  // Copy handler
  const handleCopy = useCallback(
    (e: React.ClipboardEvent) => {
      if (isEditing) return // Allow normal text copy inside input

      const cell = getCell(activeCell)
      if (cell?.raw !== undefined) {
        e.clipboardData.setData('text/plain', String(cell.raw))
        e.preventDefault()
      }
    },
    [isEditing, activeCell, getCell]
  )

  // Paste handler
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (isEditing) return // Allow normal text paste inside input

      const text = e.clipboardData.getData('text/plain')
      if (!text) return

      e.preventDefault()
      const rows = parseCSV(text.replace(/\t/g, ','))
      if (rows.length === 0) return

      const match = activeCell.match(/^([A-Z]+)([0-9]+)$/)
      if (!match) return

      const startCol = letterToColIndex(match[1])
      const startRow = parseInt(match[2], 10) - 1

      const updatedCells = { ...sheet.cells }
      for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < rows[r].length; c++) {
          const val = rows[r][c].trim()
          const targetCol = colIndexToLetter(startCol + c)
          const targetRow = startRow + r + 1
          const coord = `${targetCol}${targetRow}`

          if (val === '') {
            delete updatedCells[coord]
          } else {
            const isNum = !isNaN(Number(val)) && !/^0[0-9]+/.test(val)
            updatedCells[coord] = {
              raw: isNum ? Number(val) : val,
              type: isNum ? 'number' : 'text',
            }
          }
        }
      }

      onChange({
        ...sheet,
        cells: updatedCells,
      })
    },
    [isEditing, activeCell, sheet, onChange]
  )

  // Column resizing state
  const handleResizeStart = (colLetter: string, startX: number, startWidth: number) => {
    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX
      const newWidth = Math.max(50, startWidth + delta)
      setColumnWidths((prev) => ({ ...prev, [colLetter]: newWidth }))
    }

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      onChange({
        ...sheet,
        columnWidths: { ...columnWidths },
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onCopy={handleCopy}
      onPaste={handlePaste}
      className="w-full h-full overflow-auto bg-card border border-border rounded-lg outline-none select-none focus:ring-1 focus:ring-primary/40 text-xs font-mono"
    >
      <table className="border-collapse table-fixed w-max min-w-full">
        {/* Header Row: Corner + Columns (A, B, C...) */}
        <thead className="sticky top-0 z-20 bg-muted/80 backdrop-blur-sm shadow-sm">
          <tr>
            <th className="w-12 min-w-12 h-7 border-b border-r border-border bg-muted/90 text-center font-mono text-[10px] text-muted-foreground select-none sticky left-0 z-30">
              #
            </th>
            {Array.from({ length: colCount }).map((_, colIdx) => {
              const letter = colIndexToLetter(colIdx)
              const width = columnWidths[letter] || 100
              const isColActive = activeCell.startsWith(letter) && !activeCell.slice(letter.length).includes('0')

              return (
                <th
                  key={letter}
                  style={{ width, minWidth: width }}
                  className={`h-7 border-b border-r border-border px-2 text-center text-[11px] font-mono text-muted-foreground relative select-none ${
                    isColActive ? 'bg-primary/10 text-primary font-semibold' : ''
                  }`}
                >
                  <span>{letter}</span>
                  {/* Resize Handle */}
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      handleResizeStart(letter, e.clientX, width)
                    }}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/50"
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
            const isRowActive = activeCell.endsWith(String(rowNum))

            return (
              <tr key={rowNum}>
                {/* Row Header (sticky left) */}
                <td
                  className={`h-7 border-b border-r border-border text-center text-[10px] font-mono text-muted-foreground sticky left-0 z-10 select-none ${
                    isRowActive ? 'bg-primary/10 text-primary font-semibold' : 'bg-muted/70'
                  }`}
                >
                  {rowNum}
                </td>

                {/* Cells in Row */}
                {Array.from({ length: colCount }).map((_, colIdx) => {
                  const letter = colIndexToLetter(colIdx)
                  const coord = `${letter}${rowNum}`
                  const cell = getCell(coord)
                  const isActive = activeCell === coord
                  const isCurrentlyEditing = isActive && isEditing
                  const width = columnWidths[letter] || 100

                  return (
                    <td
                      key={coord}
                      style={{ width, minWidth: width }}
                      onClick={() => {
                        if (activeCell === coord && !isEditing) {
                          startEditing(coord)
                        } else {
                          if (isEditing) commitEdit()
                          setActiveCell(coord)
                        }
                      }}
                      onDoubleClick={() => startEditing(coord)}
                      className={`h-7 border-b border-r border-border/80 px-2 py-0 text-foreground overflow-hidden text-ellipsis whitespace-nowrap relative cursor-cell ${
                        isActive
                          ? 'ring-2 ring-primary ring-inset bg-primary/5 z-10'
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
                        <div
                          className={`truncate ${
                            cell?.type === 'number' ? 'text-right' : 'text-left'
                          }`}
                        >
                          {cell?.raw !== undefined && cell?.raw !== null ? String(cell.raw) : ''}
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
