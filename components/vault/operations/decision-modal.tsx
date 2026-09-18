'use client'

import { useState, useTransition, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Decision } from '@/lib/vault/operations/types'
import { createDecisionAction, updateDecisionAction } from '@/lib/vault/operations-actions'

interface DecisionModalProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
  decision?: Decision | null
  prefill?: {
    projectId?: string | null
    meetingId?: string | null
  }
  projects?: { id: string; title: string }[]
  meetings?: { id: string; title: string }[]
  onSuccess?: (savedDecision: Decision) => void
}

export function DecisionModal({
  isOpen,
  onClose,
  workspaceId,
  decision,
  prefill,
  projects = [],
  meetings = [],
  onSuccess,
}: DecisionModalProps) {
  const isEditing = Boolean(decision)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [decisionText, setDecisionText] = useState('')
  const [context, setContext] = useState('')
  const [reasoning, setReasoning] = useState('')
  const [alternativesConsidered, setAlternativesConsidered] = useState('')
  const [consequences, setConsequences] = useState('')
  const [decidedAt, setDecidedAt] = useState('')
  const [projectId, setProjectId] = useState<string>('')
  const [meetingId, setMeetingId] = useState<string>('')

  useEffect(() => {
    if (decision) {
      setTitle(decision.title || '')
      setDecisionText(decision.decision || '')
      setContext(decision.context || '')
      setReasoning(decision.reasoning || '')
      setAlternativesConsidered(decision.alternatives_considered || '')
      setConsequences(decision.consequences || '')
      setDecidedAt(decision.decided_at || '')
      setProjectId(decision.project_id || '')
      setMeetingId(decision.meeting_id || '')
    } else {
      setTitle('')
      setDecisionText('')
      setContext('')
      setReasoning('')
      setAlternativesConsidered('')
      setConsequences('')
      setDecidedAt(new Date().toISOString().split('T')[0])
      setProjectId(prefill?.projectId || '')
      setMeetingId(prefill?.meetingId || '')
    }
    setError(null)
  }, [decision, prefill, isOpen])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Decision title is required')
      return
    }
    if (!decisionText.trim()) {
      setError('Decision statement is required')
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        if (isEditing && decision) {
          const updated = await updateDecisionAction(workspaceId, decision.id, {
            title: title.trim(),
            decision: decisionText.trim(),
            context: context.trim() || null,
            reasoning: reasoning.trim() || null,
            alternatives_considered: alternativesConsidered.trim() || null,
            consequences: consequences.trim() || null,
            decided_at: decidedAt,
            project_id: projectId || null,
            meeting_id: meetingId || null,
          })
          onSuccess?.(updated)
        } else {
          const created = await createDecisionAction(workspaceId, {
            title: title.trim(),
            decision: decisionText.trim(),
            context: context.trim() || null,
            reasoning: reasoning.trim() || null,
            alternatives_considered: alternativesConsidered.trim() || null,
            consequences: consequences.trim() || null,
            decided_at: decidedAt,
            project_id: projectId || null,
            meeting_id: meetingId || null,
          })
          onSuccess?.(created)
        }
        onClose()
      } catch (err: any) {
        setError(err.message || 'Failed to save decision')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-0 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-5 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h2 className="font-serif text-lg font-semibold text-foreground">
            {isEditing ? 'Edit Decision' : 'Record Decision'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-foreground mb-1">
              Title <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Choose Supabase for Primary Storage"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1">
              Decision Statement <span className="text-destructive">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={decisionText}
              onChange={(e) => setDecisionText(e.target.value)}
              placeholder="The concrete decision reached and agreed upon..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none font-medium"
            />
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1">Decided Date</label>
            <input
              type="date"
              required
              value={decidedAt}
              onChange={(e) => setDecidedAt(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1">Context & Background</label>
            <textarea
              rows={2}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="What prompted this decision?"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1">Reasoning & Justification</label>
            <textarea
              rows={2}
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="Why this choice was made over others..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1">Alternatives Considered</label>
            <textarea
              rows={2}
              value={alternativesConsidered}
              onChange={(e) => setAlternativesConsidered(e.target.value)}
              placeholder="Other options evaluated and why they were declined..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1">Anticipated Consequences</label>
            <textarea
              rows={2}
              value={consequences}
              onChange={(e) => setConsequences(e.target.value)}
              placeholder="Expected outcomes, tradeoffs, or future commitments..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
            <div>
              <label className="block font-medium text-muted-foreground mb-1">Linked Project</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">None (Workspace General)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-muted-foreground mb-1">Linked Meeting</label>
              <select
                value={meetingId}
                onChange={(e) => setMeetingId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">None</option>
                {meetings.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isEditing ? 'Save Changes' : 'Record Decision'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
