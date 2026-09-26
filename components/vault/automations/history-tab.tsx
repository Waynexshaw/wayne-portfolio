'use client'

import { useState } from 'react'
import {
  History,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  Filter,
  Eye,
  Layers
} from 'lucide-react'
import { AutomationRun } from '@/lib/vault/automation/types'
import { HistoryDetailModal } from './history-detail-modal'
import { cn } from '@/lib/utils'

interface HistoryTabProps {
  runs: AutomationRun[]
}

export function HistoryTab({ runs }: HistoryTabProps) {
  const [selectedRun, setSelectedRun] = useState<AutomationRun | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filteredRuns = runs.filter(run => {
    if (statusFilter === 'all') return true
    return run.status === statusFilter
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
        return (
          <span className="px-2 py-0.5 rounded-full bg-[#2DB52D]/10 text-[#136C13] dark:text-[#2DB52D] border border-[#2DB52D]/30 text-[10px] font-mono font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Succeeded
          </span>
        )
      case 'failed':
        return (
          <span className="px-2 py-0.5 rounded-full bg-[#DC143C]/10 text-[#A30F2D] dark:text-[#FF5C77] border border-[#DC143C]/30 text-[10px] font-mono font-semibold flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        )
      case 'awaiting_approval':
        return (
          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] font-mono font-semibold flex items-center gap-1">
            <Clock className="w-3 h-3" /> Awaiting Approval
          </span>
        )
      case 'approved':
        return (
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 text-[10px] font-mono font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        )
      case 'rejected':
        return (
          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border text-[10px] font-mono flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        )
      case 'running':
        return (
          <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 text-[10px] font-mono animate-pulse">
            Running
          </span>
        )
      default:
        return (
          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border text-[10px] font-mono">
            {status}
          </span>
        )
    }
  }

  if (runs.length === 0) {
    return (
      <div className="p-12 rounded-xl border border-border bg-card text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <History className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">
            No automation runs recorded yet.
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            When events trigger automation rules or scheduled evaluation cycles run, full audit history will be preserved here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground">
          Showing <strong className="text-foreground font-semibold">{filteredRuns.length}</strong> of{' '}
          <strong className="text-foreground">{runs.length}</strong> runs
        </span>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-border bg-card text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="awaiting_approval">Awaiting Approval</option>
            <option value="running">Running</option>
            <option value="succeeded">Succeeded</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="failed">Failed</option>
            <option value="skipped">Skipped</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Runs Table / List */}
      <div className="space-y-2.5">
        {filteredRuns.map(run => {
          const ruleSnapshot = run.rule_snapshot || {}
          const hasError = run.status === 'failed'

          return (
            <div
              key={run.id}
              onClick={() => setSelectedRun(run)}
              className={cn(
                'p-4 rounded-xl border bg-card hover:bg-muted/20 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs',
                hasError ? 'border-rose-500/30' : 'border-border'
              )}
            >
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-semibold text-foreground text-xs">
                    {ruleSnapshot.title || 'Automation Run'}
                  </span>
                  {getStatusBadge(run.status)}
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {new Date(run.started_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground flex-wrap">
                  <span>Trigger: {ruleSnapshot.trigger_type || 'system'}</span>
                  <span>•</span>
                  <span>Action: {ruleSnapshot.action_type || 'system'}</span>
                  {run.target_entity_type && (
                    <>
                      <span>•</span>
                      <span>Target: {run.target_entity_type}</span>
                    </>
                  )}
                </div>

                {hasError && run.error_details && (
                  <p className="text-[11px] text-rose-500 font-mono line-clamp-1 pt-0.5">
                    Error: {run.error_details}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end md:self-auto text-primary text-xs font-medium">
                <span className="text-[11px] font-mono">Inspect</span>
                <Eye className="w-3.5 h-3.5" />
              </div>
            </div>
          )
        })}
      </div>

      {selectedRun && (
        <HistoryDetailModal
          run={selectedRun}
          onClose={() => setSelectedRun(null)}
        />
      )}
    </div>
  )
}
