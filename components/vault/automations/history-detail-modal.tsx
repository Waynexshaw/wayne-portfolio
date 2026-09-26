'use client'

import { useState, useEffect } from 'react'
import {
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Zap,
  Layers,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  FileText
} from 'lucide-react'
import { AutomationRun } from '@/lib/vault/automation/types'
import { cn } from '@/lib/utils'

interface HistoryDetailModalProps {
  run: AutomationRun | null
  onClose: () => void
}

export function HistoryDetailModal({ run, onClose }: HistoryDetailModalProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (run) window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [run, onClose])

  if (!run) return null

  const ruleSnapshot = run.rule_snapshot || {}
  const executionDetails = run.execution_details || {}

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
        return (
          <span className="px-2.5 py-1 rounded-full bg-[#2DB52D]/10 text-[#136C13] dark:text-[#2DB52D] border border-[#2DB52D]/30 text-xs font-mono font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Succeeded
          </span>
        )
      case 'failed':
        return (
          <span className="px-2.5 py-1 rounded-full bg-[#DC143C]/10 text-[#A30F2D] dark:text-[#FF5C77] border border-[#DC143C]/30 text-xs font-mono font-semibold flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" /> Failed
          </span>
        )
      case 'awaiting_approval':
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs font-mono font-semibold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Awaiting Approval
          </span>
        )
      case 'approved':
        return (
          <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/30 text-xs font-mono font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </span>
        )
      case 'rejected':
        return (
          <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border text-xs font-mono flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        )
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border text-xs font-mono flex items-center gap-1.5">
            Cancelled
          </span>
        )
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-secondary text-foreground border border-border text-xs font-mono">
            {status}
          </span>
        )
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-xl bg-card border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <div>
              <h2 className="font-semibold text-sm text-foreground">
                Automation Run Inspection
              </h2>
              <span className="text-[11px] font-mono text-muted-foreground">
                Run ID: {run.id.substring(0, 8)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Status & Timing Overview */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/60">
            <div>
              <span className="text-muted-foreground text-[11px] block">Execution Lifecycle</span>
              <div className="mt-1">{getStatusBadge(run.status)}</div>
            </div>
            <div className="text-right text-[11px] font-mono text-muted-foreground space-y-0.5">
              <div>Started: {new Date(run.started_at).toLocaleString()}</div>
              {run.completed_at && <div>Completed: {new Date(run.completed_at).toLocaleString()}</div>}
            </div>
          </div>

          {/* Failure Alert if Failed */}
          {run.status === 'failed' && (
            <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" /> Execution Error
              </div>
              <p className="text-xs pl-5 leading-relaxed font-mono">
                {run.error_details || 'Execution terminated with unhandled error'}
              </p>
            </div>
          )}

          {/* 1. What triggered this & Which Rule ran */}
          <div className="space-y-2 border-b border-border/60 pb-3">
            <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider font-mono text-muted-foreground">
              1. Trigger & Rule Evaluation
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-secondary/50 border border-border/50">
                <span className="text-[11px] text-muted-foreground block font-mono">Rule</span>
                <span className="font-medium text-foreground">{ruleSnapshot.title || 'Direct Trigger'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-secondary/50 border border-border/50">
                <span className="text-[11px] text-muted-foreground block font-mono">Trigger Event</span>
                <span className="font-medium text-foreground font-mono">{ruleSnapshot.trigger_type || 'Event Hook'}</span>
              </div>
            </div>
          </div>

          {/* 2. Target Entity & Action */}
          <div className="space-y-2 border-b border-border/60 pb-3">
            <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider font-mono text-muted-foreground">
              2. Action Proposed / Executed
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-secondary/50 border border-border/50">
                <span className="text-[11px] text-muted-foreground block font-mono">Action Type</span>
                <span className="font-medium text-foreground font-mono">{ruleSnapshot.action_type || 'N/A'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-secondary/50 border border-border/50">
                <span className="text-[11px] text-muted-foreground block font-mono">Target Entity</span>
                <span className="font-medium text-foreground font-mono">
                  {run.target_entity_type} {run.target_entity_id ? `(${run.target_entity_id.substring(0, 8)})` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Human Approval Status */}
          <div className="p-3 rounded-lg bg-secondary/40 border border-border/60 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-medium text-foreground text-xs block">Human Authorization</span>
              <span className="text-[11px] text-muted-foreground">
                {ruleSnapshot.requires_approval
                  ? 'Consequential action requiring human authorization prior to mutation'
                  : 'Safe autonomous action; executed directly without human authorization'}
              </span>
            </div>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-card border border-border">
              {ruleSnapshot.requires_approval ? 'Required' : 'Autonomous'}
            </span>
          </div>

          {/* 4. Collapsible Technical Audit Details */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="text-xs text-muted-foreground hover:text-foreground font-mono flex items-center gap-1.5 transition-colors"
            >
              {showTechnicalDetails ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              {showTechnicalDetails ? 'Hide technical audit payload' : 'Inspect technical audit payload'}
            </button>

            {showTechnicalDetails && (
              <div className="mt-2 space-y-2">
                <div className="p-3 rounded-lg bg-muted/40 border border-border font-mono text-[10px] space-y-2 overflow-x-auto text-foreground">
                  <div>
                    <span className="text-muted-foreground">{'// Idempotency Key:'}</span>
                    <p className="break-all">{run.idempotency_key}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{'// Execution Details:'}</span>
                    <pre className="mt-1">{JSON.stringify(executionDetails, null, 2)}</pre>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{'// Rule Snapshot:'}</span>
                    <pre className="mt-1">{JSON.stringify(ruleSnapshot, null, 2)}</pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-border bg-muted/10 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
