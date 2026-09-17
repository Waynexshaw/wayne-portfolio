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
  AlertTriangle
} from 'lucide-react'
import {
  ReviewItem,
  ReviewType,
  ReviewStatus,
  ReviewConnectionItem,
  setReviewStatus,
  archiveReview,
  restoreReview
} from '@/lib/vault/actions'
import { VaultStatusBadge } from '@/components/vault/vault-badge'
import { formatPeriod } from './review-list'
import { ReviewEditModal } from './review-edit-modal'
import { ReviewConnectionsSection } from './review-connections-section'

interface ReviewDetailViewProps {
  review: ReviewItem
  workspaceId: string
  workspaceName?: string
  connections?: ReviewConnectionItem[]
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

export function ReviewDetailView({
  review,
  workspaceId,
  workspaceName,
  connections = [],
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

  const periodDisplay = formatPeriod(review.period_start, review.period_end)

  const createdDate = new Date(review.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const updatedDate = new Date(review.updated_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const completedDate = review.completed_at
    ? new Date(review.completed_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* 1. HEADER */}
      <div className="space-y-4">
        {/* Navigation & Actions Row */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium transition-colors shadow-xs disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Complete Review
              </button>
            )}

            {review.status === 'completed' && (
              <button
                onClick={() => handleStatusTransition('draft')}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium transition-colors shadow-xs disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Return to Draft
              </button>
            )}

            {review.status === 'archived' ? (
              <button
                onClick={handleRestore}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 transition-colors shadow-xs disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restore
              </button>
            ) : (
              <button
                onClick={() => setShowArchiveConfirm(true)}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/60 text-xs font-medium transition-colors disabled:opacity-50"
              >
                <Archive className="w-3.5 h-3.5" />
                Archive
              </button>
            )}

            <button
              onClick={() => setIsEditOpen(true)}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50"
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
          <div className="p-4 rounded-xl border border-border bg-card text-xs space-y-2">
            <div className="flex items-center gap-2 text-foreground font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Archive this review?</span>
            </div>
            <p className="text-muted-foreground">
              Archived reviews remain accessible via the Archived filter and can be restored at any time.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleArchive}
                disabled={isPending}
                className="px-3 py-1 bg-foreground text-background rounded-md hover:bg-foreground/90 transition-colors text-xs font-medium"
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

        {/* Review Title & Structural Badges */}
        <div className="p-6 rounded-xl border border-border bg-card/60 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/60">
              {formatType(review.review_type)}
            </span>
            <VaultStatusBadge status={review.status} />
            {periodDisplay && (
              <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground bg-secondary/50 px-2.5 py-0.5 rounded border border-border/60">
                <Calendar className="w-3.5 h-3.5" />
                <span>{periodDisplay}</span>
              </div>
            )}
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl font-medium text-foreground tracking-tight">
            {review.title}
          </h1>
        </div>
      </div>

      {/* 2. REVIEW CONTEXT */}
      <section className="space-y-3">
        <div className="p-5 rounded-xl border border-border bg-card/40 space-y-2">
          <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Objective
          </h2>
          <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
            {review.objective || <span className="text-muted-foreground">—</span>}
          </p>
        </div>
      </section>

      {/* 3. EXPECTATION VS REALITY */}
      <section className="space-y-3">
        <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          Expectation vs. Reality
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl border border-border bg-card/40 space-y-2">
            <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Expected Outcome
            </h3>
            <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {review.expected_outcome || <span className="text-muted-foreground">—</span>}
            </p>
          </div>

          <div className="p-5 rounded-xl border border-border bg-card/40 space-y-2">
            <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Actual Outcome
            </h3>
            <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {review.actual_outcome || <span className="text-muted-foreground">—</span>}
            </p>
          </div>
        </div>
      </section>

      {/* 4. ANALYSIS */}
      <section className="space-y-3">
        <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          Analysis
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl border border-border bg-card/40 space-y-2">
            <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              What Worked
            </h3>
            <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {review.what_worked || <span className="text-muted-foreground">—</span>}
            </p>
          </div>

          <div className="p-5 rounded-xl border border-border bg-card/40 space-y-2">
            <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              What Didn&apos;t Work
            </h3>
            <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {review.what_did_not_work || <span className="text-muted-foreground">—</span>}
            </p>
          </div>
        </div>

        {/* Why */}
        <div className="p-5 rounded-xl border border-border bg-card/40 space-y-2">
          <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Why
          </h3>
          <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {review.why || <span className="text-muted-foreground">—</span>}
          </p>
        </div>
      </section>

      {/* 5. SYNTHESIS */}
      <section className="space-y-3">
        <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          Synthesis
        </h2>

        {/* Key Lessons: prominent but restrained */}
        <div className="p-5 rounded-xl border border-border bg-card/60 space-y-2">
          <h3 className="text-xs font-mono text-foreground font-medium uppercase tracking-wider">
            Key Lessons
          </h3>
          <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
            {review.lessons || <span className="text-muted-foreground">—</span>}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl border border-border bg-card/40 space-y-2">
            <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Next Changes
            </h3>
            <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {review.next_changes || <span className="text-muted-foreground">—</span>}
            </p>
          </div>

          <div className="p-5 rounded-xl border border-border bg-card/40 space-y-2">
            <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Summary
            </h3>
            <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {review.summary || <span className="text-muted-foreground">—</span>}
            </p>
          </div>
        </div>
      </section>

      {/* 6. OPERATIONAL CONTEXT */}
      <ReviewConnectionsSection
        reviewId={review.id}
        workspaceId={workspaceId}
        connections={connections}
      />

      {/* 7. HISTORICAL METADATA */}
      <div className="pt-6 border-t border-border/60 flex items-center justify-between text-xs font-mono text-muted-foreground flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span>Created: {createdDate}</span>
          <span>•</span>
          <span>Updated: {updatedDate}</span>
          {completedDate && (
            <>
              <span>•</span>
              <span>Completed: {completedDate}</span>
            </>
          )}
        </div>
      </div>

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
