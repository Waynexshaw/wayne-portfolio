'use client'

import { useState, useTransition } from 'react'
import { X, Loader2, Edit3, Calendar } from 'lucide-react'
import { updateReview, ReviewItem, ReviewType, ReviewStatus } from '@/lib/vault/actions'

interface ReviewEditModalProps {
  isOpen: boolean
  onClose: () => void
  review: ReviewItem
  workspaceId: string
}

const REVIEW_TYPES: { value: ReviewType; label: string }[] = [
  { value: 'project', label: 'Project Review' },
  { value: 'campaign', label: 'Campaign Retrospective' },
  { value: 'growth', label: 'Growth & Funnel' },
  { value: 'strategy', label: 'Strategic Initiative' },
  { value: 'opportunity', label: 'Opportunity Post-Mortem' },
  { value: 'partnership', label: 'Partnership Reflection' },
  { value: 'period', label: 'Periodic Review' },
  { value: 'other', label: 'General Retrospective' },
]

const STATUSES: { value: ReviewStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
]

export function ReviewEditModal({
  isOpen,
  onClose,
  review,
  workspaceId,
}: ReviewEditModalProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState(review.title || '')
  const [reviewType, setReviewType] = useState<ReviewType>(review.review_type || 'project')
  const [status, setStatus] = useState<ReviewStatus>(review.status || 'draft')
  const [periodStart, setPeriodStart] = useState(review.period_start || '')
  const [periodEnd, setPeriodEnd] = useState(review.period_end || '')
  const [objective, setObjective] = useState(review.objective || '')
  const [expectedOutcome, setExpectedOutcome] = useState(review.expected_outcome || '')
  const [actualOutcome, setActualOutcome] = useState(review.actual_outcome || '')
  const [whatWorked, setWhatWorked] = useState(review.what_worked || '')
  const [whatDidNotWork, setWhatDidNotWork] = useState(review.what_did_not_work || '')
  const [why, setWhy] = useState(review.why || '')
  const [lessons, setLessons] = useState(review.lessons || '')
  const [nextChanges, setNextChanges] = useState(review.next_changes || '')
  const [summary, setSummary] = useState(review.summary || '')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (periodStart && periodEnd && periodStart > periodEnd) {
      setError('Period start date cannot be after period end date')
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        await updateReview(review.id, {
          workspaceId,
          title: title.trim(),
          reviewType,
          status,
          periodStart: periodStart || null,
          periodEnd: periodEnd || null,
          objective: objective.trim() || null,
          expectedOutcome: expectedOutcome.trim() || null,
          actualOutcome: actualOutcome.trim() || null,
          whatWorked: whatWorked.trim() || null,
          whatDidNotWork: whatDidNotWork.trim() || null,
          why: why.trim() || null,
          lessons: lessons.trim() || null,
          nextChanges: nextChanges.trim() || null,
          summary: summary.trim() || null,
        })
        onClose()
      } catch (err: any) {
        setError(err.message || 'Failed to update review')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-card/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-base font-medium text-foreground">
                Edit Operational Review
              </h2>
              <p className="text-xs text-muted-foreground">
                Update retrospective details, diagnosis, and action items
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
              Review Title <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-background border border-border focus:border-primary focus:outline-none"
            />
          </div>

          {/* Type and Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={reviewType}
                onChange={(e) => setReviewType(e.target.value as ReviewType)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-background border border-border focus:border-primary focus:outline-none"
              >
                {REVIEW_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ReviewStatus)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-background border border-border focus:border-primary focus:outline-none"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Period Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                Period Start
              </label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-background border border-border focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                Period End
              </label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-background border border-border focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Objective */}
          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
              Original Objective
            </label>
            <textarea
              rows={2}
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="What did we set out to do?"
              className="w-full px-3 py-2 text-xs rounded-lg bg-background border border-border focus:border-primary focus:outline-none resize-none"
            />
          </div>

          {/* Expected vs Actual Outcome */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                Expected Outcome
              </label>
              <textarea
                rows={3}
                value={expectedOutcome}
                onChange={(e) => setExpectedOutcome(e.target.value)}
                placeholder="What was supposed to happen?"
                className="w-full px-3 py-2 text-xs rounded-lg bg-background border border-border focus:border-primary focus:outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                Actual Outcome
              </label>
              <textarea
                rows={3}
                value={actualOutcome}
                onChange={(e) => setActualOutcome(e.target.value)}
                placeholder="What actually materialized?"
                className="w-full px-3 py-2 text-xs rounded-lg bg-background border border-border focus:border-primary focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* What Worked vs What Didn't Work */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                What Worked
              </label>
              <textarea
                rows={3}
                value={whatWorked}
                onChange={(e) => setWhatWorked(e.target.value)}
                placeholder="Positive levers, strong execution points"
                className="w-full px-3 py-2 text-xs rounded-lg bg-background border border-border focus:border-primary focus:outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                What Did Not Work
              </label>
              <textarea
                rows={3}
                value={whatDidNotWork}
                onChange={(e) => setWhatDidNotWork(e.target.value)}
                placeholder="Friction points, blockers, misses"
                className="w-full px-3 py-2 text-xs rounded-lg bg-background border border-border focus:border-primary focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Why (Diagnosis) */}
          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
              Root Cause Diagnosis (Why?)
            </label>
            <textarea
              rows={3}
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              placeholder="Why did things turn out this way? Underlying factors and mechanisms"
              className="w-full px-3 py-2 text-xs rounded-lg bg-background border border-border focus:border-primary focus:outline-none resize-none"
            />
          </div>

          {/* Lessons Learned */}
          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
              Lessons Learned
            </label>
            <textarea
              rows={3}
              value={lessons}
              onChange={(e) => setLessons(e.target.value)}
              placeholder="Generalized principles, cognitive takeaways, team knowledge"
              className="w-full px-3 py-2 text-xs rounded-lg bg-background border border-border focus:border-primary focus:outline-none resize-none"
            />
          </div>

          {/* Next Changes */}
          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
              Next Changes
            </label>
            <textarea
              rows={3}
              value={nextChanges}
              onChange={(e) => setNextChanges(e.target.value)}
              placeholder="Concrete adjustments to systems, cadences, processes, or priorities"
              className="w-full px-3 py-2 text-xs rounded-lg bg-background border border-border focus:border-primary focus:outline-none resize-none"
            />
          </div>

          {/* Executive Summary */}
          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
              Executive Summary
            </label>
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="High-level synopsis of the retrospective"
              className="w-full px-3 py-2 text-xs rounded-lg bg-background border border-border focus:border-primary focus:outline-none resize-none"
            />
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-3.5 py-1.5 text-xs rounded-lg border border-border hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !title.trim()}
              className="px-4 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
