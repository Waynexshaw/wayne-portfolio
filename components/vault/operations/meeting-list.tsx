'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  FolderGit2,
  Building2,
  Edit3,
  Archive,
  RotateCcw,
  ChevronRight,
  Video,
} from 'lucide-react'
import { Meeting } from '@/lib/vault/operations/types'
import {
  archiveMeetingAction,
  restoreMeetingAction,
} from '@/lib/vault/operations-actions'
import { VaultStatusBadge } from '@/components/vault/vault-badge'
import { cn } from '@/lib/utils'

interface MeetingListProps {
  meetings: Meeting[]
  workspaceId: string
  isAdmin?: boolean
  onEditMeeting: (meeting: Meeting) => void
  onRefresh?: () => void
}

export function MeetingList({
  meetings,
  workspaceId,
  isAdmin = false,
  onEditMeeting,
  onRefresh,
}: MeetingListProps) {
  const [isPending, startTransition] = useTransition()
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null)

  const handleArchive = (meeting: Meeting) => {
    setActiveMeetingId(meeting.id)
    startTransition(async () => {
      try {
        if (meeting.archived_at) {
          await restoreMeetingAction(workspaceId, meeting.id)
        } else {
          await archiveMeetingAction(workspaceId, meeting.id)
        }
        onRefresh?.()
      } catch (err) {
        console.error('Failed to archive/restore meeting:', err)
      } finally {
        setActiveMeetingId(null)
      }
    })
  }

  if (meetings.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground text-xs bg-card border border-border rounded-xl space-y-2">
        <Video className="w-8 h-8 mx-auto opacity-30 text-primary" />
        <p className="font-medium text-foreground">No meetings found</p>
        <p className="text-muted-foreground/80">Schedule your first meeting or adjust active filters above.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {meetings.map((meeting) => {
        const isActionLoading = isPending && activeMeetingId === meeting.id
        const scheduledDate = new Date(meeting.scheduled_at)

        return (
          <div
            key={meeting.id}
            className={cn(
              'p-4 rounded-xl border bg-card transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group',
              meeting.archived_at
                ? 'opacity-60 border-border/50 bg-secondary/20'
                : 'border-border hover:border-border/90'
            )}
          >
            {/* Left: Meeting Info */}
            <div className="space-y-2 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/vault/operations/meetings/${meeting.id}`}
                  className="text-base font-semibold text-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
                >
                  <span>{meeting.title}</span>
                  <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </Link>
                <VaultStatusBadge status={meeting.status} />
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border capitalize">
                  {meeting.meeting_type}
                </span>
                {meeting.archived_at && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    Archived
                  </span>
                )}
              </div>

              {/* Timing & Channel */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>
                    {scheduledDate.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>
                    {scheduledDate.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                    {meeting.ended_at && (
                      <>
                        {' - '}
                        {new Date(meeting.ended_at).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </>
                    )}
                  </span>
                </div>

                {meeting.location_or_channel && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{meeting.location_or_channel}</span>
                  </div>
                )}
              </div>

              {/* Related metadata */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-secondary/80 text-foreground">
                  <Users className="w-3 h-3 text-primary" />
                  <span>
                    {meeting.participants_count ?? 0} {meeting.participants_count === 1 ? 'Participant' : 'Participants'}
                  </span>
                </div>

                {meeting.project && (
                  <Link
                    href={`/vault/projects/${meeting.project.id}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-secondary/80 hover:bg-secondary text-foreground transition-colors"
                  >
                    <FolderGit2 className="w-3 h-3 text-primary" />
                    <span>{meeting.project.title}</span>
                  </Link>
                )}

                {meeting.company && (
                  <Link
                    href={`/vault/companies/${meeting.company_id}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-secondary/80 hover:bg-secondary text-foreground transition-colors"
                  >
                    <Building2 className="w-3 h-3 text-primary" />
                    <span>{meeting.company.name}</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
              <Link
                href={`/vault/operations/meetings/${meeting.id}`}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm"
              >
                View Meeting
              </Link>

              <button
                type="button"
                onClick={() => onEditMeeting(meeting)}
                disabled={isActionLoading || Boolean(meeting.archived_at)}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
                title="Edit Meeting"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleArchive(meeting)}
                disabled={isActionLoading}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
                title={meeting.archived_at ? 'Restore Meeting' : 'Archive Meeting'}
              >
                {meeting.archived_at ? (
                  <RotateCcw className="w-3.5 h-3.5 text-primary" />
                ) : (
                  <Archive className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
