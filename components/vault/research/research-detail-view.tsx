'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  BookOpen, 
  HelpCircle, 
  Target, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  ArrowRightCircle, 
  Clock, 
  Calendar, 
  Archive, 
  Edit3, 
  Loader2,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react'
import { updateResearchRecord, archiveResearchRecord, ResearchStatus } from '@/lib/vault/actions'
import { ResearchEditModal } from './research-edit-modal'

interface ResearchDetailViewProps {
  record: any
  workspaceId: string
  workspaceName?: string
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
    case 'planning':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
    case 'paused':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
    case 'completed':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
    case 'archived':
      return 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30'
    default:
      return 'bg-secondary text-foreground border-border'
  }
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case 'urgent':
      return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
    case 'high':
      return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30'
    case 'medium':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
    case 'low':
      return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30'
    default:
      return 'bg-secondary text-muted-foreground border-border'
  }
}

export function ResearchDetailView({
  record,
  workspaceId,
  workspaceName,
}: ResearchDetailViewProps) {
  const router = useRouter()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)

  const handleStatusChange = (newStatus: ResearchStatus) => {
    setError(null)
    startTransition(async () => {
      try {
        await updateResearchRecord(record.id, {
          workspaceId,
          status: newStatus,
        })
      } catch (err: any) {
        setError(err.message || 'Failed to update status')
      }
    })
  }

  const handleArchive = () => {
    setError(null)
    startTransition(async () => {
      try {
        await archiveResearchRecord(record.id, workspaceId)
        setShowArchiveConfirm(false)
      } catch (err: any) {
        setError(err.message || 'Failed to archive record')
      }
    })
  }

  const createdDate = new Date(record.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const updatedDate = new Date(record.updated_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  const completedDate = record.completed_at
    ? new Date(record.completed_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Back Button & Breadcrumbs */}
      <div className="flex items-center justify-between">
        <Link
          href="/vault/research"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Research Directory</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-secondary text-secondary-foreground border border-border">
            Workspace: {workspaceName || 'Active'}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/20 font-mono">
          {error}
        </div>
      )}

      {/* Main Header Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-secondary text-secondary-foreground border border-border">
                {record.research_type}
              </span>
              <span
                className={`text-xs font-medium capitalize px-2.5 py-0.5 rounded border ${getStatusBadge(
                  record.status
                )}`}
              >
                {record.status}
              </span>
              <span
                className={`text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${getPriorityBadge(
                  record.priority
                )}`}
              >
                Priority: {record.priority}
              </span>
            </div>
            <h1 className="font-serif text-2xl md:text-3xl font-medium text-foreground tracking-tight">
              {record.title}
            </h1>
          </div>

          {/* Action Buttons: Edit & Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsEditOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-secondary/50 text-foreground hover:bg-secondary transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 text-primary" />
              <span>Edit Record</span>
            </button>

            {record.status !== 'archived' && (
              <button
                onClick={() => setShowArchiveConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/10 transition-colors"
                title="Archive Research"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Archive</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Status Bar */}
        <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span>Quick Status:</span>
            <div className="flex items-center gap-1">
              {record.status !== 'active' && (
                <button
                  disabled={isPending}
                  onClick={() => handleStatusChange('active')}
                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors disabled:opacity-50"
                >
                  Set Active
                </button>
              )}
              {record.status !== 'completed' && (
                <button
                  disabled={isPending}
                  onClick={() => handleStatusChange('completed')}
                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 border border-purple-500/30 transition-colors disabled:opacity-50"
                >
                  Mark Completed
                </button>
              )}
              {record.status !== 'paused' && record.status !== 'completed' && (
                <button
                  disabled={isPending}
                  onClick={() => handleStatusChange('paused')}
                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 transition-colors disabled:opacity-50"
                >
                  Pause
                </button>
              )}
              {record.status !== 'planning' && record.status !== 'completed' && (
                <button
                  disabled={isPending}
                  onClick={() => handleStatusChange('planning')}
                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 transition-colors disabled:opacity-50"
                >
                  Move to Planning
                </button>
              )}
              {record.status === 'archived' && (
                <button
                  disabled={isPending}
                  onClick={() => handleStatusChange('planning')}
                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-secondary text-foreground hover:bg-secondary/80 border border-border transition-colors disabled:opacity-50"
                >
                  Restore to Planning
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Created {createdDate}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> Updated {updatedDate}
            </span>
            {completedDate && (
              <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                <CheckCircle2 className="w-3 h-3" /> Completed {completedDate}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Archive Confirmation Banner */}
      {showArchiveConfirm && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Are you sure you want to archive this research record? It will be hidden from the active research list.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowArchiveConfirm(false)}
              className="px-2.5 py-1 rounded text-xs border border-border text-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={isPending}
              onClick={handleArchive}
              className="px-2.5 py-1 rounded text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50 font-medium"
            >
              {isPending ? 'Archiving...' : 'Confirm Archive'}
            </button>
          </div>
        </div>
      )}

      {/* Core Inquiry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Research Question Card */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-2 md:col-span-2 shadow-sm">
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-wider">
            <HelpCircle className="w-4 h-4" />
            <span>Central Research Question</span>
          </div>
          {record.research_question ? (
            <p className="font-serif text-lg text-foreground italic leading-relaxed">
              &ldquo;{record.research_question}&rdquo;
            </p>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No specific research question defined yet. Click &ldquo;Edit Record&rdquo; to formulate the central inquiry.
            </p>
          )}
        </div>

        {/* Strategic Objective Card */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-2 shadow-sm">
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-wider">
            <Target className="w-4 h-4" />
            <span>Strategic Objective</span>
          </div>
          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {record.objective || 'No objective specified.'}
          </p>
        </div>

        {/* Resulting Next Action Card */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-2 shadow-sm">
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-wider">
            <ArrowRightCircle className="w-4 h-4" />
            <span>Resulting Next Action</span>
          </div>
          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {record.next_action || 'No next action defined.'}
          </p>
        </div>

        {/* Summary & Background */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-2 md:col-span-2 shadow-sm">
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-wider">
            <FileText className="w-4 h-4" />
            <span>Background & Context Summary</span>
          </div>
          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {record.summary || 'No background summary provided.'}
          </p>
        </div>

        {/* Findings & Analysis */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-2 md:col-span-2 shadow-sm">
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Findings & Analysis</span>
          </div>
          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {record.findings || 'No findings recorded yet. Log observations, data points, or discoveries as the inquiry proceeds.'}
          </p>
        </div>

        {/* Conclusion & Synthesis */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-2 md:col-span-2 shadow-sm">
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" />
            <span>Conclusion & Synthesis</span>
          </div>
          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {record.conclusion || 'No conclusion formed yet.'}
          </p>
        </div>
      </div>

      {/* Edit Modal */}
      <ResearchEditModal
        record={record}
        workspaceId={workspaceId}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
      />
    </div>
  )
}
