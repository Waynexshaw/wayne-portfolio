'use client'

import { useState } from 'react'
import { Plus, X, TrendingUp } from 'lucide-react'
import { createOpportunity } from '@/lib/vault/actions'

interface OpportunityCreateButtonProps {
  workspaceId?: string
  workspaceName?: string
  contacts: any[]
  companies: any[]
}

export function OpportunityCreateButton({
  workspaceId,
  workspaceName,
  contacts,
  companies,
}: OpportunityCreateButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!workspaceId) {
      setError('No active workspace selected')
      return
    }

    setLoading(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const title = (form.get('title') as string)?.trim()
    if (!title) {
      setError('Opportunity title cannot be empty')
      setLoading(false)
      return
    }

    try {
      await createOpportunity({
        workspaceId,
        contactId: (form.get('contactId') as string) || undefined,
        companyId: (form.get('companyId') as string) || undefined,
        title,
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
      setIsOpen(false)
    } catch (err: any) {
      setError(err.message || 'Failed to create opportunity')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm"
      >
        <Plus className="w-3.5 h-3.5" />
        Create Opportunity
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-card border border-border p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <h2 className="font-serif text-lg font-medium text-foreground">
                    Create Opportunity
                  </h2>
                </div>
                {workspaceName && (
                  <p className="text-[11px] font-mono text-muted-foreground">
                    Workspace: <span className="text-foreground font-semibold">{workspaceName}</span>
                  </p>
                )}
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">
                  Opportunity Title *
                </label>
                <input
                  required
                  name="title"
                  placeholder="e.g. Protocol Growth Strategy & Advisory Mandate"
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">
                    Type
                  </label>
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
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">
                    Pipeline Stage
                  </label>
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
                    <option value="lost">Lost</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">
                    Associated Contact
                  </label>
                  <select
                    name="contactId"
                    defaultValue=""
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="">No Contact Attached</option>
                    {contacts.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name} {c.role_title ? `(${c.role_title})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">
                    Associated Company
                  </label>
                  <select
                    name="companyId"
                    defaultValue=""
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="">No Company Attached</option>
                    {companies.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1 col-span-2">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">
                    Estimated Value
                  </label>
                  <input
                    type="number"
                    name="valueEstimate"
                    placeholder="e.g. 25000"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">
                    Currency
                  </label>
                  <input
                    name="currency"
                    defaultValue="USD"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">
                    Probability % (0-100)
                  </label>
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
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">
                    Target Close Date
                  </label>
                  <input
                    type="date"
                    name="expectedCloseDate"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">
                  Next Action
                </label>
                <input
                  name="nextAction"
                  placeholder="e.g. Schedule advisory pitch with founders"
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">
                  Description / Deliverables / Notes
                </label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Scope, mandate terms, strategic context..."
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors shadow-sm"
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
