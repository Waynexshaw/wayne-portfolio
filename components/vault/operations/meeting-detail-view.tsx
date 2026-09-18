'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Edit3,
  Archive,
  RotateCcw,
  CheckCircle2,
  FileText,
  FolderGit2,
  Building2,
  Trash2,
  User,
  Mail,
  Loader2,
} from 'lucide-react'
import { Meeting, Task, Decision } from '@/lib/vault/operations/types'
import {
  archiveMeetingAction,
  restoreMeetingAction,
  removeMeetingParticipantAction,
} from '@/lib/vault/operations-actions'
import { VaultStatusBadge } from '@/components/vault/vault-badge'
import { MeetingModal } from './meeting-modal'
import { ParticipantModal } from './participant-modal'
import { TaskModal } from './task-modal'
import { DecisionModal } from './decision-modal'
import { TaskList } from './task-list'
import { DecisionList } from './decision-list'
import { cn } from '@/lib/utils'

interface MeetingDetailViewProps {
  meeting: Meeting
  workspaceId: string
  isAdmin?: boolean
  linkedTasks?: Task[]
  linkedDecisions?: Decision[]
  projects: { id: string; title: string }[]
  companies: { id: string; name: string }[]
  contacts: { id: string; full_name: string; email?: string | null; role_title?: string | null }[]
}

export function MeetingDetailView({
  meeting,
  workspaceId,
  isAdmin = false,
  linkedTasks = [],
  linkedDecisions = [],
  projects,
  companies,
  contacts,
}: MeetingDetailViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editingDecision, setEditingDecision] = useState<Decision | null>(null)

  const scheduledDate = new Date(meeting.scheduled_at)

  const handleArchive = () => {
    startTransition(async () => {
      try {
        if (meeting.archived_at) {
          await restoreMeetingAction(workspaceId, meeting.id)
        } else {
          await archiveMeetingAction(workspaceId, meeting.id)
        }
        router.refresh()
      } catch (err) {
        console.error('Failed to toggle meeting archive:', err)
      }
    })
  }

  const handleRemoveParticipant = (participantId: string) => {
    if (!confirm('Remove this participant from the meeting?')) return
    startTransition(async () => {
      try {
        await removeMeetingParticipantAction(workspaceId, meeting.id, participantId)
        router.refresh()
      } catch (err) {
        console.error('Failed to remove participant:', err)
      }
    })
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Back Link */}
      <div>
        <Link
          href="/vault/operations?view=meetings"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Operations</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
                {meeting.title}
              </h1>
              <VaultStatusBadge status={meeting.status} />
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border capitalize">
                {meeting.meeting_type}
              </span>
              {meeting.archived_at && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                  Archived
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-mono">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-primary" />
                <span>
                  {scheduledDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-muted-foreground" />
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
                <div className="flex items-center gap-1.5 text-foreground">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>{meeting.location_or_channel}</span>
                </div>
              )}
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsTaskModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDecisionModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium transition-colors shadow-sm"
            >
              <FileText className="w-3.5 h-3.5 text-primary" />
              <span>Record Decision</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEditOpen(true)}
              disabled={isPending || Boolean(meeting.archived_at)}
              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
              title="Edit Meeting"
            >
              <Edit3 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleArchive}
              disabled={isPending}
              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
              title={meeting.archived_at ? 'Restore Meeting' : 'Archive Meeting'}
            >
              {meeting.archived_at ? (
                <RotateCcw className="w-4 h-4 text-primary" />
              ) : (
                <Archive className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Linked project & company strip */}
        {(meeting.project || meeting.company) && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border/80 text-xs text-muted-foreground">
            {meeting.project && (
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px]">PROJECT:</span>
                <Link
                  href={`/vault/projects/${meeting.project.id}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-foreground font-medium transition-colors"
                >
                  <FolderGit2 className="w-3.5 h-3.5 text-primary" />
                  <span>{meeting.project.title}</span>
                </Link>
              </div>
            )}

            {meeting.company && (
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px]">COMPANY:</span>
                <Link
                  href={`/vault/companies/${meeting.company_id}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-foreground font-medium transition-colors"
                >
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  <span>{meeting.company.name}</span>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Grid: Left Notes & Content, Right Participants */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Agenda, Notes, Outcomes, Action Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Agenda */}
          <div className="p-5 rounded-xl bg-card border border-border space-y-2">
            <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Meeting Agenda
            </h2>
            {meeting.agenda ? (
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {meeting.agenda}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground italic">No agenda specified.</p>
            )}
          </div>

          {/* Notes */}
          <div className="p-5 rounded-xl bg-card border border-border space-y-2">
            <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Meeting Notes & Discussion
            </h2>
            {meeting.notes ? (
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {meeting.notes}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground italic">No notes recorded yet.</p>
            )}
          </div>

          {/* Outcomes */}
          <div className="p-5 rounded-xl bg-card border border-border space-y-2">
            <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Key Outcomes & Conclusions
            </h2>
            {meeting.outcomes ? (
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {meeting.outcomes}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground italic">No outcomes recorded yet.</p>
            )}
          </div>

          {/* Linked Decisions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <h2 className="font-serif text-lg font-medium text-foreground">
                  Decisions from this Meeting
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                  {linkedDecisions.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsDecisionModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground transition-colors border border-border"
              >
                <Plus className="w-3 h-3" />
                <span>Record Decision</span>
              </button>
            </div>

            <DecisionList
              decisions={linkedDecisions}
              workspaceId={workspaceId}
              isAdmin={isAdmin}
              onEditDecision={(d) => {
                setEditingDecision(d)
                setIsDecisionModalOpen(true)
              }}
              onRefresh={() => router.refresh()}
            />
          </div>

          {/* Action Items / Linked Tasks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <h2 className="font-serif text-lg font-medium text-foreground">
                  Action Items & Tasks
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                  {linkedTasks.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground transition-colors border border-border"
              >
                <Plus className="w-3 h-3" />
                <span>Add Task</span>
              </button>
            </div>

            <TaskList
              tasks={linkedTasks}
              workspaceId={workspaceId}
              isAdmin={isAdmin}
              onEditTask={(t) => {
                setEditingTask(t)
                setIsTaskModalOpen(true)
              }}
              onRefresh={() => router.refresh()}
            />
          </div>
        </div>

        {/* Right Column: Participants & Overview */}
        <div className="space-y-6">
          {/* Participants Card */}
          <div className="p-5 rounded-xl bg-card border border-border space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <h2 className="font-serif text-base font-medium text-foreground">
                  Participants
                </h2>
                <span className="text-xs font-mono px-1.5 py-0.2 rounded-full bg-secondary text-muted-foreground">
                  {meeting.participants?.length ?? 0}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsParticipantModalOpen(true)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground transition-colors border border-border"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>
            </div>

            {(!meeting.participants || meeting.participants.length === 0) ? (
              <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
                <Users className="w-6 h-6 mx-auto opacity-30 text-muted-foreground" />
                <p>No participants registered yet.</p>
                <button
                  type="button"
                  onClick={() => setIsParticipantModalOpen(true)}
                  className="text-primary hover:underline text-xs font-medium"
                >
                  Add a contact or guest
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {meeting.participants.map((p) => {
                  const isContact = Boolean(p.contact_id && p.contact)
                  const displayName = isContact ? p.contact!.full_name : p.guest_name
                  const displayEmail = isContact ? p.contact!.email : p.guest_email
                  const displayRole = p.role

                  return (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-lg border border-border bg-secondary/30 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {isContact ? (
                            <Link
                              href={`/vault/contacts/${p.contact_id}`}
                              className="font-medium text-foreground hover:text-primary transition-colors truncate"
                            >
                              {displayName}
                            </Link>
                          ) : (
                            <span className="font-medium text-foreground truncate">
                              {displayName}
                            </span>
                          )}
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-secondary text-muted-foreground capitalize">
                            {displayRole}
                          </span>
                        </div>

                        {displayEmail && (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5 truncate">
                            <Mail className="w-3 h-3 shrink-0" />
                            <span className="truncate">{displayEmail}</span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveParticipant(p.id)}
                        disabled={isPending}
                        className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors shrink-0"
                        title="Remove participant"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <MeetingModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        workspaceId={workspaceId}
        meeting={meeting}
        projects={projects}
        companies={companies}
        onSuccess={() => router.refresh()}
      />

      <ParticipantModal
        isOpen={isParticipantModalOpen}
        onClose={() => setIsParticipantModalOpen(false)}
        workspaceId={workspaceId}
        meetingId={meeting.id}
        contacts={contacts}
        onSuccess={() => router.refresh()}
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false)
          setEditingTask(null)
        }}
        workspaceId={workspaceId}
        task={editingTask}
        prefill={{ meetingId: meeting.id, projectId: meeting.project_id }}
        projects={projects}
        meetings={[{ id: meeting.id, title: meeting.title }]}
        decisions={linkedDecisions.map((d) => ({ id: d.id, title: d.title }))}
        onSuccess={() => router.refresh()}
      />

      <DecisionModal
        isOpen={isDecisionModalOpen}
        onClose={() => {
          setIsDecisionModalOpen(false)
          setEditingDecision(null)
        }}
        workspaceId={workspaceId}
        decision={editingDecision}
        prefill={{ meetingId: meeting.id, projectId: meeting.project_id }}
        projects={projects}
        meetings={[{ id: meeting.id, title: meeting.title }]}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
