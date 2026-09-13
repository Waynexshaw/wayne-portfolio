'use client'

import { useState } from 'react'
import { Plus, X, FolderGit2, Shield } from 'lucide-react'
import { createWorkspaceProject } from '@/lib/vault/actions'

interface ProjectCreateButtonProps {
  workspaceId?: string
  workspaceName?: string
  identities: any[]
}

export function ProjectCreateButton({
  workspaceId,
  workspaceName,
  identities,
}: ProjectCreateButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!workspaceId) {
      setError('No active workspace selected')
      return
    }

    setLoading(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const title = (form.get('title') as string)?.trim()
    if (!title) {
      setError('Project title cannot be empty')
      setLoading(false)
      return
    }

    try {
      await createWorkspaceProject({
        workspaceId,
        identityId: (form.get('identityId') as string) || undefined,
        title,
        description: (form.get('description') as string) || undefined,
        status: (form.get('status') as any) || 'active',
        priority: (form.get('priority') as any) || 'medium',
        startDate: (form.get('startDate') as string) || undefined,
        targetDate: (form.get('targetDate') as string) || undefined,
      })
      setIsOpen(false)
    } catch (err: any) {
      setError(err.message || 'Failed to create workspace project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm"
      >
        <Plus className="w-3.5 h-3.5" />
        Create Project
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-card border border-border p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <FolderGit2 className="w-4 h-4 text-purple-400" />
                  <h2 className="font-serif text-lg font-medium text-foreground">
                    Create Workspace Project
                  </h2>
                </div>
                {workspaceName && (
                  <p className="text-[11px] font-mono text-muted-foreground">
                    Workspace: <span className="text-foreground font-semibold">{workspaceName}</span>
                  </p>
                )}
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">
                  Project Title *
                </label>
                <input
                  required
                  name="title"
                  placeholder="e.g. Protocol Governance V2 Architecture"
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">
                    Status
                  </label>
                  <select
                    name="status"
                    defaultValue="active"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">
                    Priority
                  </label>
                  <select
                    name="priority"
                    defaultValue="medium"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">
                  Operating Identity
                </label>
                <select
                  name="identityId"
                  defaultValue=""
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                >
                  <option value="">Workspace Default Identity</option>
                  {identities.map((id: any) => (
                    <option key={id.id} value={id.id}>
                      {id.name} (@{id.handle || id.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">
                    Target Date / Deadline
                  </label>
                  <input
                    type="date"
                    name="targetDate"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">
                  Description / Deliverables
                </label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Define scope, milestones, technical deliverables, or goals..."
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors shadow-sm"
                >
                  {loading ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
