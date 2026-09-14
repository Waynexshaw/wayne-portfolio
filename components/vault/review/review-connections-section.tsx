'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  Link2,
  Plus,
  Building2,
  User,
  Target,
  Briefcase,
  BookOpen,
  Edit3,
  Trash2,
  Loader2,
  ExternalLink,
  AlertCircle,
  ArrowRightCircle,
  Lightbulb,
  Users,
} from 'lucide-react'
import {
  deleteReviewConnection,
  ReviewConnectionItem,
  ReviewConnectionRelationshipType,
} from '@/lib/vault/actions'
import { ReviewConnectionModal } from './review-connection-modal'

interface ReviewConnectionsSectionProps {
  reviewId: string
  workspaceId: string
  connections: ReviewConnectionItem[]
}

// Semantic group definitions
const SEMANTIC_GROUPS: {
  key: ReviewConnectionRelationshipType
  label: string
  icon: React.ReactNode
  color: string
}[] = [
  {
    key: 'subject',
    label: 'Evaluated Subjects',
    icon: <Target className="w-3.5 h-3.5" />,
    color: 'text-amber-600 dark:text-amber-400',
  },
  {
    key: 'informed_by',
    label: 'Research Inputs',
    icon: <BookOpen className="w-3.5 h-3.5" />,
    color: 'text-blue-600 dark:text-blue-400',
  },
  {
    key: 'stakeholder',
    label: 'Key Stakeholders',
    icon: <Users className="w-3.5 h-3.5" />,
    color: 'text-indigo-600 dark:text-indigo-400',
  },
  {
    key: 'resulted_in',
    label: 'Generated Outcomes',
    icon: <ArrowRightCircle className="w-3.5 h-3.5" />,
    color: 'text-emerald-600 dark:text-emerald-400',
  },
]

function getRelationshipBadge(type: ReviewConnectionRelationshipType) {
  switch (type) {
    case 'subject':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
    case 'informed_by':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
    case 'stakeholder':
      return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
    case 'resulted_in':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
    default:
      return 'bg-secondary text-foreground border-border'
  }
}

function formatRelationshipLabel(type: ReviewConnectionRelationshipType) {
  switch (type) {
    case 'subject':
      return 'Subject'
    case 'informed_by':
      return 'Informed By'
    case 'stakeholder':
      return 'Stakeholder'
    case 'resulted_in':
      return 'Resulted In'
    default:
      return type
  }
}

function getEntityIcon(conn: ReviewConnectionItem) {
  if (conn.project_id) return <Briefcase className="w-4 h-4 text-violet-500" />
  if (conn.opportunity_id) return <Target className="w-4 h-4 text-emerald-500" />
  if (conn.research_record_id) return <BookOpen className="w-4 h-4 text-blue-500" />
  if (conn.company_id) return <Building2 className="w-4 h-4 text-indigo-500" />
  if (conn.contact_id) return <User className="w-4 h-4 text-sky-500" />
  return <Link2 className="w-4 h-4" />
}

function getEntityDetails(conn: ReviewConnectionItem) {
  if (conn.project_id && conn.project) {
    return {
      title: conn.project.title,
      subtitle: `${conn.project.status} • ${conn.project.priority} priority`,
      categoryLabel: 'Project',
      href: '/vault/projects',
    }
  }
  if (conn.opportunity_id && conn.opportunity) {
    const val = conn.opportunity.value_estimate
      ? `$${conn.opportunity.value_estimate.toLocaleString()}`
      : null
    return {
      title: conn.opportunity.title,
      subtitle: [conn.opportunity.pipeline_stage, val].filter(Boolean).join(' • '),
      categoryLabel: 'Opportunity',
      href: '/vault/opportunities',
    }
  }
  if (conn.research_record_id && conn.research) {
    return {
      title: conn.research.title,
      subtitle: conn.research.research_question || conn.research.status,
      categoryLabel: 'Research',
      href: `/vault/research/${conn.research_record_id}`,
    }
  }
  if (conn.company_id && conn.company) {
    return {
      title: conn.company.name,
      subtitle: [conn.company.industry, conn.company.domain].filter(Boolean).join(' • '),
      categoryLabel: 'Company',
      href: `/vault/companies/${conn.company_id}`,
    }
  }
  if (conn.contact_id && conn.contact) {
    return {
      title: conn.contact.full_name,
      subtitle: conn.contact.role_title || '',
      categoryLabel: 'Contact',
      href: `/vault/contacts/${conn.contact_id}`,
    }
  }
  return {
    title: 'Unknown Entity',
    subtitle: '',
    categoryLabel: 'Unknown',
    href: '#',
  }
}

export function ReviewConnectionsSection({
  reviewId,
  workspaceId,
  connections,
}: ReviewConnectionsSectionProps) {
  const [isPending, startTransition] = useTransition()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingConnection, setEditingConnection] = useState<ReviewConnectionItem | null>(null)
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const handleDisconnect = (connectionId: string) => {
    setActionError(null)
    setDisconnectingId(connectionId)
    startTransition(async () => {
      try {
        await deleteReviewConnection(connectionId, workspaceId)
        setDisconnectingId(null)
      } catch (err: any) {
        setActionError(err.message || 'Failed to disconnect entity')
        setDisconnectingId(null)
      }
    })
  }

  // Group connections by relationship_type (semantic grouping)
  const groupedConnections = SEMANTIC_GROUPS
    .map((group) => ({
      ...group,
      items: connections.filter((c) => c.relationship_type === group.key),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Link2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-lg font-medium text-foreground">
                Review Context
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border">
                {connections.length}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Projects, research, people, and organizations connected to this review
            </p>
          </div>
        </div>

        {/* Header Action */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Context</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {actionError && (
        <div className="flex items-start gap-2.5 p-3 text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 font-mono">{actionError}</div>
        </div>
      )}

      {/* Connections by Semantic Group or Empty State */}
      {connections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-lg border border-dashed border-border bg-secondary/20">
          <div className="p-3 rounded-full bg-secondary text-muted-foreground mb-3">
            <Link2 className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-medium text-foreground mb-1">
            No review context yet
          </h4>
          <p className="text-xs text-muted-foreground max-w-sm mb-4">
            Connect projects, research records, contacts, companies, or opportunities to provide context for this review.
          </p>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add First Context</span>
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedConnections.map((group) => (
            <div key={group.key} className="space-y-2.5">
              {/* Group Header */}
              <div className="flex items-center gap-2 px-1">
                <span className={group.color}>{group.icon}</span>
                <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </h4>
                <span className="text-[10px] font-mono text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded-md border border-border">
                  {group.items.length}
                </span>
              </div>

              {/* Group Items */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {group.items.map((conn) => {
                  const details = getEntityDetails(conn)
                  const isDisconnecting = disconnectingId === conn.id

                  return (
                    <div
                      key={conn.id}
                      className="flex flex-col justify-between p-4 rounded-xl border border-border bg-card hover:border-border/80 transition-all shadow-xs space-y-3"
                    >
                      {/* Entity Info */}
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="p-1.5 rounded-md bg-secondary/80 shrink-0">
                              {getEntityIcon(conn)}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={details.href}
                                className="group inline-flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors truncate"
                              >
                                <span className="truncate">{details.title}</span>
                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                              </Link>
                              {details.subtitle && (
                                <div className="text-[11px] text-muted-foreground truncate">
                                  {details.subtitle}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Relationship Badge */}
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono border shrink-0 ${getRelationshipBadge(
                              conn.relationship_type
                            )}`}
                          >
                            {formatRelationshipLabel(conn.relationship_type)}
                          </span>
                        </div>

                        {/* Notes snippet */}
                        {conn.notes && (
                          <div className="text-xs text-foreground/80 bg-secondary/30 p-2.5 rounded-lg border border-border/50 whitespace-pre-wrap leading-relaxed">
                            {conn.notes}
                          </div>
                        )}
                      </div>

                      {/* Footer / Meta & Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                        <span className="font-mono text-[10px]">
                          {details.categoryLabel}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingConnection(conn)}
                            className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                            title="Edit relationship or notes"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDisconnect(conn.id)}
                            disabled={isDisconnecting || isPending}
                            className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                            title="Disconnect entity"
                          >
                            {isDisconnecting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-destructive" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Connection Modal */}
      <ReviewConnectionModal
        reviewId={reviewId}
        workspaceId={workspaceId}
        existingConnections={connections}
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />

      {/* Edit Connection Modal */}
      {editingConnection && (
        <ReviewConnectionModal
          reviewId={reviewId}
          workspaceId={workspaceId}
          connection={editingConnection}
          existingConnections={connections}
          isOpen={!!editingConnection}
          onClose={() => setEditingConnection(null)}
        />
      )}
    </div>
  )
}
