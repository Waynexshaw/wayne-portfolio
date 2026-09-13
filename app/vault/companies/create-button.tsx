'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { createCompany } from '@/lib/vault/actions'

export function CompanyCreateButton({ workspaceId }: { workspaceId?: string }) {
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
    try {
      await createCompany({
        workspaceId,
        name: form.get('name') as string,
        domain: form.get('domain') as string || undefined,
        industry: form.get('industry') as string || undefined,
        website: form.get('website') as string || undefined,
        linkedinUrl: form.get('linkedinUrl') as string || undefined,
        xHandle: form.get('xHandle') as string || undefined,
        tier: form.get('tier') as any || 'tier_2',
        status: form.get('status') as any || 'prospect',
        notes: form.get('notes') as string || undefined,
      })
      setIsOpen(false)
    } catch (err: any) {
      setError(err.message || 'Failed to create company')
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
        New Company
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-card border border-border p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="font-serif text-lg font-medium text-foreground">Add New Organization</h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 text-xs bg-destructive/10 border border-destructive/20 text-destructive rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">Company Name *</label>
                <input
                  required
                  name="name"
                  placeholder="e.g. Polygon Labs"
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Industry</label>
                  <input
                    name="industry"
                    placeholder="e.g. L2 Infrastructure, DeFi"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Domain</label>
                  <input
                    name="domain"
                    placeholder="e.g. polygon.technology"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Website</label>
                  <input
                    name="website"
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">X Handle</label>
                  <input
                    name="xHandle"
                    placeholder="@0xPolygon"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Tier</label>
                  <select
                    name="tier"
                    defaultValue="tier_1"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="tier_1">Tier 1 (Strategic Priority)</option>
                    <option value="tier_2">Tier 2 (Active Target)</option>
                    <option value="tier_3">Tier 3 (General Network)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Status</label>
                  <select
                    name="status"
                    defaultValue="prospect"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="prospect">Prospect</option>
                    <option value="active">Active</option>
                    <option value="partner">Partner</option>
                    <option value="portfolio">Portfolio</option>
                    <option value="vendor">Vendor</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">Notes</label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="Key products, contacts, strategic angles..."
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Save Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}