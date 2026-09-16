'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  WorkspaceMetricDetail,
  MetricTargetItem,
  MetricObservationItem,
  MetricDirection,
  archiveWorkspaceMetric,
  restoreWorkspaceMetric,
} from '@/lib/vault/actions'
import { MetricEditModal } from './metric-edit-modal'
import { TargetModal } from './target-modal'
import { ObservationModal } from './observation-modal'
import { VaultAttainment } from '@/components/vault/vault-attainment'
import { VaultStatusBadge } from '@/components/vault/vault-badge'
import { formatMetricValue } from './format-metric-value'
import {
  FolderGit2,
  Plus,
  Edit2,
  Archive,
  RefreshCw,
  ExternalLink,
  ArrowLeft,
  Clock,
  Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MetricDetailViewProps {
  metric: WorkspaceMetricDetail
  workspaceId: string
  projects?: { id: string; title: string }[]
}

function getDirectionLabel(direction: MetricDirection): string {
  switch (direction) {
    case 'higher_is_better':
      return 'Higher is better'
    case 'lower_is_better':
      return 'Lower is better'
    case 'neutral':
      return 'Neutral'
    default:
      return 'Neutral'
  }
}

/**
 * Derives factual temporal context for target history.
 * A resolved target is only "Current" if its applicability window encompasses today.
 * If undated, it is "Open-ended". If past, it is "Historical" (or "Relevant · Historical" if selected by resolver).
 * Future targets never display Current or Relevant.
 */
function getTargetTemporalContext(
  t: MetricTargetItem,
  isResolved: boolean
): { label: string; isCurrentOrRelevant: boolean } {
  const today = new Date().toISOString().split('T')[0]
  const start = t.period_start
    ? t.period_start.includes('T')
      ? t.period_start.split('T')[0]
      : t.period_start
    : null
  const end = t.period_end
    ? t.period_end.includes('T')
      ? t.period_end.split('T')[0]
      : t.period_end
    : null

  // 1. Future target: period_start > today (never Current, Relevant, or Active before period begins)
  if (start && start > today) {
    return { label: 'Future', isCurrentOrRelevant: false }
  }

  // 2. Historical target: period_end < today
  if (end && end < today) {
    if (isResolved) {
      return { label: 'Relevant · Historical', isCurrentOrRelevant: true }
    }
    return { label: 'Historical', isCurrentOrRelevant: false }
  }

  // 3. Fully undated target: start is null AND end is null
  if (!start && !end) {
    if (isResolved) {
      return { label: 'Relevant · Open-ended', isCurrentOrRelevant: true }
    }
    return { label: 'Open-ended', isCurrentOrRelevant: false }
  }

  // 4. Bounded or partially bounded target applicable today:
  // - period_start <= today AND period_end >= today
  // - period_start <= today AND period_end is null
  // - period_start is null AND period_end >= today
  return { label: 'Current', isCurrentOrRelevant: isResolved }
}

export function MetricDetailView({ metric, workspaceId, projects = [] }: MetricDetailViewProps) {
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
        console.error('[Archive toggle error]:', err)
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

  const today = new Date().toISOString().split('T')[0]
  const isHistoricalResolvedTarget = Boolean(
    metric.current_target?.period_end &&
      (metric.current_target.period_end.includes('T')
        ? metric.current_target.period_end.split('T')[0]
        : metric.current_target.period_end) < today
  )

  const targetLabel = isHistoricalResolvedTarget ? 'RELEVANT TARGET' : 'CURRENT TARGET'

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <Link
            href="/vault/metrics"
            className="hover:text-foreground flex items-center transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none rounded"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            <span>Metrics</span>
          </Link>
          <span className="text-border select-none">/</span>
          <span className="text-foreground font-medium truncate max-w-sm">{metric.name}</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="px-3 py-1.5 text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-lg transition-colors flex items-center space-x-1.5 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Metric</span>
          </button>
          <button
            type="button"
            onClick={handleArchiveToggle}
            disabled={isPending}
            className="px-3 py-1.5 text-xs font-medium bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors flex items-center space-x-1.5 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
          >
            {metric.status === 'archived' ? (
              <>
                <RefreshCw className={cn('w-3.5 h-3.5', isPending && 'animate-spin')} />
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
      <div className="p-6 bg-card/40 border border-border/80 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-sans font-medium tracking-wide uppercase bg-muted/60 text-muted-foreground border border-border/60">
                {metric.category}
              </span>
              <VaultStatusBadge status={metric.status} className="text-[10px] px-2 py-0" />
              {metric.project && (
                <Link
                  href={`/vault/projects/${metric.project.id}`}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-sans text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted/70 border border-border/50 transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                >
                  <FolderGit2 className="w-3 h-3 mr-1 text-muted-foreground" />
                  <span>{metric.project.title}</span>
                </Link>
              )}
            </div>

            <h1 className="font-serif text-2xl font-normal text-foreground tracking-tight">
              {metric.name}
            </h1>

            <div className="flex items-center space-x-2 text-xs font-sans text-muted-foreground flex-wrap gap-y-1">
              <span className="font-mono text-muted-foreground">{metric.key}</span>
              <span className="text-border select-none">•</span>
              <span className="capitalize">{metric.unit_type}</span>
              {metric.unit_symbol && <span>({metric.unit_symbol})</span>}
              <span className="text-border select-none">•</span>
              <span>{getDirectionLabel(metric.direction)}</span>
              <span className="text-border select-none">•</span>
              <span>{metric.measurement_type === 'point' ? 'Snapshot' : 'Period'}</span>
              {metric.cadence && (
                <>
                  <span className="text-border select-none">•</span>
                  <span className="capitalize">{metric.cadence}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {metric.description && (
          <p className="text-xs text-muted-foreground leading-relaxed border-t border-border/60 pt-3">
            {metric.description}
          </p>
        )}
      </div>

      {/* Integrated Performance Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-card/30 border border-border/80 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-border/60">
        {/* Latest Actual */}
        <div className="py-2 sm:py-0 sm:px-4 first:pl-0 flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
              CURRENT ACTUAL
            </div>
            <div className="text-2xl font-semibold text-foreground tabular-nums font-sans">
              {formatMetricValue(metric.current_actual, metric.unit_type, metric.unit_symbol)}
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {metric.latest_observation ? (
              <span className="tabular-nums">Observed {metric.latest_observation.observed_at}</span>
            ) : (
              <span>No observations recorded</span>
            )}
          </div>
        </div>

        {/* Current / Relevant Target */}
        <div className="py-2 sm:py-0 sm:px-4 flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
              {targetLabel}
            </div>
            <div className="text-2xl font-semibold text-foreground/85 tabular-nums font-sans">
              {formatMetricValue(
                metric.current_target_value ?? metric.current_target?.target_value,
                metric.unit_type,
                metric.unit_symbol
              )}
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {metric.current_target ? (
              <span className="tabular-nums">
                {isHistoricalResolvedTarget
                  ? `Historical: ${
                      metric.current_target.period_start && metric.current_target.period_end
                        ? `${metric.current_target.period_start} to ${metric.current_target.period_end}`
                        : metric.current_target.period_end
                        ? `Ended ${metric.current_target.period_end}`
                        : 'Ended'
                    }`
                  : metric.current_target.period_start && metric.current_target.period_end
                  ? `${metric.current_target.period_start} to ${metric.current_target.period_end}`
                  : metric.current_target.period_start
                  ? `From ${metric.current_target.period_start}`
                  : metric.current_target.period_end
                  ? `Until ${metric.current_target.period_end}`
                  : 'Open-ended target'}
              </span>
            ) : (
              <span>No relevant target</span>
            )}
          </div>
        </div>

        {/* Attainment Performance */}
        <div className="py-2 sm:py-0 sm:px-4 last:pr-0 flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
              ATTAINMENT
            </div>
            <VaultAttainment
              attainment={metric.attainment_rate}
              variant="stat"
              suffix="of target"
            />
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {metric.current_target?.baseline_value !== null &&
            metric.current_target?.baseline_value !== undefined ? (
              <span className="tabular-nums">
                Baseline: {formatMetricValue(metric.current_target.baseline_value, metric.unit_type, metric.unit_symbol)}
              </span>
            ) : metric.attainment_rate === null ? (
              <span>Requires target and observation</span>
            ) : (
              <span>Calculated against relevant target</span>
            )}
          </div>
        </div>
      </div>

      {/* Two-Column Operational Ledgers: Observations & Targets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Observation History Ledger */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Observations Log</h2>
              <p className="text-xs text-muted-foreground">
                Empirical measurements recorded over time ({metric.observations.length})
              </p>
            </div>
            <button
              type="button"
              onClick={openAddObs}
              className="inline-flex items-center px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-medium shadow-sm transition-all space-x-1.5 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Observation</span>
            </button>
          </div>

          {metric.observations.length === 0 ? (
            <div className="p-8 border border-border/80 rounded-xl text-center bg-card/20">
              <Clock className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-foreground font-medium">No observations yet</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                Record actual measurement results to track progress against targets.
              </p>
              <button
                type="button"
                onClick={openAddObs}
                className="inline-flex items-center px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-lg text-xs font-medium transition-colors space-x-1 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record First Observation</span>
              </button>
            </div>
          ) : (
            <div className="border border-border/80 rounded-xl overflow-hidden bg-card/30 divide-y divide-border/60">
              {metric.observations.map((obs, idx) => (
                <div
                  key={obs.id}
                  className="p-3 hover:bg-card/60 transition-colors flex items-start justify-between gap-4 text-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="font-semibold text-foreground font-mono tabular-nums text-sm">
                        {formatMetricValue(obs.value, metric.unit_type, metric.unit_symbol)}
                      </span>
                      {idx === 0 && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-sans font-medium bg-secondary text-foreground border border-border/60">
                          Latest
                        </span>
                      )}
                      <span className="text-muted-foreground font-mono tabular-nums text-xs">
                        on {obs.observed_at}
                      </span>
                      {(obs.period_start || obs.period_end) && (
                        <span className="text-[11px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded border border-border/50 tabular-nums font-mono">
                          {obs.period_start || '…'} → {obs.period_end || '…'}
                        </span>
                      )}
                    </div>

                    {obs.notes && (
                      <p className="text-xs text-muted-foreground leading-relaxed">{obs.notes}</p>
                    )}

                    {(obs.source_label || obs.source_url) && (
                      <div className="flex items-center space-x-1.5 text-[11px] text-muted-foreground pt-0.5">
                        <span className="text-muted-foreground/70">Source:</span>
                        {obs.source_url ? (
                          <a
                            href={obs.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-foreground hover:underline flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none rounded"
                          >
                            <span>{obs.source_label || obs.source_url}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span>{obs.source_label}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => openEditObs(obs)}
                    className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none shrink-0"
                    title="Edit observation"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Targets History Ledger */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Targets</h2>
              <p className="text-xs text-muted-foreground">
                Intent and expectations ({metric.targets.length})
              </p>
            </div>
            <button
              type="button"
              onClick={openAddTarget}
              className="inline-flex items-center px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-lg text-xs font-medium shadow-sm transition-all space-x-1.5 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Set Target</span>
            </button>
          </div>

          {metric.targets.length === 0 ? (
            <div className="p-8 border border-border/80 rounded-xl text-center bg-card/20">
              <Target className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-foreground font-medium">No targets defined</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                Set intended performance targets to measure progress.
              </p>
              <button
                type="button"
                onClick={openAddTarget}
                className="inline-flex items-center px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-lg text-xs font-medium transition-colors space-x-1 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Target</span>
              </button>
            </div>
          ) : (
            <div className="border border-border/80 rounded-xl overflow-hidden bg-card/30 divide-y divide-border/60">
              {metric.targets.map((tgt) => {
                const isResolved = tgt.id === metric.current_target?.id
                const { label: temporalLabel, isCurrentOrRelevant } = getTargetTemporalContext(
                  tgt,
                  isResolved
                )

                return (
                  <div
                    key={tgt.id}
                    className={cn(
                      'p-3 hover:bg-card/60 transition-colors flex items-start justify-between gap-3 text-xs',
                      isCurrentOrRelevant && 'bg-primary/5'
                    )}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-semibold text-foreground font-mono tabular-nums text-sm">
                          {formatMetricValue(tgt.target_value, metric.unit_type, metric.unit_symbol)}
                        </span>
                        {isCurrentOrRelevant ? (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-sans font-medium bg-primary/10 text-primary border border-primary/25">
                            {temporalLabel}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-sans text-muted-foreground bg-muted/40 border border-border/50">
                            {temporalLabel}
                          </span>
                        )}
                      </div>

                      {tgt.baseline_value !== null && tgt.baseline_value !== undefined && (
                        <div className="text-xs text-muted-foreground font-sans">
                          Baseline:{' '}
                          <strong className="text-foreground font-mono tabular-nums font-normal">
                            {formatMetricValue(tgt.baseline_value, metric.unit_type, metric.unit_symbol)}
                          </strong>
                        </div>
                      )}

                      <div className="text-[11px] text-muted-foreground font-mono tabular-nums">
                        {tgt.period_start || tgt.period_end ? (
                          <span>
                            {tgt.period_start || '…'} to {tgt.period_end || '…'}
                          </span>
                        ) : (
                          <span className="font-sans">Open-ended period</span>
                        )}
                      </div>

                      {tgt.notes && (
                        <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">{tgt.notes}</p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => openEditTarget(tgt)}
                      className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none shrink-0"
                      title="Edit target"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
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
