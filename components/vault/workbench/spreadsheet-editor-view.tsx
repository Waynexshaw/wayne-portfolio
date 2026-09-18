'use client'
import { useState, useEffect, useRef, useTransition, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Download,
  Upload,
  Archive,
  RotateCcw,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Table as TableIcon,
  Undo2,
  Redo2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Combine,
  Split,
  X,
} from 'lucide-react'
import {
  ProjectSpreadsheet,
  SpreadsheetData,
  SpreadsheetSheet,
  SpreadsheetCell,
  SelectionRange,
  CellAlign,
  normalizeSpreadsheetData,
} from '@/lib/vault/workbench/types'
import {
  updateProjectSpreadsheet,
  archiveProjectSpreadsheet,
  restoreProjectSpreadsheet,
} from '@/lib/vault/workbench-actions'
import { exportSheetToCSV, importCSVToSheet } from '@/lib/vault/workbench/csv-utils'
import {
  coordToIndices,
  indicesToCoord,
  normalizeRange,
  mergeCells,
  unmergeCells,
  copyRangeToTSV,
  pasteTSVToSheet,
  findMergeForCell,
} from '@/lib/vault/workbench/spreadsheet-transforms'
import { SpreadsheetGrid } from './spreadsheet-grid'

interface SpreadsheetEditorViewProps {
  spreadsheet: ProjectSpreadsheet
  projectId: string
  workspaceId: string
  projectName: string
}

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'

export function SpreadsheetEditorView({
  spreadsheet,
  projectId,
  workspaceId,
  projectName,
}: SpreadsheetEditorViewProps) {
  const router = useRouter()
  const [title, setTitle] = useState(spreadsheet.title)
  // Normalize initial data for V1 backward compatibility
  const [data, setData] = useState<SpreadsheetData>(() =>
    normalizeSpreadsheetData(spreadsheet.data)
  )
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [notification, setNotification] = useState<string | null>(null)
  const [activeCellCoord, setActiveCellCoord] = useState('A1')
  const [activeCellValue, setActiveCellValue] = useState('')
  const [selectedRange, setSelectedRange] = useState<SelectionRange | null>(null)
  const [isPending, startTransition] = useTransition()

  // Undo / Redo history stacks (limit 50)
  const undoStackRef = useRef<SpreadsheetSheet[]>([])
  const redoStackRef = useRef<SpreadsheetSheet[]>([])
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const csvInputRef = useRef<HTMLInputElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const latestDataRef = useRef<SpreadsheetData>(data)
  const latestTitleRef = useRef<string>(title)

  latestDataRef.current = data
  latestTitleRef.current = title

  const isArchived = !!spreadsheet.archived_at

  // Active sheet
  const activeSheet: SpreadsheetSheet = useMemo(() => {
    return (
      data.sheets?.[0] || {
        id: 'sheet-1',
        name: 'Sheet1',
        rowCount: 50,
        columnCount: 20,
        columnWidths: {},
        rowHeights: {},
        merges: [],
        cells: {},
      }
    )
  }, [data.sheets])

  const updateUndoState = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0)
    setCanRedo(redoStackRef.current.length > 0)
  }, [])

  const pushUndo = useCallback(
    (prevSheet: SpreadsheetSheet) => {
      undoStackRef.current.push(JSON.parse(JSON.stringify(prevSheet)))
      if (undoStackRef.current.length > 50) {
        undoStackRef.current.shift()
      }
      redoStackRef.current = [] // clear redo stack on new operation
      updateUndoState()
    },
    [updateUndoState]
  )

  // Update active cell value for formula/cell bar
  const handleActiveCellChange = useCallback(
    (coord: string, cell: SpreadsheetCell | null) => {
      setActiveCellCoord(coord)
      setActiveCellValue(
        cell?.raw !== undefined && cell?.raw !== null ? String(cell.raw) : ''
      )
    },
    []
  )

  // Autosave execution
  const executeAutosave = useCallback(async () => {
    setSaveStatus('saving')
    try {
      await updateProjectSpreadsheet(spreadsheet.id, projectId, workspaceId, {
        title: latestTitleRef.current,
        data: latestDataRef.current,
      })
      setSaveStatus('saved')
      setErrorMessage(null)
    } catch (err: any) {
      setSaveStatus('error')
      setErrorMessage(err.message || 'Failed to save spreadsheet')
    }
  }, [spreadsheet.id, projectId, workspaceId])

  // Grid data change triggers debounced autosave & tracks undo
  const handleGridChange = useCallback(
    (updatedSheet: SpreadsheetSheet, skipUndo = false) => {
      if (!skipUndo) {
        pushUndo(activeSheet)
      }

      const updatedData: SpreadsheetData = {
        ...data,
        version: 2,
        sheets: [updatedSheet],
      }
      setData(updatedData)
      setSaveStatus('unsaved')

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(() => {
        executeAutosave()
      }, 1500)
    },
    [activeSheet, data, executeAutosave, pushUndo]
  )

  // Cell input bar manual edit
  const handleCellInputChange = (val: string) => {
    setActiveCellValue(val)
    const trimmed = val.trim()
    const updatedCells = { ...activeSheet.cells }

    if (trimmed === '') {
      delete updatedCells[activeCellCoord]
    } else {
      const isNum = !isNaN(Number(trimmed)) && !/^0[0-9]+/.test(trimmed)
      const existingCell = activeSheet.cells[activeCellCoord]
      updatedCells[activeCellCoord] = {
        ...(existingCell || {}),
        raw: isNum ? Number(trimmed) : trimmed,
        type: isNum ? 'number' : 'text',
      }
    }

    handleGridChange({
      ...activeSheet,
      cells: updatedCells,
    })
  }

  // Undo / Redo Actions
  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return
    const prevSheet = undoStackRef.current.pop()!
    redoStackRef.current.push(JSON.parse(JSON.stringify(activeSheet)))
    updateUndoState()
    handleGridChange(prevSheet, true)
  }, [activeSheet, handleGridChange, updateUndoState])

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return
    const nextSheet = redoStackRef.current.pop()!
    undoStackRef.current.push(JSON.parse(JSON.stringify(activeSheet)))
    updateUndoState()
    handleGridChange(nextSheet, true)
  }, [activeSheet, handleGridChange, updateUndoState])

  // Alignment Toolbar Action
  const handleSetAlignment = (align: CellAlign) => {
    const activeIndices = coordToIndices(activeCellCoord)
    const range: SelectionRange = selectedRange || {
      startCol: activeIndices.col,
      startRow: activeIndices.row,
      endCol: activeIndices.col,
      endRow: activeIndices.row,
    }
    const norm = normalizeRange(range)
    const updatedCells = { ...activeSheet.cells }

    for (let r = norm.startRow; r <= norm.endRow; r++) {
      for (let c = norm.startCol; c <= norm.endCol; c++) {
        const coord = indicesToCoord(c, r)
        const cell = updatedCells[coord]
        if (cell) {
          updatedCells[coord] = { ...cell, align }
        } else {
          updatedCells[coord] = { raw: '', type: 'text', align }
        }
      }
    }

    handleGridChange({
      ...activeSheet,
      cells: updatedCells,
    })
  }

  // Merge / Unmerge Toolbar Action
  const activeIndices = coordToIndices(activeCellCoord)
  const currentCellMerge = findMergeForCell(
    activeSheet.merges || [],
    activeIndices.col,
    activeIndices.row
  )
  const isCurrentCellMerged = !!currentCellMerge

  const handleToggleMerge = () => {
    if (isCurrentCellMerged && currentCellMerge) {
      // Unmerge existing merge
      const res = unmergeCells(activeSheet, currentCellMerge.id)
      if (!res.success) {
        setNotification(res.error || 'Failed to unmerge cells')
      } else if (res.updatedSheet) {
        handleGridChange(res.updatedSheet)
      }
      return
    }

    // Merge currently selected range
    if (!selectedRange) {
      setNotification('Select a multi-cell range to merge.')
      return
    }

    const norm = normalizeRange(selectedRange)
    if (norm.startCol === norm.endCol && norm.startRow === norm.endRow) {
      setNotification('Select more than one cell to merge.')
      return
    }

    const res = mergeCells(activeSheet, selectedRange)
    if (!res.success) {
      setNotification(res.error || 'Cannot merge selected cells')
    } else if (res.updatedSheet) {
      handleGridChange(res.updatedSheet)
    }
  }

  // Clipboard Handlers (Cut, Copy, Paste)
  const handleCut = useCallback(
    (e: ClipboardEvent) => {
      // Only process when not actively typing in an input
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      const activeIndices = coordToIndices(activeCellCoord)
      const range: SelectionRange = selectedRange || {
        startCol: activeIndices.col,
        startRow: activeIndices.row,
        endCol: activeIndices.col,
        endRow: activeIndices.row,
      }
      const tsv = copyRangeToTSV(activeSheet, range)
      if (e.clipboardData) {
        e.clipboardData.setData('text/plain', tsv)
        e.preventDefault()
      }

      // Clear the cut cells
      const norm = normalizeRange(range)
      const updatedCells = { ...activeSheet.cells }
      for (let r = norm.startRow; r <= norm.endRow; r++) {
        for (let c = norm.startCol; c <= norm.endCol; c++) {
          delete updatedCells[indicesToCoord(c, r)]
        }
      }
      handleGridChange({ ...activeSheet, cells: updatedCells })
    },
    [activeCellCoord, selectedRange, activeSheet, handleGridChange]
  )

  const handleCopy = useCallback(
    (e: ClipboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      const activeIndices = coordToIndices(activeCellCoord)
      const range: SelectionRange = selectedRange || {
        startCol: activeIndices.col,
        startRow: activeIndices.row,
        endCol: activeIndices.col,
        endRow: activeIndices.row,
      }
      const tsv = copyRangeToTSV(activeSheet, range)
      if (e.clipboardData) {
        e.clipboardData.setData('text/plain', tsv)
        e.preventDefault()
      }
    },
    [activeCellCoord, selectedRange, activeSheet]
  )

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      const text = e.clipboardData?.getData('text/plain')
      if (!text) return

      e.preventDefault()
      const activeIndices = coordToIndices(activeCellCoord)
      const res = pasteTSVToSheet(
        activeSheet,
        text,
        activeIndices.col,
        activeIndices.row,
        selectedRange || undefined
      )

      if (res.error) {
        setNotification(res.error)
        return
      }

      if (res.clipped) {
        setNotification('Pasted data exceeded sheet boundaries and was clipped to 200 rows × 26 columns.')
      }

      handleGridChange(res.updatedSheet)
    },
    [activeCellCoord, selectedRange, activeSheet, handleGridChange]
  )

  // Global Keyboard Shortcuts (Ctrl+Z, Ctrl+Y / Ctrl+Shift+Z)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          handleRedo()
        } else {
          handleUndo()
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        handleRedo()
      }
    }

    const copyListener = (e: ClipboardEvent) => handleCopy(e)
    const cutListener = (e: ClipboardEvent) => handleCut(e)
    const pasteListener = (e: ClipboardEvent) => handlePaste(e)

    window.addEventListener('keydown', handleGlobalKeyDown)
    window.addEventListener('copy', copyListener)
    window.addEventListener('cut', cutListener)
    window.addEventListener('paste', pasteListener)

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown)
      window.removeEventListener('copy', copyListener)
      window.removeEventListener('cut', cutListener)
      window.removeEventListener('paste', pasteListener)
    }
  }, [handleUndo, handleRedo, handleCopy, handleCut, handlePaste])

  // Title change blur/Enter triggers immediate save
  const handleTitleBlur = () => {
    const trimmed = title.trim() || 'Untitled Spreadsheet'
    setTitle(trimmed)
    executeAutosave()
  }

  // CSV Import handler
  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (text) {
        if (activeSheet.merges && activeSheet.merges.length > 0) {
          const confirmed = window.confirm(
            'This sheet contains merged cells. CSV import cannot preserve merged cell structure. Continuing will remove the existing merges. Import anyway?'
          )
          if (!confirmed) {
            return
          }
        }
        const newSheet = importCSVToSheet(text, activeSheet)
        handleGridChange(newSheet)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // CSV Export handler
  const handleCSVExport = () => {
    const csvString = exportSheetToCSV(activeSheet)
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${title.replace(/\\s+/g, '_')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Archive / Restore
  const handleToggleArchive = () => {
    startTransition(async () => {
      if (isArchived) {
        await restoreProjectSpreadsheet(spreadsheet.id, projectId, workspaceId)
      } else {
        await archiveProjectSpreadsheet(spreadsheet.id, projectId, workspaceId)
        router.push(`/vault/projects/${projectId}/workbench`)
        return
      }
      router.refresh()
    })
  }

  // Browser unload navigation guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'unsaved' || saveStatus === 'saving') {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [saveStatus])

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-[1600px] mx-auto space-y-2.5 pb-4">
      {/* User Toast Notification Banner */}
      {notification && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs font-mono animate-in fade-in shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{notification}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="p-1 hover:bg-destructive/20 rounded text-destructive"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground min-w-0">
          <Link
            href={`/vault/projects/${projectId}/workbench`}
            className="flex items-center gap-1 hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Workbench</span>
          </Link>
          <span>/</span>
          <span className="text-foreground truncate max-w-xs">{projectName}</span>
        </div>

        {/* Action Controls & Autosave Indicator */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Save Status Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border border-border bg-secondary/60">
            {saveStatus === 'saved' && (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span className="text-muted-foreground">Saved</span>
              </>
            )}
            {saveStatus === 'saving' && (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                <span className="text-primary font-medium">Saving...</span>
              </>
            )}
            {saveStatus === 'unsaved' && (
              <>
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-muted-foreground">Unsaved</span>
              </>
            )}
            {saveStatus === 'error' && (
              <button
                onClick={executeAutosave}
                className="flex items-center gap-1 text-destructive hover:underline"
                title={errorMessage || 'Retry Save'}
              >
                <AlertCircle className="w-3 h-3" />
                <span>Save failed (retry)</span>
              </button>
            )}
          </div>

          {/* CSV Import / Export */}
          <button
            onClick={() => csvInputRef.current?.click()}
            title="Import CSV into sheet"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Import CSV</span>
          </button>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleCSVImport}
          />

          <button
            onClick={handleCSVExport}
            title="Export sheet to CSV"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Archive / Restore */}
          <button
            onClick={handleToggleArchive}
            disabled={isPending}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            {isArchived ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 text-emerald-500" />
                <span>Restore</span>
              </>
            ) : (
              <>
                <Archive className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Archive</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Editable Title Input */}
      <div className="flex items-center gap-2 shrink-0">
        <TableIcon className="w-5 h-5 text-primary shrink-0" />
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            setSaveStatus('unsaved')
          }}
          onBlur={handleTitleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur()
            }
          }}
          placeholder="Untitled Spreadsheet"
          className="font-serif text-2xl font-medium text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none w-full max-w-xl transition-colors py-0.5"
        />
      </div>

      {/* 3. Toolbar & Formula Bar */}
      <div className="flex flex-wrap items-center gap-2 px-2.5 py-1 rounded-lg border border-border bg-muted/20 shrink-0 text-xs font-mono">
        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            disabled={!canUndo}
            onClick={handleUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded hover:bg-secondary text-foreground disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={!canRedo}
            onClick={handleRedo}
            title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
            className="p-1.5 rounded hover:bg-secondary text-foreground disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="w-px h-4 bg-border" />

        {/* Text Alignment */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => handleSetAlignment('left')}
            title="Align Left"
            className="p-1.5 rounded hover:bg-secondary text-foreground transition-colors"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleSetAlignment('center')}
            title="Align Center"
            className="p-1.5 rounded hover:bg-secondary text-foreground transition-colors"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleSetAlignment('right')}
            title="Align Right"
            className="p-1.5 rounded hover:bg-secondary text-foreground transition-colors"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="w-px h-4 bg-border" />

        {/* Merge / Unmerge */}
        <button
          type="button"
          onClick={handleToggleMerge}
          title={isCurrentCellMerged ? 'Unmerge Cells' : 'Merge Selected Cells'}
          className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors text-[11px]"
        >
          {isCurrentCellMerged ? (
            <>
              <Split className="w-3 h-3 text-amber-500" />
              <span>Unmerge</span>
            </>
          ) : (
            <>
              <Combine className="w-3 h-3 text-primary" />
              <span>Merge</span>
            </>
          )}
        </button>

        <div className="w-px h-4 bg-border" />

        {/* Active Cell Coord & Input */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <div className="w-12 text-center font-semibold text-primary px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 shrink-0 select-none text-[11px]">
            {activeCellCoord}
          </div>
          <input
            type="text"
            value={activeCellValue}
            onChange={(e) => handleCellInputChange(e.target.value)}
            placeholder="Enter text, numbers, or dates..."
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/60 border-none outline-none font-mono text-xs px-1"
          />
        </div>
      </div>

      {/* 4. Main Spreadsheet Grid */}
      <div className="flex-1 min-h-0 relative">
        <SpreadsheetGrid
          sheet={activeSheet}
          onChange={handleGridChange}
          onActiveCellChange={handleActiveCellChange}
          selectedRange={selectedRange}
          onRangeSelect={setSelectedRange}
          onNotification={(msg) => setNotification(msg)}
        />
      </div>

      {/* 5. Bottom Status Bar */}
      <div className="flex items-center justify-between px-2 pt-1 text-[11px] font-mono text-muted-foreground shrink-0 border-t border-border">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-secondary font-medium text-foreground">
            {activeSheet.name}
          </span>
          <span>
            {activeSheet.rowCount} rows × {activeSheet.columnCount} cols
          </span>
          {activeSheet.merges && activeSheet.merges.length > 0 && (
            <span className="text-muted-foreground/70">
              ({activeSheet.merges.length} merged range{activeSheet.merges.length > 1 ? 's' : ''})
            </span>
          )}
        </div>
        <div>
          <span>Formulas deferred to V1.2+</span>
        </div>
      </div>
    </div>
  )
}