'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2, AlertCircle, BarChart2 } from 'lucide-react'
import {
  createWorkspaceMetric,
  getWorkspaceProjects,
  MetricCategory,
  MetricUnitType,
  MetricDirection,
  MetricMeasurementType,
  MetricCadence,
} from '@/lib/vault/actions'

export interface MetricCreateModalProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
  projects?: { id: string; title: string }[]
  onSuccess?: (newMetricId?: string) => void
  defaultProjectId?: string
}

const CATEGORIES: { value: MetricCategory; label: string }[] = [
  { value: 'growth', label: 'Growth' },
  { value: 'financial', label: 'Financial' },
  { value: 'operational', label: 'Operational' },
  { value: 'product', label: 'Product' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'community', label: 'Community' },
  { value: 'other', label: 'Other' },
]

const UNIT_TYPES: { value: MetricUnitType; label: string }[] = [
  { value: 'count', label: 'Count / Numeric' },
  { value: 'currency', label: 'Currency' },
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'duration', label: 'Duration' },
  { value: 'score', label: 'Score / Rating' },
]

const DIRECTIONS: { value: MetricDirection; label: string }[] = [
  { value: 'higher_is_better', label: 'Higher is better' },
  { value: 'lower_is_better', label: 'Lower is better' },
  { value: 'neutral', label: 'Neutral' },
]

const MEASUREMENT_TYPES: { value: MetricMeasurementType; label: string }[] = [
  { value: 'point', label: 'Point-in-Time (Snapshot)' },
  { value: 'period', label: 'Period (Aggregate / Over Time)' },
]

const CADENCES: { value: MetricCadence; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'ad_hoc', label: 'Ad-hoc' },
]

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64)
}

export function MetricCreateModal({
  isOpen,
  onClose,
  workspaceId,
  projects: initialProjects,
  onSuccess,
  defaultProjectId,
}: MetricCreateModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [isKeyManuallyEdited, setIsKeyManuallyEdited] = useState(false)
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<MetricCategory>('growth')
  const [unitType, setUnitType] = useState<MetricUnitType>('count')
  const [unitSymbol, setUnitSymbol] = useState('')
  const [direction, setDirection] = useState<MetricDirection>('higher_is_better')
  const [measurementType, setMeasurementType] = useState<MetricMeasurementType>('point')
  const [cadence, setCadence] = useState<string>('')
  const [projectId, setProjectId] = useState<string>(defaultProjectId || '')

  const [projects, setProjects] = useState<{ id: string; title: string }[]>(initialProjects || [])

  // Auto-fill suggested unit symbol based on unitType
  const handleUnitTypeChange = (newType: MetricUnitType) => {
    setUnitType(newType)
    if (!unitSymbol || ['count', 'currency', 'percentage', 'duration', 'score'].includes(unitSymbol)) {
      if (newType === 'currency') setUnitSymbol('USD')
      else if (newType === 'percentage') setUnitSymbol('%')
      else if (newType === 'duration') setUnitSymbol('days')
      else if (newType === 'count') setUnitSymbol('')
      else if (newType === 'score') setUnitSymbol('/10')
    }
  }

  const handleNameChange = (val: string) => {
    setName(val)
    if (!isKeyManuallyEdited) {
      setKey(slugify(val))
    }
  }

  useEffect(() => {
    if (isOpen) {
      if (!initialProjects || initialProjects.length === 0) {
        getWorkspaceProjects(workspaceId).then((res) => {
          setProjects(res.map((p) => ({ id: p.id, title: p.title })))
        }).catch(() => {})
      } else {
        setProjects(initialProjects)
      }
      setProjectId(defaultProjectId || '')
      setError(null)
    } else {
      setName('')
      setKey('')
      setIsKeyManuallyEdited(false)
      setDescription('')
      setCategory('growth')
      setUnitType('count')
      setUnitSymbol('')
      setDirection('higher_is_better')
      setMeasurementType('point')
      setCadence('')
      setProjectId(defaultProjectId || '')
      setError(null)
    }
  }, [isOpen, workspaceId, initialProjects, defaultProjectId])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Metric name is required.')
      return
    }

    const finalKey = key.trim() ? slugify(key) : slugify(name)
    if (!finalKey) {
      setError('Metric key identifier is required.')
      return
    }

    startTransition(async () => {
      try {
        const newMetric = await createWorkspaceMetric({
          workspaceId,
          name: name.trim(),
          key: finalKey,
          description: description.trim() || null,
          category,
          unitType,
          unitSymbol: unitSymbol.trim() || null,
          direction,
          measurementType,
          cadence: cadence ? (cadence as MetricCadence) : null,
          projectId: projectId ? projectId : null,
        })

        if (onSuccess) {
          onSuccess(newMetric.id)
        } else {
          router.push(`/vault/metrics/${newMetric.id}`)
        }
        onClose()
      } catch (err: any) {
        setError(err.message || 'Failed to create metric')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-muted/50 text-muted-foreground border border-border">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Create New Metric</h2>
              <p className="text-xs text-muted-foreground">Define an operational measurement for tracking performance</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start space-x-2.5 text-destructive text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name & Key */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Metric Name <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. PEVRA Waitlist Signups"
                required
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Key Identifier <span className="text-primary">*</span>
                <span className="text-muted-foreground font-normal ml-1">(unique slug)</span>
              </label>
              <input
                type="text"
                value={key}
                onChange={(e) => {
                  setKey(e.target.value)
                  setIsKeyManuallyEdited(true)
                }}
                placeholder="pevra_waitlist_signups"
                required
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Operational intent, what this metric measures and why..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors resize-none"
            />
          </div>

          {/* Category & Project Scope */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MetricCategory)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value} className="bg-card text-foreground">
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Project Scope (Optional)</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
              >
                <option value="" className="bg-card text-foreground">-- Workspace Level (General) --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-card text-foreground">
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Unit Type & Unit Symbol */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Unit Type *</label>
              <select
                value={unitType}
                onChange={(e) => handleUnitTypeChange(e.target.value as MetricUnitType)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
              >
                {UNIT_TYPES.map((u) => (
                  <option key={u.value} value={u.value} className="bg-card text-foreground">
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Unit Symbol / Label <span className="text-muted-foreground font-normal">(e.g. $, %, days)</span>
              </label>
              <input
                type="text"
                value={unitSymbol}
                onChange={(e) => setUnitSymbol(e.target.value)}
                placeholder="e.g. NGN, %, users"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
              />
            </div>
          </div>

          {/* Direction, Measurement Type & Cadence */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Direction *</label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as MetricDirection)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
              >
                {DIRECTIONS.map((d) => (
                  <option key={d.value} value={d.value} className="bg-card text-foreground">
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Measurement *</label>
              <select
                value={measurementType}
                onChange={(e) => setMeasurementType(e.target.value as MetricMeasurementType)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
              >
                {MEASUREMENT_TYPES.map((m) => (
                  <option key={m.value} value={m.value} className="bg-card text-foreground">
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Cadence (Optional)</label>
              <select
                value={cadence}
                onChange={(e) => setCadence(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
              >
                <option value="" className="bg-card text-foreground">-- Unspecified --</option>
                {CADENCES.map((c) => (
                  <option key={c.value} value={c.value} className="bg-card text-foreground">
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-3.5 py-1.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-lg text-xs font-medium shadow-sm transition-all flex items-center space-x-1.5 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Create Metric</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
