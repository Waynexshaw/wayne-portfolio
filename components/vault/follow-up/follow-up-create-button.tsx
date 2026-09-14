'use client'

import { useState } from 'react'
import { Plus, X, CheckSquare, Calendar, User, MessageSquareShare } from 'lucide-react'
import { createFollowUp } from '@/lib/vault/actions'

interface FollowUpCreateButtonProps {
  workspaceId?: string
  workspaceName?: string
  contacts: any[]
  interactions?: any[]
  initialContactId?: string
  initialInteractionId?: string
}

export function FollowUpCreateButton({
  workspaceId,
  workspaceName,
  contacts,
  interactions = [],
  initialContactId,
  initialInteractionId,
}: FollowUpCreateButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedContactId, setSelectedContactId] = useState<string>(initialContactId || '')

  // Default datetime string: tomorrow at 10:00 AM local time
  const getDefaultDateTime = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(10, 0, 0, 0)
    tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset())
    return tomorrow.toISOString().slice(0, 16)
  }

  // Filter interactions for currently selected contact
  const contactInteractions = selectedContactId
    ? interactions.filter(
        (inter) => inter.contact_id === selectedContactId || inter.contact?.id === selectedContactId
      )
    : []

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
      await createFollowUp({
        workspaceId,
        contactId: form.get('contactId') as string,
        interactionId: (form.get('interactionId') as string) || undefined,
        title: form.get('title') as string,
        description: (form.get('description') as string) || undefined,
        dueDate: form.get('dueDate') as string,
        priority: (form.get('priority') as any) || 'medium',
      })
      setIsOpen(false)
    } catch (err: any) {
      setError(err.message || 'Failed to schedule follow-up')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => {
          setSelectedContactId(initialContactId || '')
          setIsOpen(true)
        }}
        className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm"
      >
        <Plus className="w-3.5 h-3.5" />
        Schedule Follow-up
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-card border border-border p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-amber-400" />
                <h2 className="font-serif text-lg font-medium text-foreground">
                  Schedule Actionable Follow-up
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
                <label className="text-muted-foreground font-mono uppercase text-[10px]">
                  Contact *
                </label>
                <select
                  required
                  name="contactId"
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                >
                  <option value="">Select a Professional Contact</option>
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

              {/* Action Title */}
              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">
                  Action Title *
                </label>
                <input
                  required
                  name="title"
                  placeholder="e.g. Send technical tokenomics deck & follow up on grant proposal"
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              {/* Description / Deliverables */}
              <div className="space-y-1">
                <label className="text-muted-foreground font-mono uppercase text-[10px]">
                  Context & Deliverables
                </label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Specific action items, agenda items, or deliverables promised..."
                  className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              {/* Due Date & Time, Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">
                    Due Date & Time *
                  </label>
                  <input
                    required
                    type="datetime-local"
                    name="dueDate"
                    defaultValue={getDefaultDateTime()}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px]">
                    Priority *
                  </label>
                  <select
                    name="priority"
                    defaultValue="medium"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs capitalize"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
              </div>

              {/* Optional Originating Interaction Selector */}
              {selectedContactId && contactInteractions.length > 0 && (
                <div className="space-y-1 pt-1">
                  <label className="text-muted-foreground font-mono uppercase text-[10px] flex items-center gap-1">
                    <MessageSquareShare className="w-3 h-3 text-primary" />
                    Originating Touchpoint (Optional)
                  </label>
                  <select
                    name="interactionId"
                    defaultValue={initialInteractionId || ''}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="">None (Independent Task)</option>
                    {contactInteractions.map((inter: any) => {
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
                  {loading ? 'Scheduling...' : 'Save Follow-up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
