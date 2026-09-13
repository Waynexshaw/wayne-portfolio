import { getVaultContext, getFollowUps } from '@/lib/vault/actions'
import { CheckSquare, Calendar, User } from 'lucide-react'
import { FollowUpToggleButton } from './toggle-button'

export const dynamic = 'force-dynamic'

export default async function VaultFollowUpsPage() {
  const context = await getVaultContext()
  const activeWorkspace = context?.activeWorkspace
  const followUps = await getFollowUps(activeWorkspace?.id).catch(() => [])

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl font-medium text-foreground">
              Follow-ups & Action Board
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
              {followUps.length} Total
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Ensure no professional conversation goes cold. Scheduled commitments and reminders.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {followUps.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm bg-card border border-border rounded-xl">
            <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No follow-ups scheduled. They will appear here when interactions have follow-up actions set.</p>
          </div>
        ) : (
          followUps.map((item: any) => {
            const isCompleted = item.status === 'completed'
            const dueDate = new Date(item.due_date)
            const isOverdue = !isCompleted && dueDate < new Date()

            return (
              <div 
                key={item.id} 
                className={`p-4 rounded-xl bg-card border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isCompleted 
                    ? 'border-border/50 opacity-60' 
                    : isOverdue 
                      ? 'border-destructive/40 bg-destructive/5' 
                      : 'border-border hover:border-primary/40'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded ${
                      isOverdue 
                        ? 'bg-destructive/20 text-destructive' 
                        : 'bg-secondary text-muted-foreground'
                    }`}>
                      {item.priority}
                    </span>
                    <h3 className={`text-sm font-medium ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {item.title}
                    </h3>
                  </div>

                  {item.description && (
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-primary" />
                      <span>{item.contact?.full_name || 'Contact'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span className={isOverdue ? 'text-destructive font-bold' : ''}>
                        Due: {dueDate.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <FollowUpToggleButton id={item.id} currentStatus={item.status} />
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}