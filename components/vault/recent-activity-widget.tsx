import Link from 'next/link'
import { 
  MessageSquareShare, 
  ArrowRight, 
  User, 
  ArrowUpRight, 
  ArrowDownLeft, 
  FileText,
  CheckCircle2
} from 'lucide-react'

interface RecentActivityWidgetProps {
  interactions: any[]
}

export function RecentActivityWidget({ interactions }: RecentActivityWidgetProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquareShare className="w-4 h-4 text-primary" />
          <h3 className="font-serif text-lg font-medium text-foreground">
            Recent Touchpoints & Activity
          </h3>
        </div>
        <Link 
          href="/vault/interactions"
          className="text-xs font-mono text-primary hover:text-primary/80 flex items-center gap-1"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Interactions List */}
      {interactions.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground text-xs space-y-1">
          <p className="font-medium text-foreground">No recent activity.</p>
          <p>Logged conversations, messages, and meeting notes will appear here chronologically.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {interactions.slice(0, 5).map((item) => {
            const date = new Date(item.interaction_date)
            const isOutbound = item.direction === 'outbound'
            const isInbound = item.direction === 'inbound'

            return (
              <div
                key={item.id}
                className="p-3 rounded-lg bg-secondary/30 border border-border/70 space-y-1.5 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex items-center gap-1 text-sm font-medium text-foreground truncate">
                      <User className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{item.contact?.full_name || 'Unknown Contact'}</span>
                    </div>

                    {item.purpose && (
                      <span className="text-xs text-muted-foreground hidden sm:inline truncate">
                        · {item.purpose}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border flex items-center gap-1">
                      {isOutbound && <ArrowUpRight className="w-3 h-3 text-blue-400" />}
                      {isInbound && <ArrowDownLeft className="w-3 h-3 text-emerald-400" />}
                      {!isOutbound && !isInbound && <FileText className="w-3 h-3 text-muted-foreground" />}
                      {item.channel}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2">
                  {item.content}
                </p>

                {item.response && (
                  <div className="p-2 rounded bg-card border border-border/60 text-xs flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-muted-foreground line-clamp-1">
                      <span className="font-semibold text-foreground/80">Response:</span> {item.response}
                    </span>
                  </div>
                )}

                <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                  <span>{date.toLocaleString()}</span>
                  {item.identity && (
                    <span>via @{item.identity.name}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
