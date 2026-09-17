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
  BookOpen,
} from 'lucide-react'
import {
  createReviewConnection,
  updateReviewConnection,
  getReviewConnectableEntities,
  ReviewConnectionRelationshipType,
  ReviewConnectionItem,
} from '@/lib/vault/actions'

const REVIEW_CONNECTION_COMPATIBILITY: Record<string, ReviewConnectionRelationshipType[]> = {
  project: ['subject', 'resulted_in'],
  opportunity: ['subject', 'resulted_in'],
  research: ['informed_by', 'resulted_in'],
  company: ['subject', 'stakeholder'],
  contact: ['subject', 'stakeholder'],
}

interface ReviewConnectionModalProps {
  reviewId: string
  workspaceId: string
  connection?: ReviewConnectionItem | null
  existingConnections: ReviewConnectionItem[]
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

type EntityCategory = 'project' | 'opportunity' | 'research' | 'company' | 'contact'

const RELATIONSHIP_TYPE_LABELS: Record<ReviewConnectionRelationshipType, { label: string; description: string }> = {
  subject: {
    label: 'Subject',
    description: 'Primary entity being evaluated or reviewed',
  },
  informed_by: {
    label: 'Informed By',
    description: 'Research that provided context or evidence for this review',
  },
  stakeholder: {
    label: 'Stakeholder',
    description: 'Key person or organization involved in the reviewed work',
  },
  resulted_in: {
    label: 'Resulted In',
    description: 'Outcome, follow-up, or derivative created from this review',
  },
}

export function ReviewConnectionModal({
  reviewId,
  workspaceId,
  connection,
  existingConnections,
  isOpen,
  onClose,
  onSuccess,
}: ReviewConnectionModalProps) {
  const [isPending, startTransition] = useTransition()
  const [isLoadingEntities, setIsLoadingEntities] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = !!connection

  const [category, setCategory] = useState<EntityCategory>('project')
  const [selectedEntityId, setSelectedEntityId] = useState<string>('')
  const [relationshipType, setRelationshipType] = useState<ReviewConnectionRelationshipType>('subject')
  const [notes, setNotes] = useState('')

  const [availableEntities, setAvailableEntities] = useState<{
    contacts: Array<{ id: string; fullName: string; roleTitle: string | null; avatarUrl: string | null }>
    companies: Array<{ id: string; name: string; industry: string | null; domain: string | null; tier: string }>
    opportunities: Array<{ id: string; title: string; type: string; pipelineStage: string; valueEstimate: number | null; currency: string }>
    projects: Array<{ id: string; title: string; status: string; priority: string }>
    researchRecords: Array<{ id: string; title: string; researchQuestion: string | null; objective: string | null; status: string }>
  }>({
    contacts: [],
    companies: [],
    opportunities: [],
    projects: [],
    researchRecords: [],
  })

  // Load available entities on modal open
  useEffect(() => {
    if (isOpen && !isEdit) {
      setIsLoadingEntities(true)
      setError(null)
      getReviewConnectableEntities(workspaceId)
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
      else if (connection.opportunity_id) setCategory('opportunity')
      else if (connection.research_record_id) setCategory('research')
      else if (connection.company_id) setCategory('company')
      else if (connection.contact_id) setCategory('contact')
    } else {
      setSelectedEntityId('')
      setRelationshipType('subject')
      setNotes('')
      setCategory('project')
    }
    setError(null)
  }, [connection, isOpen])

  // When category changes in create mode, reset entity and set first compatible relationship type
  useEffect(() => {
    if (!isEdit) {
      setSelectedEntityId('')
      const compatibleTypes = REVIEW_CONNECTION_COMPATIBILITY[category]
      if (compatibleTypes && compatibleTypes.length > 0) {
        setRelationshipType(compatibleTypes[0])
      }
    }
  }, [category, isEdit])

  if (!isOpen) return null

  // Filter out already connected entities for creation mode
  const connectedProjectIds = new Set(existingConnections.map((c) => c.project_id).filter(Boolean))
  const connectedOpportunityIds = new Set(existingConnections.map((c) => c.opportunity_id).filter(Boolean))
  const connectedResearchIds = new Set(existingConnections.map((c) => c.research_record_id).filter(Boolean))
  const connectedCompanyIds = new Set(existingConnections.map((c) => c.company_id).filter(Boolean))
  const connectedContactIds = new Set(existingConnections.map((c) => c.contact_id).filter(Boolean))

  const filteredProjects = availableEntities.projects.filter((p) => !connectedProjectIds.has(p.id))
  const filteredOpportunities = availableEntities.opportunities.filter((o) => !connectedOpportunityIds.has(o.id))
  const filteredResearch = availableEntities.researchRecords.filter((r) => !connectedResearchIds.has(r.id))
  const filteredCompanies = availableEntities.companies.filter((c) => !connectedCompanyIds.has(c.id))
  const filteredContacts = availableEntities.contacts.filter((c) => !connectedContactIds.has(c.id))

  // Get compatible relationship types for current category
  const compatibleRelTypes = REVIEW_CONNECTION_COMPATIBILITY[category] || []

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
          await updateReviewConnection(connection.id, {
            workspaceId,
            relationshipType,
            notes: notes.trim() || null,
          })
        } else {
          await createReviewConnection({
            workspaceId,
            reviewId,
            projectId: category === 'project' ? selectedEntityId : null,
            opportunityId: category === 'opportunity' ? selectedEntityId : null,
            researchRecordId: category === 'research' ? selectedEntityId : null,
            companyId: category === 'company' ? selectedEntityId : null,
            contactId: category === 'contact' ? selectedEntityId : null,
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
  let editCategoryLabel = ''
  if (isEdit && connection) {
    if (connection.project) {
      editEntityDisplay = connection.project.title
      editCategoryLabel = 'Project'
    } else if (connection.opportunity) {
      editEntityDisplay = connection.opportunity.title
      editCategoryLabel = 'Opportunity'
    } else if (connection.research) {
      editEntityDisplay = connection.research.title
      editCategoryLabel = 'Research'
    } else if (connection.company) {
      editEntityDisplay = connection.company.name
      editCategoryLabel = 'Company'
    } else if (connection.contact) {
      editEntityDisplay = connection.contact.full_name
      editCategoryLabel = 'Contact'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-0">
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center text-foreground">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-base font-medium text-foreground">
                {isEdit ? 'Edit Connection' : 'Add Connection'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? 'Update relationship role or context notes for this connection'
                  : 'Connect an entity to this review with an explicit semantic role'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-start gap-2.5 p-3 text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/20 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {isEdit ? (
            /* Target Entity Read-only (Immutability Enforced) */
            <div className="space-y-1.5 p-3 rounded-lg bg-muted/40 border border-border">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{editCategoryLabel}</span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                  <Lock className="w-3 h-3" /> Target Immutable
                </span>
              </div>
              <div className="text-sm font-medium text-foreground font-serif pt-1">
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
                <div className="grid grid-cols-5 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCategory('project')}
                    className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg border text-xs font-medium transition-all ${
                      category === 'project'
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Project</span>
                    <span className="text-[10px] font-mono opacity-80">
                      ({filteredProjects.length})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategory('opportunity')}
                    className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg border text-xs font-medium transition-all ${
                      category === 'opportunity'
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>Opp.</span>
                    <span className="text-[10px] font-mono opacity-80">
                      ({filteredOpportunities.length})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategory('research')}
                    className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg border text-xs font-medium transition-all ${
                      category === 'research'
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Research</span>
                    <span className="text-[10px] font-mono opacity-80">
                      ({filteredResearch.length})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategory('company')}
                    className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg border text-xs font-medium transition-all ${
                      category === 'company'
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Company</span>
                    <span className="text-[10px] font-mono opacity-80">
                      ({filteredCompanies.length})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategory('contact')}
                    className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg border text-xs font-medium transition-all ${
                      category === 'contact'
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Contact</span>
                    <span className="text-[10px] font-mono opacity-80">
                      ({filteredContacts.length})
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
                  <div className="flex items-center justify-center p-4 rounded-lg border border-border bg-muted/40 text-xs text-muted-foreground gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    <span>Loading workspace entities...</span>
                  </div>
                ) : (
                  <select
                    value={selectedEntityId}
                    onChange={(e) => setSelectedEntityId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="">-- Choose a {category} --</option>
                    {category === 'project' &&
                      filteredProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title} [{p.status}, {p.priority}]
                        </option>
                      ))}
                    {category === 'opportunity' &&
                      filteredOpportunities.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.title} [{o.pipelineStage}] {o.valueEstimate ? `— $${o.valueEstimate.toLocaleString()}` : ''}
                        </option>
                      ))}
                    {category === 'research' &&
                      filteredResearch.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.title} [{r.status}]
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
                  </select>
                )}

                {/* Empty category state notice */}
                {!isLoadingEntities && (
                  <>
                    {category === 'project' && filteredProjects.length === 0 && (
                      <p className="text-[11px] text-muted-foreground italic font-mono pt-1">
                        No unconnected projects available in this workspace.
                      </p>
                    )}
                    {category === 'opportunity' && filteredOpportunities.length === 0 && (
                      <p className="text-[11px] text-muted-foreground italic font-mono pt-1">
                        No unconnected opportunities available in this workspace.
                      </p>
                    )}
                    {category === 'research' && filteredResearch.length === 0 && (
                      <p className="text-[11px] text-muted-foreground italic font-mono pt-1">
                        No unconnected research records available in this workspace.
                      </p>
                    )}
                    {category === 'company' && filteredCompanies.length === 0 && (
                      <p className="text-[11px] text-muted-foreground italic font-mono pt-1">
                        No unconnected companies available in this workspace.
                      </p>
                    )}
                    {category === 'contact' && filteredContacts.length === 0 && (
                      <p className="text-[11px] text-muted-foreground italic font-mono pt-1">
                        No unconnected contacts available in this workspace.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Relationship Role Selector (filtered by compatibility) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Relationship Role <span className="text-destructive">*</span>
            </label>
            <select
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value as ReviewConnectionRelationshipType)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
            >
              {compatibleRelTypes.map((rt) => (
                <option key={rt} value={rt}>
                  {RELATIONSHIP_TYPE_LABELS[rt].label} — {RELATIONSHIP_TYPE_LABELS[rt].description}
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
              placeholder="Why is this entity connected? What role did it play in this review?"
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-muted-foreground/60 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-3.5 py-1.5 text-xs rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || (!isEdit && !selectedEntityId)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
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
