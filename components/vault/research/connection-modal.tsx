'use client'

import { useState, useTransition, useEffect } from 'react'
import {
  X,
  Loader2,
  Building2,
  User,
  Target,
  Briefcase,
  Link2,
  Lock,
  AlertCircle,
} from 'lucide-react'
import {
  createResearchConnection,
  updateResearchConnection,
  getWorkspaceConnectableEntities,
  ResearchConnectionType,
  ResearchConnectionItem,
} from '@/lib/vault/actions'

interface ConnectionModalProps {
  researchRecordId: string
  workspaceId: string
  connection?: ResearchConnectionItem | null
  existingConnections: ResearchConnectionItem[]
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

type EntityCategory = 'company' | 'contact' | 'opportunity' | 'project'

export const RELATIONSHIP_TYPES: { value: ResearchConnectionType; label: string; description: string }[] = [
  {
    value: 'subject',
    label: 'Subject',
    description: 'Core subject or focal entity of this research',
  },
  {
    value: 'stakeholder',
    label: 'Stakeholder',
    description: 'Interested party, key influencer, or decision maker',
  },
  {
    value: 'partner',
    label: 'Partner',
    description: 'Strategic, ecosystem, or collaboration partner',
  },
  {
    value: 'competitor',
    label: 'Competitor',
    description: 'Competitive benchmark, alternative, or rival entity',
  },
  {
    value: 'due_diligence',
    label: 'Due Diligence',
    description: 'Target of vetting, evaluation, or risk assessment',
  },
  {
    value: 'supporting',
    label: 'Supporting',
    description: 'Secondary reference, context, or technical dependency',
  },
]

export function ConnectionModal({
  researchRecordId,
  workspaceId,
  connection,
  existingConnections,
  isOpen,
  onClose,
  onSuccess,
}: ConnectionModalProps) {
  const [isPending, startTransition] = useTransition()
  const [isLoadingEntities, setIsLoadingEntities] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = !!connection

  const [category, setCategory] = useState<EntityCategory>('project')
  const [selectedEntityId, setSelectedEntityId] = useState<string>('')
  const [relationshipType, setRelationshipType] = useState<ResearchConnectionType>('subject')
  const [notes, setNotes] = useState('')

  const [availableEntities, setAvailableEntities] = useState<{
    contacts: Array<{ id: string; fullName: string; roleTitle: string | null; avatarUrl: string | null }>
    companies: Array<{ id: string; name: string; industry: string | null; domain: string | null; tier: string }>
    opportunities: Array<{ id: string; title: string; type: string; pipelineStage: string; valueEstimate: number | null; currency: string }>
    projects: Array<{ id: string; title: string; status: string; priority: string }>
  }>({
    contacts: [],
    companies: [],
    opportunities: [],
    projects: [],
  })

  // Load available entities on modal open
  useEffect(() => {
    if (isOpen && !isEdit) {
      setIsLoadingEntities(true)
      setError(null)
      getWorkspaceConnectableEntities(workspaceId)
        .then((data) => {
          setAvailableEntities(data)
          setIsLoadingEntities(false)
        })
        .catch((err) => {
          setError(err.message || 'Failed to load workspace entities')
          setIsLoadingEntities(false)
        })
    }
  }, [isOpen, workspaceId, isEdit])

  // Sync fields when opening in edit mode
  useEffect(() => {
    if (connection) {
      setRelationshipType(connection.relationship_type)
      setNotes(connection.notes || '')
      if (connection.project_id) setCategory('project')
      else if (connection.company_id) setCategory('company')
      else if (connection.contact_id) setCategory('contact')
      else if (connection.opportunity_id) setCategory('opportunity')
    } else {
      setSelectedEntityId('')
      setRelationshipType('subject')
      setNotes('')
    }
    setError(null)
  }, [connection, isOpen])

  if (!isOpen) return null

  // Filter out already connected entities for creation mode
  const connectedContactIds = new Set(existingConnections.map((c) => c.contact_id).filter(Boolean))
  const connectedCompanyIds = new Set(existingConnections.map((c) => c.company_id).filter(Boolean))
  const connectedOpportunityIds = new Set(existingConnections.map((c) => c.opportunity_id).filter(Boolean))
  const connectedProjectIds = new Set(existingConnections.map((c) => c.project_id).filter(Boolean))

  const filteredProjects = availableEntities.projects.filter((p) => !connectedProjectIds.has(p.id))
  const filteredCompanies = availableEntities.companies.filter((c) => !connectedCompanyIds.has(c.id))
  const filteredContacts = availableEntities.contacts.filter((c) => !connectedContactIds.has(c.id))
  const filteredOpportunities = availableEntities.opportunities.filter((o) => !connectedOpportunityIds.has(o.id))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!isEdit && !selectedEntityId) {
      setError('Please select an entity to connect')
      return
    }

    startTransition(async () => {
      try {
        if (isEdit && connection) {
          await updateResearchConnection(connection.id, {
            workspaceId,
            relationshipType,
            notes: notes.trim() || null,
          })
        } else {
          await createResearchConnection({
            workspaceId,
            researchRecordId,
            contactId: category === 'contact' ? selectedEntityId : null,
            companyId: category === 'company' ? selectedEntityId : null,
            opportunityId: category === 'opportunity' ? selectedEntityId : null,
            projectId: category === 'project' ? selectedEntityId : null,
            relationshipType,
            notes: notes.trim() || null,
          })
        }
        onSuccess?.()
        onClose()
      } catch (err: any) {
        setError(err.message || 'Failed to save connection')
      }
    })
  }

  // Display name of existing target entity in edit mode
  let editEntityDisplay = ''
  if (isEdit && connection) {
    if (connection.project) editEntityDisplay = `Project: ${connection.project.title}`
    else if (connection.company) editEntityDisplay = `Company: ${connection.company.name}`
    else if (connection.contact) editEntityDisplay = `Contact: ${connection.contact.full_name}`
    else if (connection.opportunity) editEntityDisplay = `Opportunity: ${connection.opportunity.title}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-0">
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-muted/60 text-foreground">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-medium text-foreground">
                {isEdit ? 'Edit Connection' : 'Connect Entity'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? 'Update relationship classification or notes for this entity'
                  : 'Link a project, company, contact, or opportunity to this research'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 p-3 text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/20 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isEdit ? (
            /* Target Entity Read-only (Immutability Enforced) */
            <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 border border-border/70">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium">Connected Entity</span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                  <Lock className="w-3 h-3" /> Target Immutable
                </span>
              </div>
              <div className="text-sm font-medium text-foreground font-serif">
                {editEntityDisplay}
              </div>
            </div>
          ) : (
            /* Category Picker & Entity Selector */
            <div className="space-y-4">
              {/* Category Tabs */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Entity Category <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCategory('project')
                      setSelectedEntityId('')
                    }}
                    className={`flex flex-col items-center justify-center gap-1 p-2.5 rounded-lg border text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none ${
                      category === 'project'
                        ? 'border-primary/50 bg-primary/10 text-primary shadow-sm'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                    }`}
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>Project</span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      ({filteredProjects.length})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCategory('company')
                      setSelectedEntityId('')
                    }}
                    className={`flex flex-col items-center justify-center gap-1 p-2.5 rounded-lg border text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none ${
                      category === 'company'
                        ? 'border-primary/50 bg-primary/10 text-primary shadow-sm'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Company</span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      ({filteredCompanies.length})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCategory('contact')
                      setSelectedEntityId('')
                    }}
                    className={`flex flex-col items-center justify-center gap-1 p-2.5 rounded-lg border text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none ${
                      category === 'contact'
                        ? 'border-primary/50 bg-primary/10 text-primary shadow-sm'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>Contact</span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      ({filteredContacts.length})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCategory('opportunity')
                      setSelectedEntityId('')
                    }}
                    className={`flex flex-col items-center justify-center gap-1 p-2.5 rounded-lg border text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none ${
                      category === 'opportunity'
                        ? 'border-primary/50 bg-primary/10 text-primary shadow-sm'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                    }`}
                  >
                    <Target className="w-4 h-4" />
                    <span>Opportunity</span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      ({filteredOpportunities.length})
                    </span>
                  </button>
                </div>
              </div>

              {/* Entity Selector Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Select {category.charAt(0).toUpperCase() + category.slice(1)}{' '}
                  <span className="text-destructive">*</span>
                </label>
                {isLoadingEntities ? (
                  <div className="flex items-center justify-center p-4 rounded-lg border border-border bg-muted/20 text-xs text-muted-foreground gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>Loading workspace entities...</span>
                  </div>
                ) : (
                  <select
                    value={selectedEntityId}
                    onChange={(e) => setSelectedEntityId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card text-foreground focus:outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
                  >
                    <option value="">-- Choose a {category} --</option>
                    {category === 'project' &&
                      filteredProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title} [{p.status}, {p.priority}]
                        </option>
                      ))}
                    {category === 'company' &&
                      filteredCompanies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.industry ? `(${c.industry})` : ''} {c.domain ? `— ${c.domain}` : ''}
                        </option>
                      ))}
                    {category === 'contact' &&
                      filteredContacts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.fullName} {c.roleTitle ? `— ${c.roleTitle}` : ''}
                        </option>
                      ))}
                    {category === 'opportunity' &&
                      filteredOpportunities.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.title} [{o.pipelineStage}] {o.valueEstimate ? `— $${o.valueEstimate.toLocaleString()}` : ''}
                        </option>
                      ))}
                  </select>
                )}

                {/* Empty category state notice */}
                {!isLoadingEntities && (
                  <>
                    {category === 'project' && filteredProjects.length === 0 && (
                      <p className="text-[11px] text-muted-foreground font-mono">
                        No unconnected projects available in this workspace.
                      </p>
                    )}
                    {category === 'company' && filteredCompanies.length === 0 && (
                      <p className="text-[11px] text-muted-foreground font-mono">
                        No unconnected companies available in this workspace.
                      </p>
                    )}
                    {category === 'contact' && filteredContacts.length === 0 && (
                      <p className="text-[11px] text-muted-foreground font-mono">
                        No unconnected contacts available in this workspace.
                      </p>
                    )}
                    {category === 'opportunity' && filteredOpportunities.length === 0 && (
                      <p className="text-[11px] text-muted-foreground font-mono">
                        No unconnected opportunities available in this workspace.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Relationship Type Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Relationship Type <span className="text-destructive">*</span>
            </label>
            <select
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value as ResearchConnectionType)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card text-foreground focus:outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
            >
              {RELATIONSHIP_TYPES.map((rt) => (
                <option key={rt.value} value={rt.value}>
                  {rt.label} — {rt.description}
                </option>
              ))}
            </select>
          </div>

          {/* Notes (Optional Context) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Connection Notes <span className="text-[10px] text-muted-foreground/80">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why is this entity connected? What is their relevance to this inquiry?"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card text-foreground focus:outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/40 placeholder:text-muted-foreground/60 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-border hover:bg-muted/40 text-foreground transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || (!isEdit && !selectedEntityId)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Connect Entity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
