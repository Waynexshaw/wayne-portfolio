'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { logInteraction } from '@/lib/vault/actions'

export function InteractionCreateButton({ 
  workspaceId, 
  contacts,
  identities
}: { 
  workspaceId?: string
  contacts: any[]
  identities: any[]
}) {
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
      await logInteraction({
        workspaceId,
        contactId: form.get('contactId') as string,
        identityId: form.get('identityId') as string || undefined,
        channel: form.get('channel') as any || 'x',
        direction: form.get('direction') as any || 'outbound',
        purpose: form.get('purpose') as string || undefined,
        subject: form.get('subject') as string || undefined,
        content: form.get('content') as string,
        response: form.get('response') as string || undefined,
        status: form.get('status') as any || 'completed',
        sentiment: form.get('sentiment') as any || undefined,
        nextAction: form.get('nextAction') as string || undefined,
        followUpAt: form.get('followUpAt') as string || undefined,
        notes: form.get('notes') as string || undefined,
      })
      setIsOpen(false)
    } catch (err: any) {
      setError(err.message || 'Failed to log interaction')
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
        Log Touchpoint
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-card border border-border p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="font-serif text-lg font-medium text-foreground">Log Professional Touchpoint</h2>
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Contact *</label>
                  <select
                    required
                    name="contactId"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="">Select a Contact</option>
                    {contacts.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.full_name} {c.role_title ? `(${c.role_title})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Representing Identity</label>
                  <select
                    name="identityId"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="">Default Identity</option>
                    {identities.map((id: any) => (
                      <option key={id.id} value={id.id}>{id.name} ({id.type})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Channel *</label>
                  <select
                    name="channel"
                    defaultValue="x"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="x">X / Twitter DM</option>
                    <option value="telegram">Telegram</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="email">Email</option>
                    <option value="call">Phone / Zoom Call</option>
                    <option value="meeting">In-Person Meeting</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Direction</label>
                  <select
                    name="direction"
                    defaultValue="outbound"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="outbound">Outbound (Sent)</option>
                    <option value="inbound">Inbound (Received)</option>
                    <option value="internal_note">Internal Note</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Sentiment</label>
                  <select
                    name="sentiment"
                    defaultValue="positive"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="positive">Positive</option>
                    <option value="neutral">Neutral</option>
                    <option value="negative">Negative</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">Purpose / Objective</label>
                <input
                  name="purpose"
                  placeholder="e.g. Discuss PEVRA telecom pilot partnership"
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">Interaction Summary / Content *</label>
                <textarea
                  required
                  name="content"
                  rows={3}
                  placeholder="What was discussed, pitched, or decided..."
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">Their Response</label>
                <textarea
                  name="response"
                  rows={2}
                  placeholder="Feedback, interest level, questions raised..."
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Next Action</label>
                  <input
                    name="nextAction"
                    placeholder="e.g. Send technical deck by Thursday"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Scheduled Follow-up Date</label>
                  <input
                    type="date"
                    name="followUpAt"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
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
                  {loading ? 'Logging...' : 'Save Touchpoint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}