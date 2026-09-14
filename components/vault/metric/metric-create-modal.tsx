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
  { value: 'higher_is_better', label: 'Higher is Better (↑)' },
  { value: 'lower_is_better', label: 'Lower is Better (↓)' },
  { value: 'neutral', label: 'Neutral / Informational' },
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
      if (!initialProjects) {
        getWorkspaceProjects(workspaceId).then((res) => {
          setProjects(res.map((p) => ({ id: p.id, title: p.title })))
        }).catch(() => {})
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/40">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Create New Metric</h2>
              <p className="text-xs text-zinc-400">Define an operational measurement for tracking performance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-950/40 border border-red-800/60 rounded-lg flex items-start space-x-2.5 text-red-300 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name & Key */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Metric Name <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. PEVRA Waitlist Signups"
                required
                className="w-full px-3 py-2 bg-zinc-900/80 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Key Identifier <span className="text-emerald-400">*</span>
                <span className="text-zinc-500 font-normal ml-1">(unique slug)</span>
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
                className="w-full px-3 py-2 bg-zinc-900/80 border border-zinc-800 rounded-lg text-sm font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Operational intent, what this metric measures and why..."
              className="w-full px-3 py-2 bg-zinc-900/80 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors resize-none"
            />
          </div>

          {/* Category & Project Scope */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MetricCategory)}
                className="w-full px-3 py-2 bg-zinc-900/80 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Project Scope (Optional)</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900/80 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              >
                <option value="">-- Workspace Level (General) --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Unit Type & Unit Symbol */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Unit Type *</label>
              <select
                value={unitType}
                onChange={(e) => handleUnitTypeChange(e.target.value as MetricUnitType)}
                className="w-full px-3 py-2 bg-zinc-900/80 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              >
                {UNIT_TYPES.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Unit Symbol / Label <span className="text-zinc-500 font-normal">(e.g. $, %, signups, days)</span>
              </label>
              <input
                type="text"
                value={unitSymbol}
                onChange={(e) => setUnitSymbol(e.target.value)}
                placeholder="e.g. NGN, %, users"
                className="w-full px-3 py-2 bg-zinc-900/80 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Direction, Measurement Type & Cadence */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Direction *</label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as MetricDirection)}
                className="w-full px-3 py-2 bg-zinc-900/80 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              >
                {DIRECTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Measurement *</label>
              <select
                value={measurementType}
                onChange={(e) => setMeasurementType(e.target.value as MetricMeasurementType)}
                className="w-full px-3 py-2 bg-zinc-900/80 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              >
                {MEASUREMENT_TYPES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Cadence (Optional)</label>
              <select
                value={cadence}
                onChange={(e) => setCadence(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900/80 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              >
                <option value="">-- Unspecified --</option>
                {CADENCES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium shadow-sm transition-all flex items-center space-x-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Create Metric</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
