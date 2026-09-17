'use client'

import Link from 'next/link'
import { 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  HelpCircle, 
  Target,
  AlertCircle
} from 'lucide-react'
import { VaultStatusBadge, VaultPriorityBadge } from '@/components/vault/vault-badge'

interface ResearchListProps {
  records: any[]
  hasActiveFilters: boolean
  workspaceId?: string
  workspaceName?: string
}

export function ResearchList({
  records,
  hasActiveFilters,
  workspaceName,
}: ResearchListProps) {
  if (records.length === 0) {
    if (hasActiveFilters) {
      return (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center">
          <AlertCircle className="w-7 h-7 text-muted-foreground mx-auto mb-2.5" />
          <h3 className="font-serif text-base font-medium text-foreground">
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
        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3 text-primary">
          <BookOpen className="w-5 h-5" />
        </div>
        <h3 className="font-serif text-base font-medium text-foreground">
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
        const isCompleted = record.status === 'completed'
        const updatedDate = new Date(record.updated_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
        const completedDate = record.completed_at
          ? new Date(record.completed_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : null

        return (
          <div
            key={record.id}
            className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-all shadow-sm"
          >
            <div className="space-y-3">
              {/* Badges: Research Type, Status, Priority */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/50">
                    {record.research_type}
                  </span>
                  <VaultStatusBadge status={record.status} showDot className="text-[10px] px-2 py-0" />
                </div>
                {record.priority && (
                  <VaultPriorityBadge priority={record.priority} className="text-[10px] px-1.5 py-0" />
                )}
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

              {/* Central Research Question or Objective preview */}
              {record.research_question ? (
                <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground font-mono text-[10px] uppercase tracking-wider mb-1">
                    <HelpCircle className="w-3 h-3 shrink-0 text-muted-foreground/80" />
                    <span>Inquiry Question</span>
                  </div>
                  <p className="text-foreground/90 line-clamp-2 font-serif text-sm leading-relaxed">
                    &ldquo;{record.research_question}&rdquo;
                  </p>
                </div>
              ) : record.objective ? (
                <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground font-mono text-[10px] uppercase tracking-wider mb-1">
                    <Target className="w-3 h-3 shrink-0 text-muted-foreground/80" />
                    <span>Objective</span>
                  </div>
                  <p className="text-foreground/80 line-clamp-2 leading-relaxed">
                    {record.objective}
                  </p>
                </div>
              ) : record.summary ? (
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {record.summary}
                </p>
              ) : null}
            </div>

            {/* Footer: Date & Navigation Link */}
            <div className="pt-3.5 mt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                {isCompleted && completedDate ? (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <CheckCircle2 className="w-3 h-3 text-muted-foreground" />
                    <span>Completed {completedDate}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-muted-foreground/70" />
                    <span>Updated {updatedDate}</span>
                  </span>
                )}
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
