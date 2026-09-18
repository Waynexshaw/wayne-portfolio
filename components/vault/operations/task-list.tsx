'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Calendar,
  FolderGit2,
  Video,
  FileText,
  Edit3,
  Archive,
  RotateCcw,
  Loader2,
} from 'lucide-react'
import { Task, TaskStatus, TaskPriority } from '@/lib/vault/operations/types'
import {
  toggleTaskCompleteAction,
  archiveTaskAction,
  restoreTaskAction,
} from '@/lib/vault/operations-actions'
import { VaultPriorityBadge, VaultStatusBadge } from '@/components/vault/vault-badge'
import { cn } from '@/lib/utils'

interface TaskListProps {
  tasks: Task[]
  workspaceId: string
  isAdmin?: boolean
  onEditTask: (task: Task) => void
  onRefresh?: () => void
}

export function TaskList({
  tasks,
  workspaceId,
  isAdmin = false,
  onEditTask,
  onRefresh,
}: TaskListProps) {
  const [isPending, startTransition] = useTransition()
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)

  const todayStr = new Date().toISOString().split('T')[0]

  const handleToggle = (task: Task) => {
    setActiveTaskId(task.id)
    startTransition(async () => {
      try {
        await toggleTaskCompleteAction(workspaceId, task.id)
        onRefresh?.()
      } catch (err) {
        console.error('Failed to toggle task:', err)
      } finally {
        setActiveTaskId(null)
      }
    })
  }

  const handleArchive = (task: Task) => {
    setActiveTaskId(task.id)
    startTransition(async () => {
      try {
        if (task.archived_at) {
          await restoreTaskAction(workspaceId, task.id)
        } else {
          await archiveTaskAction(workspaceId, task.id)
        }
        onRefresh?.()
      } catch (err) {
        console.error('Failed to archive/restore task:', err)
      } finally {
        setActiveTaskId(null)
      }
    })
  }

  if (tasks.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground text-xs bg-card border border-border rounded-xl space-y-2">
        <CheckCircle2 className="w-8 h-8 mx-auto opacity-30 text-primary" />
        <p className="font-medium text-foreground">No tasks found</p>
        <p className="text-muted-foreground/80">Adjust filters or create your first task above.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => {
        const isCompleted = task.status === 'completed'
        const isCancelled = task.status === 'cancelled'
        const isActionLoading = isPending && activeTaskId === task.id

        // Date attention logic
        const hasDueDate = Boolean(task.due_date)
        const isOverdue = !isCompleted && !isCancelled && hasDueDate && (task.due_date! < todayStr)
        const isDueToday = !isCompleted && !isCancelled && hasDueDate && (task.due_date === todayStr)

        return (
          <div
            key={task.id}
            className={cn(
              'group p-3.5 rounded-xl border bg-card transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3',
              task.archived_at
                ? 'opacity-60 border-border/50 bg-secondary/20'
                : isOverdue
                ? 'border-[#DC143C]/40 bg-[#DC143C]/5 dark:bg-[#DC143C]/10'
                : isDueToday
                ? 'border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10'
                : 'border-border hover:border-border/90'
            )}
          >
            {/* Left: Checkbox + Title + Meta */}
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => handleToggle(task)}
                disabled={isActionLoading || Boolean(task.archived_at)}
                aria-label={isCompleted ? 'Mark task incomplete' : 'Mark task completed'}
                className="mt-0.5 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 shrink-0"
              >
                {isActionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-[#2DB52D]" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
              </button>

              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'text-sm font-medium transition-colors',
                      isCompleted && 'line-through text-muted-foreground',
                      isCancelled && 'line-through text-muted-foreground/70',
                      !isCompleted && !isCancelled && 'text-foreground'
                    )}
                  >
                    {task.title}
                  </span>
                  <VaultPriorityBadge priority={task.priority} />
                  <VaultStatusBadge status={task.status} />
                  {task.archived_at && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      Archived
                    </span>
                  )}
                </div>

                {task.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {task.description}
                  </p>
                )}

                {/* Context Pills */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground pt-0.5">
                  {/* Due Date Indicator */}
                  {hasDueDate && (
                    <div
                      className={cn(
                        'flex items-center gap-1 font-mono text-[11px]',
                        isOverdue && 'text-[#DC143C] font-semibold',
                        isDueToday && 'text-amber-700 dark:text-amber-400 font-semibold',
                        !isOverdue && !isDueToday && 'text-muted-foreground'
                      )}
                    >
                      {isOverdue ? (
                        <AlertCircle className="w-3 h-3" />
                      ) : isDueToday ? (
                        <Clock className="w-3 h-3" />
                      ) : (
                        <Calendar className="w-3 h-3" />
                      )}
                      <span>
                        {isOverdue
                          ? `Overdue (${task.due_date})`
                          : isDueToday
                          ? 'Due Today'
                          : `Due ${task.due_date}`}
                      </span>
                    </div>
                  )}

                  {/* Completed At */}
                  {isCompleted && task.completed_at && (
                    <span className="font-mono text-[10px] text-[#136C13] dark:text-[#2DB52D]">
                      Completed {new Date(task.completed_at).toLocaleDateString()}
                    </span>
                  )}

                  {/* Linked Project */}
                  {task.project && (
                    <Link
                      href={`/vault/projects/${task.project.id}`}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                    >
                      <FolderGit2 className="w-3 h-3 text-primary" />
                      <span>{task.project.title}</span>
                    </Link>
                  )}

                  {/* Linked Meeting */}
                  {task.meeting && (
                    <Link
                      href={`/vault/operations/meetings/${task.meeting_id}`}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                    >
                      <Video className="w-3 h-3 text-primary" />
                      <span>{task.meeting.title}</span>
                    </Link>
                  )}

                  {/* Linked Decision */}
                  {task.decision && (
                    <Link
                      href={`/vault/operations/decisions/${task.decision_id}`}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                    >
                      <FileText className="w-3 h-3 text-primary" />
                      <span>{task.decision.title}</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => onEditTask(task)}
                disabled={isActionLoading || Boolean(task.archived_at)}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
                title="Edit Task"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleArchive(task)}
                disabled={isActionLoading}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
                title={task.archived_at ? 'Restore Task' : 'Archive Task'}
              >
                {task.archived_at ? (
                  <RotateCcw className="w-3.5 h-3.5 text-primary" />
                ) : (
                  <Archive className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
