'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2, RotateCcw, Calendar, Target, HelpCircle } from 'lucide-react'
import { createReview, ReviewType, ReviewStatus } from '@/lib/vault/actions'

interface ReviewCreateModalProps {
  isOpen: boolean
  onClose: () => void
  workspaceId?: string
  workspaceName?: string
}

const REVIEW_TYPES: { value: ReviewType; label: string }[] = [
  { value: 'project', label: 'Project Review' },
  { value: 'campaign', label: 'Campaign Retrospective' },
  { value: 'growth', label: 'Growth & Funnel' },
  { value: 'strategy', label: 'Strategic Initiative' },
  { value: 'opportunity', label: 'Opportunity Post-Mortem' },
  { value: 'partnership', label: 'Partnership Reflection' },
  { value: 'period', label: 'Periodic Review (Quarter/Month)' },
  { value: 'other', label: 'General Retrospective' },
]

export function ReviewCreateModal({
  isOpen,
  onClose,
  workspaceId,
  workspaceName,
}: ReviewCreateModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [reviewType, setReviewType] = useState<ReviewType>('project')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [objective, setObjective] = useState('')
  const [expectedOutcome, setExpectedOutcome] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!workspaceId) {
      setError('Workspace is required')
      return
    }
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
        const review = await createReview({
          workspaceId,
          title: title.trim(),
          reviewType,
          periodStart: periodStart || null,
          periodEnd: periodEnd || null,
          objective: objective.trim() || null,
          expectedOutcome: expectedOutcome.trim() || null,
        })
        onClose()
        router.push(`/vault/reviews/${review.id}`)
      } catch (err: any) {
        setError(err.message || 'Failed to create review')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-card/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center text-foreground">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-base font-medium text-foreground tracking-tight">
                New Review
              </h2>
              <p className="text-xs text-muted-foreground">
                {workspaceName ? `in ${workspaceName}` : 'Capture retrospective reflection and learnings'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
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
              placeholder="e.g., Q3 Payment Settlement Infrastructure Review"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:border-foreground/40 focus:outline-none transition-colors"
            />
          </div>

          {/* Review Type */}
          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
              Review Type
            </label>
            <select
              value={reviewType}
              onChange={(e) => setReviewType(e.target.value as ReviewType)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-card border border-border text-foreground focus:border-foreground/40 focus:outline-none cursor-pointer"
            >
              {REVIEW_TYPES.map((t) => (
                <option key={t.value} value={t.value} className="bg-card text-foreground">
                  {t.label}
                </option>
              ))}
            </select>
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
                className="w-full px-3 py-2 text-xs rounded-lg bg-card border border-border text-foreground focus:border-foreground/40 focus:outline-none"
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
                className="w-full px-3 py-2 text-xs rounded-lg bg-card border border-border text-foreground focus:border-foreground/40 focus:outline-none"
              />
            </div>
          </div>

          {/* Objective */}
          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
              Objective
            </label>
            <textarea
              rows={3}
              placeholder="What was this review evaluating? Original scope and purpose."
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:border-foreground/40 focus:outline-none resize-none"
            />
          </div>

          {/* Expected Outcome */}
          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
              Expected Outcome
            </label>
            <textarea
              rows={2}
              placeholder="What outcome or targets were anticipated at the start?"
              value={expectedOutcome}
              onChange={(e) => setExpectedOutcome(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:border-foreground/40 focus:outline-none resize-none"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
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
              Create Review
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
