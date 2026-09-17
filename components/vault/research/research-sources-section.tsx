'use client'

import { useState, useTransition } from 'react'
import {
  BookOpen,
  Plus,
  ExternalLink,
  Edit3,
  Archive,
  RotateCcw,
  Calendar,
  User,
  Building2,
  Filter,
} from 'lucide-react'
import { archiveResearchSource, restoreResearchSource } from '@/lib/vault/actions'
import { SourceModal } from './source-modal'

interface ResearchSourcesSectionProps {
  researchRecordId: string
  workspaceId: string
  sources: any[]
  evidenceCountBySourceId: Record<string, number>
  onAddEvidenceForSource?: (sourceId: string) => void
}

export function ResearchSourcesSection({
  researchRecordId,
  workspaceId,
  sources,
  evidenceCountBySourceId,
  onAddEvidenceForSource,
}: ResearchSourcesSectionProps) {
  const [isPending, startTransition] = useTransition()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingSource, setEditingSource] = useState<any | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const activeSources = sources.filter((s) => !s.archived_at)
  const archivedSources = sources.filter((s) => !!s.archived_at)
  const displayedSources = showArchived ? archivedSources : activeSources

  const handleArchive = (sourceId: string) => {
    setActionError(null)
    startTransition(async () => {
      try {
        await archiveResearchSource(sourceId, workspaceId)
      } catch (err: any) {
        setActionError(err.message || 'Failed to archive source')
      }
    })
  }

  const handleRestore = (sourceId: string) => {
    setActionError(null)
    startTransition(async () => {
      try {
        await restoreResearchSource(sourceId, workspaceId)
      } catch (err: any) {
        setActionError(err.message || 'Failed to restore source')
      }
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-base font-medium text-foreground">
              Source Library
            </h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/60">
              {activeSources.length}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Bibliographic records, documents, and references underlying this inquiry.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {archivedSources.length > 0 && (
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none ${
                showArchived
                  ? 'bg-secondary text-foreground border-border'
                  : 'text-muted-foreground hover:text-foreground border-border/60'
              }`}
            >
              <Filter className="w-3 h-3" />
              <span>{showArchived ? 'Viewing Archived' : `Archived (${archivedSources.length})`}</span>
            </button>
          )}

          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Source</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div className="p-3 text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/20 font-mono">
          {actionError}
        </div>
      )}

      {/* Sources Ledger */}
      {displayedSources.length === 0 ? (
        <div className="py-8 text-center space-y-2 border border-dashed border-border/80 rounded-xl">
          <BookOpen className="w-7 h-7 text-muted-foreground/40 mx-auto" />
          <p className="text-xs text-muted-foreground">
            {showArchived
              ? 'No archived sources.'
              : 'No research sources logged yet. Add sources to begin capturing evidence.'}
          </p>
          {!showArchived && (
            <button
              onClick={() => setIsAddOpen(true)}
              className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline pt-1 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
            >
              <Plus className="w-3 h-3" />
              <span>Add First Source</span>
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-border/60 border border-border/60 rounded-lg overflow-hidden bg-card/40">
          {displayedSources.map((source) => {
            const count = evidenceCountBySourceId[source.id] || 0
            const publishedFormatted = source.published_at
              ? new Date(source.published_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : null
            const accessedFormatted = source.accessed_at
              ? new Date(source.accessed_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : null

            return (
              <div
                key={source.id}
                className="p-3.5 sm:p-4 hover:bg-muted/20 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Source Info */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.2 rounded bg-muted/60 text-muted-foreground border border-border/50">
                      {source.source_type?.replace('_', ' ')}
                    </span>
                    {source.archived_at && (
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-muted/40 text-muted-foreground border border-border/50">
                        Archived
                      </span>
                    )}
                    <h4 className="font-serif text-sm font-medium text-foreground hover:text-primary transition-colors truncate">
                      {source.title}
                    </h4>
                  </div>

                  {/* Metadata Row: Publisher/Author, Dates, Notes */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {(source.publisher || source.author) && (
                      <div className="flex items-center gap-2">
                        {source.publisher && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-muted-foreground/70" />
                            <span>{source.publisher}</span>
                          </span>
                        )}
                        {source.author && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-muted-foreground/70" />
                            <span>{source.author}</span>
                          </span>
                        )}
                      </div>
                    )}

                    {publishedFormatted && (
                      <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground/80">
                        <Calendar className="w-3 h-3" />
                        <span>Pub: {publishedFormatted}</span>
                      </span>
                    )}

                    {accessedFormatted && (
                      <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground/80">
                        <Calendar className="w-3 h-3" />
                        <span>Accessed: {accessedFormatted}</span>
                      </span>
                    )}

                    <span className="font-mono text-[11px] text-muted-foreground">
                      {count} evidence point{count === 1 ? '' : 's'}
                    </span>
                  </div>

                  {source.notes && (
                    <p className="text-xs text-muted-foreground/80 italic line-clamp-1">
                      &ldquo;{source.notes}&rdquo;
                    </p>
                  )}
                </div>

                {/* Right Side: Links & Actions */}
                <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                  {source.url && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-primary border border-border/60 hover:border-primary/40 rounded transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                      title="Open source URL"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span className="font-mono text-[11px]">Visit</span>
                    </a>
                  )}

                  {!source.archived_at && onAddEvidenceForSource && (
                    <button
                      onClick={() => onAddEvidenceForSource(source.id)}
                      className="px-2 py-1 text-xs text-primary hover:bg-primary/10 border border-primary/20 rounded transition-colors font-medium focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                      title="Attach evidence to this source"
                    >
                      + Evidence
                    </button>
                  )}

                  <button
                    onClick={() => setEditingSource(source)}
                    className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                    title="Edit Source"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  {source.archived_at ? (
                    <button
                      disabled={isPending}
                      onClick={() => handleRestore(source.id)}
                      className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                      title="Restore Source"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      disabled={isPending}
                      onClick={() => handleArchive(source.id)}
                      className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                      title="Archive Source"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Source Modal */}
      <SourceModal
        researchRecordId={researchRecordId}
        workspaceId={workspaceId}
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />

      {/* Edit Source Modal */}
      {editingSource && (
        <SourceModal
          researchRecordId={researchRecordId}
          workspaceId={workspaceId}
          source={editingSource}
          isOpen={!!editingSource}
          onClose={() => setEditingSource(null)}
        />
      )}
    </div>
  )
}
