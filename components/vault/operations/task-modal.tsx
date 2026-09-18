'use client'

import { useState, useTransition, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Task, TaskStatus, TaskPriority } from '@/lib/vault/operations/types'
import { createTaskAction, updateTaskAction } from '@/lib/vault/operations-actions'

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
  task?: Task | null
  prefill?: {
    projectId?: string | null
    meetingId?: string | null
    decisionId?: string | null
  }
  projects?: { id: string; title: string }[]
  meetings?: { id: string; title: string }[]
  decisions?: { id: string; title: string }[]
  onSuccess?: (savedTask: Task) => void
}

export function TaskModal({
  isOpen,
  onClose,
  workspaceId,
  task,
  prefill,
  projects = [],
  meetings = [],
  decisions = [],
  onSuccess,
}: TaskModalProps) {
  const isEditing = Boolean(task)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [projectId, setProjectId] = useState<string>('')
  const [meetingId, setMeetingId] = useState<string>('')
  const [decisionId, setDecisionId] = useState<string>('')

  useEffect(() => {
    if (task) {
      setTitle(task.title || '')
      setDescription(task.description || '')
      setStatus(task.status || 'todo')
      setPriority(task.priority || 'medium')
      setDueDate(task.due_date || '')
      setProjectId(task.project_id || '')
      setMeetingId(task.meeting_id || '')
      setDecisionId(task.decision_id || '')
    } else {
      setTitle('')
      setDescription('')
      setStatus('todo')
      setPriority('medium')
      setDueDate('')
      setProjectId(prefill?.projectId || '')
      setMeetingId(prefill?.meetingId || '')
      setDecisionId(prefill?.decisionId || '')
    }
    setError(null)
  }, [task, prefill, isOpen])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Task title is required')
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        if (isEditing && task) {
          const updated = await updateTaskAction(workspaceId, task.id, {
            title: title.trim(),
            description: description.trim() || null,
            status,
            priority,
            due_date: dueDate || null,
            project_id: projectId || null,
            meeting_id: meetingId || null,
            decision_id: decisionId || null,
          })
          onSuccess?.(updated)
        } else {
          const created = await createTaskAction(workspaceId, {
            title: title.trim(),
            description: description.trim() || null,
            status,
            priority,
            due_date: dueDate || null,
            project_id: projectId || null,
            meeting_id: meetingId || null,
            decision_id: decisionId || null,
          })
          onSuccess?.(created)
        }
        onClose()
      } catch (err: any) {
        setError(err.message || 'Failed to save task')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-0">
      <div className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h2 className="font-serif text-lg font-semibold text-foreground">
            {isEditing ? 'Edit Task' : 'New Task'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-foreground mb-1">
              Title <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add optional context or checklist..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-foreground mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary capitalize"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="blocked">Blocked</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-foreground mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary capitalize"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-3 pt-2 border-t border-border">
            <div>
              <label className="block font-medium text-muted-foreground mb-1">Linked Project</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">None (Workspace General)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            {meetings.length > 0 && (
              <div>
                <label className="block font-medium text-muted-foreground mb-1">Linked Meeting</label>
                <select
                  value={meetingId}
                  onChange={(e) => setMeetingId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">None</option>
                  {meetings.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {decisions.length > 0 && (
              <div>
                <label className="block font-medium text-muted-foreground mb-1">Linked Decision</label>
                <select
                  value={decisionId}
                  onChange={(e) => setDecisionId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">None</option>
                  {decisions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isEditing ? 'Save Changes' : 'Create Task'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
