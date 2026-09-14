'use client'

import { useState, useTransition } from 'react'
import { Plus, X, Loader2, BookOpen, HelpCircle, Target } from 'lucide-react'
import { createResearchRecord, ResearchType, ResearchStatus, ResearchPriority } from '@/lib/vault/actions'

interface ResearchCreateButtonProps {
  workspaceId?: string
  workspaceName?: string
}

const TYPES: { value: ResearchType; label: string }[] = [
  { value: 'protocol', label: 'Protocol' },
  { value: 'market', label: 'Market' },
  { value: 'tokenomics', label: 'Tokenomics' },
  { value: 'growth', label: 'Growth' },
  { value: 'company', label: 'Company' },
  { value: 'person', label: 'Person' },
  { value: 'product', label: 'Product' },
  { value: 'technology', label: 'Technology' },
  { value: 'regulatory', label: 'Regulatory' },
  { value: 'pevra', label: 'PEVRA' },
  { value: 'other', label: 'Other' },
]

const STATUSES: { value: ResearchStatus; label: string }[] = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
]

const PRIORITIES: { value: ResearchPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export function ResearchCreateButton({
  workspaceId,
  workspaceName,
}: ResearchCreateButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [researchType, setResearchType] = useState<ResearchType>('market')
  const [status, setStatus] = useState<ResearchStatus>('planning')
  const [priority, setPriority] = useState<ResearchPriority>('medium')
  const [researchQuestion, setResearchQuestion] = useState('')
  const [objective, setObjective] = useState('')
  const [summary, setSummary] = useState('')
  const [findings, setFindings] = useState('')
  const [conclusion, setConclusion] = useState('')
  const [nextAction, setNextAction] = useState('')

  const resetForm = () => {
    setTitle('')
    setResearchType('market')
    setStatus('planning')
    setPriority('medium')
    setResearchQuestion('')
    setObjective('')
    setSummary('')
    setFindings('')
    setConclusion('')
    setNextAction('')
    setError(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!workspaceId) {
      setError('No active workspace selected')
      return
    }
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        await createResearchRecord({
          workspaceId,
          title: title.trim(),
          researchType,
          status,
          priority,
          researchQuestion: researchQuestion.trim() || undefined,
          objective: objective.trim() || undefined,
          summary: summary.trim() || undefined,
          findings: findings.trim() || undefined,
          conclusion: conclusion.trim() || undefined,
          nextAction: nextAction.trim() || undefined,
        })
        resetForm()
        setIsOpen(false)
      } catch (err: any) {
        setError(err.message || 'Failed to create research record')
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>New Research</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto">
          <div
            className="relative w-full max-w-2xl bg-card border border-border rounded-xl shadow-xl p-6 my-8 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <h2 className="font-serif text-lg font-medium text-foreground">
                    Initiate Research Record
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Workspace: <span className="font-mono text-foreground">{workspaceName || 'Active'}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  resetForm()
                  setIsOpen(false)
                }}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/20 font-mono">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Research Title <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., L2 Sequencer Decentralization & Revenue Models"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-secondary/30 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                />
              </div>

              {/* Type, Status, Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Research Type
                  </label>
                  <select
                    value={researchType}
                    onChange={(e) => setResearchType(e.target.value as ResearchType)}
                    className="w-full px-3 py-2 text-xs bg-secondary/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {TYPES.map((t) => (
                      <option key={t.value} value={t.value} className="bg-background text-foreground">
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Initial Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ResearchStatus)}
                    className="w-full px-3 py-2 text-xs bg-secondary/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value} className="bg-background text-foreground">
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as ResearchPriority)}
                    className="w-full px-3 py-2 text-xs bg-secondary/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value} className="bg-background text-foreground">
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Research Question */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3 text-primary" />
                  <span>Central Research Question (Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="What specific question or hypothesis are we investigating?"
                  value={researchQuestion}
                  onChange={(e) => setResearchQuestion(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-secondary/30 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors resize-none"
                />
              </div>

              {/* Objective */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1 flex items-center gap-1">
                  <Target className="w-3 h-3 text-primary" />
                  <span>Strategic Objective (Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="What outcome, decision, or mandate does this research inform?"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-secondary/30 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                />
              </div>

              {/* Summary / Context */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Background / Context Summary (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Context, preliminary observations, or rationale..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-secondary/30 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors resize-none"
                />
              </div>

              {/* Initial Findings & Next Action in a 2-col layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Initial Findings (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Key findings discovered so far..."
                    value={findings}
                    onChange={(e) => setFindings(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-secondary/30 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Resulting Next Action (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="What action or follow-up results from this?"
                    value={nextAction}
                    onChange={(e) => setNextAction(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-secondary/30 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors resize-none"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    resetForm()
                    setIsOpen(false)
                  }}
                  className="px-3.5 py-2 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isPending ? 'Creating...' : 'Create Research'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
