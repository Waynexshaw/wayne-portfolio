'use client'

import { useState, useTransition, useEffect } from 'react'
import { X, Loader2, Quote, MapPin, Sparkles, FileText, BookOpen } from 'lucide-react'
import {
  createResearchEvidence,
  updateResearchEvidence,
} from '@/lib/vault/actions'

interface EvidenceModalProps {
  researchRecordId: string
  workspaceId: string
  sources: any[]
  defaultSourceId?: string
  evidence?: any
  isOpen: boolean
  onClose: () => void
  onSuccess?: (evidence: any) => void
  onOpenAddSource?: () => void
}

export function EvidenceModal({
  researchRecordId,
  workspaceId,
  sources,
  defaultSourceId,
  evidence,
  isOpen,
  onClose,
  onSuccess,
  onOpenAddSource,
}: EvidenceModalProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isEdit = !!evidence

  // Filter sources to only active ones unless editing existing evidence attached to an archived source
  const activeSources = sources.filter((s) => !s.archived_at || s.id === evidence?.source_id)

  const [sourceId, setSourceId] = useState(defaultSourceId || activeSources[0]?.id || '')
  const [evidenceText, setEvidenceText] = useState('')
  const [claimSummary, setClaimSummary] = useState('')
  const [contextLocation, setContextLocation] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (evidence) {
      setSourceId(evidence.source_id || defaultSourceId || activeSources[0]?.id || '')
      setEvidenceText(evidence.evidence_text || '')
      setClaimSummary(evidence.claim_summary || '')
      setContextLocation(evidence.context_location || '')
      setNotes(evidence.notes || '')
    } else {
      setSourceId(defaultSourceId || activeSources[0]?.id || '')
      setEvidenceText('')
      setClaimSummary('')
      setContextLocation('')
      setNotes('')
    }
    setError(null)
  }, [evidence, defaultSourceId, isOpen, activeSources])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!sourceId) {
      setError('A valid source must be selected.')
      return
    }

    if (!evidenceText.trim()) {
      setError('Evidence text is required.')
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        let result: any
        if (isEdit) {
          result = await updateResearchEvidence(evidence.id, {
            workspaceId,
            evidenceText: evidenceText.trim(),
            claimSummary: claimSummary.trim() || undefined,
            contextLocation: contextLocation.trim() || undefined,
            notes: notes.trim() || undefined,
          })
        } else {
          result = await createResearchEvidence({
            workspaceId,
            researchRecordId,
            sourceId,
            evidenceText: evidenceText.trim(),
            claimSummary: claimSummary.trim() || undefined,
            contextLocation: contextLocation.trim() || undefined,
            notes: notes.trim() || undefined,
          })
        }
        if (onSuccess) onSuccess(result)
        onClose()
      } catch (err: any) {
        setError(err.message || 'Failed to save evidence')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto">
      <div
        className="relative w-full max-w-xl bg-card border border-border rounded-xl shadow-xl p-6 my-8 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Quote className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-medium text-foreground">
                {isEdit ? 'Edit Evidence Record' : 'Record Research Evidence'}
              </h2>
              <p className="text-xs text-muted-foreground">
                Ground your findings with verbatim text or data points tied to an authoritative source.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/20 font-mono">
            {error}
          </div>
        )}

        {activeSources.length === 0 && !isEdit ? (
          <div className="p-5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-foreground">No Sources Available</h4>
              <p className="text-xs text-muted-foreground">
                Evidence must be linked to an authoritative source in this research record. Add a source first before logging evidence.
              </p>
            </div>
            {onOpenAddSource && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenAddSource()
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
              >
                + Add Source Now
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                <span>Parent Source <span className="text-destructive">*</span></span>
              </label>
              {isEdit ? (
                <div className="px-3 py-2 text-xs rounded-lg border border-border bg-secondary text-foreground font-mono">
                  {sources.find((s) => s.id === sourceId)?.title || sourceId}
                </div>
              ) : (
                <select
                  required
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-secondary/50 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                >
                  {activeSources.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.source_type}] {s.title} {s.author ? `— ${s.author}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                <Quote className="w-3 h-3 text-primary" />
                <span>Evidence Text (Source Data / Excerpt) <span className="text-destructive">*</span></span>
              </label>
              <textarea
                required
                rows={4}
                placeholder="Paste the verbatim excerpt, quote, data point, or observable metric from the source..."
                value={evidenceText}
                onChange={(e) => setEvidenceText(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-secondary/50 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors resize-none font-sans"
              />
              <span className="text-[11px] text-muted-foreground">
                Preserve what the source actually stated or demonstrated.
              </span>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary" />
                <span>Claim / Takeaway Summary</span>
              </label>
              <textarea
                rows={2}
                placeholder="What interpretation, takeaway, or finding does this evidence support?"
                value={claimSummary}
                onChange={(e) => setClaimSummary(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-secondary/50 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>Context Location</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Page 14, paragraph 2; Timestamp 14:20; Section 3.1"
                value={contextLocation}
                onChange={(e) => setContextLocation(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-secondary/50 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span>Internal Notes</span>
              </label>
              <textarea
                rows={2}
                placeholder="Caveats, verification notes, or correlation with other evidence..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-secondary/50 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isEdit ? 'Save Evidence' : 'Record Evidence'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
