'use client'

import { useState, useTransition } from 'react'
import { X, Loader2, User, Mail } from 'lucide-react'
import { ParticipantRole, MeetingParticipant } from '@/lib/vault/operations/types'
import { addMeetingParticipantAction } from '@/lib/vault/operations-actions'

interface ParticipantModalProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
  meetingId: string
  contacts?: { id: string; full_name: string; email?: string | null; role_title?: string | null }[]
  onSuccess?: (participant: MeetingParticipant) => void
}

export function ParticipantModal({
  isOpen,
  onClose,
  workspaceId,
  meetingId,
  contacts = [],
  onSuccess,
}: ParticipantModalProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [mode, setMode] = useState<'contact' | 'guest'>('contact')
  const [contactId, setContactId] = useState<string>('')
  const [guestName, setGuestName] = useState<string>('')
  const [guestEmail, setGuestEmail] = useState<string>('')
  const [role, setRole] = useState<ParticipantRole>('attendee')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (mode === 'contact' && !contactId) {
      setError('Please select a contact')
      return
    }

    if (mode === 'guest' && !guestName.trim()) {
      setError('Please provide a guest name')
      return
    }

    startTransition(async () => {
      try {
        const participant = await addMeetingParticipantAction(workspaceId, meetingId, {
          contact_id: mode === 'contact' ? contactId : null,
          guest_name: mode === 'guest' ? guestName.trim() : null,
          guest_email: mode === 'guest' && guestEmail.trim() ? guestEmail.trim() : null,
          role,
        })
        onSuccess?.(participant)
        onClose()
      } catch (err: any) {
        setError(err.message || 'Failed to add participant')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-0">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h2 className="font-serif text-lg font-semibold text-foreground">
            Add Meeting Participant
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Identity mode toggle: Contact vs Guest */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-secondary/60 border border-border text-xs">
          <button
            type="button"
            onClick={() => setMode('contact')}
            className={`py-1.5 rounded-md font-medium transition-colors ${
              mode === 'contact'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Existing Contact
          </button>
          <button
            type="button"
            onClick={() => setMode('guest')}
            className={`py-1.5 rounded-md font-medium transition-colors ${
              mode === 'guest'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            External Guest
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {mode === 'contact' ? (
            <div>
              <label className="block font-medium text-foreground mb-1">
                Select Contact <span className="text-destructive">*</span>
              </label>
              <select
                required
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Choose a contact...</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} {c.role_title ? `(${c.role_title})` : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div>
                <label className="block font-medium text-foreground mb-1">
                  Guest Name <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">
                  Guest Email (Optional)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block font-medium text-foreground mb-1">Participant Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as ParticipantRole)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary capitalize"
            >
              <option value="organizer">Organizer</option>
              <option value="attendee">Attendee</option>
              <option value="speaker">Speaker</option>
              <option value="observer">Observer</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Add Participant</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
