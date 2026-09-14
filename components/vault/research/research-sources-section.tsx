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
  Quote,
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

function getSourceTypeBadge(type: string) {
  switch (type) {
    case 'research_report':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
    case 'whitepaper':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
    case 'academic_paper':
      return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
    case 'regulatory_document':
      return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
    case 'official_website':
    case 'documentation':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
    case 'dataset':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
    default:
      return 'bg-secondary text-foreground border-border'
  }
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
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-lg font-medium text-foreground">
                Research Sources
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border">
                {activeSources.length}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Underlying articles, reports, documentation, and records supporting this inquiry.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {archivedSources.length > 0 && (
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                showArchived
                  ? 'bg-secondary text-foreground border-border'
                  : 'text-muted-foreground hover:text-foreground border-transparent'
              }`}
            >
              <Filter className="w-3 h-3" />
              <span>{showArchived ? 'Viewing Archived' : `Archived (${archivedSources.length})`}</span>
            </button>
          )}

          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
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

      {/* Sources List / Empty State */}
      {displayedSources.length === 0 ? (
        <div className="py-8 text-center space-y-2 border border-dashed border-border rounded-xl">
          <BookOpen className="w-8 h-8 text-muted-foreground/50 mx-auto" />
          <p className="text-xs text-muted-foreground">
            {showArchived
              ? 'No archived sources.'
              : 'No research sources logged yet. Add sources to begin capturing evidence.'}
          </p>
          {!showArchived && (
            <button
              onClick={() => setIsAddOpen(true)}
              className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline pt-1"
            >
              <Plus className="w-3 h-3" />
              <span>Add First Source</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                className="rounded-lg border border-border bg-secondary/20 p-4 space-y-3 hover:border-primary/30 transition-colors flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`text-[11px] font-mono capitalize px-2 py-0.5 rounded border ${getSourceTypeBadge(
                          source.source_type
                        )}`}
                      >
                        {source.source_type.replace('_', ' ')}
                      </span>
                      {source.archived_at && (
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-500/10 text-zinc-500 border border-zinc-500/20">
                          Archived
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {source.url && (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
                          title="Open URL"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => setEditingSource(source)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        title="Edit Source"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {source.archived_at ? (
                        <button
                          disabled={isPending}
                          onClick={() => handleRestore(source.id)}
                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          title="Restore Source"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          disabled={isPending}
                          onClick={() => handleArchive(source.id)}
                          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Archive Source"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h4 className="font-serif text-sm font-medium text-foreground leading-snug">
                    {source.title}
                  </h4>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    {(source.publisher || source.author) && (
                      <div className="flex flex-wrap items-center gap-2">
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

                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-muted-foreground/80">
                      {publishedFormatted && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Pub: {publishedFormatted}</span>
                        </span>
                      )}
                      {accessedFormatted && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Accessed: {accessedFormatted}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {source.notes && (
                    <p className="text-xs text-muted-foreground/90 italic pt-1 line-clamp-2 border-t border-border/50">
                      &ldquo;{source.notes}&rdquo;
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Quote className="w-3 h-3 text-primary" />
                    <span className="font-mono text-[11px]">
                      {count} evidence point{count === 1 ? '' : 's'}
                    </span>
                  </div>

                  {!source.archived_at && onAddEvidenceForSource && (
                    <button
                      onClick={() => onAddEvidenceForSource(source.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Attach Evidence</span>
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
