'use client'

import Link from 'next/link'
import {
  BookOpen,
  ExternalLink,
  HelpCircle,
  FileText,
  Clock,
  Sparkles,
  Archive,
} from 'lucide-react'
import {
  RelatedResearchItem,
  RelatedResearchEntityType,
  ResearchConnectionType,
} from '@/lib/vault/actions'

interface RelatedResearchSectionProps {
  relatedResearch: RelatedResearchItem[]
  entityType: RelatedResearchEntityType
  entityName?: string
}

function getRelationshipBadge(type: ResearchConnectionType) {
  switch (type) {
    case 'subject':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
    case 'stakeholder':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
    case 'partner':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
    case 'competitor':
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
    case 'due_diligence':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
    case 'supporting':
      return 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30'
    default:
      return 'bg-secondary text-foreground border-border'
  }
}

function formatRelationshipLabel(type: ResearchConnectionType) {
  switch (type) {
    case 'subject':
      return 'Subject'
    case 'stakeholder':
      return 'Stakeholder'
    case 'partner':
      return 'Partner'
    case 'competitor':
      return 'Competitor'
    case 'due_diligence':
      return 'Due Diligence'
    case 'supporting':
      return 'Supporting'
    default:
      return type
  }
}

function getStatusBadge(status: string, isArchived: boolean) {
  if (isArchived || status === 'archived') {
    return 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30'
  }
  switch (status) {
    case 'active':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
    case 'planning':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
    case 'paused':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
    case 'completed':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
    default:
      return 'bg-secondary text-foreground border-border'
  }
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case 'urgent':
      return 'text-red-500 font-medium'
    case 'high':
      return 'text-orange-500 font-medium'
    case 'medium':
      return 'text-amber-500'
    case 'low':
      return 'text-slate-400'
    default:
      return 'text-muted-foreground'
  }
}

function formatResearchType(type: string) {
  if (!type) return 'Research'
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function RelatedResearchSection({
  relatedResearch,
  entityType,
  entityName,
}: RelatedResearchSectionProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <h3 className="font-serif text-lg font-medium text-foreground">
            Related Research
          </h3>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
            {relatedResearch.length}
          </span>
        </div>

        {/* Read-only Context */}
        <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
          {relatedResearch.length === 1 ? '1 Connected Inquiry' : `${relatedResearch.length} Connected Inquiries`}
        </span>
      </div>

      {/* Empty State */}
      {relatedResearch.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground text-xs space-y-2">
          <BookOpen className="w-7 h-7 mx-auto opacity-30 text-muted-foreground" />
          <p className="font-medium text-foreground/80">
            No research connected to this {entityType} yet.
          </p>
          <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
            Connections can be established from within Research records in the Research Workspace.
          </p>
        </div>
      ) : (
        /* Research Cards List */
        <div className="space-y-3">
          {relatedResearch.map((item) => {
            const r = item.research_record
            const isArchived = Boolean(r.archived_at || r.status === 'archived')
            const formattedDate = new Date(r.updated_at || r.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })

            return (
              <Link
                key={item.id}
                href={`/vault/research/${r.id}`}
                className="group block p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-secondary/20 transition-all shadow-xs space-y-2.5"
              >
                {/* Header Row: Title & Badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors font-serif truncate">
                        {r.title}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary shrink-0" />
                    </div>

                    {/* Question or Summary snippet */}
                    {r.research_question ? (
                      <p className="text-xs text-muted-foreground italic line-clamp-1 mt-0.5">
                        &ldquo;{r.research_question}&rdquo;
                      </p>
                    ) : r.summary ? (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {r.summary}
                      </p>
                    ) : null}
                  </div>

                  {/* Badges: Relationship & Status */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Relationship Badge */}
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono border ${getRelationshipBadge(
                        item.relationship_type
                      )}`}
                    >
                      {formatRelationshipLabel(item.relationship_type)}
                    </span>

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border capitalize ${getStatusBadge(
                        r.status,
                        isArchived
                      )}`}
                    >
                      {isArchived && <Archive className="w-2.5 h-2.5" />}
                      {isArchived ? 'Archived' : r.status}
                    </span>
                  </div>
                </div>

                {/* Connection Notes if present */}
                {item.notes && (
                  <div className="text-[11px] text-foreground/80 bg-secondary/40 px-2.5 py-1.5 rounded-md border border-border/40 whitespace-pre-wrap leading-relaxed">
                    <span className="font-semibold text-muted-foreground">Note: </span>
                    {item.notes}
                  </div>
                )}

                {/* Footer Metadata: Type, Priority, Date */}
                <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px] text-muted-foreground font-mono">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-secondary/80 text-[10px]">
                      {formatResearchType(r.research_type)}
                    </span>
                    <span className="text-[10px]">
                      Priority: <span className={getPriorityBadge(r.priority)}>{r.priority}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[10px]">
                    <Clock className="w-3 h-3" />
                    <span>{formattedDate}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
