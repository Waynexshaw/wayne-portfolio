'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2, Lock, AlertCircle, BarChart2 } from 'lucide-react'
import {
  updateWorkspaceMetric,
  getWorkspaceProjects,
  WorkspaceMetricItem,
  MetricCategory,
  MetricUnitType,
  MetricDirection,
  MetricMeasurementType,
  MetricCadence,
} from '@/lib/vault/actions'

export interface MetricEditModalProps {
  isOpen: boolean
  onClose: () => void
  metric: WorkspaceMetricItem
  workspaceId: string
  projects?: { id: string; title: string }[]
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

export function MetricEditModal({
  isOpen,
  onClose,
  metric,
  workspaceId,
  projects: initialProjects,
}: MetricEditModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(metric?.name || '')
  const [description, setDescription] = useState(metric?.description || '')
  const [category, setCategory] = useState<MetricCategory>(metric?.category || 'growth')
  const [unitType, setUnitType] = useState<MetricUnitType>(metric?.unit_type || 'count')
  const [unitSymbol, setUnitSymbol] = useState(metric?.unit_symbol || '')
  const [direction, setDirection] = useState<MetricDirection>(metric?.direction || 'higher_is_better')
  const [measurementType, setMeasurementType] = useState<MetricMeasurementType>(
    metric?.measurement_type || 'point'
  )
  const [cadence, setCadence] = useState<string>(metric?.cadence || '')
  const [projectId, setProjectId] = useState<string>(metric?.project_id || '')

  const [projects, setProjects] = useState<{ id: string; title: string }[]>(initialProjects || [])

  useEffect(() => {
    if (isOpen && metric) {
      setName(metric.name || '')
      setDescription(metric.description || '')
      setCategory(metric.category || 'growth')
      setUnitType(metric.unit_type || 'count')
      setUnitSymbol(metric.unit_symbol || '')
      setDirection(metric.direction || 'higher_is_better')
      setMeasurementType(metric.measurement_type || 'point')
      setCadence(metric.cadence || '')
      setProjectId(metric.project_id || '')
      setError(null)
    }
  }, [isOpen, metric])

  useEffect(() => {
    if (initialProjects && initialProjects.length > 0) {
      setProjects(initialProjects)
      return
    }

    if (isOpen && workspaceId) {
      let isMounted = true
      getWorkspaceProjects(workspaceId)
        .then((data) => {
          if (isMounted && Array.isArray(data)) {
            setProjects(data.map((p: any) => ({ id: p.id, title: p.title })))
          }
        })
        .catch((err) => {
          console.error('Failed to load workspace projects', err)
        })
      return () => {
        isMounted = false
      }
    }
  }, [isOpen, workspaceId, initialProjects])

  if (!isOpen || !metric) return null

  // Ensure currently selected or attached project is visible in the dropdown
  const projectOptions = [...projects]
  if (metric.project && !projectOptions.some((p) => p.id === metric.project!.id)) {
    projectOptions.unshift({ id: metric.project.id, title: metric.project.title })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError('Metric name is required')
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        await updateWorkspaceMetric(metric.id, workspaceId, {
          name: name.trim(),
          description: description.trim() || null,
          category,
          unitType,
          unitSymbol: unitSymbol.trim() || null,
          direction,
          measurementType,
          cadence: (cadence as MetricCadence) || null,
          projectId: projectId ? projectId : null,
        })
        onClose()
        router.refresh()
      } catch (err: any) {
        setError(err.message || 'Failed to update metric')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto">
      <div
        className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-card/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-base font-medium text-foreground">
                Edit Metric
              </h2>
              <p className="text-xs text-muted-foreground">
                Update metric attributes, configuration, and project scope
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-start gap-2.5 p-3 text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-mono">{error}</div>
            </div>
          )}

          {/* Name & Key Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                Metric Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Monthly Active Users, MRR"
                className="w-full px-3 py-2 text-xs rounded-lg bg-background border border-border focus:border-primary focus:outline-none transition-colors text-foreground"
              />
            </div>

            {/* Key (READ-ONLY, immutable in UI with Lock icon) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  Metric Key
                </label>
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                  <Lock className="w-3 h-3" /> Immutable
                </span>
              </div>
              <div className="relative flex items-center">
                <input
                  type="text"
                  readOnly
                  disabled
                  value={metric.key}
                  className="w-full pl-8 pr-3 py-2 text-xs font-mono rounded-lg bg-secondary/40 border border-border/80 text-muted-foreground cursor-not-allowed select-all"
                />
                <Lock className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this metric tracks, its calculation method, or notes..."
              className="w-full px-3 py-2 text-xs rounded-lg bg-background border border-border focus:border-primary focus:outline-none transition-colors resize-none text-foreground"
            />
          </div>

          {/* Category & Project Scope */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                Category <span className="text-destructive">*</span>
              </label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value as MetricCategory)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-background border border-border focus:border-primary focus:outline-none transition-colors text-foreground cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Project Scope */}
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                Project Scope
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-background border border-border focus:border-primary focus:outline-none transition-colors text-foreground cursor-pointer"
              >
                <option value="">Workspace Level (Global)</option>
                {projectOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    Project: {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Unit Type & Unit Symbol */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Unit Type */}
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                Unit Type <span className="text-destructive">*</span>
              </label>
              <select
                required
                value={unitType}
                onChange={(e) => setUnitType(e.target.value as MetricUnitType)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-background border border-border focus:border-primary focus:outline-none transition-colors text-foreground cursor-pointer"
              >
                {UNIT_TYPES.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit Symbol */}
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                Unit Symbol
              </label>
              <input
                type="text"
                value={unitSymbol}
                onChange={(e) => setUnitSymbol(e.target.value)}
                placeholder="e.g. $, %, ms, users, pts"
                className="w-full px-3 py-2 text-xs rounded-lg bg-background border border-border focus:border-primary focus:outline-none transition-colors text-foreground"
              />
            </div>
          </div>

          {/* Direction & Measurement Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Direction */}
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                Direction <span className="text-destructive">*</span>
              </label>
              <select
                required
                value={direction}
                onChange={(e) => setDirection(e.target.value as MetricDirection)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-background border border-border focus:border-primary focus:outline-none transition-colors text-foreground cursor-pointer"
              >
                {DIRECTIONS.map((dir) => (
                  <option key={dir.value} value={dir.value}>
                    {dir.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Measurement Type */}
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                Measurement Type <span className="text-destructive">*</span>
              </label>
              <select
                required
                value={measurementType}
                onChange={(e) => setMeasurementType(e.target.value as MetricMeasurementType)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-background border border-border focus:border-primary focus:outline-none transition-colors text-foreground cursor-pointer"
              >
                {MEASUREMENT_TYPES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cadence */}
          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
              Cadence
            </label>
            <select
              value={cadence}
              onChange={(e) => setCadence(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-background border border-border focus:border-primary focus:outline-none transition-colors text-foreground cursor-pointer"
            >
              <option value="">No Cadence (Ad-hoc / Manual)</option>
              {CADENCES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-3.5 py-1.5 text-xs rounded-lg border border-border hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim()}
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
