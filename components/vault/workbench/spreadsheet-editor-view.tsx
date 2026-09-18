'use client'

import { useState, useEffect, useRef, useTransition, useCallback } from 'react'
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
} from 'lucide-react'
import {
  ProjectSpreadsheet,
  SpreadsheetData,
  SpreadsheetCell,
} from '@/lib/vault/workbench/types'
import {
  updateProjectSpreadsheet,
  archiveProjectSpreadsheet,
  restoreProjectSpreadsheet,
} from '@/lib/vault/workbench-actions'
import { exportSheetToCSV, importCSVToSheet } from '@/lib/vault/workbench/csv-utils'
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
  const [data, setData] = useState<SpreadsheetData>(spreadsheet.data)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [activeCellCoord, setActiveCellCoord] = useState('A1')
  const [activeCellValue, setActiveCellValue] = useState('')
  const [isPending, startTransition] = useTransition()

  const csvInputRef = useRef<HTMLInputElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const latestDataRef = useRef<SpreadsheetData>(data)
  const latestTitleRef = useRef<string>(title)

  latestDataRef.current = data
  latestTitleRef.current = title

  const isArchived = !!spreadsheet.archived_at

  // Active sheet
  const activeSheet = data.sheets?.[0] || {
    id: 'sheet-1',
    name: 'Sheet1',
    rowCount: 50,
    columnCount: 20,
    columnWidths: {},
    cells: {},
  }

  // Update active cell value for formula bar
  const handleActiveCellChange = useCallback((coord: string, cell: SpreadsheetCell | null) => {
    setActiveCellCoord(coord)
    setActiveCellValue(cell?.raw !== undefined && cell?.raw !== null ? String(cell.raw) : '')
  }, [])

  // Cell input bar manual edit
  const handleCellInputChange = (val: string) => {
    setActiveCellValue(val)
    const trimmed = val.trim()
    const updatedCells = { ...activeSheet.cells }

    if (trimmed === '') {
      delete updatedCells[activeCellCoord]
    } else {
      const isNum = !isNaN(Number(trimmed)) && !/^0[0-9]+/.test(trimmed)
      updatedCells[activeCellCoord] = {
        raw: isNum ? Number(trimmed) : trimmed,
        type: isNum ? 'number' : 'text',
      }
    }

    handleGridChange({
      ...activeSheet,
      cells: updatedCells,
    })
  }

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

  // Grid data change triggers debounced autosave
  const handleGridChange = (updatedSheet: typeof activeSheet) => {
    const updatedData: SpreadsheetData = {
      ...data,
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
  }

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
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}.csv`)
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
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-[1600px] mx-auto space-y-3 pb-4">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border shrink-0">
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

      {/* 3. Active Cell Input Bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/30 shrink-0 text-xs font-mono">
        <div className="w-14 text-center font-semibold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20 shrink-0 select-none">
          {activeCellCoord}
        </div>
        <div className="w-px h-4 bg-border" />
        <span className="text-[10px] text-muted-foreground font-mono select-none uppercase">Cell</span>
        <input
          type="text"
          value={activeCellValue}
          onChange={(e) => handleCellInputChange(e.target.value)}
          placeholder="Enter text, numbers, or dates..."
          className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/60 border-none outline-none font-mono text-xs"
        />
      </div>

      {/* 4. Main Spreadsheet Grid */}
      <div className="flex-1 min-h-0 relative">
        <SpreadsheetGrid
          sheet={activeSheet}
          onChange={handleGridChange}
          onActiveCellChange={handleActiveCellChange}
        />
      </div>

      {/* 5. Bottom Status Bar */}
      <div className="flex items-center justify-between px-2 pt-1 text-[11px] font-mono text-muted-foreground shrink-0 border-t border-border">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-secondary font-medium text-foreground">
            {activeSheet.name}
          </span>
          <span>{activeSheet.rowCount} rows × {activeSheet.columnCount} cols</span>
        </div>
        <div>
          <span>Formulas deferred to V1.1+</span>
        </div>
      </div>
    </div>
  )
}
