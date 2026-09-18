'use client'

import { useState, useTransition, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Meeting, MeetingType, MeetingStatus } from '@/lib/vault/operations/types'
import { createMeetingAction, updateMeetingAction } from '@/lib/vault/operations-actions'

interface MeetingModalProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
  meeting?: Meeting | null
  prefill?: {
    projectId?: string | null
    companyId?: string | null
  }
  projects?: { id: string; title: string }[]
  companies?: { id: string; name: string }[]
  onSuccess?: (savedMeeting: Meeting) => void
}

export function MeetingModal({
  isOpen,
  onClose,
  workspaceId,
  meeting,
  prefill,
  projects = [],
  companies = [],
  onSuccess,
}: MeetingModalProps) {
  const isEditing = Boolean(meeting)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [meetingType, setMeetingType] = useState<MeetingType>('internal')
  const [status, setStatus] = useState<MeetingStatus>('scheduled')
  const [scheduledAt, setScheduledAt] = useState('')
  const [endedAt, setEndedAt] = useState('')
  const [locationOrChannel, setLocationOrChannel] = useState('')
  const [agenda, setAgenda] = useState('')
  const [notes, setNotes] = useState('')
  const [outcomes, setOutcomes] = useState('')
  const [projectId, setProjectId] = useState<string>('')
  const [companyId, setCompanyId] = useState<string>('')

  useEffect(() => {
    if (meeting) {
      setTitle(meeting.title || '')
      setMeetingType(meeting.meeting_type || 'internal')
      setStatus(meeting.status || 'scheduled')
      // Format ISO string to datetime-local input YYYY-MM-DDTHH:mm
      setScheduledAt(meeting.scheduled_at ? new Date(meeting.scheduled_at).toISOString().slice(0, 16) : '')
      setEndedAt(meeting.ended_at ? new Date(meeting.ended_at).toISOString().slice(0, 16) : '')
      setLocationOrChannel(meeting.location_or_channel || '')
      setAgenda(meeting.agenda || '')
      setNotes(meeting.notes || '')
      setOutcomes(meeting.outcomes || '')
      setProjectId(meeting.project_id || '')
      setCompanyId(meeting.company_id || '')
    } else {
      setTitle('')
      setMeetingType('internal')
      setStatus('scheduled')
      const defaultTime = new Date(Date.now() + 3600 * 1000).toISOString().slice(0, 16)
      setScheduledAt(defaultTime)
      setEndedAt('')
      setLocationOrChannel('')
      setAgenda('')
      setNotes('')
      setOutcomes('')
      setProjectId(prefill?.projectId || '')
      setCompanyId(prefill?.companyId || '')
    }
    setError(null)
  }, [meeting, prefill, isOpen])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Meeting title is required')
      return
    }
    if (!scheduledAt) {
      setError('Scheduled date & time is required')
      return
    }

    const scheduledDate = new Date(scheduledAt)
    let endedDateIso: string | null = null
    if (endedAt) {
      const endedDate = new Date(endedAt)
      if (endedDate < scheduledDate) {
        setError('End time cannot be earlier than start time')
        return
      }
      endedDateIso = endedDate.toISOString()
    }

    setError(null)
    startTransition(async () => {
      try {
        if (isEditing && meeting) {
          const updated = await updateMeetingAction(workspaceId, meeting.id, {
            title: title.trim(),
            meeting_type: meetingType,
            status,
            scheduled_at: scheduledDate.toISOString(),
            ended_at: endedDateIso,
            location_or_channel: locationOrChannel.trim() || null,
            agenda: agenda.trim() || null,
            notes: notes.trim() || null,
            outcomes: outcomes.trim() || null,
            project_id: projectId || null,
            company_id: companyId || null,
          })
          onSuccess?.(updated)
        } else {
          const created = await createMeetingAction(workspaceId, {
            title: title.trim(),
            meeting_type: meetingType,
            status,
            scheduled_at: scheduledDate.toISOString(),
            ended_at: endedDateIso,
            location_or_channel: locationOrChannel.trim() || null,
            agenda: agenda.trim() || null,
            notes: notes.trim() || null,
            outcomes: outcomes.trim() || null,
            project_id: projectId || null,
            company_id: companyId || null,
          })
          onSuccess?.(created)
        }
        onClose()
      } catch (err: any) {
        setError(err.message || 'Failed to save meeting')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-0 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-5 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h2 className="font-serif text-lg font-semibold text-foreground">
            {isEditing ? 'Edit Meeting' : 'Schedule Meeting'}
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

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-foreground mb-1">
              Title <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q4 Strategy Review"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-foreground mb-1">Type</label>
              <select
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value as MeetingType)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary capitalize"
              >
                <option value="internal">Internal</option>
                <option value="external">External</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-foreground mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as MeetingStatus)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary capitalize"
              >
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-foreground mb-1">
                Scheduled Time <span className="text-destructive">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block font-medium text-foreground mb-1">Scheduled End Time</label>
              <input
                type="datetime-local"
                value={endedAt}
                onChange={(e) => setEndedAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1">Location or Channel</label>
            <input
              type="text"
              value={locationOrChannel}
              onChange={(e) => setLocationOrChannel(e.target.value)}
              placeholder="e.g. Google Meet, Zoom, Boardroom A"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1">Agenda</label>
            <textarea
              rows={2}
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="Planned discussion topics..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1">Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Live or post-meeting observations..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1">Outcomes</label>
            <textarea
              rows={2}
              value={outcomes}
              onChange={(e) => setOutcomes(e.target.value)}
              placeholder="Key conclusions and immediate takeaways..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
            <div>
              <label className="block font-medium text-muted-foreground mb-1">Linked Project</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">None (Workspace General)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-muted-foreground mb-1">Linked Company</label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">None</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
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
              <span>{isEditing ? 'Save Changes' : 'Schedule Meeting'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
