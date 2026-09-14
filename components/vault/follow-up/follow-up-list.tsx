'use client'

import Link from 'next/link'
import {
  CheckSquare,
  Calendar,
  Clock,
  AlertCircle,
  User,
  Building2,
  CheckCircle2,
  MessageSquareShare,
  ArrowRight
} from 'lucide-react'
import { FollowUpToggleButton } from './follow-up-toggle-button'
import { FollowUpCreateButton } from './follow-up-create-button'

interface FollowUpListProps {
  followUps: any[]
  hasActiveFilters: boolean
  workspaceId?: string
  workspaceName?: string
  contacts: any[]
  interactions?: any[]
}

export function FollowUpList({
  followUps,
  hasActiveFilters,
  workspaceId,
  workspaceName,
  contacts,
  interactions = [],
}: FollowUpListProps) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  if (followUps.length === 0) {
    if (hasActiveFilters) {
      return (
        <div className="py-16 text-center text-muted-foreground text-xs bg-card border border-border rounded-xl px-4 space-y-2">
          <CheckSquare className="w-8 h-8 mx-auto opacity-30" />
          <p className="font-medium text-foreground text-sm">No follow-ups found</p>
          <p className="max-w-md mx-auto">
            No action items match your current search or filter criteria. Try adjusting keywords or resetting filters.
          </p>
          <div className="pt-2">
            <Link
              href="/vault/follow-ups"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
            >
              Clear filters
            </Link>
          </div>
        </div>
      )
    }

    return (
      <div className="py-16 text-center text-muted-foreground text-xs bg-card border border-border rounded-xl px-4 space-y-2">
        <CheckSquare className="w-8 h-8 mx-auto opacity-30" />
        <p className="font-medium text-foreground text-sm">No follow-ups scheduled</p>
        <p className="max-w-md mx-auto">
          Ensure no professional conversation goes cold. Schedule your first action commitment for this workspace.
        </p>
        <div className="pt-2">
          <FollowUpCreateButton
            workspaceId={workspaceId}
            workspaceName={workspaceName}
            contacts={contacts}
            interactions={interactions}
          />
        </div>
      </div>
    )
  }

  // Bucket follow-ups into categories if not filtered by specific status/date_state
  const overdue: any[] = []
  const dueToday: any[] = []
  const upcoming: any[] = []
  const completed: any[] = []

  followUps.forEach((item) => {
    if (item.status === 'completed') {
      completed.push(item)
    } else if (item.status === 'pending') {
      const dueDate = new Date(item.due_date)
      if (dueDate < startOfToday) {
        overdue.push(item)
      } else if (dueDate <= endOfToday) {
        dueToday.push(item)
      } else {
        upcoming.push(item)
      }
    }
  })

  const renderFollowUpCard = (item: any) => {
    const isCompleted = item.status === 'completed'
    const dueDate = new Date(item.due_date)
    const isOverdue = !isCompleted && dueDate < startOfToday
    const isToday = !isCompleted && dueDate >= startOfToday && dueDate <= endOfToday

    let diffDays = 0
    if (isOverdue) {
      diffDays = Math.ceil((startOfToday.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    }

    return (
      <div
        key={item.id}
        className={`p-4 rounded-xl bg-card border transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
          isCompleted
            ? 'border-border/50 opacity-65 bg-secondary/10'
            : isOverdue
              ? 'border-rose-500/30 bg-rose-500/5 hover:border-rose-500/50'
              : isToday
                ? 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50'
                : 'border-border hover:border-primary/40'
        }`}
      >
        <div className="space-y-2 min-w-0 flex-1">
          {/* Top meta row: Priority, Date state badge, Contact, Company */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-semibold ${
                item.priority === 'urgent'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : item.priority === 'high'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-secondary text-muted-foreground border border-border/60'
              }`}
            >
              {item.priority}
            </span>

            {isOverdue && (
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Overdue by {diffDays} {diffDays === 1 ? 'day' : 'days'}
              </span>
            )}

            {isToday && (
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Due Today
              </span>
            )}

            {isCompleted && (
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Completed
              </span>
            )}
          </div>

          {/* Title */}
          <h3
            className={`text-sm font-medium leading-snug ${
              isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'
            }`}
          >
            {item.title}
          </h3>

          {/* Description */}
          {item.description && (
            <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {item.description}
            </p>
          )}

          {/* Metadata: Contact, Company, Due Date, Originating Touchpoint */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono flex-wrap pt-1">
            <Link
              href={`/vault/contacts/${item.contact?.id || item.contact_id}`}
              className="flex items-center gap-1.5 text-foreground/90 hover:text-primary transition-colors font-sans text-xs group"
            >
              <User className="w-3.5 h-3.5 text-primary" />
              <span className="font-medium group-hover:underline">
                {item.contact?.full_name || 'Contact'}
              </span>
              {item.contact?.role_title && (
                <span className="text-muted-foreground text-[11px]">
                  ({item.contact.role_title})
                </span>
              )}
            </Link>

            {item.contact?.company?.name && (
              <div className="flex items-center gap-1 text-muted-foreground font-sans text-xs">
                <Building2 className="w-3.5 h-3.5" />
                <span>{item.contact.company.name}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span className={isOverdue ? 'text-rose-400 font-bold' : isToday ? 'text-amber-400 font-semibold' : ''}>
                Due: {dueDate.toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            {item.completed_at && (
              <div className="text-emerald-400 text-[11px] font-mono">
                Completed on {new Date(item.completed_at).toLocaleDateString()}
              </div>
            )}

            {/* Originating interaction snippet */}
            {item.interaction && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                <MessageSquareShare className="w-3 h-3 text-primary" />
                <span>
                  Via {item.interaction.channel?.toUpperCase()} ({new Date(item.interaction.interaction_date).toLocaleDateString()})
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 pt-0.5 flex sm:flex-col items-center gap-2">
          <FollowUpToggleButton id={item.id} currentStatus={item.status} />
          <Link
            href={`/vault/contacts/${item.contact?.id || item.contact_id}`}
            className="text-[11px] font-mono text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5"
          >
            <span>View Profile</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overdue Section */}
      {overdue.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-rose-500/20">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-mono uppercase tracking-wider font-semibold">
              <AlertCircle className="w-4 h-4" />
              Overdue Actions ({overdue.length})
            </div>
          </div>
          <div className="space-y-2.5">
            {overdue.map(renderFollowUpCard)}
          </div>
        </div>
      )}

      {/* Due Today Section */}
      {dueToday.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-amber-500/20">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-mono uppercase tracking-wider font-semibold">
              <Clock className="w-4 h-4" />
              Due Today ({dueToday.length})
            </div>
          </div>
          <div className="space-y-2.5">
            {dueToday.map(renderFollowUpCard)}
          </div>
        </div>
      )}

      {/* Upcoming Section */}
      {upcoming.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono uppercase tracking-wider">
              <Calendar className="w-4 h-4 text-primary" />
              Upcoming Follow-ups ({upcoming.length})
            </div>
          </div>
          <div className="space-y-2.5">
            {upcoming.map(renderFollowUpCard)}
          </div>
        </div>
      )}

      {/* Completed History Section */}
      {completed.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between pb-1 border-b border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Completed History ({completed.length})
            </div>
          </div>
          <div className="space-y-2.5">
            {completed.map(renderFollowUpCard)}
          </div>
        </div>
      )}
    </div>
  )
}
