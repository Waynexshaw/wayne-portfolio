'use client'

import Link from 'next/link'
import {
  WorkspaceMetricItem,
  MetricUnitType,
} from '@/lib/vault/actions'
import {
  BarChart2,
  FolderGit2,
  ChevronRight,
} from 'lucide-react'
import { VaultAttainment } from '@/components/vault/vault-attainment'
import { VaultStatusBadge } from '@/components/vault/vault-badge'
import { formatMetricValue } from './format-metric-value'
import { cn } from '@/lib/utils'

export interface MetricListProps {
  metrics: WorkspaceMetricItem[]
  workspaceId: string
  onEditMetric?: (metric: WorkspaceMetricItem) => void
}

export function MetricList({
  metrics,
  workspaceId,
  onEditMetric,
}: MetricListProps) {
  if (metrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-border/80 rounded-xl bg-card/30">
        <div className="p-3 bg-muted/40 rounded-xl text-muted-foreground mb-4">
          <BarChart2 className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-medium text-foreground mb-1">No metrics found</h3>
        <p className="text-xs text-muted-foreground max-w-sm">
          Define measurable operational indicators with targets and empirical observations.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((m) => {
        return (
          <div
            key={m.id}
            className="group relative flex flex-col justify-between p-4 bg-card/40 border border-border/80 hover:border-border hover:bg-card/70 rounded-xl transition-all shadow-sm"
          >
            <div>
              {/* Header: Category, Status & Project */}
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-sans font-medium tracking-wide uppercase bg-muted/60 text-muted-foreground border border-border/60">
                    {m.category}
                  </span>
                  {m.status !== 'active' && (
                    <VaultStatusBadge status={m.status} className="text-[10px] px-2 py-0" />
                  )}
                  {m.project && (
                    <Link
                      href={`/vault/projects/${m.project.id}`}
                      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-sans text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted/70 border border-border/50 transition-colors truncate max-w-[130px] focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                    >
                      <FolderGit2 className="w-3 h-3 mr-1 shrink-0 text-muted-foreground" />
                      <span className="truncate">{m.project.title}</span>
                    </Link>
                  )}
                </div>

                {/* Neutral Attainment Presentation */}
                <VaultAttainment attainment={m.attainment_rate ?? null} />
              </div>

              {/* Title & Key */}
              <Link
                href={`/vault/metrics/${m.id}`}
                className="block group/link focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none rounded"
              >
                <h3 className="text-sm font-semibold text-foreground group-hover/link:text-primary transition-colors flex items-center justify-between">
                  <span className="truncate">{m.name}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover/link:text-primary opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-1" />
                </h3>
              </Link>
              <div className="flex items-center space-x-2 mt-0.5 mb-2.5">
                <span className="text-[11px] font-mono text-muted-foreground truncate">
                  {m.key}
                </span>
                <span className="text-[11px] text-border select-none">•</span>
                <span className="text-[11px] text-muted-foreground">
                  {m.measurement_type === 'point' ? 'Snapshot' : 'Period'}
                </span>
                {m.cadence && (
                  <>
                    <span className="text-[11px] text-border select-none">•</span>
                    <span className="text-[11px] text-muted-foreground capitalize">{m.cadence}</span>
                  </>
                )}
              </div>

              {/* Description */}
              {m.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3.5 leading-relaxed">
                  {m.description}
                </p>
              )}

              {/* Metric Values Grid */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/20 border border-border/60 rounded-lg mb-3">
                {/* Actual */}
                <div>
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
                    Latest Actual
                  </div>
                  <div className="text-base font-semibold text-foreground tabular-nums font-sans">
                    {formatMetricValue(m.current_actual, m.unit_type, m.unit_symbol)}
                  </div>
                  {m.latest_observation ? (
                    <div className="text-[11px] text-muted-foreground mt-0.5 truncate tabular-nums">
                      {m.latest_observation.observed_at}
                    </div>
                  ) : (
                    <div className="text-[11px] text-muted-foreground/70 mt-0.5">No observation</div>
                  )}
                </div>

                {/* Target */}
                <div>
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
                    Target
                  </div>
                  <div className="text-base font-semibold text-foreground/85 tabular-nums font-sans">
                    {formatMetricValue(
                      m.current_target_value ?? m.current_target?.target_value,
                      m.unit_type,
                      m.unit_symbol
                    )}
                  </div>
                  {m.current_target?.baseline_value !== null && m.current_target?.baseline_value !== undefined ? (
                    <div className="text-[11px] text-muted-foreground mt-0.5 truncate tabular-nums">
                      Base: {formatMetricValue(m.current_target.baseline_value, m.unit_type, m.unit_symbol)}
                    </div>
                  ) : (
                    <div className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">
                      {m.current_target ? 'Relevant target' : 'No target'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Card Footer */}
            <div className="pt-2.5 border-t border-border/60 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1.5 text-[11px] text-muted-foreground">
                <span className="tabular-nums">{m.observations_count || 0}</span>
                <span>obs</span>
                <span className="text-border select-none">•</span>
                <span className="tabular-nums">{m.targets_count || 0}</span>
                <span>targets</span>
              </div>

              <Link
                href={`/vault/metrics/${m.id}`}
                className="px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
              >
                <span>View</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}
