import Link from 'next/link'
import { TrendingUp, ArrowRight, DollarSign, Layers } from 'lucide-react'

interface PipelineOverviewProps {
  opportunities: any[]
}

const CANONICAL_STAGES = [
  { key: 'lead', label: 'Lead' },
  { key: 'discovery', label: 'Discovery' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
  { key: 'on_hold', label: 'On Hold' },
] as const

export function PipelineOverview({ opportunities }: PipelineOverviewProps) {
  const totalValue = opportunities.reduce<number>(
    (sum, opp) => sum + (Number(opp.value_estimate) || 0), 
    0
  )

  // Stage statistics
  const stageStats: Record<string, { count: number; value: number }> = {}
  CANONICAL_STAGES.forEach((s) => {
    stageStats[s.key] = { count: 0, value: 0 }
  })

  opportunities.forEach((opp) => {
    const stage = opp.pipeline_stage || 'lead'
    if (!stageStats[stage]) {
      stageStats[stage] = { count: 0, value: 0 }
    }
    stageStats[stage].count += 1
    stageStats[stage].value += Number(opp.value_estimate) || 0
  })

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <h3 className="font-serif text-lg font-medium text-foreground">
            Opportunity Pipeline
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-emerald-400 font-medium">
            ${totalValue.toLocaleString()} Pipeline Est.
          </span>
          <Link 
            href="/vault/opportunities"
            className="text-xs font-mono text-primary hover:text-primary/80 flex items-center gap-1"
          >
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Stage Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {CANONICAL_STAGES.map((s) => {
          const count = stageStats[s.key]?.count || 0
          const value = stageStats[s.key]?.value || 0
          const isWon = s.key === 'won'
          const isLost = s.key === 'lost'
          const hasDeals = count > 0

          return (
            <div
              key={s.key}
              className={`p-3 rounded-lg border text-xs flex flex-col justify-between transition-colors ${
                hasDeals 
                  ? isWon 
                    ? 'bg-emerald-500/10 border-emerald-500/30' 
                    : isLost 
                      ? 'bg-rose-500/5 border-rose-500/20' 
                      : 'bg-secondary/40 border-primary/30'
                  : 'bg-secondary/20 border-border/60 opacity-60'
              }`}
            >
              <div>
                <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider mb-1">
                  {s.label}
                </div>
                <div className={`text-lg font-serif font-bold ${
                  hasDeals 
                    ? isWon 
                      ? 'text-emerald-400' 
                      : isLost 
                        ? 'text-rose-400' 
                        : 'text-foreground' 
                    : 'text-muted-foreground'
                }`}>
                  {count}
                </div>
              </div>

              <div className="pt-2 text-[10px] font-mono text-muted-foreground truncate">
                {value > 0 ? `$${value.toLocaleString()}` : '—'}
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty State when zero opportunities */}
      {opportunities.length === 0 && (
        <div className="p-4 rounded-lg bg-secondary/20 border border-border text-center space-y-1">
          <p className="text-xs font-medium text-foreground">No active opportunities.</p>
          <p className="text-[11px] text-muted-foreground">
            Register advisory retainers, investments, or protocol mandates to populate the pipeline.
          </p>
        </div>
      )}
    </div>
  )
}
