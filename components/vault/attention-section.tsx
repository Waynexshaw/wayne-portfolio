import Link from 'next/link'
import { 
  AlertCircle, 
  Clock, 
  Calendar, 
  TrendingUp, 
  User, 
  Building2, 
  ArrowRight,
  Sparkles,
  CheckCircle2
} from 'lucide-react'
import { FollowUpToggleButton } from '@/app/vault/follow-ups/toggle-button'

interface AttentionSectionProps {
  followUps: any[]
  opportunities: any[]
}

export function AttentionSection({
  followUps,
  opportunities
}: AttentionSectionProps) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  // Filter incomplete follow-ups
  const activeFollowUps = followUps.filter((f) => f.status !== 'completed' && f.status !== 'cancelled')

  const overdueFollowUps: any[] = []
  const dueTodayFollowUps: any[] = []
  const upcomingFollowUps: any[] = []

  activeFollowUps.forEach((item) => {
    const dueDate = new Date(item.due_date)
    if (dueDate < startOfToday) {
      overdueFollowUps.push(item)
    } else if (dueDate <= endOfToday) {
      dueTodayFollowUps.push(item)
    } else {
      upcomingFollowUps.push(item)
    }
  })

  // Opportunities requiring attention: active stages with next action or close dates
  const attentionOpportunities = opportunities.filter((opp) => {
    const isActiveStage = ['lead', 'discovery', 'proposal', 'negotiation', 'on_hold'].includes(opp.pipeline_stage)
    return isActiveStage && (Boolean(opp.next_action) || Boolean(opp.expected_close_date))
  }).slice(0, 5)

  const hasAnyAttentionItems = 
    overdueFollowUps.length > 0 || 
    dueTodayFollowUps.length > 0 || 
    upcomingFollowUps.length > 0 || 
    attentionOpportunities.length > 0

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h2 className="font-serif text-xl font-medium text-foreground tracking-tight">
            Attention & Action Queue
          </h2>
        </div>
        <span className="text-xs font-mono text-muted-foreground">
          {overdueFollowUps.length > 0 ? (
            <span className="text-rose-400 font-semibold">{overdueFollowUps.length} Overdue</span>
          ) : (
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> No overdue items
            </span>
          )}
        </span>
      </div>

      {!hasAnyAttentionItems ? (
        <div className="p-8 rounded-xl bg-card border border-border text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-70" />
          <p className="text-sm font-medium text-foreground">No pending items requiring attention.</p>
          <p className="text-xs text-muted-foreground">
            All follow-ups are completed and opportunities have no pending actions in this workspace.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Column 1: Follow-Ups (Overdue, Due Today, Upcoming) */}
          <div className="space-y-4">
            {/* Overdue Items */}
            {overdueFollowUps.length > 0 && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-rose-500/20">
                  <div className="flex items-center gap-2 text-rose-400 text-xs font-mono uppercase tracking-wider font-semibold">
                    <AlertCircle className="w-4 h-4" />
                    Overdue Follow-ups ({overdueFollowUps.length})
                  </div>
                  <Link 
                    href="/vault/follow-ups" 
                    className="text-[11px] font-mono text-rose-400 hover:text-rose-300 flex items-center gap-1"
                  >
                    View all <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="space-y-2.5">
                  {overdueFollowUps.map((item) => {
                    const dueDate = new Date(item.due_date)
                    const diffDays = Math.ceil((startOfToday.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
                    const companyName = item.contact?.company?.name

                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg bg-card/80 border border-rose-500/20 flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground truncate">
                              {item.title}
                            </span>
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-semibold">
                              {item.priority}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            <div className="flex items-center gap-1 text-foreground/90">
                              <User className="w-3.5 h-3.5 text-primary" />
                              <span>{item.contact?.full_name || 'Contact'}</span>
                            </div>
                            {companyName && (
                              <div className="flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>{companyName}</span>
                              </div>
                            )}
                            <span className="text-rose-400 font-mono text-[11px] font-semibold">
                              Overdue by {diffDays} {diffDays === 1 ? 'day' : 'days'} ({dueDate.toLocaleDateString()})
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 pt-0.5">
                          <FollowUpToggleButton id={item.id} currentStatus={item.status} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Due Today */}
            {dueTodayFollowUps.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-mono uppercase tracking-wider font-semibold">
                    <Clock className="w-4 h-4" />
                    Due Today ({dueTodayFollowUps.length})
                  </div>
                  <Link 
                    href="/vault/follow-ups" 
                    className="text-[11px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    View all <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="space-y-2.5">
                  {dueTodayFollowUps.map((item) => {
                    const companyName = item.contact?.company?.name

                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg bg-card/80 border border-amber-500/20 flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground truncate">
                              {item.title}
                            </span>
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold">
                              {item.priority}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            <div className="flex items-center gap-1 text-foreground/90">
                              <User className="w-3.5 h-3.5 text-primary" />
                              <span>{item.contact?.full_name || 'Contact'}</span>
                            </div>
                            {companyName && (
                              <div className="flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>{companyName}</span>
                              </div>
                            )}
                            <span className="text-amber-400 font-mono text-[11px] font-medium">
                              Today
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 pt-0.5">
                          <FollowUpToggleButton id={item.id} currentStatus={item.status} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Upcoming Follow-ups */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono uppercase tracking-wider">
                  <Calendar className="w-4 h-4 text-primary" />
                  Upcoming Follow-ups ({upcomingFollowUps.length})
                </div>
                <Link 
                  href="/vault/follow-ups" 
                  className="text-[11px] font-mono text-primary hover:text-primary/80 flex items-center gap-1"
                >
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {upcomingFollowUps.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3 text-center">
                  No upcoming follow-ups scheduled beyond today.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {upcomingFollowUps.slice(0, 3).map((item) => {
                    const dueDate = new Date(item.due_date)
                    const companyName = item.contact?.company?.name

                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg bg-secondary/30 border border-border/80 flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground truncate">
                              {item.title}
                            </span>
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                              {item.priority}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            <div className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-primary" />
                              <span>{item.contact?.full_name || 'Contact'}</span>
                            </div>
                            {companyName && (
                              <div className="flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>{companyName}</span>
                              </div>
                            )}
                            <span className="font-mono text-[11px] text-muted-foreground">
                              Due: {dueDate.toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 pt-0.5">
                          <FollowUpToggleButton id={item.id} currentStatus={item.status} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Opportunities Requiring Attention */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-border mb-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono uppercase tracking-wider">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Opportunities Requiring Attention ({attentionOpportunities.length})
                </div>
                <Link 
                  href="/vault/opportunities" 
                  className="text-[11px] font-mono text-primary hover:text-primary/80 flex items-center gap-1"
                >
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {attentionOpportunities.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-xs space-y-1">
                  <p className="font-medium text-foreground">No active opportunities require action.</p>
                  <p>Opportunities with defined next actions or close dates will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {attentionOpportunities.map((opp) => (
                    <div 
                      key={opp.id}
                      className="p-3.5 rounded-lg bg-secondary/30 border border-border space-y-2 hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <h4 className="text-sm font-medium text-foreground">
                            {opp.title}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {opp.contact && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3 text-primary" />
                                {opp.contact.full_name}
                              </span>
                            )}
                            {opp.company && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-cyan-400" />
                                {opp.company.name}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
                            {opp.pipeline_stage}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {opp.probability}% win prob
                          </span>
                        </div>
                      </div>

                      {/* Next Action Callout */}
                      {opp.next_action && (
                        <div className="p-2 rounded bg-card border border-border/80 flex items-start gap-2">
                          <span className="text-[10px] font-mono uppercase text-amber-400 font-semibold shrink-0 mt-0.5">
                            Next Action:
                          </span>
                          <p className="text-xs text-foreground/90 leading-tight">
                            {opp.next_action}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-1">
                        <span>
                          {opp.expected_close_date 
                            ? `Target Close: ${new Date(opp.expected_close_date).toLocaleDateString()}` 
                            : 'No target date set'}
                        </span>
                        {opp.value_estimate && (
                          <span className="text-emerald-400 font-medium">
                            ${Number(opp.value_estimate).toLocaleString()} {opp.currency || 'USD'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
              <span className="text-muted-foreground text-[11px]">
                Tracking active deals, partnerships & advisory retainers
              </span>
              <Link 
                href="/vault/opportunities"
                className="text-primary hover:underline font-mono text-[11px]"
              >
                Pipeline Manager →
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
