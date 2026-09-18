'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FolderInput, Loader2, X, Folder } from 'lucide-react'
import {
  getProjectFolders,
  moveProjectFolder,
  moveProjectDocument,
  moveProjectSpreadsheet,
  moveProjectFile,
} from '@/lib/vault/workbench-actions'
import { ProjectFolder, WorkbenchItemType } from '@/lib/vault/workbench/types'

interface ArtifactMoveModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  workspaceId: string
  item: {
    id: string
    name: string
    type: WorkbenchItemType
    folderId: string | null
  } | null
}

export function ArtifactMoveModal({
  isOpen,
  onClose,
  projectId,
  workspaceId,
  item,
}: ArtifactMoveModalProps) {
  const router = useRouter()
  const [folders, setFolders] = useState<ProjectFolder[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(item?.folderId || null)
  const [loadingFolders, setLoadingFolders] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (isOpen) {
      setLoadingFolders(true)
      getProjectFolders(projectId, workspaceId)
        .then((data) => {
          setFolders(data)
          setSelectedFolderId(item?.folderId || null)
          setLoadingFolders(false)
        })
        .catch((err) => {
          setError(err.message || 'Failed to load folders')
          setLoadingFolders(false)
        })
    }
  }, [isOpen, projectId, workspaceId, item])

  if (!isOpen || !item) return null

  // Find all descendant folder IDs if the item being moved is a folder
  const disabledFolderIds = new Set<string>()
  if (item.type === 'folder') {
    disabledFolderIds.add(item.id)
    const findDescendants = (parentId: string) => {
      for (const f of folders) {
        if (f.parent_folder_id === parentId) {
          disabledFolderIds.add(f.id)
          findDescendants(f.id)
        }
      }
    }
    findDescendants(item.id)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        if (item.type === 'folder') {
          await moveProjectFolder(item.id, selectedFolderId, projectId, workspaceId)
        } else if (item.type === 'document') {
          await moveProjectDocument(item.id, selectedFolderId, projectId, workspaceId)
        } else if (item.type === 'spreadsheet') {
          await moveProjectSpreadsheet(item.id, selectedFolderId, projectId, workspaceId)
        } else if (item.type === 'file') {
          await moveProjectFile(item.id, selectedFolderId, projectId, workspaceId)
        }
        onClose()
        router.refresh()
      } catch (err: any) {
        setError(err.message || 'Failed to move artifact')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FolderInput className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Move &ldquo;{item.name}&rdquo;
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-mono uppercase text-muted-foreground">
              Select Destination
            </label>

            {loadingFolders ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2 text-primary" />
                Loading folders...
              </div>
            ) : (
              <div className="border border-border rounded-lg max-h-60 overflow-y-auto p-1 space-y-1 bg-background">
                {/* Root Option */}
                <button
                  type="button"
                  onClick={() => setSelectedFolderId(null)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md transition-colors text-left ${
                    selectedFolderId === null
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-secondary text-foreground'
                  }`}
                >
                  <Folder className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>Workbench Root</span>
                  {item.folderId === null && (
                    <span className="ml-auto text-[10px] text-muted-foreground">(Current)</span>
                  )}
                </button>

                {/* Folders List */}
                {folders.map((f) => {
                  const isDisabled = disabledFolderIds.has(f.id)
                  const isCurrent = item.folderId === f.id
                  const isSelected = selectedFolderId === f.id

                  return (
                    <button
                      key={f.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => !isDisabled && setSelectedFolderId(f.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md transition-colors text-left ${
                        isDisabled
                          ? 'opacity-40 cursor-not-allowed text-muted-foreground'
                          : isSelected
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'hover:bg-secondary text-foreground'
                      }`}
                    >
                      <Folder className="w-4 h-4 text-primary shrink-0" />
                      <span className="truncate">{f.name}</span>
                      {isCurrent && (
                        <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
                          (Current)
                        </span>
                      )}
                      {isDisabled && item.id === f.id && (
                        <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
                          (Self)
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || selectedFolderId === item.folderId}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Move Item
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
