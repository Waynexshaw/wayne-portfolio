'use client'

import { useState, useTransition } from 'react'
import {
  Quote,
  Plus,
  Sparkles,
  MapPin,
  ExternalLink,
  Edit3,
  Archive,
  RotateCcw,
  BookOpen,
  Filter,
  FileText,
} from 'lucide-react'
import { archiveResearchEvidence, restoreResearchEvidence } from '@/lib/vault/actions'
import { EvidenceModal } from './evidence-modal'

interface ResearchEvidenceSectionProps {
  researchRecordId: string
  workspaceId: string
  evidence: any[]
  sources: any[]
  selectedSourceId?: string | null
  onOpenAddSource?: () => void
}

export function ResearchEvidenceSection({
  researchRecordId,
  workspaceId,
  evidence,
  sources,
  selectedSourceId: initialSelectedSourceId = null,
  onOpenAddSource,
}: ResearchEvidenceSectionProps) {
  const [isPending, startTransition] = useTransition()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingEvidence, setEditingEvidence] = useState<any | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [filterSourceId, setFilterSourceId] = useState<string | null>(initialSelectedSourceId)
  const [actionError, setActionError] = useState<string | null>(null)

  const activeEvidence = evidence.filter((e) => !e.archived_at)
  const archivedEvidence = evidence.filter((e) => !!e.archived_at)
  const baseList = showArchived ? archivedEvidence : activeEvidence

  const displayedEvidence = filterSourceId
    ? baseList.filter((e) => e.source_id === filterSourceId)
    : baseList

  const handleArchive = (evidenceId: string) => {
    setActionError(null)
    startTransition(async () => {
      try {
        await archiveResearchEvidence(evidenceId, workspaceId)
      } catch (err: any) {
        setActionError(err.message || 'Failed to archive evidence')
      }
    })
  }

  const handleRestore = (evidenceId: string) => {
    setActionError(null)
    startTransition(async () => {
      try {
        await restoreResearchEvidence(evidenceId, workspaceId)
      } catch (err: any) {
        setActionError(err.message || 'Failed to restore evidence')
      }
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Quote className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-lg font-medium text-foreground">
                Evidence & Grounded Claims
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border">
                {activeEvidence.length}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Traceable excerpts, empirical observations, and citations backing this research.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Source Filter Dropdown if sources exist */}
          {sources.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Filter className="w-3.5 h-3.5" />
              <select
                value={filterSourceId || ''}
                onChange={(e) => setFilterSourceId(e.target.value || null)}
                className="px-2 py-1 text-xs rounded-lg border border-border bg-secondary/50 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Sources ({sources.length})</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {archivedEvidence.length > 0 && (
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                showArchived
                  ? 'bg-secondary text-foreground border-border'
                  : 'text-muted-foreground hover:text-foreground border-transparent'
              }`}
            >
              <span>{showArchived ? 'Viewing Archived' : `Archived (${archivedEvidence.length})`}</span>
            </button>
          )}

          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Evidence</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div className="p-3 text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/20 font-mono">
          {actionError}
        </div>
      )}

      {/* Evidence Cards / Empty State */}
      {displayedEvidence.length === 0 ? (
        <div className="py-8 text-center space-y-2 border border-dashed border-border rounded-xl">
          <Quote className="w-8 h-8 text-muted-foreground/50 mx-auto" />
          <p className="text-xs text-muted-foreground">
            {showArchived
              ? 'No archived evidence records.'
              : sources.length === 0
              ? 'No sources logged yet. Add a source first to begin logging grounded evidence.'
              : 'No evidence points attached yet. Record verbatim excerpts and claims to establish traceability.'}
          </p>
          {!showArchived && sources.length > 0 && (
            <button
              onClick={() => setIsAddOpen(true)}
              className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline pt-1"
            >
              <Plus className="w-3 h-3" />
              <span>Record Evidence</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {displayedEvidence.map((item) => {
            const parentSource = item.source || sources.find((s) => s.id === item.source_id)

            return (
              <div
                key={item.id}
                className="rounded-lg border border-border bg-secondary/15 p-4 space-y-3 hover:border-primary/30 transition-colors"
              >
                {/* Header: Parent Source Chip & Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded bg-secondary text-secondary-foreground border border-border">
                      <BookOpen className="w-3 h-3 text-primary" />
                      <span>{parentSource?.title || 'Unknown Source'}</span>
                    </span>

                    {parentSource?.source_type && (
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-secondary/80 text-muted-foreground border border-border">
                        {parentSource.source_type}
                      </span>
                    )}

                    {parentSource?.url && (
                      <a
                        href={parentSource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-[11px] text-primary hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Source Link</span>
                      </a>
                    )}

                    {item.archived_at && (
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-500/10 text-zinc-500 border border-zinc-500/20">
                        Archived
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingEvidence(item)}
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      title="Edit Evidence"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {item.archived_at ? (
                      <button
                        disabled={isPending}
                        onClick={() => handleRestore(item.id)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        title="Restore Evidence"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        disabled={isPending}
                        onClick={() => handleArchive(item.id)}
                        className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Archive Evidence"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Claim Summary: The Researcher's Interpretation */}
                {item.claim_summary && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-primary">
                      <Sparkles className="w-3 h-3" />
                      <span>Takeaway / Supported Claim</span>
                    </div>
                    <p className="text-sm font-medium text-foreground leading-relaxed">
                      {item.claim_summary}
                    </p>
                  </div>
                )}

                {/* Evidence Text: Verbatim Source Excerpt */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Quote className="w-3 h-3 text-muted-foreground" />
                      <span>Verbatim Excerpt</span>
                    </span>
                    {item.context_location && (
                      <span className="flex items-center gap-1 text-[11px] font-mono lowercase normal-case text-muted-foreground">
                        <MapPin className="w-3 h-3 text-primary" />
                        <span>{item.context_location}</span>
                      </span>
                    )}
                  </div>
                  <div className="p-3 rounded-lg bg-background/60 border border-border/80 text-xs text-foreground/90 font-serif italic leading-relaxed whitespace-pre-wrap">
                    &ldquo;{item.evidence_text}&rdquo;
                  </div>
                </div>

                {/* Notes */}
                {item.notes && (
                  <div className="pt-1 text-xs text-muted-foreground flex items-start gap-1.5">
                    <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground/70" />
                    <p className="whitespace-pre-wrap">{item.notes}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Evidence Modal */}
      <EvidenceModal
        researchRecordId={researchRecordId}
        workspaceId={workspaceId}
        sources={sources}
        defaultSourceId={filterSourceId || undefined}
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onOpenAddSource={onOpenAddSource}
      />

      {/* Edit Evidence Modal */}
      {editingEvidence && (
        <EvidenceModal
          researchRecordId={researchRecordId}
          workspaceId={workspaceId}
          sources={sources}
          evidence={editingEvidence}
          isOpen={!!editingEvidence}
          onClose={() => setEditingEvidence(null)}
        />
      )}
    </div>
  )
}
