'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Calendar,
  FolderGit2,
  Video,
  Edit3,
  Archive,
  RotateCcw,
  CheckCircle2,
  FileText,
  Plus,
  Scale,
  Sparkles,
  GitCommit,
} from 'lucide-react'
import { Decision, Task } from '@/lib/vault/operations/types'
import {
  archiveDecisionAction,
  restoreDecisionAction,
} from '@/lib/vault/operations-actions'
import { DecisionModal } from './decision-modal'
import { TaskModal } from './task-modal'
import { TaskList } from './task-list'

interface DecisionDetailViewProps {
  decision: Decision
  workspaceId: string
  isAdmin?: boolean
  linkedTasks?: Task[]
  projects: { id: string; title: string }[]
  meetings: { id: string; title: string }[]
}

export function DecisionDetailView({
  decision,
  workspaceId,
  isAdmin = false,
  linkedTasks = [],
  projects,
  meetings,
}: DecisionDetailViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const handleArchive = () => {
    startTransition(async () => {
      try {
        if (decision.archived_at) {
          await restoreDecisionAction(workspaceId, decision.id)
        } else {
          await archiveDecisionAction(workspaceId, decision.id)
        }
        router.refresh()
      } catch (err) {
        console.error('Failed to toggle decision archive:', err)
      }
    })
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Back Link */}
      <div>
        <Link
          href="/vault/operations?view=decisions"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Decisions</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
                {decision.title}
              </h1>
              {decision.archived_at && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                  Archived
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <Calendar className="w-4 h-4 text-primary" />
              <span>Decided on {decision.decided_at}</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsTaskModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Action Item</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEditOpen(true)}
              disabled={isPending || Boolean(decision.archived_at)}
              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
              title="Edit Decision"
            >
              <Edit3 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleArchive}
              disabled={isPending}
              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
              title={decision.archived_at ? 'Restore Decision' : 'Archive Decision'}
            >
              {decision.archived_at ? (
                <RotateCcw className="w-4 h-4 text-primary" />
              ) : (
                <Archive className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Linked project & meeting strip */}
        {(decision.project || decision.meeting) && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border/80 text-xs text-muted-foreground">
            {decision.project && (
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px]">PROJECT:</span>
                <Link
                  href={`/vault/projects/${decision.project.id}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-foreground font-medium transition-colors"
                >
                  <FolderGit2 className="w-3.5 h-3.5 text-primary" />
                  <span>{decision.project.title}</span>
                </Link>
              </div>
            )}

            {decision.meeting && (
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px]">MEETING:</span>
                <Link
                  href={`/vault/operations/meetings/${decision.meeting_id}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-foreground font-medium transition-colors"
                >
                  <Video className="w-3.5 h-3.5 text-primary" />
                  <span>{decision.meeting.title}</span>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Decision Statement Box */}
      <div className="p-6 rounded-2xl bg-card border-2 border-primary/20 space-y-2">
        <h2 className="font-mono text-xs uppercase tracking-wider text-primary font-bold">
          Decision Statement
        </h2>
        <p className="text-base text-foreground font-medium leading-relaxed">
          {decision.decision}
        </p>
      </div>

      {/* Structured Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Context */}
        <div className="p-5 rounded-xl bg-card border border-border space-y-2">
          <div className="flex items-center gap-2 text-foreground font-medium text-sm">
            <FileText className="w-4 h-4 text-primary" />
            <span>Context & Problem Statement</span>
          </div>
          {decision.context ? (
            <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {decision.context}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground italic">No context recorded.</p>
          )}
        </div>

        {/* Reasoning */}
        <div className="p-5 rounded-xl bg-card border border-border space-y-2">
          <div className="flex items-center gap-2 text-foreground font-medium text-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Reasoning & Rationale</span>
          </div>
          {decision.reasoning ? (
            <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {decision.reasoning}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground italic">No reasoning recorded.</p>
          )}
        </div>

        {/* Alternatives Considered */}
        <div className="p-5 rounded-xl bg-card border border-border space-y-2">
          <div className="flex items-center gap-2 text-foreground font-medium text-sm">
            <Scale className="w-4 h-4 text-primary" />
            <span>Alternatives Considered</span>
          </div>
          {decision.alternatives_considered ? (
            <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {decision.alternatives_considered}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground italic">No alternatives recorded.</p>
          )}
        </div>

        {/* Consequences */}
        <div className="p-5 rounded-xl bg-card border border-border space-y-2">
          <div className="flex items-center gap-2 text-foreground font-medium text-sm">
            <GitCommit className="w-4 h-4 text-primary" />
            <span>Anticipated Consequences & Tradeoffs</span>
          </div>
          {decision.consequences ? (
            <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {decision.consequences}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground italic">No consequences recorded.</p>
          )}
        </div>
      </div>

      {/* Linked Action Items / Tasks */}
      <div className="space-y-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <h2 className="font-serif text-lg font-medium text-foreground">
              Follow-up Execution Tasks
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
              {linkedTasks.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsTaskModalOpen(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        </div>

        <TaskList
          tasks={linkedTasks}
          workspaceId={workspaceId}
          isAdmin={isAdmin}
          onEditTask={(t) => {
            setEditingTask(t)
            setIsTaskModalOpen(true)
          }}
          onRefresh={() => router.refresh()}
        />
      </div>

      {/* Modals */}
      <DecisionModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        workspaceId={workspaceId}
        decision={decision}
        projects={projects}
        meetings={meetings}
        onSuccess={() => router.refresh()}
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false)
          setEditingTask(null)
        }}
        workspaceId={workspaceId}
        task={editingTask}
        prefill={{ decisionId: decision.id, projectId: decision.project_id }}
        projects={projects}
        meetings={meetings}
        decisions={[{ id: decision.id, title: decision.title }]}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
