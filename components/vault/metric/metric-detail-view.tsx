'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  WorkspaceMetricDetail,
  WorkspaceMetricItem,
  MetricTargetItem,
  MetricObservationItem,
  MetricDirection,
  MetricUnitType,
  archiveWorkspaceMetric,
  restoreWorkspaceMetric,
} from '@/lib/vault/actions'
import { MetricEditModal } from './metric-edit-modal'
import { TargetModal } from './target-modal'
import { ObservationModal } from './observation-modal'
import {
  BarChart2,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  Calendar,
  FolderGit2,
  Plus,
  Edit2,
  Archive,
  RefreshCw,
  ExternalLink,
  Info,
  ArrowLeft,
  Clock,
  Target,
  FileText,
  HelpCircle,
} from 'lucide-react'

export interface MetricDetailViewProps {
  metric: WorkspaceMetricDetail
  workspaceId: string
  projects?: { id: string; title: string }[]
}

function formatMetricValue(val: number | null | undefined, unitType: MetricUnitType, unitSymbol?: string | null): string {
  if (val === null || val === undefined) return '—'
  const numVal = Number(val)

  if (unitType === 'currency') {
    const symbol = unitSymbol || 'USD'
    return `${symbol} ${numVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
  }
  if (unitType === 'percentage') {
    return `${numVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`
  }
  if (unitType === 'duration') {
    const symbol = unitSymbol ? ` ${unitSymbol}` : ' days'
    return `${numVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}${symbol}`
  }
  if (unitType === 'score') {
    const symbol = unitSymbol || '/10'
    return `${numVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${symbol}`
  }

  // count / numeric default
  const symbol = unitSymbol ? ` ${unitSymbol}` : ''
  return `${numVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}${symbol}`
}

function getAttainmentBadge(attainment: number | null, direction: MetricDirection) {
  if (attainment === null) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
        No Target Set
      </span>
    )
  }

  const isMet = attainment >= 100

  if (direction === 'neutral') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
        <Minus className="w-3.5 h-3.5 mr-1" />
        {attainment.toFixed(1)}% Attainment
      </span>
    )
  }

  if (isMet) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
        {attainment.toFixed(1)}% Target Met
      </span>
    )
  }

  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
      <TrendingDown className="w-3.5 h-3.5 mr-1" />
      {attainment.toFixed(1)}% Attainment
    </span>
  )
}

export function MetricDetailView({ metric, workspaceId, projects }: MetricDetailViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Modal states
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false)
  const [targetToEdit, setTargetToEdit] = useState<MetricTargetItem | null>(null)
  const [isObsModalOpen, setIsObsModalOpen] = useState(false)
  const [obsToEdit, setObsToEdit] = useState<MetricObservationItem | null>(null)

  const handleArchiveToggle = () => {
    startTransition(async () => {
      try {
        if (metric.status === 'archived') {
          await restoreWorkspaceMetric(metric.id, workspaceId)
        } else {
          await archiveWorkspaceMetric(metric.id, workspaceId)
        }
        router.refresh()
      } catch (err) {
        console.error(err)
      }
    })
  }

  const openAddTarget = () => {
    setTargetToEdit(null)
    setIsTargetModalOpen(true)
  }

  const openEditTarget = (target: MetricTargetItem) => {
    setTargetToEdit(target)
    setIsTargetModalOpen(true)
  }

  const openAddObs = () => {
    setObsToEdit(null)
    setIsObsModalOpen(true)
  }

  const openEditObs = (obs: MetricObservationItem) => {
    setObsToEdit(obs)
    setIsObsModalOpen(true)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm text-zinc-400">
          <Link
            href="/vault/metrics"
            className="hover:text-zinc-100 flex items-center transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Metrics
          </Link>
          <span>/</span>
          <span className="text-zinc-200 font-medium truncate max-w-sm">{metric.name}</span>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsEditOpen(true)}
            className="px-3 py-1.5 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-lg transition-colors flex items-center space-x-1.5"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Metric</span>
          </button>
          <button
            onClick={handleArchiveToggle}
            disabled={isPending}
            className="px-3 py-1.5 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded-lg transition-colors flex items-center space-x-1.5"
          >
            {metric.status === 'archived' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restore</span>
              </>
            ) : (
              <>
                <Archive className="w-3.5 h-3.5" />
                <span>Archive</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Header Banner */}
      <div className="p-6 bg-zinc-900/40 border border-zinc-800/80 rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium tracking-wide uppercase bg-zinc-800 text-zinc-300 border border-zinc-700/50">
                {metric.category}
              </span>
              {metric.status === 'paused' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Paused
                </span>
              )}
              {metric.status === 'archived' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                  Archived
                </span>
              )}
              {metric.project && (
                <Link
                  href={`/vault/projects/${metric.project.id}`}
                  className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-700/60 transition-colors"
                >
                  <FolderGit2 className="w-3 h-3 mr-1 text-zinc-400" />
                  <span>{metric.project.title}</span>
                </Link>
              )}
            </div>

            <h1 className="text-2xl font-bold text-zinc-100">{metric.name}</h1>
            <div className="flex items-center space-x-2 text-xs font-mono text-zinc-500">
              <span>{metric.key}</span>
              <span>•</span>
              <span className="capitalize">{metric.unit_type}</span>
              {metric.unit_symbol && <span>({metric.unit_symbol})</span>}
              <span>•</span>
              <span>
                {metric.direction === 'higher_is_better'
                  ? 'Higher is better (↑)'
                  : metric.direction === 'lower_is_better'
                  ? 'Lower is better (↓)'
                  : 'Neutral'}
              </span>
              <span>•</span>
              <span>{metric.measurement_type === 'point' ? 'Point-in-Time' : 'Period'}</span>
              {metric.cadence && (
                <>
                  <span>•</span>
                  <span className="capitalize">{metric.cadence}</span>
                </>
              )}
            </div>
          </div>

          <div>{getAttainmentBadge(metric.attainment_rate ?? null, metric.direction)}</div>
        </div>

        {metric.description && (
          <p className="text-sm text-zinc-300 leading-relaxed border-t border-zinc-800/60 pt-3">
            {metric.description}
          </p>
        )}
      </div>

      {/* Primary KPI Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Latest Actual */}
        <div className="p-5 bg-zinc-900/40 border border-zinc-800/80 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-2">
            <span>CURRENT ACTUAL</span>
            <BarChart2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-100 mb-1">
            {formatMetricValue(metric.current_actual, metric.unit_type, metric.unit_symbol)}
          </div>
          <div className="text-xs text-zinc-500">
            {metric.latest_observation ? (
              <span>Observed on {metric.latest_observation.observed_at}</span>
            ) : (
              <span>No observations recorded</span>
            )}
          </div>
        </div>

        {/* Current Target */}
        <div className="p-5 bg-zinc-900/40 border border-zinc-800/80 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-2">
            <span>CURRENT TARGET</span>
            <Target className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-200 mb-1">
            {formatMetricValue(metric.current_target_value ?? metric.current_target?.target_value, metric.unit_type, metric.unit_symbol)}
          </div>
          <div className="text-xs text-zinc-500">
            {metric.current_target ? (
              <span>
                {metric.current_target.period_start && metric.current_target.period_end
                  ? `${metric.current_target.period_start} to ${metric.current_target.period_end}`
                  : 'Open-ended target'}
              </span>
            ) : (
              <span>No relevant target</span>
            )}
          </div>
        </div>

        {/* Attainment Performance */}
        <div className="p-5 bg-zinc-900/40 border border-zinc-800/80 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-2">
            <span>PERFORMANCE ATTAINMENT</span>
            {metric.direction === 'lower_is_better' ? (
              <TrendingDown className="w-4 h-4 text-blue-400" />
            ) : (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <div className="text-2xl font-bold text-zinc-100 mb-1">
            {metric.attainment_rate !== null && metric.attainment_rate !== undefined
              ? `${metric.attainment_rate.toFixed(1)}%`
              : '—'}
          </div>
          <div className="text-xs text-zinc-500">
            {metric.attainment_rate !== null && metric.attainment_rate !== undefined ? (
              <span>
                {metric.direction === 'higher_is_better'
                  ? metric.attainment_rate >= 100
                    ? 'Target achieved or exceeded'
                    : 'Target not yet reached'
                  : metric.direction === 'lower_is_better'
                  ? metric.attainment_rate >= 100
                    ? 'Within desired lower bound'
                    : 'Exceeds desired threshold'
                  : 'Relative ratio'}
              </span>
            ) : (
              <span>Requires target and observation</span>
            )}
          </div>
        </div>
      </div>

      {/* Two-Column Logs: Observations & Targets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Observation History */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Observations Log</h2>
              <p className="text-xs text-zinc-400">
                Empirical measurements recorded over time ({metric.observations.length})
              </p>
            </div>
            <button
              onClick={openAddObs}
              className="inline-flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium shadow-sm transition-all space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Observation</span>
            </button>
          </div>

          {metric.observations.length === 0 ? (
            <div className="p-8 border border-zinc-800/80 rounded-xl text-center bg-zinc-900/20">
              <Clock className="w-6 h-6 text-zinc-500 mx-auto mb-2" />
              <p className="text-sm text-zinc-300 font-medium">No observations yet</p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
                Record actual measurement results to track progress against targets.
              </p>
              <button
                onClick={openAddObs}
                className="inline-flex items-center px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition-colors space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record First Observation</span>
              </button>
            </div>
          ) : (
            <div className="border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-900/30 divide-y divide-zinc-800/60">
              {metric.observations.map((obs) => (
                <div
                  key={obs.id}
                  className="p-4 hover:bg-zinc-900/60 transition-colors flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2.5">
                      <span className="text-base font-semibold text-zinc-100">
                        {formatMetricValue(obs.value, metric.unit_type, metric.unit_symbol)}
                      </span>
                      <span className="text-xs text-zinc-400">
                        on <strong className="text-zinc-300 font-normal">{obs.observed_at}</strong>
                      </span>
                      {(obs.period_start || obs.period_end) && (
                        <span className="text-[11px] text-zinc-500 bg-zinc-800/60 px-2 py-0.5 rounded border border-zinc-700/40">
                          Period: {obs.period_start || '…'} → {obs.period_end || '…'}
                        </span>
                      )}
                    </div>

                    {obs.notes && (
                      <p className="text-xs text-zinc-300 leading-relaxed">{obs.notes}</p>
                    )}

                    {(obs.source_label || obs.source_url) && (
                      <div className="flex items-center space-x-2 text-[11px] text-zinc-400 pt-0.5">
                        <span className="text-zinc-500">Source:</span>
                        {obs.source_url ? (
                          <a
                            href={obs.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:underline flex items-center"
                          >
                            <span>{obs.source_label || obs.source_url}</span>
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        ) : (
                          <span>{obs.source_label}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => openEditObs(obs)}
                    className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Targets History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Targets</h2>
              <p className="text-xs text-zinc-400">
                Intent & baseline expectations ({metric.targets.length})
              </p>
            </div>
            <button
              onClick={openAddTarget}
              className="inline-flex items-center px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 rounded-lg text-xs font-medium shadow-sm transition-all space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Set Target</span>
            </button>
          </div>

          {metric.targets.length === 0 ? (
            <div className="p-8 border border-zinc-800/80 rounded-xl text-center bg-zinc-900/20">
              <Target className="w-6 h-6 text-zinc-500 mx-auto mb-2" />
              <p className="text-sm text-zinc-300 font-medium">No targets defined</p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
                Set intended performance targets to measure progress.
              </p>
              <button
                onClick={openAddTarget}
                className="inline-flex items-center px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition-colors space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Target</span>
              </button>
            </div>
          ) : (
            <div className="border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-900/30 divide-y divide-zinc-800/60">
              {metric.targets.map((tgt) => (
                <div
                  key={tgt.id}
                  className="p-4 hover:bg-zinc-900/60 transition-colors flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-base font-semibold text-zinc-100">
                        {formatMetricValue(tgt.target_value, metric.unit_type, metric.unit_symbol)}
                      </span>
                    </div>

                    {tgt.baseline_value !== null && tgt.baseline_value !== undefined && (
                      <div className="text-xs text-zinc-400">
                        Baseline:{' '}
                        <strong className="text-zinc-300 font-normal">
                          {formatMetricValue(tgt.baseline_value, metric.unit_type, metric.unit_symbol)}
                        </strong>
                      </div>
                    )}

                    <div className="text-[11px] text-zinc-500">
                      {tgt.period_start || tgt.period_end ? (
                        <span>
                          {tgt.period_start || '…'} to {tgt.period_end || '…'}
                        </span>
                      ) : (
                        <span>Open-ended period</span>
                      )}
                    </div>

                    {tgt.notes && (
                      <p className="text-xs text-zinc-400 leading-relaxed pt-0.5">{tgt.notes}</p>
                    )}
                  </div>

                  <button
                    onClick={() => openEditTarget(tgt)}
                    className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {isEditOpen && (
        <MetricEditModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          metric={metric}
          workspaceId={workspaceId}
          projects={projects}
        />
      )}

      {isTargetModalOpen && (
        <TargetModal
          isOpen={isTargetModalOpen}
          onClose={() => setIsTargetModalOpen(false)}
          metricId={metric.id}
          metricUnitSymbol={metric.unit_symbol}
          workspaceId={workspaceId}
          target={targetToEdit}
          onSuccess={() => router.refresh()}
        />
      )}

      {isObsModalOpen && (
        <ObservationModal
          isOpen={isObsModalOpen}
          onClose={() => setIsObsModalOpen(false)}
          metricId={metric.id}
          metricMeasurementType={metric.measurement_type}
          metricUnitSymbol={metric.unit_symbol}
          workspaceId={workspaceId}
          observation={obsToEdit}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  )
}
