'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  WorkspaceMetricItem,
  MetricCategory,
  MetricStatus,
  MetricDirection,
  MetricUnitType,
} from '@/lib/vault/actions'
import {
  BarChart2,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  XCircle,
  Calendar,
  FolderGit2,
  Clock,
  ChevronRight,
  Plus,
  ArrowUpRight,
  Archive,
  RefreshCw,
} from 'lucide-react'

export interface MetricListProps {
  metrics: WorkspaceMetricItem[]
  workspaceId: string
  onEditMetric?: (metric: WorkspaceMetricItem) => void
  onAddTarget?: (metric: WorkspaceMetricItem) => void
  onAddObservation?: (metric: WorkspaceMetricItem) => void
  onCreateMetric?: () => void
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
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
        No Target
      </span>
    )
  }

  const isMet = attainment >= 100

  if (direction === 'neutral') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
        <Minus className="w-3 h-3 mr-1" />
        {attainment.toFixed(1)}% Attainment
      </span>
    )
  }

  if (isMet) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        {attainment.toFixed(1)}% Achieved
      </span>
    )
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
      <TrendingDown className="w-3 h-3 mr-1" />
      {attainment.toFixed(1)}% Attainment
    </span>
  )
}

export function MetricList({
  metrics,
  workspaceId,
  onEditMetric,
  onAddTarget,
  onAddObservation,
  onCreateMetric,
}: MetricListProps) {
  if (metrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-zinc-800/80 rounded-xl bg-zinc-900/30">
        <div className="p-3 bg-zinc-800/50 rounded-xl text-zinc-400 mb-4">
          <BarChart2 className="w-8 h-8" />
        </div>
        <h3 className="text-base font-medium text-zinc-200 mb-1">No metrics found</h3>
        <p className="text-sm text-zinc-400 max-w-sm mb-6">
          Define measurable operational indicators with targets and empirical observations.
        </p>
        {onCreateMetric && (
          <button
            onClick={onCreateMetric}
            className="inline-flex items-center px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium shadow-sm transition-all space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Metric</span>
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((m) => {
        const hasActual = m.current_actual !== null && m.current_actual !== undefined
        const hasTarget = m.current_target !== null && m.current_target !== undefined

        return (
          <div
            key={m.id}
            className="group relative flex flex-col justify-between p-5 bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700/80 rounded-xl transition-all hover:bg-zinc-900/60"
          >
            <div>
              {/* Header: Category, Status & Project */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium tracking-wide uppercase bg-zinc-800/80 text-zinc-300 border border-zinc-700/50">
                    {m.category}
                  </span>
                  {m.status === 'paused' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Paused
                    </span>
                  )}
                  {m.status === 'archived' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                      Archived
                    </span>
                  )}
                  {m.project && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800/60 text-zinc-400 border border-zinc-700/40 truncate max-w-[130px]">
                      <FolderGit2 className="w-3 h-3 mr-1 shrink-0" />
                      <span className="truncate">{m.project.title}</span>
                    </span>
                  )}
                </div>

                {/* Attainment badge */}
                {getAttainmentBadge(m.attainment_rate ?? null, m.direction)}
              </div>

              {/* Title & Key */}
              <Link
                href={`/vault/metrics/${m.id}`}
                className="block group/link focus:outline-none focus:underline"
              >
                <h3 className="text-base font-semibold text-zinc-100 group-hover/link:text-emerald-400 transition-colors flex items-center justify-between">
                  <span className="truncate">{m.name}</span>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover/link:text-emerald-400 opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-1" />
                </h3>
              </Link>
              <div className="flex items-center space-x-2 mt-0.5 mb-2">
                <span className="text-xs font-mono text-zinc-500 truncate">
                  {m.key}
                </span>
                <span className="text-xs text-zinc-600">•</span>
                <span className="text-xs text-zinc-400">
                  {m.measurement_type === 'point' ? 'Snapshot' : 'Period'}
                </span>
                {m.cadence && (
                  <>
                    <span className="text-xs text-zinc-600">•</span>
                    <span className="text-xs text-zinc-400 capitalize">{m.cadence}</span>
                  </>
                )}
              </div>

              {/* Description */}
              {m.description && (
                <p className="text-xs text-zinc-400 line-clamp-2 mb-4 leading-relaxed">
                  {m.description}
                </p>
              )}

              {/* Metric Values Grid */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-950/60 border border-zinc-800/60 rounded-lg mb-4">
                {/* Actual */}
                <div>
                  <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-0.5">
                    Latest Actual
                  </div>
                  <div className="text-base font-semibold text-zinc-100">
                    {formatMetricValue(m.current_actual, m.unit_type, m.unit_symbol)}
                  </div>
                  {m.latest_observation ? (
                    <div className="text-[11px] text-zinc-500 mt-0.5 truncate">
                      {m.latest_observation.observed_at}
                    </div>
                  ) : (
                    <div className="text-[11px] text-zinc-600 mt-0.5">No observation</div>
                  )}
                </div>

                {/* Target */}
                <div>
                  <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-0.5">
                    Target
                  </div>
                  <div className="text-base font-semibold text-zinc-300">
                    {formatMetricValue(m.current_target_value ?? m.current_target?.target_value, m.unit_type, m.unit_symbol)}
                  </div>
                  {m.current_target?.baseline_value !== null && m.current_target?.baseline_value !== undefined ? (
                    <div className="text-[11px] text-zinc-500 mt-0.5 truncate">
                      Base: {formatMetricValue(m.current_target.baseline_value, m.unit_type, m.unit_symbol)}
                    </div>
                  ) : (
                    <div className="text-[11px] text-zinc-600 mt-0.5">
                      {m.current_target ? 'Current target' : 'No target'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Card Footer Actions */}
            <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-zinc-500">
                <span>{m.observations_count || 0} obs</span>
                <span>•</span>
                <span>{m.targets_count || 0} targets</span>
              </div>

              <div className="flex items-center space-x-1.5">
                {onAddObservation && (
                  <button
                    onClick={() => onAddObservation(m)}
                    className="px-2 py-1 text-[11px] font-medium text-zinc-300 hover:text-emerald-400 hover:bg-zinc-800/80 rounded transition-colors"
                  >
                    + Obs
                  </button>
                )}
                {onAddTarget && (
                  <button
                    onClick={() => onAddTarget(m)}
                    className="px-2 py-1 text-[11px] font-medium text-zinc-300 hover:text-emerald-400 hover:bg-zinc-800/80 rounded transition-colors"
                  >
                    + Target
                  </button>
                )}
                <Link
                  href={`/vault/metrics/${m.id}`}
                  className="px-2 py-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 rounded transition-colors flex items-center"
                >
                  View
                </Link>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
