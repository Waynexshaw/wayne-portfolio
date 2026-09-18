'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FolderPlus, Loader2, X } from 'lucide-react'
import { createProjectFolder, updateProjectFolder } from '@/lib/vault/workbench-actions'
import { ProjectFolder } from '@/lib/vault/workbench/types'

interface FolderModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  workspaceId: string
  parentFolderId?: string | null
  existingFolder?: ProjectFolder | null
}

export function FolderModal({
  isOpen,
  onClose,
  projectId,
  workspaceId,
  parentFolderId,
  existingFolder,
}: FolderModalProps) {
  const router = useRouter()
  const [name, setName] = useState(existingFolder?.name || '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!isOpen) return null

  const isEditing = !!existingFolder

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Folder name cannot be empty')
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        if (isEditing) {
          await updateProjectFolder(existingFolder.id, projectId, workspaceId, { name: trimmed })
        } else {
          await createProjectFolder(projectId, workspaceId, {
            name: trimmed,
            parentFolderId: parentFolderId || null,
          })
        }
        onClose()
        router.refresh()
      } catch (err: any) {
        setError(err.message || 'Failed to save folder')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              {isEditing ? 'Rename Folder' : 'Create New Folder'}
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

          <div className="space-y-1.5">
            <label htmlFor="folder-name" className="text-xs font-mono uppercase text-muted-foreground">
              Folder Name
            </label>
            <input
              id="folder-name"
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Technical Specs, Financials, Media"
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
            />
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
              disabled={isPending || !name.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
