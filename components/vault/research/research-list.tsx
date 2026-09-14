'use client'

import Link from 'next/link'
import { 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  HelpCircle, 
  Target,
  Sparkles,
  AlertCircle
} from 'lucide-react'

interface ResearchListProps {
  records: any[]
  hasActiveFilters: boolean
  workspaceId?: string
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

export function ResearchList({
  records,
  hasActiveFilters,
  workspaceName,
}: ResearchListProps) {
  if (records.length === 0) {
    if (hasActiveFilters) {
      return (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
          <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-serif text-lg font-medium text-foreground">
            No research records found
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
            No research records matched your active search or filter criteria. Try adjusting your query or resetting your filters.
          </p>
        </div>
      )
    }

    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-6 h-6 text-primary" />
        </div>
        <h3 className="font-serif text-lg font-medium text-foreground">
          No research records yet
        </h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
          Initiate your first research record for {workspaceName || 'this workspace'} to track hypotheses, questions, findings, and resulting action items.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {records.map((record) => {
        const updatedDate = new Date(record.updated_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })

        return (
          <div
            key={record.id}
            className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 hover:border-primary/50 transition-all shadow-sm hover:shadow-md"
          >
            <div className="space-y-3">
              {/* Badges: Type, Status, Priority */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-secondary text-secondary-foreground border border-border">
                    {record.research_type}
                  </span>
                  <span
                    className={`text-[11px] font-medium capitalize px-2 py-0.5 rounded border ${getStatusBadge(
                      record.status
                    )}`}
                  >
                    {record.status}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${getPriorityBadge(
                    record.priority
                  )}`}
                >
                  {record.priority}
                </span>
              </div>

              {/* Title */}
              <div>
                <Link
                  href={`/vault/research/${record.id}`}
                  className="font-serif text-lg font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1"
                >
                  {record.title}
                </Link>
              </div>

              {/* Research Question */}
              {record.research_question ? (
                <div className="p-2.5 rounded-lg bg-secondary/30 border border-border/60 text-xs">
                  <div className="flex items-start gap-1.5 text-muted-foreground font-mono text-[10px] uppercase tracking-wider mb-1">
                    <HelpCircle className="w-3 h-3 shrink-0 text-primary mt-0.5" />
                    <span>Research Question</span>
                  </div>
                  <p className="text-foreground/90 line-clamp-2 italic font-serif">
                    &ldquo;{record.research_question}&rdquo;
                  </p>
                </div>
              ) : record.objective ? (
                <div className="p-2.5 rounded-lg bg-secondary/30 border border-border/60 text-xs">
                  <div className="flex items-start gap-1.5 text-muted-foreground font-mono text-[10px] uppercase tracking-wider mb-1">
                    <Target className="w-3 h-3 shrink-0 text-primary mt-0.5" />
                    <span>Objective</span>
                  </div>
                  <p className="text-foreground/90 line-clamp-2">
                    {record.objective}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {record.summary || 'No summary provided yet.'}
                </p>
              )}

              {/* Findings preview if present */}
              {record.findings && (
                <div className="text-xs text-muted-foreground/80 line-clamp-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-primary/70 shrink-0" />
                  <span className="truncate">{record.findings}</span>
                </div>
              )}
            </div>

            {/* Footer: Date & Link */}
            <div className="pt-4 mt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <Clock className="w-3 h-3" />
                <span>Updated {updatedDate}</span>
              </div>
              <Link
                href={`/vault/research/${record.id}`}
                className="inline-flex items-center gap-1 text-primary hover:underline font-medium text-xs group/link"
              >
                <span>View Record</span>
                <ArrowRight className="w-3 h-3 transition-transform group-hover/link:translate-x-0.5" />
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}
