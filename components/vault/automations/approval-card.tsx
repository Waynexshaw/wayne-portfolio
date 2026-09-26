'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  XCircle,
  Edit3,
  Clock,
  ExternalLink,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  FileCheck2,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react'
import { AutomationApproval } from '@/lib/vault/automation/types'
import { cn } from '@/lib/utils'

interface ApprovalCardProps {
  approval: AutomationApproval
  onApprove: (id: string) => Promise<void>
  onReject: (id: string) => Promise<void>
  onEditAndApprove: (approval: AutomationApproval) => void
  isProcessing: boolean
}

export function ApprovalCard({
  approval,
  onApprove,
  onReject,
  onEditAndApprove,
  isProcessing,
}: ApprovalCardProps) {
  const isExpired = approval.expires_at ? new Date(approval.expires_at) < new Date() : false
  const proposed = approval.proposed_payload || {}
  const source = approval.source_context || {}

  // Human-friendly title and description translation
  const getActionSummary = () => {
    switch (approval.action_type) {
      case 'suggest_task_creation':
        return {
          header: 'Suggested Operating Task',
          title: proposed.title || 'Create follow-up task',
          explanation: source.meeting_title
            ? `Proposed from completed meeting: "${source.meeting_title}"`
            : source.decision_title
            ? `Proposed from recorded decision: "${source.decision_title}"`
            : 'Generated from business trigger',
          outcome: 'An actionable task will be added to the Operations workspace.',
          icon: <FileCheck2 className="w-4 h-4 text-primary" />,
          details: [
            proposed.priority && { label: 'Priority', value: proposed.priority.toUpperCase() },
            proposed.due_date && { label: 'Due Date', value: proposed.due_date },
          ].filter(Boolean),
        }

      case 'suggest_follow_up_creation':
        return {
          header: 'Suggested Relationship Follow-up',
          title: proposed.title || 'Follow up with contact',
          explanation: proposed.reason
            ? proposed.reason
            : source.contact_name
            ? `Automated reconnection suggestion for ${source.contact_name}`
            : 'CRM touchpoint threshold reached',
          outcome: 'A relationship follow-up reminder will be added to your queue.',
          icon: <Clock className="w-4 h-4 text-amber-500" />,
          details: [
            proposed.priority && { label: 'Priority', value: proposed.priority.toUpperCase() },
            proposed.due_date && { label: 'Due Date', value: proposed.due_date },
          ].filter(Boolean),
        }

      case 'suggest_portfolio_snapshot':
        return {
          header: 'Suggested Portfolio Snapshot',
          title: 'Snapshot approved evidence to public portfolio bridge',
          explanation: source.evidence_title
            ? `Evidence claim "${source.evidence_title}" was approved.`
            : 'Evidence item approved.',
          outcome: 'A public verifiable proof bridge snapshot will be created in your portfolio.',
          icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />,
          details: [
            source.evidence_type && { label: 'Evidence Type', value: source.evidence_type },
          ].filter(Boolean),
        }

      case 'suggest_review_creation':
        return {
          header: 'Suggested Retrospective Review',
          title: proposed.title || 'Project Retrospective Review',
          explanation: source.project_title
            ? `Project "${source.project_title}" was completed.`
            : 'Completed project retrospective triggered.',
          outcome: 'A new retrospective review will be opened in the Reviews workspace.',
          icon: <Sparkles className="w-4 h-4 text-primary" />,
          details: [
            proposed.review_type && { label: 'Review Type', value: proposed.review_type },
            proposed.period_start && { label: 'Timeframe', value: `${proposed.period_start} → ${proposed.period_end}` },
          ].filter(Boolean),
        }

      default:
        return {
          header: 'Automation Suggestion',
          title: approval.action_type,
          explanation: 'Consequential action requiring human authorization.',
          outcome: 'Will execute deterministic action.',
          icon: <Layers className="w-4 h-4 text-primary" />,
          details: [],
        }
    }
  }

  const summary = getActionSummary()

  return (
    <div
      className={cn(
        'p-5 rounded-xl border bg-card transition-all relative overflow-hidden',
        isExpired
          ? 'border-border/60 opacity-60'
          : 'border-border hover:border-border/80 shadow-sm'
      )}
    >
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-secondary/80 border border-border">
            {summary.icon}
          </div>
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              {summary.header}
            </span>
            <div className="text-xs text-muted-foreground/80 flex items-center gap-2">
              <span>Proposed {new Date(approval.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              {approval.expires_at && !isExpired && (
                <span>• Expires {new Date(approval.expires_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              )}
            </div>
          </div>
        </div>

        {isExpired && (
          <span className="self-start sm:self-auto px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-mono uppercase tracking-wider font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Expired
          </span>
        )}
      </div>

      {/* Body: What is WV suggesting & Why */}
      <div className="py-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground tracking-tight">
            {summary.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {summary.explanation}
          </p>
        </div>

        {/* Expected Consequence */}
        <div className="p-3 rounded-lg bg-muted/30 border border-border/40 text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-1.5 font-medium text-foreground text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> What will happen on approval:
          </div>
          <p className="text-[11px] pl-5">{summary.outcome}</p>
        </div>

        {/* Action Details / Tags */}
        {summary.details && summary.details.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap pt-1 text-xs">
            {summary.details.map((d: any, i: number) => (
              <div
                key={i}
                className="px-2.5 py-1 rounded-md bg-secondary/60 border border-border/60 text-[11px] font-mono flex items-center gap-1.5"
              >
                <span className="text-muted-foreground">{d.label}:</span>
                <span className="font-semibold text-foreground">{d.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Controls: Approve, Edit & Approve, Reject */}
      <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-3">
        <span className="text-[11px] font-mono text-muted-foreground/70">
          Ref: {approval.id.substring(0, 8)}
        </span>

        <div className="flex items-center gap-2">
          {/* Reject */}
          <button
            type="button"
            onClick={() => onReject(approval.id)}
            disabled={isProcessing || isExpired}
            className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-500 text-muted-foreground text-xs font-medium transition-colors disabled:opacity-50"
          >
            Reject
          </button>

          {/* Edit & Approve */}
          <button
            type="button"
            onClick={() => onEditAndApprove(approval)}
            disabled={isProcessing || isExpired}
            className="px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Edit3 className="w-3.5 h-3.5 text-primary" /> Edit & Approve
          </button>

          {/* Direct Approve */}
          <button
            type="button"
            onClick={() => onApprove(approval.id)}
            disabled={isProcessing || isExpired}
            className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
          </button>
        </div>
      </div>
    </div>
  )
}
