'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Calendar,
  Shield,
  Clock,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  Archive,
  Edit3,
  Plus,
  Loader2,
  FolderGit2,
  BarChart2,
  BookOpen,
  History,
  Target,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  ChevronDown,
  Sparkles,
  ClipboardList,
  Award,
} from 'lucide-react'
import {
  WorkspaceProjectDetail,
  WorkspaceProjectStatus,
  WorkspaceProjectPriority,
  WorkspaceMetricItem,
  MetricUnitType,
  MetricDirection,
  RelatedReviewItem,
  updateProjectLifecycle,
  ProjectLifecycleAction,
} from '@/lib/vault/actions'
import { WorkbenchStats } from '@/lib/vault/workbench/types'
import { ProjectEditModal } from './project-edit-modal'
import { MetricCreateModal } from '../metric/metric-create-modal'
import { getStatusBadgeClasses, getPriorityBadgeClasses } from '@/components/vault/vault-badge'

interface ProjectDetailViewProps {
  project: WorkspaceProjectDetail
  metrics: WorkspaceMetricItem[]
  relatedResearch: any[]
  relatedReviews: RelatedReviewItem[]
  workbenchStats?: WorkbenchStats
  operationsStats?: { activeTasks: number; upcomingMeetings: number; decisionsCount: number }
  evidenceCounts?: { approved: number; draft: number; total: number }
  workspaceId: string
  workspaceName?: string
  identities?: { id: string; name: string; handle?: string | null }[]
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatMetricValue(val: number | null | undefined, unitType: MetricUnitType, unitSymbol?: string | null): string {
  if (val === null || val === undefined) return '—'
  const numVal = Number(val)

  if (unitType === 'currency') {
    const symbol = unitSymbol || 'USD'
    return `${symbol} ${numVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
  }
  if (unitType === 'percentage') {
    return `${numVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`
  }
  if (unitType === 'duration') {
    const symbol = unitSymbol ? ` ${unitSymbol}` : ' days'
    return `${numVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}${symbol}`
  }
  if (unitType === 'score') {
    const symbol = unitSymbol || '/10'
    return `${numVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${symbol}`
  }

  const symbol = unitSymbol ? ` ${unitSymbol}` : ''
  return `${numVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}${symbol}`
}

function getAttainmentBadge(attainment: number | null | undefined) {
  if (attainment === null || attainment === undefined) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-secondary text-muted-foreground border border-border">
        No Target
      </span>
    )
  }

  if (attainment >= 100) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
        {attainment.toFixed(1)}% Attainment
      </span>
    )
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
      {attainment.toFixed(1)}% Attainment
    </span>
  )
}

function getStatusBadge(status: WorkspaceProjectStatus) {
  return getStatusBadgeClasses(status)
}

function getPriorityBadge(priority: WorkspaceProjectPriority) {
  return getPriorityBadgeClasses(priority)
}

export function ProjectDetailView({
  project,
  metrics,
  relatedResearch,
  relatedReviews,
  workbenchStats,
  operationsStats,
  evidenceCounts,
  workspaceId,
  workspaceName,
  identities = [],
}: ProjectDetailViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isAddMetricOpen, setIsAddMetricOpen] = useState(false)
  const [showArchivedMetrics, setShowArchivedMetrics] = useState(false)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)

  const activeOrPausedMetrics = metrics.filter((m) => m.status !== 'archived')
  const archivedMetrics = metrics.filter((m) => m.status === 'archived')

  const handleLifecycle = (action: ProjectLifecycleAction) => {
    setError(null)
    startTransition(async () => {
      try {
        await updateProjectLifecycle(project.id, workspaceId, action)
        setShowArchiveConfirm(false)
        router.refresh()
      } catch (err: any) {
        setError(err.message || 'Failed to update project lifecycle')
      }
    })
  }

  const isArchived = project.status === 'archived'
  const isCompleted = project.status === 'completed'

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* 1. Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
        <Link href="/vault/projects" className="hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" />
          Projects
        </Link>
        <span>/</span>
        <span className="text-foreground truncate max-w-sm">{project.title}</span>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Archived Notice Banner */}
      {isArchived && (
        <div className="p-4 rounded-xl border border-zinc-500/30 bg-zinc-500/5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-zinc-600 dark:text-zinc-400">
            <Archive className="w-4 h-4 shrink-0" />
            <div>
              <span className="font-medium">Project Archived</span>
              {project.archived_at && (
                <span className="ml-1 text-muted-foreground">
                  on {formatDate(project.archived_at)}
                </span>
              )}
              <p className="text-muted-foreground mt-0.5">
                Historical metrics, connected research, and retrospective reviews remain preserved.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleLifecycle('restore')}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shrink-0 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            Restore Project
          </button>
        </div>
      )}

      {/* 3. Completed Notice Banner */}
      {isCompleted && (
        <div className="p-4 rounded-xl border border-teal-500/30 bg-teal-500/5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-teal-600 dark:text-teal-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <div>
              <span className="font-medium">Project Completed</span>
              {project.completed_at && (
                <span className="ml-1 text-muted-foreground">
                  on {formatDate(project.completed_at)}
                </span>
              )}
              <p className="text-muted-foreground mt-0.5">
                Deliverables finalized. Performance and retrospective records remain fully accessible.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleLifecycle('reopen')}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              Reopen Project
            </button>
          </div>
        </div>
      )}

      {/* Archive Confirmation Dialog */}
      {showArchiveConfirm && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-xs space-y-2">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium">
            <AlertTriangle className="w-4 h-4" />
            <span>Archive this project?</span>
          </div>
          <p className="text-muted-foreground">
            Archived projects remain preserved and accessible, but are moved out of active operational views.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => handleLifecycle('archive')}
              disabled={isPending}
              className="px-3 py-1 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors text-xs font-medium"
            >
              Confirm Archive
            </button>
            <button
              onClick={() => setShowArchiveConfirm(false)}
              className="px-3 py-1 bg-secondary text-foreground rounded-md hover:bg-secondary/80 transition-colors text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 4. Project Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-serif text-3xl font-medium text-foreground tracking-tight">
              {project.title}
            </h1>
            <span className={`text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-full border ${getStatusBadge(project.status)}`}>
              {project.status}
            </span>
            <span className={`text-[11px] font-mono capitalize px-2.5 py-0.5 rounded-full border ${getPriorityBadge(project.priority)}`}>
              {project.priority} priority
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-mono">
            {project.identity && (
              <div className="flex items-center gap-1.5 text-foreground">
                <Shield className="w-3.5 h-3.5 text-primary" />
                <span>{project.identity.name}</span>
                {project.identity.handle && (
                  <span className="text-muted-foreground">(@{project.identity.handle})</span>
                )}
              </div>
            )}
            {workspaceName && (
              <span>Workspace: {workspaceName}</span>
            )}
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {!isArchived && (
            <>
              {/* Lifecycle Transitions */}
              {project.status === 'planning' && (
                <button
                  onClick={() => handleLifecycle('start')}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium transition-colors border border-border disabled:opacity-50"
                >
                  <PlayCircle className="w-3.5 h-3.5 text-emerald-500" />
                  Start Project
                </button>
              )}

              {project.status === 'active' && (
                <>
                  <button
                    onClick={() => handleLifecycle('pause')}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium transition-colors border border-border disabled:opacity-50"
                  >
                    <PauseCircle className="w-3.5 h-3.5 text-amber-500" />
                    Pause
                  </button>
                  <button
                    onClick={() => handleLifecycle('complete')}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium transition-colors border border-border disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
                    Complete
                  </button>
                </>
              )}

              {project.status === 'paused' && (
                <>
                  <button
                    onClick={() => handleLifecycle('resume')}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium transition-colors border border-border disabled:opacity-50"
                  >
                    <PlayCircle className="w-3.5 h-3.5 text-emerald-500" />
                    Resume
                  </button>
                  <button
                    onClick={() => handleLifecycle('complete')}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium transition-colors border border-border disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
                    Complete
                  </button>
                </>
              )}

              {/* Archive Action */}
              <button
                onClick={() => setShowArchiveConfirm(true)}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 text-xs font-medium transition-colors disabled:opacity-50"
              >
                <Archive className="w-3.5 h-3.5" />
                Archive
              </button>

              {/* Open Workbench */}
              <Link
                href={`/vault/projects/${project.id}/workbench`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm"
              >
                <FolderGit2 className="w-3.5 h-3.5" />
                <span>Workbench</span>
              </Link>

              {/* Open Operations */}
              <Link
                href={`/vault/operations?projectId=${project.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium transition-colors shadow-sm"
              >
                <ClipboardList className="w-3.5 h-3.5 text-primary" />
                <span>Operations</span>
              </Link>

              {/* Edit Project */}
              <button
                onClick={() => setIsEditOpen(true)}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Project
              </button>

              {/* Add Metric */}
              <button
                onClick={() => setIsAddMetricOpen(true)}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Metric
              </button>
            </>
          )}
        </div>
      </div>

      {/* 5. Project Overview Card */}
      <div className="p-6 rounded-2xl bg-card border border-border space-y-6">
        <div>
          <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
            Overview & Description
          </h2>
          {project.description ? (
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {project.description}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No description provided. Click Edit Project to add goals, scope, or operational notes.
            </p>
          )}
        </div>

        {/* Fact Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-6 border-t border-border/80">
          <div>
            <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground mb-1">
              <Calendar className="w-3 h-3 text-muted-foreground/70" />
              <span>START DATE</span>
            </div>
            <div className="text-xs font-medium text-foreground">
              {formatDate(project.start_date)}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground mb-1">
              <Calendar className="w-3 h-3 text-muted-foreground/70" />
              <span>TARGET DATE</span>
            </div>
            <div className="text-xs font-medium text-foreground">
              {formatDate(project.target_date)}
            </div>
          </div>

          {project.completed_at && (
            <div>
              <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground mb-1">
                <CheckCircle2 className="w-3 h-3 text-teal-500" />
                <span>COMPLETED</span>
              </div>
              <div className="text-xs font-medium text-foreground">
                {formatDate(project.completed_at)}
              </div>
            </div>
          )}

          {project.archived_at && (
            <div>
              <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground mb-1">
                <Archive className="w-3 h-3 text-zinc-400" />
                <span>ARCHIVED</span>
              </div>
              <div className="text-xs font-medium text-foreground">
                {formatDate(project.archived_at)}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground mb-1">
              <Clock className="w-3 h-3 text-muted-foreground/70" />
              <span>CREATED</span>
            </div>
            <div className="text-xs font-medium text-foreground">
              {formatDate(project.created_at)}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground mb-1">
              <Clock className="w-3 h-3 text-muted-foreground/70" />
              <span>UPDATED</span>
            </div>
            <div className="text-xs font-medium text-foreground">
              {formatDate(project.updated_at)}
            </div>
          </div>
        </div>
      </div>

      {/* 5.5. Working Environment: Project Workbench */}
      <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-primary" />
              <h2 className="font-serif text-xl font-medium text-foreground">
                Project Workbench
              </h2>
              {workbenchStats && (
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                  {workbenchStats.totalCount} Artifacts
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Working environment for native documents, structured spreadsheets, and project files.
            </p>
          </div>

          <Link
            href={`/vault/projects/${project.id}/workbench`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm self-start sm:self-auto shrink-0"
          >
            <span>Open Workbench</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href={`/vault/projects/${project.id}/workbench`}
            className="p-3 rounded-xl bg-secondary/40 border border-border/70 hover:border-primary/40 transition-colors group"
          >
            <div className="text-[11px] font-mono text-muted-foreground">DOCUMENTS</div>
            <div className="text-lg font-semibold text-foreground mt-0.5 group-hover:text-primary transition-colors">
              {workbenchStats?.documentsCount ?? 0}
            </div>
          </Link>

          <Link
            href={`/vault/projects/${project.id}/workbench`}
            className="p-3 rounded-xl bg-secondary/40 border border-border/70 hover:border-primary/40 transition-colors group"
          >
            <div className="text-[11px] font-mono text-muted-foreground">SPREADSHEETS</div>
            <div className="text-lg font-semibold text-foreground mt-0.5 group-hover:text-primary transition-colors">
              {workbenchStats?.spreadsheetsCount ?? 0}
            </div>
          </Link>

          <Link
            href={`/vault/projects/${project.id}/workbench`}
            className="p-3 rounded-xl bg-secondary/40 border border-border/70 hover:border-primary/40 transition-colors group"
          >
            <div className="text-[11px] font-mono text-muted-foreground">FILES</div>
            <div className="text-lg font-semibold text-foreground mt-0.5 group-hover:text-primary transition-colors">
              {workbenchStats?.filesCount ?? 0}
            </div>
          </Link>

          <Link
            href={`/vault/projects/${project.id}/workbench`}
            className="p-3 rounded-xl bg-secondary/40 border border-border/70 hover:border-primary/40 transition-colors group"
          >
            <div className="text-[11px] font-mono text-muted-foreground">FOLDERS</div>
            <div className="text-lg font-semibold text-foreground mt-0.5 group-hover:text-primary transition-colors">
              {workbenchStats?.foldersCount ?? 0}
            </div>
          </Link>
        </div>
      </div>

      {/* Operations Summary Card */}
      <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            <h2 className="font-serif text-base font-medium text-foreground">
              Project Operations
            </h2>
            <span className="text-xs font-mono text-muted-foreground">
              Tasks, Meetings & Decisions
            </span>
          </div>

          <Link
            href={`/vault/operations?projectId=${project.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-medium transition-colors shadow-sm self-start sm:self-auto shrink-0"
          >
            <span>View Operations</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Operations Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href={`/vault/operations?view=tasks&projectId=${project.id}`}
            className="p-3 rounded-xl bg-secondary/40 border border-border/70 hover:border-primary/40 transition-colors group"
          >
            <div className="text-[11px] font-mono text-muted-foreground">ACTIVE TASKS</div>
            <div className="text-lg font-semibold text-foreground mt-0.5 group-hover:text-primary transition-colors">
              {operationsStats?.activeTasks ?? 0}
            </div>
          </Link>

          <Link
            href={`/vault/operations?view=meetings&projectId=${project.id}`}
            className="p-3 rounded-xl bg-secondary/40 border border-border/70 hover:border-primary/40 transition-colors group"
          >
            <div className="text-[11px] font-mono text-muted-foreground">UPCOMING MEETINGS</div>
            <div className="text-lg font-semibold text-foreground mt-0.5 group-hover:text-primary transition-colors">
              {operationsStats?.upcomingMeetings ?? 0}
            </div>
          </Link>

          <Link
            href={`/vault/operations?view=decisions&projectId=${project.id}`}
            className="p-3 rounded-xl bg-secondary/40 border border-border/70 hover:border-primary/40 transition-colors group"
          >
            <div className="text-[11px] font-mono text-muted-foreground">DECISIONS RECORDED</div>
            <div className="text-lg font-semibold text-foreground mt-0.5 group-hover:text-primary transition-colors">
              {operationsStats?.decisionsCount ?? 0}
            </div>
          </Link>
        </div>
      </div>

      {/* 6. Evidence & Professional Claims */}
      <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg font-medium text-foreground">
                  Evidence & Professional Claims
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                  {evidenceCounts?.total ?? 0} Recorded
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Professional achievements, contributions, and portfolio-ready claims for this project
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isArchived && (
              <Link
                href={`/vault/evidence?projectId=${project.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Claim</span>
              </Link>
            )}
            <Link
              href={`/vault/evidence?projectId=${project.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-medium transition-colors shadow-sm self-start sm:self-auto shrink-0"
            >
              <span>View Claims</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Evidence Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href={`/vault/evidence?status=approved&projectId=${project.id}`}
            className="p-3 rounded-xl bg-secondary/40 border border-border/70 hover:border-emerald-500/40 transition-colors group"
          >
            <div className="text-[11px] font-mono text-emerald-500">APPROVED CLAIMS</div>
            <div className="text-lg font-semibold text-foreground mt-0.5 group-hover:text-emerald-500 transition-colors">
              {evidenceCounts?.approved ?? 0}
            </div>
          </Link>

          <Link
            href={`/vault/evidence?status=draft&projectId=${project.id}`}
            className="p-3 rounded-xl bg-secondary/40 border border-border/70 hover:border-amber-500/40 transition-colors group"
          >
            <div className="text-[11px] font-mono text-amber-500">DRAFT CLAIMS</div>
            <div className="text-lg font-semibold text-foreground mt-0.5 group-hover:text-amber-500 transition-colors">
              {evidenceCounts?.draft ?? 0}
            </div>
          </Link>

          <Link
            href={`/vault/evidence?projectId=${project.id}`}
            className="p-3 rounded-xl bg-secondary/40 border border-border/70 hover:border-primary/40 transition-colors group"
          >
            <div className="text-[11px] font-mono text-muted-foreground">TOTAL CLAIMS</div>
            <div className="text-lg font-semibold text-foreground mt-0.5 group-hover:text-primary transition-colors">
              {evidenceCounts?.total ?? 0}
            </div>
          </Link>
        </div>
      </div>

      {/* 7. Performance: Project Metrics */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary" />
            <h2 className="font-serif text-xl font-medium text-foreground">
              Performance & Metrics
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
              {activeOrPausedMetrics.length} Active
            </span>
          </div>

          {!isArchived && (
            <button
              onClick={() => setIsAddMetricOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground transition-colors border border-border"
            >
              <Plus className="w-3 h-3" />
              Add Metric
            </button>
          )}
        </div>

        {activeOrPausedMetrics.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-xs bg-card border border-border rounded-xl space-y-3">
            <BarChart2 className="w-8 h-8 mx-auto opacity-30" />
            <p>No metrics tracked for this project yet.</p>
            {!isArchived && (
              <button
                onClick={() => setIsAddMetricOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Metric
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeOrPausedMetrics.map((m) => (
              <Link
                key={m.id}
                href={`/vault/metrics/${m.id}`}
                className="block p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {m.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-mono capitalize px-1.5 py-0.2 rounded bg-secondary text-muted-foreground">
                        {m.category}
                      </span>
                      <span className="text-[10px] font-mono capitalize text-muted-foreground">
                        • {m.measurement_type}
                      </span>
                    </div>
                  </div>
                  {getAttainmentBadge(m.attainment_rate)}
                </div>

                {/* Actual vs Target values */}
                <div className="pt-3 border-t border-border/70 grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <div className="text-[10px] text-muted-foreground">CURRENT ACTUAL</div>
                    <div className="font-semibold text-foreground mt-0.5">
                      {formatMetricValue(m.current_actual, m.unit_type, m.unit_symbol)}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-muted-foreground">TARGET</div>
                    <div className="font-semibold text-muted-foreground mt-0.5">
                      {m.current_target_value !== null
                        ? formatMetricValue(m.current_target_value, m.unit_type, m.unit_symbol)
                        : 'No Target'}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Collapsible Archived Metrics */}
        {archivedMetrics.length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setShowArchivedMetrics(!showArchivedMetrics)}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-mono transition-colors"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showArchivedMetrics ? 'rotate-180' : ''}`} />
              <span>
                {showArchivedMetrics ? 'Hide' : 'Show'} Archived Metrics ({archivedMetrics.length})
              </span>
            </button>

            {showArchivedMetrics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3 pt-2">
                {archivedMetrics.map((m) => (
                  <Link
                    key={m.id}
                    href={`/vault/metrics/${m.id}`}
                    className="block p-4 rounded-xl bg-card/60 border border-border/80 hover:border-primary/40 transition-colors group opacity-80"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                          {m.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                            Archived
                          </span>
                        </div>
                      </div>
                      {getAttainmentBadge(m.attainment_rate)}
                    </div>

                    <div className="pt-3 border-t border-border/70 grid grid-cols-2 gap-2 text-xs font-mono">
                      <div>
                        <div className="text-[10px] text-muted-foreground">LAST OBSERVED</div>
                        <div className="font-semibold text-foreground mt-0.5">
                          {formatMetricValue(m.current_actual, m.unit_type, m.unit_symbol)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">TARGET</div>
                        <div className="font-semibold text-muted-foreground mt-0.5">
                          {m.current_target_value !== null
                            ? formatMetricValue(m.current_target_value, m.unit_type, m.unit_symbol)
                            : 'No Target'}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 7. Knowledge: Related Research */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <h2 className="font-serif text-xl font-medium text-foreground">
              Knowledge & Related Research
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
              {relatedResearch.length} Connected
            </span>
          </div>

          <Link
            href="/vault/research"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-mono transition-colors"
          >
            <span>Browse Research</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        {relatedResearch.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-xs bg-card border border-border rounded-xl space-y-2">
            <BookOpen className="w-8 h-8 mx-auto opacity-30" />
            <p>No research is connected to this project yet.</p>
            <Link
              href="/vault/research"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Explore research records in workspace
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {relatedResearch.map((item: any) => {
              const rec = item.research_record || {}
              return (
                <Link
                  key={item.id}
                  href={`/vault/research/${item.research_record_id}`}
                  className="block p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors group space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {rec.title || 'Untitled Research Record'}
                    </h3>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                      {item.relationship_type}
                    </span>
                  </div>

                  {rec.research_question && (
                    <p className="text-xs text-muted-foreground line-clamp-2 italic">
                      &ldquo;{rec.research_question}&rdquo;
                    </p>
                  )}

                  <div className="pt-2 border-t border-border/70 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="capitalize">{rec.research_type}</span>
                      <span>•</span>
                      <span className="capitalize">{rec.status}</span>
                    </div>
                    <span>Updated {formatDate(rec.updated_at)}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* 8. Retrospectives: Related Reviews */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            <h2 className="font-serif text-xl font-medium text-foreground">
              Retrospectives & Related Reviews
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
              {relatedReviews.length} Connected
            </span>
          </div>

          <Link
            href="/vault/reviews"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-mono transition-colors"
          >
            <span>Browse Reviews</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        {relatedReviews.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-xs bg-card border border-border rounded-xl space-y-2">
            <History className="w-8 h-8 mx-auto opacity-30" />
            <p>No reviews are connected to this project yet.</p>
            <Link
              href="/vault/reviews"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Explore retrospective reviews in workspace
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {relatedReviews.map((item) => {
              const rev = item.review || {}
              const relLabel = item.relationship_type === 'subject'
                ? 'Reviewed Project'
                : item.relationship_type === 'resulted_in'
                ? 'Generated Project'
                : item.relationship_type

              return (
                <Link
                  key={item.id}
                  href={`/vault/reviews/${item.review_id}`}
                  className="block p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors group space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {rev.title || 'Untitled Review'}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary text-foreground border border-border shrink-0">
                      {relLabel}
                    </span>
                  </div>

                  {rev.summary && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {rev.summary}
                    </p>
                  )}

                  <div className="pt-2 border-t border-border/70 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="capitalize">{rev.review_type}</span>
                      {rev.period_start && (
                        <span>
                          • {formatDate(rev.period_start)}
                          {rev.period_end ? ` – ${formatDate(rev.period_end)}` : ''}
                        </span>
                      )}
                    </div>
                    <span>Updated {formatDate(rev.updated_at)}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Edit Project Modal */}
      <ProjectEditModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        project={project}
        workspaceId={workspaceId}
        identities={identities}
      />

      {/* Add Metric Modal */}
      <MetricCreateModal
        isOpen={isAddMetricOpen}
        onClose={() => setIsAddMetricOpen(false)}
        workspaceId={workspaceId}
        defaultProjectId={project.id}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
