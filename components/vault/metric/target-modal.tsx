'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  X,
  Loader2,
  Target,
  Calendar,
  FileText,
  Hash,
  AlertCircle,
} from 'lucide-react'
import {
  createMetricTarget,
  updateMetricTarget,
  type MetricTargetItem,
} from '@/lib/vault/actions'

export interface TargetModalProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
  metricId: string
  metricUnitSymbol?: string | null
  target?: MetricTargetItem | null
  onSuccess?: () => void
}

function formatDateForInput(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
}

export function TargetModal({
  isOpen,
  onClose,
  workspaceId,
  metricId,
  metricUnitSymbol,
  target,
  onSuccess,
}: TargetModalProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isEdit = !!target

  const [targetValue, setTargetValue] = useState<string>('')
  const [baselineValue, setBaselineValue] = useState<string>('')
  const [periodStart, setPeriodStart] = useState<string>('')
  const [periodEnd, setPeriodEnd] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  useEffect(() => {
    if (isOpen) {
      if (target) {
        setTargetValue(
          target.target_value !== null && target.target_value !== undefined
            ? String(target.target_value)
            : ''
        )
        setBaselineValue(
          target.baseline_value !== null && target.baseline_value !== undefined
            ? String(target.baseline_value)
            : ''
        )
        setPeriodStart(formatDateForInput(target.period_start))
        setPeriodEnd(formatDateForInput(target.period_end))
        setNotes(target.notes || '')
      } else {
        setTargetValue('')
        setBaselineValue('')
        setPeriodStart('')
        setPeriodEnd('')
        setNotes('')
      }
      setError(null)
    }
  }, [isOpen, target])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (targetValue.trim() === '') {
      setError('Target value is required.')
      return
    }

    const numTarget = Number(targetValue)
    if (Number.isNaN(numTarget)) {
      setError('Target value must be a valid number.')
      return
    }

    let numBaseline: number | null = null
    if (baselineValue.trim() !== '') {
      const parsedBaseline = Number(baselineValue)
      if (Number.isNaN(parsedBaseline)) {
        setError('Baseline value must be a valid number if provided.')
        return
      }
      numBaseline = parsedBaseline
    }

    if (periodStart && periodEnd && periodEnd < periodStart) {
      setError('Period end date cannot be earlier than period start date.')
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        if (isEdit && target?.id) {
          await updateMetricTarget(target.id, workspaceId, {
            targetValue: numTarget,
            baselineValue: numBaseline,
            periodStart: periodStart || null,
            periodEnd: periodEnd || null,
            notes: notes.trim() || null,
          })
        } else {
          await createMetricTarget({
            workspaceId,
            metricId,
            targetValue: numTarget,
            baselineValue: numBaseline,
            periodStart: periodStart || null,
            periodEnd: periodEnd || null,
            notes: notes.trim() || null,
          })
        }

        if (onSuccess) {
          onSuccess()
        }
        onClose()
      } catch (err: any) {
        setError(err?.message || 'Failed to save metric target.')
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) {
          onClose()
        }
      }}
    >
      <div
        className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl p-6 my-8 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-base font-medium text-foreground">
                {isEdit ? 'Edit Metric Target' : 'Set Metric Target'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? 'Update benchmark goal thresholds and timeframe.'
                  : 'Define a benchmark expectation and target cycle for this metric.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3 text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/20 font-mono flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Value & Baseline Value */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                <Target className="w-3 h-3 text-primary" />
                <span>
                  Target Value <span className="text-destructive">*</span>
                </span>
                {metricUnitSymbol && (
                  <span className="text-muted-foreground/80 font-normal">
                    ({metricUnitSymbol})
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 1000"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors font-mono tabular-nums ${
                    metricUnitSymbol ? 'pr-12' : ''
                  }`}
                />
                {metricUnitSymbol && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-xs font-mono text-muted-foreground">
                    {metricUnitSymbol}
                  </div>
                )}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Desired performance objective.
              </p>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                <Hash className="w-3 h-3" />
                <span>Baseline Value</span>
                {metricUnitSymbol && (
                  <span className="text-muted-foreground/80 font-normal">
                    ({metricUnitSymbol})
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 350"
                  value={baselineValue}
                  onChange={(e) => setBaselineValue(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors font-mono tabular-nums ${
                    metricUnitSymbol ? 'pr-12' : ''
                  }`}
                />
                {metricUnitSymbol && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-xs font-mono text-muted-foreground">
                    {metricUnitSymbol}
                  </div>
                )}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Optional starting reference value.
              </p>
            </div>
          </div>

          {/* Period Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Period Start</span>
              </label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors font-mono"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Cycle start date (optional).
              </p>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Period End</span>
              </label>
              <input
                type="date"
                value={periodEnd}
                min={periodStart || undefined}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors font-mono"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Target deadline date (optional).
              </p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span>Notes</span>
            </label>
            <textarea
              rows={3}
              placeholder="Context, rationale, or milestone for this target"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors resize-none font-sans"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isEdit ? 'Update Target' : 'Create Target'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TargetModal
