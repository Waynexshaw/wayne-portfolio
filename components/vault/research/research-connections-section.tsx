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
  Edit3,
  Trash2,
  Loader2,
  ExternalLink,
  Filter,
  FileText,
  AlertCircle,
} from 'lucide-react'
import {
  deleteResearchConnection,
  ResearchConnectionItem,
  ResearchConnectionType,
} from '@/lib/vault/actions'
import { ConnectionModal } from './connection-modal'

interface ResearchConnectionsSectionProps {
  researchRecordId: string
  workspaceId: string
  connections: ResearchConnectionItem[]
}

function getRelationshipBadge(type: ResearchConnectionType) {
  return 'bg-muted/60 text-muted-foreground border-border/60 font-mono text-[10px] uppercase tracking-wider'
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

export function ResearchConnectionsSection({
  researchRecordId,
  workspaceId,
  connections,
}: ResearchConnectionsSectionProps) {
  const [isPending, startTransition] = useTransition()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingConnection, setEditingConnection] = useState<ResearchConnectionItem | null>(null)
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'companies' | 'contacts' | 'opportunities' | 'projects'>('all')

  const companiesCount = connections.filter((c) => !!c.company_id).length
  const contactsCount = connections.filter((c) => !!c.contact_id).length
  const opportunitiesCount = connections.filter((c) => !!c.opportunity_id).length
  const projectsCount = connections.filter((c) => !!c.project_id).length

  const filteredConnections = connections.filter((c) => {
    if (filterType === 'companies') return !!c.company_id
    if (filterType === 'contacts') return !!c.contact_id
    if (filterType === 'opportunities') return !!c.opportunity_id
    if (filterType === 'projects') return !!c.project_id
    return true
  })

  const handleDisconnect = (connectionId: string) => {
    setActionError(null)
    setDisconnectingId(connectionId)
    startTransition(async () => {
      try {
        await deleteResearchConnection(connectionId, workspaceId)
        setDisconnectingId(null)
      } catch (err: any) {
        setActionError(err.message || 'Failed to disconnect entity')
        setDisconnectingId(null)
      }
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-base font-medium text-foreground">
              Connected Operational Entities
            </h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/60">
              {connections.length}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Vault projects, companies, contacts, and opportunities linked to this research.
          </p>
        </div>

        {/* Header Action */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Connect Entity</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {actionError && (
        <div className="flex items-start gap-2.5 p-3 text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/20 font-mono">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">{actionError}</div>
        </div>
      )}

      {/* Filter Tabs if multiple entity types exist */}
      {connections.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors font-medium focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none ${
              filterType === 'all'
                ? 'bg-secondary text-foreground border border-border/80'
                : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
            }`}
          >
            All ({connections.length})
          </button>

          {projectsCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterType('projects')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors font-medium focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none ${
                filterType === 'projects'
                  ? 'bg-secondary text-foreground border border-border/80'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
              }`}
            >
              <Briefcase className="w-3 h-3 text-muted-foreground" />
              <span>Projects ({projectsCount})</span>
            </button>
          )}

          {companiesCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterType('companies')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors font-medium focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none ${
                filterType === 'companies'
                  ? 'bg-secondary text-foreground border border-border/80'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
              }`}
            >
              <Building2 className="w-3 h-3 text-muted-foreground" />
              <span>Companies ({companiesCount})</span>
            </button>
          )}

          {contactsCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterType('contacts')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors font-medium focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none ${
                filterType === 'contacts'
                  ? 'bg-secondary text-foreground border border-border/80'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
              }`}
            >
              <User className="w-3 h-3 text-muted-foreground" />
              <span>Contacts ({contactsCount})</span>
            </button>
          )}

          {opportunitiesCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterType('opportunities')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors font-medium focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none ${
                filterType === 'opportunities'
                  ? 'bg-secondary text-foreground border border-border/80'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
              }`}
            >
              <Target className="w-3 h-3 text-muted-foreground" />
              <span>Opportunities ({opportunitiesCount})</span>
            </button>
          )}
        </div>
      )}

      {/* Connections List or Empty State */}
      {filteredConnections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center rounded-lg border border-dashed border-border/80 bg-muted/20">
          <div className="p-2.5 rounded-full bg-muted/50 text-muted-foreground mb-2.5">
            <Link2 className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-medium text-foreground mb-1">
            {connections.length === 0
              ? 'No entities connected yet'
              : 'No entities match this filter'}
          </h4>
          <p className="text-xs text-muted-foreground max-w-sm mb-3">
            {connections.length === 0
              ? 'Connect contacts, companies, opportunities, or projects to anchor this research inquiry to operational records.'
              : 'Try selecting a different filter above.'}
          </p>
          {connections.length === 0 && (
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect First Entity</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredConnections.map((conn) => {
            let entityTypeIcon = <Building2 className="w-4 h-4 text-muted-foreground" />
            let entityCategoryLabel = 'Company'
            let entityTitle = 'Unknown Entity'
            let entitySubtitle = ''
            let entityHref = '#'

            if (conn.project_id && conn.project) {
              entityTypeIcon = <Briefcase className="w-4 h-4 text-muted-foreground" />
              entityCategoryLabel = 'Project'
              entityTitle = conn.project.title
              entitySubtitle = `${conn.project.status} • ${conn.project.priority} priority`
              entityHref = `/vault/projects/${conn.project_id}`
            } else if (conn.company_id && conn.company) {
              entityTypeIcon = <Building2 className="w-4 h-4 text-muted-foreground" />
              entityCategoryLabel = 'Company'
              entityTitle = conn.company.name
              entitySubtitle = [conn.company.industry, conn.company.domain].filter(Boolean).join(' • ')
              entityHref = `/vault/companies/${conn.company_id}`
            } else if (conn.contact_id && conn.contact) {
              entityTypeIcon = <User className="w-4 h-4 text-muted-foreground" />
              entityCategoryLabel = 'Contact'
              entityTitle = conn.contact.full_name
              entitySubtitle = conn.contact.role_title || ''
              entityHref = `/vault/contacts/${conn.contact_id}`
            } else if (conn.opportunity_id && conn.opportunity) {
              entityTypeIcon = <Target className="w-4 h-4 text-muted-foreground" />
              entityCategoryLabel = 'Opportunity'
              entityTitle = conn.opportunity.title
              const val = conn.opportunity.value_estimate
                ? `$${conn.opportunity.value_estimate.toLocaleString()}`
                : null
              entitySubtitle = [conn.opportunity.pipeline_stage, val].filter(Boolean).join(' • ')
              entityHref = `/vault/opportunities`
            }

            const isDisconnecting = disconnectingId === conn.id

            return (
              <div
                key={conn.id}
                className="group relative flex flex-col justify-between rounded-lg border border-border/70 bg-card/60 p-4 space-y-2.5 hover:border-primary/30 transition-colors"
              >
                <div className="space-y-2">
                  {/* Card Header: Category + Neutral Relationship Badge + Disconnect */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 rounded-md bg-muted/60 text-muted-foreground shrink-0">
                        {entityTypeIcon}
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80">
                          {entityCategoryLabel}
                        </span>
                        <span
                          className={`inline-block px-1.5 py-0.2 rounded border ${getRelationshipBadge(
                            conn.relationship_type
                          )}`}
                        >
                          {formatRelationshipLabel(conn.relationship_type)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingConnection(conn)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                        title="Edit Relationship"
                        aria-label="Edit relationship"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={isDisconnecting || isPending}
                        onClick={() => handleDisconnect(conn.id)}
                        className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                        title="Disconnect entity"
                        aria-label="Disconnect entity"
                      >
                        {isDisconnecting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-destructive" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Entity Title Link */}
                  <div>
                    {entityHref !== '#' ? (
                      <Link
                        href={entityHref}
                        className="font-serif text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1.5 group/link truncate"
                      >
                        <span className="truncate">{entityTitle}</span>
                        <ExternalLink className="w-3 h-3 text-muted-foreground group-hover/link:text-primary shrink-0 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                      </Link>
                    ) : (
                      <span className="font-serif text-sm font-medium text-foreground truncate block">
                        {entityTitle}
                      </span>
                    )}
                    {entitySubtitle && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {entitySubtitle}
                      </p>
                    )}
                  </div>

                  {/* Notes */}
                  {conn.notes && (
                    <div className="pt-1.5 border-t border-border/40 text-xs text-muted-foreground flex items-start gap-1.5">
                      <FileText className="w-3 h-3 shrink-0 mt-0.5 text-muted-foreground/60" />
                      <p className="line-clamp-2 leading-relaxed">{conn.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Connect Entity Modal */}
      <ConnectionModal
        researchRecordId={researchRecordId}
        workspaceId={workspaceId}
        existingConnections={connections}
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />

      {/* Edit Connection Modal */}
      {editingConnection && (
        <ConnectionModal
          researchRecordId={researchRecordId}
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
