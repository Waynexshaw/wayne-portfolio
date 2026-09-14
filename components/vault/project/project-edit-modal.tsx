'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2, AlertCircle, Edit3 } from 'lucide-react'
import {
  updateWorkspaceProject,
  WorkspaceProjectDetail,
  WorkspaceProjectPriority,
} from '@/lib/vault/actions'

export interface ProjectEditModalProps {
  isOpen: boolean
  onClose: () => void
  project: WorkspaceProjectDetail
  workspaceId: string
  identities?: { id: string; name: string; handle?: string | null }[]
  onSuccess?: () => void
}

const PRIORITIES: { value: WorkspaceProjectPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export function ProjectEditModal({
  isOpen,
  onClose,
  project,
  workspaceId,
  identities = [],
  onSuccess,
}: ProjectEditModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState(project.title)
  const [description, setDescription] = useState(project.description || '')
  const [priority, setPriority] = useState<WorkspaceProjectPriority>(project.priority)
  const [identityId, setIdentityId] = useState<string>(project.identity_id || '')
  const [startDate, setStartDate] = useState<string>(project.start_date || '')
  const [targetDate, setTargetDate] = useState<string>(project.target_date || '')

  useEffect(() => {
    if (isOpen) {
      setTitle(project.title)
      setDescription(project.description || '')
      setPriority(project.priority)
      setIdentityId(project.identity_id || '')
      setStartDate(project.start_date || '')
      setTargetDate(project.target_date || '')
      setError(null)
    }
  }, [isOpen, project])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    if (startDate && targetDate && targetDate < startDate) {
      setError('Target date cannot be earlier than start date')
      return
    }

    startTransition(async () => {
      try {
        await updateWorkspaceProject(project.id, workspaceId, {
          title: title.trim(),
          description: description.trim() || null,
          priority,
          identityId: identityId || null,
          startDate: startDate || null,
          targetDate: targetDate || null,
        })
        onClose()
        router.refresh()
        onSuccess?.()
      } catch (err: any) {
        setError(err.message || 'Failed to update project')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-xl rounded-2xl bg-card border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Edit Project Details</h2>
              <p className="text-xs text-muted-foreground">Modify operational scope, dates, and assignments</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Title <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are the goals, context, and expected results of this project?"
              className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
            />
          </div>

          {/* Priority & Operating Identity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as WorkspaceProjectPriority)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Operating Identity
              </label>
              <select
                value={identityId}
                onChange={(e) => setIdentityId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              >
                <option value="">None (Workspace Default)</option>
                {identities.map((id) => (
                  <option key={id.id} value={id.id}>
                    {id.name} {id.handle ? `(@${id.handle})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Start Date & Target Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Target Date
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
