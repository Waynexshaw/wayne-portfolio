'use client'

import { useState, useTransition, useEffect } from 'react'
import {
  X,
  Loader2,
  Calendar,
  CalendarRange,
  Hash,
  Link2,
  FileText,
  Tag,
  BarChart3,
  Edit3,
  Info,
} from 'lucide-react'
import {
  createMetricObservation,
  updateMetricObservation,
  type MetricObservationItem,
} from '@/lib/vault/actions'

export interface ObservationModalProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
  metricId: string
  metricMeasurementType: 'point' | 'period'
  metricUnitSymbol?: string | null
  observation?: MetricObservationItem | null
  onSuccess?: () => void
}

export function ObservationModal({
  isOpen,
  onClose,
  workspaceId,
  metricId,
  metricMeasurementType,
  metricUnitSymbol,
  observation,
  onSuccess,
}: ObservationModalProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isEdit = Boolean(observation && observation.id)

  const getTodayString = () => new Date().toISOString().split('T')[0]

  const [value, setValue] = useState('')
  const [observedAt, setObservedAt] = useState(getTodayString())
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [sourceLabel, setSourceLabel] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [notes, setNotes] = useState('')

  // Initialize or reset form state when modal opens or observation changes
  useEffect(() => {
    if (isOpen) {
      if (observation) {
        setValue(
          observation.value !== undefined && observation.value !== null
            ? String(observation.value)
            : ''
        )
        setObservedAt(
          observation.observed_at ? observation.observed_at.split('T')[0] : getTodayString()
        )
        setPeriodStart(
          observation.period_start ? observation.period_start.split('T')[0] : ''
        )
        setPeriodEnd(
          observation.period_end ? observation.period_end.split('T')[0] : ''
        )
        setSourceLabel(observation.source_label || '')
        setSourceUrl(observation.source_url || '')
        setNotes(observation.notes || '')
      } else {
        setValue('')
        setObservedAt(getTodayString())
        setPeriodStart('')
        setPeriodEnd('')
        setSourceLabel('')
        setSourceUrl('')
        setNotes('')
      }
      setError(null)
    }
  }, [isOpen, observation])

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isPending) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isPending, onClose])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validation: Value required & numeric
    if (value.trim() === '' || isNaN(Number(value))) {
      setError('Please enter a valid numeric observation value.')
      return
    }

    // Validation: Observed at required
    if (!observedAt.trim()) {
      setError('Observed date is required.')
      return
    }

    // Validation: Period dates consistency
    if (periodStart.trim() && periodEnd.trim() && periodEnd.trim() < periodStart.trim()) {
      setError('Period end date cannot be earlier than period start date.')
      return
    }

    // Validation: Optional source URL formatting
    let formattedUrl: string | null = null
    if (sourceUrl.trim()) {
      const rawUrl = sourceUrl.trim()
      try {
        const parsed = rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
          ? new URL(rawUrl)
          : new URL(`https://${rawUrl}`)
        formattedUrl = parsed.toString()
      } catch {
        setError('Please enter a valid source URL (e.g. https://analytics.google.com).')
        return
      }
    }

    setError(null)

    startTransition(async () => {
      try {
        const numericValue = Number(value)

        if (isEdit && observation) {
          await updateMetricObservation(observation.id, workspaceId, {
            value: numericValue,
            observedAt: observedAt.trim() || undefined,
            periodStart: periodStart.trim() || null,
            periodEnd: periodEnd.trim() || null,
            sourceLabel: sourceLabel.trim() || null,
            sourceUrl: formattedUrl,
            notes: notes.trim() || null,
          })
        } else {
          await createMetricObservation({
            workspaceId,
            metricId,
            value: numericValue,
            observedAt: observedAt.trim() || undefined,
            periodStart: periodStart.trim() || null,
            periodEnd: periodEnd.trim() || null,
            sourceLabel: sourceLabel.trim() || null,
            sourceUrl: formattedUrl,
            notes: notes.trim() || null,
          })
        }

        if (onSuccess) {
          onSuccess()
        }
        onClose()
      } catch (err: any) {
        setError(err.message || 'Failed to save metric observation')
      }
    })
  }

  const isPeriod = metricMeasurementType === 'period'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto"
      onClick={() => {
        if (!isPending) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="relative w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl p-6 my-8 space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
              {isEdit ? <Edit3 className="w-5 h-5" /> : <BarChart3 className="w-5 h-5" />}
            </div>
            <div>
              <h2 id="modal-title" className="font-serif text-lg font-medium text-foreground">
                {isEdit ? 'Edit Observation' : 'Log Metric Observation'}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEdit
                  ? 'Update observation reading, timeframe, and attribution context.'
                  : isPeriod
                  ? 'Record a periodic observation data point for this metric.'
                  : 'Capture a point-in-time quantitative measurement for this metric.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/20 font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Value & Observed At */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Value */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-primary" />
                  <span>
                    Value <span className="text-destructive">*</span>
                  </span>
                </label>
                {metricUnitSymbol && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                    {metricUnitSymbol}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 472"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className={`w-full px-3 py-2 text-sm rounded-lg border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors ${
                    metricUnitSymbol ? 'pr-14' : ''
                  }`}
                />
                {metricUnitSymbol && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs font-mono text-muted-foreground truncate max-w-[3.5rem]">
                    {metricUnitSymbol}
                  </div>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground mt-1 block">
                The numeric measurement value recorded.
              </span>
            </div>

            {/* Observed At */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>
                  Observed At <span className="text-destructive">*</span>
                </span>
              </label>
              <input
                type="date"
                required
                value={observedAt}
                onChange={(e) => setObservedAt(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-secondary/50 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
              />
              <span className="text-[11px] text-muted-foreground mt-1 block">
                Date when this observation was logged or detected.
              </span>
            </div>
          </div>

          {/* Period Section: Prominent for period metrics, clean/optional for point metrics */}
          {isPeriod ? (
            <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-primary font-medium">
                  <CalendarRange className="w-3.5 h-3.5 text-primary" />
                  <span>Observation Period Window</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Period Metric
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                This metric aggregates performance over a time range. Provide the beginning and ending dates of the measured window.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                    Period Start
                  </label>
                  <input
                    type="date"
                    value={periodStart}
                    max={periodEnd || undefined}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                    Period End
                  </label>
                  <input
                    type="date"
                    value={periodEnd}
                    min={periodStart || undefined}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl border border-border/70 bg-secondary/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  <CalendarRange className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Timeframe Span (Optional)</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  Point Metric
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Leave blank if this is a discrete snapshot, or define the bounding timeframe if this reading reflects a summary period.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                    Period Start
                  </label>
                  <input
                    type="date"
                    value={periodStart}
                    max={periodEnd || undefined}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-secondary/50 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                    Period End
                  </label>
                  <input
                    type="date"
                    value={periodEnd}
                    min={periodStart || undefined}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-secondary/50 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Row 3: Source Label & Source URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Source Label</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Google Analytics, Manual Count, X Dashboard"
                value={sourceLabel}
                onChange={(e) => setSourceLabel(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
              />
              <span className="text-[11px] text-muted-foreground mt-1 block">
                Provider, tooling, or origin of the reading.
              </span>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Source URL</span>
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
              />
              <span className="text-[11px] text-muted-foreground mt-1 block">
                Direct link to source report or external dashboard.
              </span>
            </div>
          </div>

          {/* Row 4: Notes */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Notes</span>
            </label>
            <textarea
              rows={3}
              placeholder="Observations, anomalies, or qualitative context"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors resize-none"
            />
            <span className="text-[11px] text-muted-foreground mt-1 block">
              Any situational nuances, methodology shifts, or contextual commentary.
            </span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-border text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isEdit ? 'Update Observation' : 'Log Observation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ObservationModal
