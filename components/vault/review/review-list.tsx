'use client'

import Link from 'next/link'
import { RotateCcw, Calendar, ArrowRight } from 'lucide-react'
import { ReviewItem, ReviewType } from '@/lib/vault/actions'
import { VaultStatusBadge } from '@/components/vault/vault-badge'

interface ReviewListProps {
  records: ReviewItem[]
  hasActiveFilters: boolean
  workspaceId?: string
  workspaceName?: string
}

function formatType(type: ReviewType | string) {
  switch (type) {
    case 'project': return 'Project'
    case 'campaign': return 'Campaign'
    case 'growth': return 'Growth'
    case 'strategy': return 'Strategy'
    case 'opportunity': return 'Opportunity'
    case 'partnership': return 'Partnership'
    case 'period': return 'Periodic'
    default: return type || 'Review'
  }
}

export function formatPeriod(start?: string | null, end?: string | null): string | null {
  if (!start && !end) return null

  const formatDate = (d: string) => {
    const [year, month, day] = d.split('-').map(Number)
    if (!year || !month || !day) return d
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (start && end) {
    if (start === end) return formatDate(start)
    return `${formatDate(start)} – ${formatDate(end)}`
  }
  if (start) return `From ${formatDate(start)}`
  if (end) return `Until ${formatDate(end)}`
  return null
}

export function ReviewList({
  records,
  hasActiveFilters,
  workspaceName,
}: ReviewListProps) {
  if (records.length === 0) {
    if (hasActiveFilters) {
      return (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-12 text-center space-y-2">
          <h3 className="font-serif text-base font-medium text-foreground">
            No reviews found
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No reviews match the selected status, category, or search query.
          </p>
        </div>
      )
    }

    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 p-12 text-center space-y-2">
        <div className="w-10 h-10 rounded-full bg-secondary border border-border/60 flex items-center justify-center mx-auto text-muted-foreground mb-1">
          <RotateCcw className="w-5 h-5" />
        </div>
        <h3 className="font-serif text-base font-medium text-foreground">
          No reviews yet
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Capture retrospectives, analyze outcomes, and document operating lessons for {workspaceName || 'this workspace'}.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {records.map((review) => {
        const periodDisplay = formatPeriod(review.period_start, review.period_end)

        const dateLabel = review.status === 'completed' && review.completed_at
          ? `Completed ${new Date(review.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
          : `Updated ${new Date(review.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

        return (
          <Link
            key={review.id}
            href={`/vault/reviews/${review.id}`}
            prefetch={false}
            className="group relative flex flex-col justify-between p-5 rounded-xl border border-border bg-card/50 hover:bg-card/90 hover:border-foreground/25 transition-all duration-150"
          >
            <div className="space-y-3">
              {/* Header Badges */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/60">
                    {formatType(review.review_type)}
                  </span>
                  <VaultStatusBadge status={review.status} />
                </div>

                {periodDisplay && (
                  <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded border border-border/60">
                    <Calendar className="w-3 h-3" />
                    <span>{periodDisplay}</span>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <h3 className="font-serif text-base font-medium text-foreground group-hover:text-foreground/80 transition-colors line-clamp-2">
                  {review.title}
                </h3>
              </div>

              {/* Objective / Supporting Context */}
              {review.objective && (
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {review.objective}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 mt-4 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="font-mono">{dateLabel}</span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground/75 group-hover:text-foreground group-hover:translate-x-0.5 transition-all">
                View Review
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
