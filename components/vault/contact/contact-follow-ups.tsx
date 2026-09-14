import { 
  CheckSquare, 
  Calendar, 
  Clock, 
  AlertCircle, 
  Plus, 
  CheckCircle2 
} from 'lucide-react'
import { FollowUpToggleButton } from '@/app/vault/follow-ups/toggle-button'

interface ContactFollowUpsProps {
  followUps: any[]
  onOpenCreateFollowUp: () => void
}

export function ContactFollowUps({
  followUps,
  onOpenCreateFollowUp,
}: ContactFollowUpsProps) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

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

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-amber-400" />
          <h3 className="font-serif text-lg font-medium text-foreground">
            Follow-ups & Commitments
          </h3>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
            {followUps.length} Total
          </span>
        </div>

        <button
          onClick={onOpenCreateFollowUp}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/80 hover:bg-secondary text-secondary-foreground border border-border text-xs font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5 text-amber-400" />
          Create Follow-up
        </button>
      </div>

      {followUps.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground text-xs space-y-2">
          <CheckSquare className="w-8 h-8 mx-auto opacity-30" />
          <p className="font-medium text-foreground text-sm">No follow-ups scheduled.</p>
          <p>Nothing is waiting on this relationship. Schedule a commitment or reminder.</p>
          <button
            onClick={onOpenCreateFollowUp}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/80 hover:bg-secondary text-foreground text-xs font-medium border border-border transition-colors mt-2"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            Create Follow-up
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Overdue */}
          {overdue.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-rose-400 font-semibold">
                <AlertCircle className="w-3.5 h-3.5" />
                Overdue ({overdue.length})
              </div>
              <div className="space-y-2">
                {overdue.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/20 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{item.title}</span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-semibold">
                          {item.priority}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-muted-foreground text-[11px]">{item.description}</p>
                      )}
                      <div className="text-[11px] font-mono text-rose-400 font-medium">
                        Due: {new Date(item.due_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="shrink-0 pt-0.5">
                      <FollowUpToggleButton id={item.id} currentStatus={item.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Due Today */}
          {dueToday.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-amber-400 font-semibold">
                <Clock className="w-3.5 h-3.5" />
                Due Today ({dueToday.length})
              </div>
              <div className="space-y-2">
                {dueToday.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{item.title}</span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold">
                          {item.priority}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-muted-foreground text-[11px]">{item.description}</p>
                      )}
                      <div className="text-[11px] font-mono text-amber-400">
                        Scheduled for today
                      </div>
                    </div>
                    <div className="shrink-0 pt-0.5">
                      <FollowUpToggleButton id={item.id} currentStatus={item.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-muted-foreground">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Upcoming ({upcoming.length})
              </div>
              <div className="space-y-2">
                {upcoming.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-secondary/30 border border-border/70 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{item.title}</span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                          {item.priority}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-muted-foreground text-[11px]">{item.description}</p>
                      )}
                      <div className="text-[11px] font-mono text-muted-foreground">
                        Due: {new Date(item.due_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="shrink-0 pt-0.5">
                      <FollowUpToggleButton id={item.id} currentStatus={item.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed History */}
          {completed.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Completed History ({completed.length})
              </div>
              <div className="space-y-2 opacity-75">
                {completed.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-secondary/20 border border-border/50 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <span className="line-through text-muted-foreground font-medium">
                        {item.title}
                      </span>
                      {item.completed_at && (
                        <div className="text-[10px] font-mono text-emerald-400">
                          Completed on {new Date(item.completed_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 pt-0.5">
                      <FollowUpToggleButton id={item.id} currentStatus={item.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
