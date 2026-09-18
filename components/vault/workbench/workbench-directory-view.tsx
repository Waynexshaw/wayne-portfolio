'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Folder as FolderIcon,
  FileText,
  Table as TableIcon,
  File as FileIcon,
  Plus,
  Upload,
  Search,
  MoreVertical,
  Edit2,
  FolderInput,
  Archive,
  RotateCcw,
  Eye,
  ArrowLeft,
  ChevronRight,
  FolderPlus,
  Loader2,
  Layers,
} from 'lucide-react'
import {
  WorkbenchDirectoryItem,
  ProjectFolder,
  FolderBreadcrumb,
  WorkbenchStats,
  WorkbenchItemType,
} from '@/lib/vault/workbench/types'
import {
  archiveProjectFolder,
  restoreProjectFolder,
  archiveProjectDocument,
  restoreProjectDocument,
  archiveProjectSpreadsheet,
  restoreProjectSpreadsheet,
  archiveProjectFile,
  restoreProjectFile,
  createProjectDocument,
  createProjectSpreadsheet,
} from '@/lib/vault/workbench-actions'
import { FolderModal } from './folder-modal'
import { FileUploadModal } from './file-upload-modal'
import { FilePreviewModal } from './file-preview-modal'
import { ArtifactRenameModal } from './artifact-rename-modal'
import { ArtifactMoveModal } from './artifact-move-modal'

interface WorkbenchDirectoryViewProps {
  items: WorkbenchDirectoryItem[]
  currentFolder: ProjectFolder | null
  breadcrumbs: FolderBreadcrumb[]
  stats: WorkbenchStats
  projectId: string
  workspaceId: string
  projectName: string
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function WorkbenchDirectoryView({
  items,
  currentFolder,
  breadcrumbs,
  stats,
  projectId,
  workspaceId,
  projectName,
}: WorkbenchDirectoryViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'documents' | 'spreadsheets' | 'files'>('all')
  const [showArchived, setShowArchived] = useState(searchParams.get('archived') === 'true')
  const [isPending, startTransition] = useTransition()

  // Modals state
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false)
  const [folderToEdit, setFolderToEdit] = useState<ProjectFolder | null>(null)

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)

  const [previewFileId, setPreviewFileId] = useState<string | null>(null)

  const [renameItem, setRenameItem] = useState<{
    id: string
    name: string
    type: WorkbenchItemType
  } | null>(null)

  const [moveItem, setMoveItem] = useState<{
    id: string
    name: string
    type: WorkbenchItemType
    folderId: string | null
  } | null>(null)

  const [isCreateDocOpen, setIsCreateDocOpen] = useState(false)
  const [newDocTitle, setNewDocTitle] = useState('')

  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false)
  const [newSheetTitle, setNewSheetTitle] = useState('')

  // 1. Structural folders in the current view (organizational navigation, filtered only by search)
  const folders = items.filter((item) => {
    if (item.type !== 'folder') return false
    if (searchQuery.trim()) {
      return item.name.toLowerCase().includes(searchQuery.toLowerCase())
    }
    return true
  })

  // 2. Artifacts in the current view (filtered by typeFilter and search)
  const artifacts = items.filter((item) => {
    if (item.type === 'folder') return false
    if (typeFilter === 'documents' && item.type !== 'document') return false
    if (typeFilter === 'spreadsheets' && item.type !== 'spreadsheet') return false
    if (typeFilter === 'files' && item.type !== 'file') return false

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchesName = item.name.toLowerCase().includes(q)
      const matchesSnippet = item.plainTextSnippet?.toLowerCase().includes(q)
      return matchesName || matchesSnippet
    }

    return true
  })

  // Handle Archive / Restore
  const handleToggleArchive = (item: WorkbenchDirectoryItem) => {
    startTransition(async () => {
      if (item.archivedAt) {
        // Restore
        if (item.type === 'folder') await restoreProjectFolder(item.id, projectId, workspaceId)
        if (item.type === 'document') await restoreProjectDocument(item.id, projectId, workspaceId)
        if (item.type === 'spreadsheet') await restoreProjectSpreadsheet(item.id, projectId, workspaceId)
        if (item.type === 'file') await restoreProjectFile(item.id, projectId, workspaceId)
      } else {
        // Archive
        if (item.type === 'folder') await archiveProjectFolder(item.id, projectId, workspaceId)
        if (item.type === 'document') await archiveProjectDocument(item.id, projectId, workspaceId)
        if (item.type === 'spreadsheet') await archiveProjectSpreadsheet(item.id, projectId, workspaceId)
        if (item.type === 'file') await archiveProjectFile(item.id, projectId, workspaceId)
      }
      router.refresh()
    })
  }

  // Create Document
  const handleCreateDocument = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      try {
        const doc = await createProjectDocument(projectId, workspaceId, {
          title: newDocTitle.trim() || 'Untitled Document',
          folderId: currentFolder?.id || null,
        })
        setIsCreateDocOpen(false)
        setNewDocTitle('')
        router.push(`/vault/projects/${projectId}/documents/${doc.id}`)
      } catch (err: any) {
        alert(err.message || 'Failed to create document')
      }
    })
  }

  // Create Spreadsheet
  const handleCreateSpreadsheet = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      try {
        const sheet = await createProjectSpreadsheet(projectId, workspaceId, {
          title: newSheetTitle.trim() || 'Untitled Spreadsheet',
          folderId: currentFolder?.id || null,
        })
        setIsCreateSheetOpen(false)
        setNewSheetTitle('')
        router.push(`/vault/projects/${projectId}/spreadsheets/${sheet.id}`)
      } catch (err: any) {
        alert(err.message || 'Failed to create spreadsheet')
      }
    })
  }

  const toggleArchivedView = () => {
    const next = !showArchived
    setShowArchived(next)
    const params = new URLSearchParams(searchParams.toString())
    if (next) {
      params.set('archived', 'true')
    } else {
      params.delete('archived')
    }
    router.push(`/vault/projects/${projectId}/workbench?${params.toString()}`)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. Breadcrumb & Back to Project */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground flex-wrap">
          <Link
            href={`/vault/projects/${projectId}`}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Project Overview</span>
          </Link>
          <span>/</span>

          {breadcrumbs.map((bc, idx) => {
            const isLast = idx === breadcrumbs.length - 1
            const href = bc.id
              ? `/vault/projects/${projectId}/workbench?folder=${bc.id}`
              : `/vault/projects/${projectId}/workbench`

            if (isLast) {
              return (
                <span key={idx} className="text-foreground font-medium">
                  {bc.name}
                </span>
              )
            }

            return (
              <div key={idx} className="flex items-center gap-2">
                <Link href={href} className="hover:text-foreground transition-colors">
                  {bc.name}
                </Link>
                <span>/</span>
              </div>
            )
          })}
        </div>

        {/* Project Name context */}
        <span className="text-xs font-mono text-muted-foreground hidden sm:inline">
          Project: <strong className="text-foreground font-medium">{projectName}</strong>
        </span>
      </div>

      {/* 2. Workbench Header Card */}
      <div className="p-6 rounded-2xl bg-card border border-border flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-3xl font-medium text-foreground tracking-tight">
              {currentFolder ? currentFolder.name : 'Project Workbench'}
            </h1>
            {showArchived && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                Archived View
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {currentFolder
              ? 'Folder contents and nested working materials'
              : 'Working environment for documents, spreadsheets, files, and folders'}
          </p>

          {/* Quick Stats */}
          <div className="flex items-center gap-3 pt-2 text-[11px] font-mono text-muted-foreground">
            <span>{stats.documentsCount} docs</span>
            <span>•</span>
            <span>{stats.spreadsheetsCount} sheets</span>
            <span>•</span>
            <span>{stats.filesCount} files</span>
            <span>•</span>
            <span>{stats.foldersCount} folders</span>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* New Document Button */}
          <button
            onClick={() => {
              setNewDocTitle('')
              setIsCreateDocOpen(true)
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Document</span>
          </button>

          {/* New Spreadsheet Button */}
          <button
            onClick={() => {
              setNewSheetTitle('')
              setIsCreateSheetOpen(true)
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium transition-colors border border-border"
          >
            <TableIcon className="w-3.5 h-3.5 text-primary" />
            <span>New Sheet</span>
          </button>

          {/* Upload File Button */}
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium transition-colors border border-border"
          >
            <Upload className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Upload File</span>
          </button>

          {/* New Folder Button */}
          <button
            onClick={() => {
              setFolderToEdit(null)
              setIsFolderModalOpen(true)
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium transition-colors border border-border"
          >
            <FolderPlus className="w-3.5 h-3.5 text-muted-foreground" />
            <span>New Folder</span>
          </button>
        </div>
      </div>

      {/* 3. Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search artifacts, documents, files..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-card border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/60 font-mono"
          />
        </div>

        {/* Type Filter Pills & Archived Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center p-0.5 rounded-lg border border-border bg-muted/30 text-xs font-mono">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                typeFilter === 'all'
                  ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setTypeFilter('documents')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                typeFilter === 'documents'
                  ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Documents
            </button>
            <button
              onClick={() => setTypeFilter('spreadsheets')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                typeFilter === 'spreadsheets'
                  ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Spreadsheets
            </button>
            <button
              onClick={() => setTypeFilter('files')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                typeFilter === 'files'
                  ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Files
            </button>
          </div>

          {/* Show Archived Toggle */}
          <button
            onClick={toggleArchivedView}
            className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-colors ${
              showArchived
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-500 font-medium'
                : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            {showArchived ? 'Viewing Archived' : 'Show Archived'}
          </button>
        </div>
      </div>

      {/* 4. Folders Grid (If any in current location) */}
      {folders.length > 0 && (
        <div className="space-y-2.5">
          <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Folders ({folders.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {folders.map((f) => (
              <div
                key={f.id}
                className="group relative p-3.5 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors flex items-center justify-between gap-2"
              >
                <Link
                  href={`/vault/projects/${projectId}/workbench?folder=${f.id}${
                    showArchived ? '&archived=true' : ''
                  }`}
                  className="flex items-center gap-2.5 min-w-0 flex-1"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <FolderIcon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {f.name}
                    </h3>
                    <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                      {formatDate(f.updatedAt)}
                    </p>
                  </div>
                </Link>

                {/* Folder Actions Menu */}
                <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                  <button
                    onClick={() => {
                      setRenameItem({ id: f.id, name: f.name, type: 'folder' })
                    }}
                    title="Rename Folder"
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setMoveItem({
                        id: f.id,
                        name: f.name,
                        type: 'folder',
                        folderId: f.folderId,
                      })
                    }}
                    title="Move Folder"
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <FolderInput className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleToggleArchive(f)}
                    title={f.archivedAt ? 'Restore Folder' : 'Archive Folder'}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    {f.archivedAt ? (
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Archive className="w-3.5 h-3.5 hover:text-destructive" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Artifacts List (Documents, Spreadsheets, Files) */}
      <div className="space-y-2.5">
        <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
          Artifacts ({artifacts.length})
        </h2>

        {artifacts.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-xs bg-card border border-border rounded-xl space-y-3">
            <Layers className="w-8 h-8 mx-auto opacity-30 text-muted-foreground" />
            <p>
              {searchQuery
                ? 'No artifacts match your search query.'
                : 'No documents, spreadsheets, or files in this location.'}
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                onClick={() => {
                  setNewDocTitle('')
                  setIsCreateDocOpen(true)
                }}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 transition-colors shadow-sm"
              >
                Create Document
              </button>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground font-medium text-xs transition-colors"
              >
                Upload File
              </button>
            </div>
          </div>
        ) : (
          <div className="border border-border rounded-xl bg-card overflow-hidden divide-y divide-border">
            {artifacts.map((item) => {
              const isDoc = item.type === 'document'
              const isSheet = item.type === 'spreadsheet'
              const isFile = item.type === 'file'

              let targetHref = '#'
              if (isDoc) targetHref = `/vault/projects/${projectId}/documents/${item.id}`
              if (isSheet) targetHref = `/vault/projects/${projectId}/spreadsheets/${item.id}`

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3.5 hover:bg-muted/20 transition-colors group gap-4"
                >
                  {/* Left: Icon + Title + Snippet/Metadata */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Item Type Icon */}
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 border border-border">
                      {isDoc && <FileText className="w-4 h-4 text-primary" />}
                      {isSheet && <TableIcon className="w-4 h-4 text-teal-500" />}
                      {isFile && <FileIcon className="w-4 h-4 text-muted-foreground" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      {isFile ? (
                        <button
                          onClick={() => setPreviewFileId(item.id)}
                          className="text-xs font-medium text-foreground hover:text-primary transition-colors truncate block text-left"
                        >
                          {item.name}
                        </button>
                      ) : (
                        <Link
                          href={targetHref}
                          className="text-xs font-medium text-foreground group-hover:text-primary transition-colors truncate block"
                        >
                          {item.name}
                        </Link>
                      )}

                      {/* Sub-text: Snippet or file metadata */}
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        <span className="capitalize font-mono text-[10px]">
                          {item.type}
                        </span>
                        {item.sizeBytes && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-[10px]">
                              {formatBytes(item.sizeBytes)}
                            </span>
                          </>
                        )}
                        {item.plainTextSnippet && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-xs sm:max-w-md hidden sm:inline text-muted-foreground/80">
                              {item.plainTextSnippet}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Updated Date & Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] font-mono text-muted-foreground hidden md:inline">
                      {formatDate(item.updatedAt)}
                    </span>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      {isFile && (
                        <button
                          onClick={() => setPreviewFileId(item.id)}
                          title="Preview / Download"
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() =>
                          setRenameItem({
                            id: item.id,
                            name: item.name,
                            type: item.type,
                          })
                        }
                        title="Rename"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() =>
                          setMoveItem({
                            id: item.id,
                            name: item.name,
                            type: item.type,
                            folderId: item.folderId,
                          })
                        }
                        title="Move to Folder"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        <FolderInput className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleToggleArchive(item)}
                        title={item.archivedAt ? 'Restore' : 'Archive'}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        {item.archivedAt ? (
                          <RotateCcw className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Archive className="w-3.5 h-3.5 hover:text-destructive" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <FolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        projectId={projectId}
        workspaceId={workspaceId}
        parentFolderId={currentFolder?.id || null}
        existingFolder={folderToEdit}
      />

      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        projectId={projectId}
        workspaceId={workspaceId}
        folderId={currentFolder?.id || null}
      />

      <FilePreviewModal
        isOpen={!!previewFileId}
        onClose={() => setPreviewFileId(null)}
        projectId={projectId}
        workspaceId={workspaceId}
        fileId={previewFileId}
      />

      <ArtifactRenameModal
        isOpen={!!renameItem}
        onClose={() => setRenameItem(null)}
        projectId={projectId}
        workspaceId={workspaceId}
        item={renameItem}
      />

      <ArtifactMoveModal
        isOpen={!!moveItem}
        onClose={() => setMoveItem(null)}
        projectId={projectId}
        workspaceId={workspaceId}
        item={moveItem}
      />

      {/* Quick Create Document Modal */}
      {isCreateDocOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-xl overflow-hidden p-4 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Create New Document</h3>
            <form onSubmit={handleCreateDocument} className="space-y-4">
              <div>
                <label className="text-xs font-mono uppercase text-muted-foreground">Document Title</label>
                <input
                  type="text"
                  autoFocus
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  placeholder="e.g. Project Charter, Technical Spec"
                  className="w-full mt-1 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateDocOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Create & Open
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Create Spreadsheet Modal */}
      {isCreateSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-xl overflow-hidden p-4 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Create New Spreadsheet</h3>
            <form onSubmit={handleCreateSpreadsheet} className="space-y-4">
              <div>
                <label className="text-xs font-mono uppercase text-muted-foreground">Spreadsheet Title</label>
                <input
                  type="text"
                  autoFocus
                  value={newSheetTitle}
                  onChange={(e) => setNewSheetTitle(e.target.value)}
                  placeholder="e.g. Budget Model, Milestone Tracker"
                  className="w-full mt-1 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateSheetOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Create & Open
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
