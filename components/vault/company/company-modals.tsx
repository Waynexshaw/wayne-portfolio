'use client'

import { useState } from 'react'
import {
  X,
  Building2,
  Layers,
  Plus,
  TrendingUp,
  Users,
  Edit,
  Globe,
  CheckSquare
} from 'lucide-react'
import {
  updateCompanyGlobal,
  updateWorkspaceCompany,
  createContact,
  createOpportunity
} from '@/lib/vault/actions'

interface CompanyModalsProps {
  company: any
  workspaceRelationship: any
  workspaceId?: string
  workspaceName?: string
  contacts: any[]
  isEditCompanyOpen: boolean
  setIsEditCompanyOpen: (open: boolean) => void
  isEditRelationshipOpen: boolean
  setIsEditRelationshipOpen: (open: boolean) => void
  isAddContactOpen: boolean
  setIsAddContactOpen: (open: boolean) => void
  isCreateOpportunityOpen: boolean
  setIsCreateOpportunityOpen: (open: boolean) => void
}

export function CompanyModals({
  company,
  workspaceRelationship,
  workspaceId,
  workspaceName,
  contacts,
  isEditCompanyOpen,
  setIsEditCompanyOpen,
  isEditRelationshipOpen,
  setIsEditRelationshipOpen,
  isAddContactOpen,
  setIsAddContactOpen,
  isCreateOpportunityOpen,
  setIsCreateOpportunityOpen,
}: CompanyModalsProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 1. Edit Global Company
  const handleEditCompany = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    try {
      await updateCompanyGlobal(company.id, {
        name: form.get('name') as string,
        domain: (form.get('domain') as string) || undefined,
        industry: (form.get('industry') as string) || undefined,
        website: (form.get('website') as string) || undefined,
        linkedinUrl: (form.get('linkedinUrl') as string) || undefined,
        xHandle: (form.get('xHandle') as string) || undefined,
        description: (form.get('description') as string) || undefined,
      })
      setIsEditCompanyOpen(false)
    } catch (err: any) {
      setError(err.message || 'Failed to update organization profile')
    } finally {
      setLoading(false)
    }
  }

  // 2. Edit Workspace Relationship
  const handleEditRelationship = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!workspaceId) return
    setLoading(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    try {
      await updateWorkspaceCompany(workspaceId, company.id, {
        tier: form.get('tier') as string,
        status: form.get('status') as string,
        notes: (form.get('notes') as string) || undefined,
      })
      setIsEditRelationshipOpen(false)
    } catch (err: any) {
      setError(err.message || 'Failed to update workspace relationship')
    } finally {
      setLoading(false)
    }
  }

  // 3. Add Contact (Preselected company)
  const handleAddContact = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!workspaceId) return
    setLoading(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    try {
      await createContact({
        workspaceId,
        companyId: company.id,
        fullName: form.get('fullName') as string,
        email: (form.get('email') as string) || undefined,
        phone: (form.get('phone') as string) || undefined,
        roleTitle: (form.get('roleTitle') as string) || undefined,
        location: (form.get('location') as string) || undefined,
        bio: (form.get('bio') as string) || undefined,
        relationshipType: (form.get('relationshipType') as string) || 'professional',
        relationshipStage: (form.get('relationshipStage') as any) || 'lead',
        relationshipScore: Number(form.get('relationshipScore')) || 5,
        priority: (form.get('priority') as any) || 'medium',
        notes: (form.get('notes') as string) || undefined,
      })
      setIsAddContactOpen(false)
    } catch (err: any) {
      setError(err.message || 'Failed to create contact')
    } finally {
      setLoading(false)
    }
  }

  // 4. Create Opportunity (Preselected company and workspace)
  const handleCreateOpportunity = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!workspaceId) return
    setLoading(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    try {
      await createOpportunity({
        workspaceId,
        companyId: company.id,
        contactId: (form.get('contactId') as string) || undefined,
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

  return (
    <>
      {/* 1. Modal: Edit Global Company */}
      {isEditCompanyOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-card border border-border p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <h2 className="font-serif text-lg font-medium text-foreground">
                  Edit Organization Profile (Global)
                </h2>
              </div>
              <button
                onClick={() => setIsEditCompanyOpen(false)}
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

            <form onSubmit={handleEditCompany} className="space-y-4">
              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">Company Name *</label>
                <input
                  required
                  name="name"
                  defaultValue={company.name}
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Industry</label>
                  <input
                    name="industry"
                    defaultValue={company.industry || ''}
                    placeholder="e.g. DeFi, L2, Advisory"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Domain</label>
                  <input
                    name="domain"
                    defaultValue={company.domain || ''}
                    placeholder="e.g. polygon.technology"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">Website</label>
                <input
                  name="website"
                  defaultValue={company.website || ''}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">LinkedIn URL</label>
                  <input
                    name="linkedinUrl"
                    defaultValue={company.linkedin_url || ''}
                    placeholder="https://linkedin.com/company/..."
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">𝕏 Handle</label>
                  <input
                    name="xHandle"
                    defaultValue={company.x_handle || ''}
                    placeholder="@handle"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">Description</label>
                <textarea
                  name="description"
                  defaultValue={company.description || ''}
                  rows={3}
                  placeholder="Overview of organization, core products, and positioning..."
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditCompanyOpen(false)}
                  className="px-4 py-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {loading ? 'Saving...' : 'Save Organization Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Edit Workspace Relationship Context */}
      {isEditRelationshipOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-card border border-border p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <h2 className="font-serif text-lg font-medium text-foreground">
                  Edit Workspace Relationship Context
                </h2>
              </div>
              <button
                onClick={() => setIsEditRelationshipOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Configure status, strategic tier, and private relationship notes for{' '}
              <strong className="text-foreground">{company.name}</strong> inside{' '}
              <strong className="text-foreground">{workspaceName || 'the active workspace'}</strong>.
            </p>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleEditRelationship} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Tier *</label>
                  <select
                    name="tier"
                    defaultValue={workspaceRelationship?.tier || 'tier_2'}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="tier_1">Tier 1 (Strategic Priority)</option>
                    <option value="tier_2">Tier 2 (Active Target)</option>
                    <option value="tier_3">Tier 3 (General Network)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Status *</label>
                  <select
                    name="status"
                    defaultValue={workspaceRelationship?.status || 'prospect'}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="prospect">Prospect</option>
                    <option value="active">Active</option>
                    <option value="partner">Partner</option>
                    <option value="portfolio">Portfolio</option>
                    <option value="vendor">Vendor</option>
                    <option value="past">Past</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">Relationship Notes</label>
                <textarea
                  name="notes"
                  defaultValue={workspaceRelationship?.notes || ''}
                  rows={4}
                  placeholder="Record strategic context, partnership history, key stakeholders, or notes..."
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditRelationshipOpen(false)}
                  className="px-4 py-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {loading ? 'Saving...' : 'Save Context'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal: Add Contact (Preselecting company) */}
      {isAddContactOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-card border border-border p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <h2 className="font-serif text-lg font-medium text-foreground">
                  Add Contact to {company.name}
                </h2>
              </div>
              <button
                onClick={() => setIsAddContactOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary shrink-0" />
              <span>
                Organization:{' '}
                <strong className="text-foreground">{company.name}</strong> (automatically linked)
              </span>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleAddContact} className="space-y-4">
              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">Full Name *</label>
                <input
                  required
                  name="fullName"
                  placeholder="e.g. Satoshi Nakamoto"
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Role / Title</label>
                  <input
                    name="roleTitle"
                    placeholder="e.g. Managing Partner, CTO"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Email</label>
                  <input
                    name="email"
                    type="email"
                    placeholder="contact@company.com"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Phone</label>
                  <input
                    name="phone"
                    placeholder="+1 555-0199"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Location</label>
                  <input
                    name="location"
                    placeholder="e.g. London, San Francisco"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Stage *</label>
                  <select
                    name="relationshipStage"
                    defaultValue="connected"
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
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Priority *</label>
                  <select
                    name="priority"
                    defaultValue="medium"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Score (1-10)</label>
                  <input
                    name="relationshipScore"
                    type="number"
                    min="1"
                    max="10"
                    defaultValue="6"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">Notes</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Initial context, background, or meeting notes..."
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddContactOpen(false)}
                  className="px-4 py-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {loading ? 'Creating...' : 'Save Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal: Create Opportunity (Preselecting company and workspace) */}
      {isCreateOpportunityOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-card border border-border p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h2 className="font-serif text-lg font-medium text-foreground">
                  Create Opportunity for {company.name}
                </h2>
              </div>
              <button
                onClick={() => setIsCreateOpportunityOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Organization:{' '}
                <strong className="text-foreground">{company.name}</strong> (automatically linked)
              </span>
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
                  placeholder="e.g. Q4 Ecosystem Advisory Mandate"
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Type *</label>
                  <select
                    name="type"
                    defaultValue="growth_strategy"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="growth_strategy">Growth Strategy</option>
                    <option value="tokenomics_advisory">Tokenomics Advisory</option>
                    <option value="institutional_mandate">Institutional Mandate</option>
                    <option value="private_equity">Private Equity</option>
                    <option value="venture_capital">Venture Capital</option>
                    <option value="partnership">Partnership</option>
                    <option value="consulting">Consulting</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Pipeline Stage *</label>
                  <select
                    name="pipelineStage"
                    defaultValue="lead"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="lead">Lead / Prospect</option>
                    <option value="qualified">Qualified</option>
                    <option value="proposal">Proposal / Pitch</option>
                    <option value="negotiation">Negotiation</option>
                    <option value="closed_won">Closed Won</option>
                    <option value="closed_lost">Closed Lost</option>
                  </select>
                </div>
              </div>

              {/* Connected Contact Lead */}
              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">Associated Contact Lead</label>
                <select
                  name="contactId"
                  defaultValue=""
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                >
                  <option value="">No specific contact lead</option>
                  {contacts.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} {c.role_title ? `(${c.role_title})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Est. Value ($)</label>
                  <input
                    name="valueEstimate"
                    type="number"
                    placeholder="100000"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Currency</label>
                  <select
                    name="currency"
                    defaultValue="USD"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Probability (%)</label>
                  <input
                    name="probability"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue="25"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Target Close Date</label>
                  <input
                    name="expectedCloseDate"
                    type="date"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Next Action</label>
                  <input
                    name="nextAction"
                    placeholder="e.g. Send teaser document"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">Description & Notes</label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Deal structure, key milestones, advisory scope..."
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateOpportunityOpen(false)}
                  className="px-4 py-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {loading ? 'Creating...' : 'Create Opportunity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
