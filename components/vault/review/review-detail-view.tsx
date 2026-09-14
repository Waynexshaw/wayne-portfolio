'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  RotateCcw, 
  Calendar, 
  CheckCircle2, 
  Archive, 
  Edit3, 
  Loader2,
  Target,
  FileText,
  Lightbulb,
  ArrowRightCircle,
  HelpCircle,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'
import { 
  ReviewItem, 
  ReviewType, 
  ReviewStatus, 
  setReviewStatus, 
  archiveReview, 
  restoreReview 
} from '@/lib/vault/actions'
import { ReviewEditModal } from './review-edit-modal'

interface ReviewDetailViewProps {
  review: ReviewItem
  workspaceId: string
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
    case 'project': return 'Project Review'
    case 'campaign': return 'Campaign Retrospective'
    case 'growth': return 'Growth & Funnel'
    case 'strategy': return 'Strategic Initiative'
    case 'opportunity': return 'Opportunity Post-Mortem'
    case 'partnership': return 'Partnership Reflection'
    case 'period': return 'Periodic Review'
    default: return 'Operational Review'
  }
}

export function ReviewDetailView({
  review,
  workspaceId,
  workspaceName,
}: ReviewDetailViewProps) {
  const router = useRouter()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)

  const handleStatusTransition = (status: ReviewStatus) => {
    setError(null)
    startTransition(async () => {
      try {
        await setReviewStatus(review.id, workspaceId, status)
      } catch (err: any) {
        setError(err.message || 'Failed to update review status')
      }
    })
  }

  const handleArchive = () => {
    setError(null)
    startTransition(async () => {
      try {
        await archiveReview(review.id, workspaceId)
        setShowArchiveConfirm(false)
      } catch (err: any) {
        setError(err.message || 'Failed to archive review')
      }
    })
  }

  const handleRestore = () => {
    setError(null)
    startTransition(async () => {
      try {
        await restoreReview(review.id, workspaceId)
      } catch (err: any) {
        setError(err.message || 'Failed to restore review')
      }
    })
  }

  const periodDisplay = review.period_start || review.period_end
    ? [review.period_start, review.period_end].filter(Boolean).join(' → ')
    : null

  const createdDate = new Date(review.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const updatedDate = new Date(review.updated_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  const completedDate = review.completed_at
    ? new Date(review.completed_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Back Button & Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/vault/reviews"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Reviews</span>
        </Link>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {review.status === 'draft' && (
            <button
              onClick={() => handleStatusTransition('completed')}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-medium hover:bg-emerald-500/20 transition-colors shadow-sm disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Mark Completed
            </button>
          )}

          {review.status === 'completed' && (
            <button
              onClick={() => handleStatusTransition('draft')}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-medium hover:bg-amber-500/20 transition-colors shadow-sm disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Return to Draft
            </button>
          )}

          {review.status === 'archived' ? (
            <button
              onClick={handleRestore}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 transition-colors shadow-sm disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore
            </button>
          ) : (
            <button
              onClick={() => setShowArchiveConfirm(true)}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <Archive className="w-3.5 h-3.5" />
              Archive
            </button>
          )}

          <button
            onClick={() => setIsEditOpen(true)}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit Review
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs">
          {error}
        </div>
      )}

      {/* Archive confirmation dialog */}
      {showArchiveConfirm && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-xs space-y-2">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium">
            <AlertTriangle className="w-4 h-4" />
            <span>Archive this review?</span>
          </div>
          <p className="text-muted-foreground">
            Archived reviews remain accessible via the Archived filter and can be restored at any time.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleArchive}
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

      {/* Title & Metadata Hero Card */}
      <div className="p-6 rounded-xl border border-border bg-card/60 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-mono font-medium px-2.5 py-0.5 rounded-full border ${getTypeBadge(review.review_type)}`}>
            {formatType(review.review_type)}
          </span>
          <span className={`text-xs font-mono font-medium px-2.5 py-0.5 rounded-full border capitalize ${getStatusBadge(review.status)}`}>
            {review.status}
          </span>
          {periodDisplay && (
            <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground bg-secondary/50 px-2.5 py-0.5 rounded-md border border-border">
              <Calendar className="w-3.5 h-3.5" />
              <span>{periodDisplay}</span>
            </div>
          )}
        </div>

        <div>
          <h1 className="font-serif text-2xl font-medium text-foreground">
            {review.title}
          </h1>
          <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground mt-2 flex-wrap">
            <span>Created: {createdDate}</span>
            <span>•</span>
            <span>Last updated: {updatedDate}</span>
            {completedDate && (
              <>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400">Completed: {completedDate}</span>
              </>
            )}
          </div>
        </div>

        {/* Objective */}
        {review.objective && (
          <div className="pt-3 border-t border-border/70 space-y-1.5">
            <h4 className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-primary" />
              Original Objective
            </h4>
            <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {review.objective}
            </p>
          </div>
        )}
      </div>

      {/* Section: Intent vs Reality */}
      {(review.expected_outcome || review.actual_outcome) && (
        <div className="space-y-2">
          <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider px-1">
            Intent vs. Reality
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-2">
              <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Expected Outcome
              </h4>
              <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {review.expected_outcome || <span className="text-muted-foreground italic">No expected outcome recorded.</span>}
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/40 space-y-2">
              <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Actual Outcome
              </h4>
              <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {review.actual_outcome || <span className="text-muted-foreground italic">No actual outcome recorded.</span>}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Section: Performance & Friction */}
      {(review.what_worked || review.what_did_not_work) && (
        <div className="space-y-2">
          <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider px-1">
            Performance & Friction
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2">
              <h4 className="text-xs font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                What Worked
              </h4>
              <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {review.what_worked || <span className="text-muted-foreground italic">No positive factors documented.</span>}
              </p>
            </div>

            <div className="p-5 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-2">
              <h4 className="text-xs font-mono text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                What Did Not Work
              </h4>
              <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {review.what_did_not_work || <span className="text-muted-foreground italic">No friction points documented.</span>}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Section: Diagnosis / Root Cause */}
      {review.why && (
        <div className="p-5 rounded-xl border border-border bg-card/50 space-y-2">
          <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-primary" />
            Root Cause Diagnosis (Why?)
          </h3>
          <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {review.why}
          </p>
        </div>
      )}

      {/* Section: Forward Improvements & Learnings */}
      {(review.lessons || review.next_changes) && (
        <div className="space-y-2">
          <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider px-1">
            Learnings & Forward Changes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-2">
              <h4 className="text-xs font-mono text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5" />
                Lessons Learned
              </h4>
              <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {review.lessons || <span className="text-muted-foreground italic">No generalized lessons recorded.</span>}
              </p>
            </div>

            <div className="p-5 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-2">
              <h4 className="text-xs font-mono text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <ArrowRightCircle className="w-3.5 h-3.5" />
                Next Changes
              </h4>
              <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {review.next_changes || <span className="text-muted-foreground italic">No upcoming changes recorded.</span>}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Section: Executive Summary */}
      {review.summary && (
        <div className="p-5 rounded-xl border border-border bg-card/60 space-y-2">
          <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-primary" />
            Retrospective Summary
          </h3>
          <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {review.summary}
          </p>
        </div>
      )}

      {/* Edit Modal */}
      <ReviewEditModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        review={review}
        workspaceId={workspaceId}
      />
    </div>
  )
}
