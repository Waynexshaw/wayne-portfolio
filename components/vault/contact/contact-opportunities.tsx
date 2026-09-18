import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Clock, 
  Plus, 
  Building2,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'

interface ContactOpportunitiesProps {
  opportunities: any[]
  onOpenCreateOpportunity: () => void
}

export function ContactOpportunities({
  opportunities,
  onOpenCreateOpportunity,
}: ContactOpportunitiesProps) {
  const totalValue = opportunities.reduce<number>(
    (sum, opp) => sum + (Number(opp.value_estimate) || 0),
    0
  )

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-serif text-lg font-medium text-foreground">
            Opportunities
          </h3>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
            {opportunities.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {totalValue > 0 && (
            <span className="text-xs font-mono text-foreground font-medium hidden sm:inline">
              ${totalValue.toLocaleString()} Value
            </span>
          )}
          <button
            onClick={onOpenCreateOpportunity}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/80 hover:bg-secondary text-secondary-foreground border border-border text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-muted-foreground" />
            Create Opportunity
          </button>
        </div>
      </div>

      {opportunities.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground text-xs space-y-2">
          <TrendingUp className="w-8 h-8 mx-auto opacity-30" />
          <p className="font-medium text-foreground text-sm">No opportunities yet.</p>
          <p>Create an opportunity when this relationship turns into active deals, advisory, or mandates.</p>
          <button
            onClick={onOpenCreateOpportunity}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/80 hover:bg-secondary text-foreground text-xs font-medium border border-border transition-colors mt-2"
          >
            <Plus className="w-3.5 h-3.5 text-muted-foreground" />
            Create Opportunity
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {opportunities.map((opp: any) => (
            <div
              key={opp.id}
              className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3 hover:border-primary/40 transition-colors flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                    {opp.type.replace('_', ' ')}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
                      {opp.pipeline_stage}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {opp.probability}%
                    </span>
                  </div>
                </div>

                <h4 className="text-sm font-semibold text-foreground">
                  {opp.title}
                </h4>

                {opp.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {opp.description}
                  </p>
                )}

                {/* Next Action Callout */}
                {opp.next_action && (
                  <div className="p-2 rounded bg-card border border-border/80 text-xs flex items-start gap-1.5">
                    <Clock className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-mono uppercase text-amber-400 font-semibold block">
                        Next Action:
                      </span>
                      <p className="text-foreground/90 font-medium">
                        {opp.next_action}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-border/70 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span>
                  {opp.expected_close_date 
                    ? `Close: ${new Date(opp.expected_close_date).toLocaleDateString()}` 
                    : 'No close date'}
                </span>
                {opp.value_estimate && (
                  <span className="text-foreground font-semibold">
                    ${Number(opp.value_estimate).toLocaleString()} {opp.currency || 'USD'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
