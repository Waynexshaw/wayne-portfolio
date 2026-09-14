'use client'

import { useState } from 'react'
import { Plus, X, MessageSquareShare, User, Shield } from 'lucide-react'
import { logInteraction } from '@/lib/vault/actions'

interface InteractionCreateButtonProps {
  workspaceId?: string
  workspaceName?: string
  contacts: any[]
  identities: any[]
  defaultIdentityId?: string
}

export function InteractionCreateButton({
  workspaceId,
  workspaceName,
  contacts,
  identities,
  defaultIdentityId,
}: InteractionCreateButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Current local datetime string for input: YYYY-MM-DDTHH:mm
  const getDefaultDateTime = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  }

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
        identityId: (form.get('identityId') as string) || undefined,
        channel: (form.get('channel') as any) || 'x',
        direction: (form.get('direction') as any) || 'outbound',
        purpose: (form.get('purpose') as string) || undefined,
        subject: (form.get('subject') as string) || undefined,
        content: form.get('content') as string,
        response: (form.get('response') as string) || undefined,
        status: (form.get('status') as any) || 'completed',
        sentiment: (form.get('sentiment') as any) || undefined,
        nextAction: (form.get('nextAction') as string) || undefined,
        followUpAt: (form.get('followUpAt') as string) || undefined,
        notes: (form.get('notes') as string) || undefined,
        interactionDate: (form.get('interactionDate') as string) || undefined,
      })
      setIsOpen(false)
    } catch (err: any) {
      setError(err.message || 'Failed to log touchpoint')
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
          <div className="w-full max-w-lg rounded-xl bg-card border border-border p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <MessageSquareShare className="w-4 h-4 text-primary" />
                <h2 className="font-serif text-lg font-medium text-foreground">
                  Log Professional Touchpoint
                </h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 text-xs bg-destructive/10 border border-destructive/20 text-destructive rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Contact Selection */}
              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">Contact *</label>
                <select
                  required
                  name="contactId"
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                >
                  <option value="">Select a Contact</option>
                  {contacts.map((c: any) => {
                    const companyName = c.company?.name
                    const role = c.role_title
                    const label = `${c.full_name}${role ? ` — ${role}` : ''}${companyName ? ` — ${companyName}` : ''}`
                    return (
                      <option key={c.id} value={c.id}>
                        {label}
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* Operating Identity & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Operating Identity</label>
                  <select
                    name="identityId"
                    defaultValue={defaultIdentityId || ''}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="">Default Workspace Identity</option>
                    {identities.map((id: any) => (
                      <option key={id.id} value={id.id}>
                        @{id.name} ({id.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Interaction Date & Time *</label>
                  <input
                    required
                    type="datetime-local"
                    name="interactionDate"
                    defaultValue={getDefaultDateTime()}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs font-mono"
                  />
                </div>
              </div>

              {/* Channel, Direction, Sentiment */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Channel *</label>
                  <select
                    name="channel"
                    defaultValue="x"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="x">𝕏 / Twitter DM</option>
                    <option value="telegram">Telegram</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="email">Email</option>
                    <option value="call">Call (Phone/Zoom)</option>
                    <option value="meeting">In-Person Meeting</option>
                    <option value="in_person">In-Person Event</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Direction *</label>
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

              {/* Purpose / Objective */}
              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">Purpose / Objective</label>
                <input
                  name="purpose"
                  placeholder="e.g. Discuss advisory mandate or strategic alliance"
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              {/* Content / Discussion Summary */}
              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">Discussion Summary / Content *</label>
                <textarea
                  required
                  name="content"
                  rows={3}
                  placeholder="What was discussed, proposed, or aligned on..."
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              {/* Counterparty Response */}
              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">Counterparty Response / Outcome</label>
                <textarea
                  name="response"
                  rows={2}
                  placeholder="Feedback, interest level, questions raised, or agreement reached..."
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              {/* Next Action & Follow-up */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Next Action</label>
                  <input
                    name="nextAction"
                    placeholder="e.g. Send technical overview deck"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">Target Date</label>
                  <input
                    type="date"
                    name="followUpAt"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs font-mono"
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
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {loading ? 'Recording...' : 'Save Touchpoint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
