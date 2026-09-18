import { 
  MessageSquareShare, 
  ArrowUpRight, 
  ArrowDownLeft, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Shield, 
  Plus,
  Calendar,
  Smile
} from 'lucide-react'

interface ContactTimelineProps {
  interactions: any[]
  onOpenLogInteraction: () => void
}

export function ContactTimeline({
  interactions,
  onOpenLogInteraction,
}: ContactTimelineProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquareShare className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-serif text-lg font-medium text-foreground">
            Relationship Timeline
          </h3>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
            {interactions.length} Touchpoints
          </span>
        </div>

        <button
          onClick={onOpenLogInteraction}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Log Interaction
        </button>
      </div>

      {/* Timeline List */}
      {interactions.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-xs space-y-3">
          <MessageSquareShare className="w-8 h-8 mx-auto opacity-30" />
          <div className="space-y-1">
            <p className="font-medium text-foreground text-sm">No interactions recorded yet.</p>
            <p>Start recording conversations, emails, calls, and direct messages to build this history.</p>
          </div>
          <button
            onClick={onOpenLogInteraction}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Log First Touchpoint
          </button>
        </div>
      ) : (
        <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-border/60">
          {interactions.map((item: any) => {
            const date = new Date(item.interaction_date)
            const isOutbound = item.direction === 'outbound'
            const isInbound = item.direction === 'inbound'

            return (
              <div key={item.id} className="relative flex items-start gap-4 pl-1">
                {/* Node icon */}
                <div className="w-6 h-6 rounded-full bg-card border-2 border-primary flex items-center justify-center shrink-0 z-10">
                  {isOutbound && <ArrowUpRight className="w-3 h-3 text-primary" />}
                  {isInbound && <ArrowDownLeft className="w-3 h-3 text-muted-foreground" />}
                  {!isOutbound && !isInbound && <FileText className="w-3 h-3 text-muted-foreground" />}
                </div>

                {/* Content Box */}
                <div className="flex-1 p-4 rounded-xl bg-secondary/30 border border-border/80 space-y-2.5 hover:border-primary/40 transition-colors">
                  {/* Top Bar: Date, Channel, Direction, Purpose */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-foreground font-semibold">
                        {date.toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-secondary text-foreground font-medium border border-border">
                        {item.direction} · {item.channel}
                      </span>
                      {item.purpose && (
                        <span className="text-muted-foreground truncate">
                          ({item.purpose})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      {item.sentiment && (
                        <span className="px-1.5 py-0.5 rounded bg-secondary text-muted-foreground capitalize">
                          {item.sentiment}
                        </span>
                      )}
                      {item.status && (
                        <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase">
                          {item.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Subject if present */}
                  {item.subject && (
                    <h4 className="text-xs font-semibold text-foreground">
                      {item.subject}
                    </h4>
                  )}

                  {/* Content / Message */}
                  <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {item.content}
                  </p>

                  {/* Response / Outcome Box */}
                  {item.response && (
                    <div className="p-2.5 rounded-lg bg-card border border-border text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-mono uppercase font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Outcome / Response
                      </div>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {item.response}
                      </p>
                    </div>
                  )}

                  {/* Next Action Callout */}
                  {item.next_action && (
                    <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs flex items-start gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-mono uppercase text-amber-400 font-semibold block">
                          Next Action Required
                        </span>
                        <p className="text-foreground/90 font-medium">
                          {item.next_action}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Footer metadata: operating identity & follow up */}
                  <div className="pt-2 border-t border-border/60 flex flex-wrap items-center justify-between text-[11px] font-mono text-muted-foreground gap-2">
                    <div className="flex items-center gap-1.5">
                      {item.identity && (
                        <span className="flex items-center gap-1 text-foreground/80">
                          <Shield className="w-3 h-3 text-primary" />
                          Identity: {item.identity.name}
                        </span>
                      )}
                    </div>

                    {item.follow_up_at && (
                      <span className="flex items-center gap-1 text-amber-400">
                        <Calendar className="w-3 h-3" />
                        Follow-up scheduled: {new Date(item.follow_up_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
