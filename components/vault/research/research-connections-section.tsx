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
                Connected Entities
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border">
                {connections.length}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Vault contacts, companies, opportunities, and projects connected to this inquiry
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
            <span>Connect Entity</span>
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

      {/* Filter Tabs if multiple entity types exist */}
      {connections.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors font-medium ${
              filterType === 'all'
                ? 'bg-secondary text-foreground font-semibold border border-border shadow-xs'
                : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
            }`}
          >
            All ({connections.length})
          </button>

          {companiesCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterType('companies')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors font-medium ${
                filterType === 'companies'
                  ? 'bg-secondary text-foreground font-semibold border border-border shadow-xs'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
              }`}
            >
              <Building2 className="w-3 h-3 text-indigo-500" />
              <span>Companies ({companiesCount})</span>
            </button>
          )}

          {contactsCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterType('contacts')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors font-medium ${
                filterType === 'contacts'
                  ? 'bg-secondary text-foreground font-semibold border border-border shadow-xs'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
              }`}
            >
              <User className="w-3 h-3 text-sky-500" />
              <span>Contacts ({contactsCount})</span>
            </button>
          )}

          {opportunitiesCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterType('opportunities')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors font-medium ${
                filterType === 'opportunities'
                  ? 'bg-secondary text-foreground font-semibold border border-border shadow-xs'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
              }`}
            >
              <Target className="w-3 h-3 text-emerald-500" />
              <span>Opportunities ({opportunitiesCount})</span>
            </button>
          )}

          {projectsCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterType('projects')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors font-medium ${
                filterType === 'projects'
                  ? 'bg-secondary text-foreground font-semibold border border-border shadow-xs'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
              }`}
            >
              <Briefcase className="w-3 h-3 text-violet-500" />
              <span>Projects ({projectsCount})</span>
            </button>
          )}
        </div>
      )}

      {/* Connections List or Empty State */}
      {filteredConnections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-lg border border-dashed border-border bg-secondary/20">
          <div className="p-3 rounded-full bg-secondary text-muted-foreground mb-3">
            <Link2 className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-medium text-foreground mb-1">
            {connections.length === 0
              ? 'No entities connected yet'
              : 'No entities match this filter'}
          </h4>
          <p className="text-xs text-muted-foreground max-w-sm mb-4">
            {connections.length === 0
              ? 'Connect contacts, companies, opportunities, or projects to anchor this research inquiry to operational records.'
              : 'Try selecting a different filter above.'}
          </p>
          {connections.length === 0 && (
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect First Entity</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredConnections.map((conn) => {
            let entityTypeIcon = <Building2 className="w-4 h-4 text-indigo-500" />
            let entityCategoryLabel = 'Company'
            let entityTitle = 'Unknown Entity'
            let entitySubtitle = ''
            let entityHref = '#'

            if (conn.company_id && conn.company) {
              entityTypeIcon = <Building2 className="w-4 h-4 text-indigo-500" />
              entityCategoryLabel = 'Company'
              entityTitle = conn.company.name
              entitySubtitle = [conn.company.industry, conn.company.domain].filter(Boolean).join(' • ')
              entityHref = `/vault/companies/${conn.company_id}`
            } else if (conn.contact_id && conn.contact) {
              entityTypeIcon = <User className="w-4 h-4 text-sky-500" />
              entityCategoryLabel = 'Contact'
              entityTitle = conn.contact.full_name
              entitySubtitle = conn.contact.role_title || ''
              entityHref = `/vault/contacts/${conn.contact_id}`
            } else if (conn.opportunity_id && conn.opportunity) {
              entityTypeIcon = <Target className="w-4 h-4 text-emerald-500" />
              entityCategoryLabel = 'Opportunity'
              entityTitle = conn.opportunity.title
              const val = conn.opportunity.value_estimate
                ? `$${conn.opportunity.value_estimate.toLocaleString()}`
                : null
              entitySubtitle = [conn.opportunity.pipeline_stage, val].filter(Boolean).join(' • ')
              entityHref = `/vault/opportunities`
            } else if (conn.project_id && conn.project) {
              entityTypeIcon = <Briefcase className="w-4 h-4 text-violet-500" />
              entityCategoryLabel = 'Project'
              entityTitle = conn.project.title
              entitySubtitle = `${conn.project.status} • ${conn.project.priority} priority`
              entityHref = `/vault/projects`
            }

            const isDisconnecting = disconnectingId === conn.id

            return (
              <div
                key={conn.id}
                className="flex flex-col justify-between p-4 rounded-xl border border-border bg-card hover:border-border/80 transition-all shadow-xs space-y-3"
              >
                {/* Entity Info & Category */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 rounded-md bg-secondary/80 shrink-0">
                        {entityTypeIcon}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={entityHref}
                          className="group inline-flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors truncate"
                        >
                          <span className="truncate">{entityTitle}</span>
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </Link>
                        {entitySubtitle && (
                          <div className="text-[11px] text-muted-foreground truncate">
                            {entitySubtitle}
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

                  {/* Notes snippet if present */}
                  {conn.notes && (
                    <div className="text-xs text-foreground/80 bg-secondary/30 p-2.5 rounded-lg border border-border/50 whitespace-pre-wrap leading-relaxed">
                      {conn.notes}
                    </div>
                  )}
                </div>

                {/* Footer / Meta & Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                  <span className="font-mono text-[10px]">
                    {entityCategoryLabel}
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
      )}

      {/* Create Connection Modal */}
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
