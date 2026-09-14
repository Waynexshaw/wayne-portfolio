'use client'

import Link from 'next/link'
import { 
  RotateCcw, 
  Calendar, 
  CheckCircle2, 
  ArrowRight, 
  Target, 
  Lightbulb, 
  AlertCircle 
} from 'lucide-react'
import { ReviewItem, ReviewType, ReviewStatus } from '@/lib/vault/actions'

interface ReviewListProps {
  records: ReviewItem[]
  hasActiveFilters: boolean
  workspaceId?: string
  workspaceName?: string
}

function getTypeBadge(type: ReviewType) {
  switch (type) {
    case 'project':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
    case 'campaign':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
    case 'growth':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
    case 'strategy':
      return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
    case 'opportunity':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
    case 'partnership':
      return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30'
    case 'period':
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
    case 'other':
    default:
      return 'bg-secondary text-muted-foreground border-border'
  }
}

function getStatusBadge(status: ReviewStatus) {
  switch (status) {
    case 'completed':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
    case 'draft':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
    case 'archived':
      return 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30'
    default:
      return 'bg-secondary text-muted-foreground border-border'
  }
}

function formatType(type: ReviewType) {
  switch (type) {
    case 'project': return 'Project'
    case 'campaign': return 'Campaign'
    case 'growth': return 'Growth'
    case 'strategy': return 'Strategy'
    case 'opportunity': return 'Opportunity'
    case 'partnership': return 'Partnership'
    case 'period': return 'Periodic'
    default: return 'Review'
  }
}

export function ReviewList({
  records,
  hasActiveFilters,
  workspaceName,
}: ReviewListProps) {
  if (records.length === 0) {
    if (hasActiveFilters) {
      return (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
          <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-serif text-lg font-medium text-foreground">
            No reviews found
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
            No operational reviews matched your search query or filter criteria. Try adjusting or clearing your filters.
          </p>
        </div>
      )
    }

    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
          <RotateCcw className="w-6 h-6 text-primary" />
        </div>
        <h3 className="font-serif text-lg font-medium text-foreground">
          No operational reviews yet
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
          Establish the continuous learning loop for {workspaceName || 'this workspace'}. Reflect on projects, campaigns, and strategic milestones.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {records.map((review) => {
        const periodDisplay = review.period_start || review.period_end
          ? [review.period_start, review.period_end].filter(Boolean).join(' → ')
          : null

        const updatedDate = new Date(review.updated_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })

        return (
          <Link
            key={review.id}
            href={`/vault/reviews/${review.id}`}
            className="group relative flex flex-col justify-between p-5 rounded-xl border border-border bg-card/50 hover:bg-card/90 hover:border-primary/40 hover:shadow-md transition-all duration-200"
          >
            <div className="space-y-3">
              {/* Header Badges */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border ${getTypeBadge(review.review_type)}`}>
                    {formatType(review.review_type)}
                  </span>
                  <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border capitalize ${getStatusBadge(review.status)}`}>
                    {review.status}
                  </span>
                </div>

                {periodDisplay && (
                  <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground bg-secondary/40 px-2 py-0.5 rounded border border-border">
                    <Calendar className="w-3 h-3" />
                    <span>{periodDisplay}</span>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <h3 className="font-serif text-base font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                  {review.title}
                </h3>
              </div>

              {/* Objective or Summary Snippet */}
              {review.objective && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  <span className="font-mono text-[10px] uppercase text-foreground/80 mr-1">Objective:</span>
                  {review.objective}
                </p>
              )}

              {/* Lessons Learned Snippet if available */}
              {review.lessons && (
                <div className="p-2 rounded-lg bg-secondary/30 border border-border/60 text-[11px] text-muted-foreground line-clamp-2 flex items-start gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>{review.lessons}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-4 mt-4 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="font-mono">Updated {updatedDate}</span>
              <span className="inline-flex items-center gap-1 text-primary text-xs font-medium group-hover:translate-x-0.5 transition-transform">
                View Retrospective
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
