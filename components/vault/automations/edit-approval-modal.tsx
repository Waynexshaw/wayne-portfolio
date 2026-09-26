'use client'

import { useState, useEffect } from 'react'
import {
  X,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Clock,
  Sparkles,
  ShieldCheck,
  Calendar,
  Layers
} from 'lucide-react'
import { AutomationApproval } from '@/lib/vault/automation/types'

interface EditApprovalModalProps {
  approval: AutomationApproval | null
  onClose: () => void
  onConfirm: (approvalId: string, modifiedPayload: Record<string, any>) => Promise<void>
  isProcessing: boolean
}

export function EditApprovalModal({
  approval,
  onClose,
  onConfirm,
  isProcessing,
}: EditApprovalModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [validationError, setValidationError] = useState<string | null>(null)

  // Sync form data on approval change
  useEffect(() => {
    if (approval) {
      setFormData({ ...(approval.proposed_payload || {}) })
      setValidationError(null)
    }
  }, [approval])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!approval) return null

  const actionType = approval.action_type
  const proposed = approval.proposed_payload || {}
  const source = approval.source_context || {}

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    // Action-specific validations
    if (actionType === 'suggest_task_creation' || actionType === 'suggest_follow_up_creation') {
      if (!formData.title?.trim()) {
        setValidationError('Title is required.')
        return
      }
    } else if (actionType === 'suggest_review_creation') {
      if (!formData.title?.trim()) {
        setValidationError('Review title is required.')
        return
      }
      const canonicalTypes = ['project', 'campaign', 'growth', 'strategy', 'opportunity', 'partnership', 'period', 'other']
      if (!canonicalTypes.includes(formData.review_type)) {
        setValidationError(`Invalid review type. Must be one of: ${canonicalTypes.join(', ')}`)
        return
      }
    }

    try {
      await onConfirm(approval.id, formData)
    } catch (err: any) {
      setValidationError(err?.message || 'Failed to execute modified approval.')
    }
  }

  const renderActionFields = () => {
    switch (actionType) {
      case 'suggest_task_creation':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Task Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="e.g. Implement architectural decision"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Description / Notes
              </label>
              <textarea
                value={formData.description || ''}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Add contextual details or instructions..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority || 'medium'}
                  onChange={e => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={formData.due_date || ''}
                  onChange={e => setFormData({ ...formData, due_date: e.target.value || null })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Read-only Source Context */}
            {(source.meeting_title || source.decision_title) && (
              <div className="p-3 rounded-lg bg-muted/30 border border-border text-[11px] text-muted-foreground space-y-1">
                <span className="font-semibold text-foreground">Source Linkage:</span>
                {source.meeting_title && <p>Meeting: {source.meeting_title}</p>}
                {source.decision_title && <p>Decision: {source.decision_title}</p>}
              </div>
            )}
          </div>
        )

      case 'suggest_follow_up_creation':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Follow-Up Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="e.g. Schedule check-in call"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Context / Notes
              </label>
              <textarea
                value={formData.description || formData.notes || ''}
                onChange={e => setFormData({ ...formData, description: e.target.value, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Details regarding this reconnection..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority || 'medium'}
                  onChange={e => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={formData.due_date ? formData.due_date.split('T')[0] : ''}
                  onChange={e => setFormData({ ...formData, due_date: e.target.value || null })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {source.contact_name && (
              <div className="p-3 rounded-lg bg-muted/30 border border-border text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">Contact:</span> {source.contact_name}
              </div>
            )}
          </div>
        )

      case 'suggest_review_creation':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Review Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="e.g. Q3 Strategic Retrospective"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Review Type (Canonical WV Schema) <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.review_type || 'project'}
                onChange={e => setFormData({ ...formData, review_type: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="project">Project</option>
                <option value="campaign">Campaign</option>
                <option value="growth">Growth</option>
                <option value="strategy">Strategy</option>
                <option value="opportunity">Opportunity</option>
                <option value="partnership">Partnership</option>
                <option value="period">Period</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Period Start (YYYY-MM-DD)
                </label>
                <input
                  type="date"
                  value={formData.period_start || ''}
                  onChange={e => setFormData({ ...formData, period_start: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Period End (YYYY-MM-DD)
                </label>
                <input
                  type="date"
                  value={formData.period_end || ''}
                  onChange={e => setFormData({ ...formData, period_end: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        )

      case 'suggest_portfolio_snapshot':
        return (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Confirm public portfolio snapshot parameters. Source evidence will be safely linked to your public case study or project.
            </p>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Public Project ID (Optional)
              </label>
              <input
                type="text"
                value={formData.public_project_id || ''}
                onChange={e => setFormData({ ...formData, public_project_id: e.target.value || null })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="UUID of public project"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Public Case Study ID (Optional)
              </label>
              <input
                type="text"
                value={formData.public_case_study_id || ''}
                onChange={e => setFormData({ ...formData, public_case_study_id: e.target.value || null })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="UUID of public case study"
              />
            </div>

            {source.evidence_title && (
              <div className="p-3 rounded-lg bg-muted/30 border border-border text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">Evidence:</span> {source.evidence_title}
              </div>
            )}
          </div>
        )

      default:
        return (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Review parameters for this automation action:
            </p>
            <pre className="p-3 rounded-lg bg-muted/40 font-mono text-[11px] overflow-x-auto text-foreground">
              {JSON.stringify(formData, null, 2)}
            </pre>
          </div>
        )
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-xl bg-card border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-primary/10 text-primary">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-foreground">
                Edit & Approve Proposal
              </h2>
              <span className="text-[11px] font-mono text-muted-foreground">
                Ref: {approval.id.substring(0, 8)}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {validationError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {renderActionFields()}

          {/* Footer buttons */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-3.5 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isProcessing}
              className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Confirm & Approve
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
