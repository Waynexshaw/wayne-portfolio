'use client'

import { useState } from 'react'
import { X, MessageSquareShare, CheckSquare, TrendingUp, Layers, Edit } from 'lucide-react'
import { 
  logInteraction, 
  createFollowUp, 
  createOpportunity, 
  updateWorkspaceRelationship, 
  updateContactGlobal 
} from '@/lib/vault/actions'

interface ContactModalsProps {
  contact: any
  workspaceRelationship: any
  workspaceId?: string
  identities: any[]
  companies: any[]
  interactions?: any[]
  // Modal visibility states
  isLogInteractionOpen: boolean
  setIsLogInteractionOpen: (open: boolean) => void
  isCreateFollowUpOpen: boolean
  setIsCreateFollowUpOpen: (open: boolean) => void
  isCreateOpportunityOpen: boolean
  setIsCreateOpportunityOpen: (open: boolean) => void
  isEditRelationshipOpen: boolean
  setIsEditRelationshipOpen: (open: boolean) => void
  isEditContactOpen: boolean
  setIsEditContactOpen: (open: boolean) => void
}

export function ContactModals({
  contact,
  workspaceRelationship,
  workspaceId,
  identities,
  companies,
  interactions = [],
  isLogInteractionOpen,
  setIsLogInteractionOpen,
  isCreateFollowUpOpen,
  setIsCreateFollowUpOpen,
  isCreateOpportunityOpen,
  setIsCreateOpportunityOpen,
  isEditRelationshipOpen,
  setIsEditRelationshipOpen,
  isEditContactOpen,
  setIsEditContactOpen,
}: ContactModalsProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 1. Log Interaction Submission
  const handleLogInteraction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!workspaceId) return
    setLoading(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    try {
      await logInteraction({
        workspaceId,
        contactId: contact.id,
        identityId: (form.get('identityId') as string) || undefined,
        channel: form.get('channel') as any || 'x',
        direction: form.get('direction') as any || 'outbound',
        purpose: (form.get('purpose') as string) || undefined,
        subject: (form.get('subject') as string) || undefined,
        content: form.get('content') as string,
        response: (form.get('response') as string) || undefined,
        status: (form.get('status') as any) || 'completed',
        sentiment: (form.get('sentiment') as any) || undefined,
        nextAction: (form.get('nextAction') as string) || undefined,
        followUpAt: (form.get('followUpAt') as string) || undefined,
        notes: (form.get('notes') as string) || undefined,
      })
      setIsLogInteractionOpen(false)
    } catch (err: any) {
      setError(err.message || 'Failed to log interaction')
    } finally {
      setLoading(false)
    }
  }

  // 2. Create Follow-up Submission
  const handleCreateFollowUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!workspaceId) return
    setLoading(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    try {
      await createFollowUp({
        workspaceId,
        contactId: contact.id,
        interactionId: (form.get('interactionId') as string) || undefined,
        title: form.get('title') as string,
        description: (form.get('description') as string) || undefined,
        dueDate: form.get('dueDate') as string,
        priority: (form.get('priority') as any) || 'medium',
      })
      setIsCreateFollowUpOpen(false)
    } catch (err: any) {
      setError(err.message || 'Failed to create follow-up')
    } finally {
      setLoading(false)
    }
  }

  // 3. Create Opportunity Submission
  const handleCreateOpportunity = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!workspaceId) return
    setLoading(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    try {
      await createOpportunity({
        workspaceId,
        contactId: contact.id,
        companyId: (form.get('companyId') as string) || contact.company_id || undefined,
        title: form.get('title') as string,
        type: (form.get('type') as string) || 'growth_strategy',
        description: (form.get('description') as string) || undefined,
        valueEstimate: form.get('valueEstimate') ? Number(form.get('valueEstimate')) : undefined,
        currency: (form.get('currency') as string) || 'USD',
        pipelineStage: (form.get('pipelineStage') as string) || 'lead',
        probability: Number(form.get('probability')) || 20,
        nextAction: (form.get('nextAction') as string) || undefined,
        expectedCloseDate: (form.get('expectedCloseDate') as string) || undefined,
        notes: (form.get('notes') as string) || undefined,
      })
      setIsCreateOpportunityOpen(false)
    } catch (err: any) {
      setError(err.message || 'Failed to create opportunity')
    } finally {
      setLoading(false)
    }
  }

  // 4. Edit Workspace Relationship Submission
  const handleEditRelationship = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!workspaceId) return
    setLoading(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    try {
      await updateWorkspaceRelationship(workspaceId, contact.id, {
        relationshipType: form.get('relationshipType') as string,
        relationshipStage: form.get('relationshipStage') as string,
        relationshipScore: Number(form.get('relationshipScore')) || 5,
        priority: form.get('priority') as string,
        primaryIdentityId: (form.get('primaryIdentityId') as string) || null,
        notes: (form.get('notes') as string) || undefined,
      })
      setIsEditRelationshipOpen(false)
    } catch (err: any) {
      setError(err.message || 'Failed to update relationship')
    } finally {
      setLoading(false)
    }
  }

  // 5. Edit Global Contact Submission
  const handleEditContact = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    try {
      await updateContactGlobal(contact.id, {
        fullName: form.get('fullName') as string,
        email: (form.get('email') as string) || undefined,
        phone: (form.get('phone') as string) || undefined,
        roleTitle: (form.get('roleTitle') as string) || undefined,
        location: (form.get('location') as string) || undefined,
        bio: (form.get('bio') as string) || undefined,
        companyId: (form.get('companyId') as string) || null,
      })
      setIsEditContactOpen(false)
    } catch (err: any) {
      setError(err.message || 'Failed to update contact')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* 1. Modal: Log Interaction */}
      {isLogInteractionOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-card border border-border p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <MessageSquareShare className="w-4 h-4 text-primary" />
                <h2 className="font-serif text-lg font-medium text-foreground">
                  Log Touchpoint with {contact.full_name}
                </h2>
              </div>
              <button 
                onClick={() => setIsLogInteractionOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleLogInteraction} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Channel *</label>
                  <select
                    name="channel"
                    defaultValue="x"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="x">𝕏 (Direct Message / Mention)</option>
                    <option value="telegram">Telegram</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="email">Email</option>
                    <option value="meeting">Video / Audio Meeting</option>
                    <option value="call">Phone Call</option>
                    <option value="in_person">In Person Event</option>
                    <option value="other">Other Channel</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Direction *</label>
                  <select
                    name="direction"
                    defaultValue="outbound"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="outbound">Outbound (Sent by you)</option>
                    <option value="inbound">Inbound (Received by you)</option>
                    <option value="internal_note">Internal Reflection / Note</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Purpose / Context</label>
                  <input
                    name="purpose"
                    placeholder="e.g. DeFi research catch-up"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Operating Identity</label>
                  <select
                    name="identityId"
                    defaultValue={workspaceRelationship?.primary_identity_id || ''}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="">Default Identity</option>
                    {identities.map((id) => (
                      <option key={id.id} value={id.id}>{id.name} (@{id.handle || id.type})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">Message / Content / Discussion *</label>
                <textarea
                  required
                  name="content"
                  rows={3}
                  placeholder="Summary of what was communicated or discussed..."
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">Outcome / Response Received</label>
                <textarea
                  name="response"
                  rows={2}
                  placeholder="Contact's answer, receptiveness, agreement, or pushback..."
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Next Action</label>
                  <input
                    name="nextAction"
                    placeholder="e.g. Send research report"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Schedule Follow-up Date</label>
                  <input
                    type="date"
                    name="followUpAt"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsLogInteractionOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors shadow-sm"
                >
                  {loading ? 'Logging...' : 'Save Touchpoint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Create Follow-up */}
      {isCreateFollowUpOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl bg-card border border-border p-6 shadow-xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-amber-400" />
                <h2 className="font-serif text-lg font-medium text-foreground">
                  Create Follow-up Commitment
                </h2>
              </div>
              <button 
                onClick={() => setIsCreateFollowUpOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateFollowUp} className="space-y-4">
              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">Action Title *</label>
                <input
                  required
                  name="title"
                  placeholder="e.g. Follow up regarding advisory proposal"
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">Description / Context</label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Specific items to deliver or discuss..."
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Due Date *</label>
                  <input
                    required
                    type="date"
                    name="dueDate"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Priority</label>
                  <select
                    name="priority"
                    defaultValue="medium"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {interactions && interactions.length > 0 && (
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">
                    Originating Touchpoint (Optional)
                  </label>
                  <select
                    name="interactionId"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="">None (Independent Task)</option>
                    {interactions.map((inter: any) => {
                      const date = new Date(inter.interaction_date).toLocaleDateString()
                      const summary = inter.purpose || inter.content?.slice(0, 40) || 'Touchpoint'
                      return (
                        <option key={inter.id} value={inter.id}>
                          {date} · {inter.channel?.toUpperCase()} ({inter.direction}) — {summary}
                        </option>
                      )
                    })}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateFollowUpOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors shadow-sm"
                >
                  {loading ? 'Creating...' : 'Schedule Follow-up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal: Create Opportunity */}
      {isCreateOpportunityOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-card border border-border p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h2 className="font-serif text-lg font-medium text-foreground">
                  Create Opportunity / Mandate
                </h2>
              </div>
              <button 
                onClick={() => setIsCreateOpportunityOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateOpportunity} className="space-y-4">
              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">Opportunity Title *</label>
                <input
                  required
                  name="title"
                  placeholder="e.g. Growth Strategy Advisory Mandate"
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Type</label>
                  <select
                    name="type"
                    defaultValue="growth_strategy"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="growth_strategy">Growth Strategy</option>
                    <option value="defi_research">DeFi Research</option>
                    <option value="tokenomics">Tokenomics</option>
                    <option value="advisory">Strategic Advisory</option>
                    <option value="pevra_partnership">PEVRA Partnership</option>
                    <option value="investment">Investment / Angel</option>
                    <option value="collaboration">Collaboration</option>
                    <option value="other">Other Mandate</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Initial Pipeline Stage</label>
                  <select
                    name="pipelineStage"
                    defaultValue="lead"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="lead">Lead</option>
                    <option value="discovery">Discovery</option>
                    <option value="proposal">Proposal</option>
                    <option value="negotiation">Negotiation</option>
                    <option value="won">Won</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1 col-span-2">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Estimated Value</label>
                  <input
                    type="number"
                    name="valueEstimate"
                    placeholder="e.g. 25000"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Currency</label>
                  <input
                    name="currency"
                    defaultValue="USD"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Probability % (0-100)</label>
                  <input
                    type="number"
                    name="probability"
                    defaultValue={30}
                    min={0}
                    max={100}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Target Close Date</label>
                  <input
                    type="date"
                    name="expectedCloseDate"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">Next Action</label>
                <input
                  name="nextAction"
                  placeholder="e.g. Present advisory terms"
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">Mandate Details</label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Scope, deliverable commitments, or strategic context..."
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateOpportunityOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors shadow-sm"
                >
                  {loading ? 'Creating...' : 'Register Opportunity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal: Edit Workspace Relationship */}
      {isEditRelationshipOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl bg-card border border-border p-6 shadow-xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <h2 className="font-serif text-lg font-medium text-foreground">
                  Edit Workspace Relationship
                </h2>
              </div>
              <button 
                onClick={() => setIsEditRelationshipOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleEditRelationship} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Relationship Type</label>
                  <select
                    name="relationshipType"
                    defaultValue={workspaceRelationship?.relationship_type || 'professional'}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="founder">Founder</option>
                    <option value="investor">Investor</option>
                    <option value="advisor">Advisor</option>
                    <option value="partner">Partner</option>
                    <option value="client">Client</option>
                    <option value="vendor">Vendor</option>
                    <option value="colleague">Colleague</option>
                    <option value="professional">Professional</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Relationship Stage</label>
                  <select
                    name="relationshipStage"
                    defaultValue={workspaceRelationship?.relationship_stage || 'lead'}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="lead">Lead</option>
                    <option value="outreach">Outreach</option>
                    <option value="connected">Connected</option>
                    <option value="in_discussion">In Discussion</option>
                    <option value="partner">Partner</option>
                    <option value="investor">Investor</option>
                    <option value="client">Client</option>
                    <option value="dormant">Dormant</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Score (1–10 Scale)</label>
                  <input
                    type="number"
                    name="relationshipScore"
                    min={1}
                    max={10}
                    defaultValue={workspaceRelationship?.relationship_score || 5}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Priority</label>
                  <select
                    name="priority"
                    defaultValue={workspaceRelationship?.priority || 'medium'}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">Operating Identity</label>
                <select
                  name="primaryIdentityId"
                  defaultValue={workspaceRelationship?.primary_identity_id || ''}
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                >
                  <option value="">Workspace Default Identity</option>
                  {identities.map((id) => (
                    <option key={id.id} value={id.id}>{id.name} (@{id.handle || id.type})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">Workspace Notes</label>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={workspaceRelationship?.notes || ''}
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditRelationshipOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors shadow-sm"
                >
                  {loading ? 'Saving...' : 'Update Relationship'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal: Edit Global Contact Profile */}
      {isEditContactOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-card border border-border p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-primary" />
                <h2 className="font-serif text-lg font-medium text-foreground">
                  Edit Global Contact Profile
                </h2>
              </div>
              <button 
                onClick={() => setIsEditContactOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleEditContact} className="space-y-4">
              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">Full Name *</label>
                <input
                  required
                  name="fullName"
                  defaultValue={contact.full_name}
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Email</label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={contact.email || ''}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Phone</label>
                  <input
                    name="phone"
                    defaultValue={contact.phone || ''}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Role / Title</label>
                  <input
                    name="roleTitle"
                    defaultValue={contact.role_title || ''}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Company</label>
                  <select
                    name="companyId"
                    defaultValue={contact.company_id || ''}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="">No Company Attached</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">Location</label>
                <input
                  name="location"
                  defaultValue={contact.location || ''}
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">Bio / Background</label>
                <textarea
                  name="bio"
                  rows={3}
                  defaultValue={contact.bio || ''}
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditContactOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors shadow-sm"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
