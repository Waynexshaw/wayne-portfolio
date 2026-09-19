'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  Calendar,
  FolderGit2,
  Video,
  Edit3,
  Archive,
  RotateCcw,
  ChevronRight,
  FileText,
} from 'lucide-react'
import { Decision } from '@/lib/vault/operations/types'
import {
  archiveDecisionAction,
  restoreDecisionAction,
} from '@/lib/vault/operations-actions'
import { cn } from '@/lib/utils'

interface DecisionListProps {
  decisions: Decision[]
  workspaceId: string
  isAdmin?: boolean
  onEditDecision: (decision: Decision) => void
  onRefresh?: () => void
}

export function DecisionList({
  decisions,
  workspaceId,
  isAdmin = false,
  onEditDecision,
  onRefresh,
}: DecisionListProps) {
  const [isPending, startTransition] = useTransition()
  const [activeDecisionId, setActiveDecisionId] = useState<string | null>(null)

  const handleArchive = (decision: Decision) => {
    setActiveDecisionId(decision.id)
    startTransition(async () => {
      try {
        if (decision.archived_at) {
          await restoreDecisionAction(workspaceId, decision.id)
        } else {
          await archiveDecisionAction(workspaceId, decision.id)
        }
        onRefresh?.()
      } catch (err) {
        console.error('Failed to archive/restore decision:', err)
      } finally {
        setActiveDecisionId(null)
      }
    })
  }

  if (decisions.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground text-xs bg-card border border-border rounded-xl space-y-2">
        <FileText className="w-8 h-8 mx-auto opacity-30 text-primary" />
        <p className="font-medium text-foreground">No decisions recorded</p>
        <p className="text-muted-foreground/80">Record an architectural or operational decision above.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {decisions.map((item) => {
        const isActionLoading = isPending && activeDecisionId === item.id

        return (
          <div
            key={item.id}
            className={cn(
              'p-5 rounded-xl border bg-card transition-all flex flex-col gap-3 group',
              item.archived_at
                ? 'opacity-60 border-border/50 bg-secondary/20'
                : 'border-border hover:border-border/90'
            )}
          >
            {/* Header: Title + Date + Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/vault/operations/decisions/${item.id}`}
                  prefetch={false}
                  className="text-base font-semibold text-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
                >
                  <span>{item.title}</span>
                  <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </Link>
                {item.archived_at && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    Archived
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>{item.decided_at}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onEditDecision(item)}
                    disabled={isActionLoading || Boolean(item.archived_at)}
                    className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
                    title="Edit Decision"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleArchive(item)}
                    disabled={isActionLoading}
                    className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
                    title={item.archived_at ? 'Restore Decision' : 'Archive Decision'}
                  >
                    {item.archived_at ? (
                      <RotateCcw className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Archive className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Decision Statement Box */}
            <div className="p-3.5 rounded-lg bg-secondary/50 border border-border/80 text-xs font-medium text-foreground leading-relaxed">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                DECISION STATEMENT
              </span>
              {item.decision}
            </div>

            {/* Context preview */}
            {item.context && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                <span className="font-medium text-foreground">Context: </span>
                {item.context}
              </p>
            )}

            {/* Footer metadata: Linked project & meeting */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/70 text-[11px] text-muted-foreground">
              {item.project && (
                <Link
                  href={`/vault/projects/${item.project.id}`}
                  prefetch={false}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                >
                  <FolderGit2 className="w-3 h-3 text-primary" />
                  <span>{item.project.title}</span>
                </Link>
              )}

              {item.meeting && (
                <Link
                  href={`/vault/operations/meetings/${item.meeting_id}`}
                  prefetch={false}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                >
                  <Video className="w-3 h-3 text-primary" />
                  <span>{item.meeting.title}</span>
                </Link>
              )}

              <div className="ml-auto">
                <Link
                  href={`/vault/operations/decisions/${item.id}`}
                  prefetch={false}
                  className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
                >
                  <span>View Decision</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
