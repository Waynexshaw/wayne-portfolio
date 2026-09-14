import Link from 'next/link'
import { getVaultContext, getOpportunities, getContacts, getCompanies } from '@/lib/vault/actions'
import { TrendingUp, DollarSign, Calendar, Building2, User, ArrowRight } from 'lucide-react'
import { OpportunityCreateButton } from './create-button'
import { OpportunitySearchFilters } from '@/components/vault/opportunity/opportunity-search-filters'

export const dynamic = 'force-dynamic'

export default async function VaultOpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stage?: string; type?: string }>
}) {
  const resolvedParams = await searchParams
  const q = resolvedParams?.q || ''
  const stage = resolvedParams?.stage || 'all'
  const type = resolvedParams?.type || 'all'

  const context = await getVaultContext()
  const activeWorkspace = context?.activeWorkspace

  const [opportunities, contacts, companies] = await Promise.all([
    getOpportunities(activeWorkspace?.id, { q, stage, type }).catch(() => []),
    getContacts(activeWorkspace?.id).catch(() => []),
    getCompanies(activeWorkspace?.id).catch(() => []),
  ])

  const oppList: any[] = opportunities || []
  const totalValue = oppList.reduce<number>((sum, opp) => sum + (Number(opp.value_estimate) || 0), 0)

  const hasActiveFilters = Boolean(
    q.trim() !== '' || (stage && stage !== 'all') || (type && type !== 'all')
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl font-medium text-foreground">
              Mandates & Deal Pipeline
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
              {opportunities.length} {hasActiveFilters ? 'Found' : 'Total'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Tracking advisory retainers, growth partnerships, investments, and protocol mandates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-card border border-border flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="text-[10px] font-mono uppercase text-muted-foreground">Estimated Pipeline Value</div>
              <div className="text-lg font-bold font-serif text-foreground">${totalValue.toLocaleString()}</div>
            </div>
          </div>

          <OpportunityCreateButton
            workspaceId={activeWorkspace?.id}
            workspaceName={activeWorkspace?.name}
            contacts={contacts}
            companies={companies}
          />
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <OpportunitySearchFilters
        initialSearch={q}
        initialStage={stage}
        initialType={type}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {opportunities.length === 0 ? (
          hasActiveFilters ? (
            <div className="col-span-full py-16 text-center text-muted-foreground text-sm bg-card border border-border rounded-xl px-4">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="font-medium text-foreground mb-1">No opportunities found</p>
              <p className="text-xs text-muted-foreground mb-4">
                No opportunities match your current search or filter criteria. Try adjusting your search or clearing filters.
              </p>
              <Link
                href="/vault/opportunities"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
              >
                Clear filters
              </Link>
            </div>
          ) : (
            <div className="col-span-full py-16 text-center text-muted-foreground text-sm bg-card border border-border rounded-xl px-4">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="font-medium text-foreground mb-1">No opportunities yet</p>
              <p className="text-xs text-muted-foreground">
                Create your first opportunity to start building your deal pipeline in this workspace.
              </p>
            </div>
          )
        ) : (
          opportunities.map((opp: any) => (
            <div 
              key={opp.id} 
              className="p-5 rounded-xl bg-card border border-border space-y-4 hover:border-primary/40 transition-colors flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                    {opp.type.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
                    {opp.pipeline_stage}
                  </span>
                </div>

                <h3 className="text-base font-medium text-foreground">{opp.title}</h3>

                {opp.value_estimate && (
                  <div className="text-xl font-bold font-serif text-emerald-400">
                    ${Number(opp.value_estimate).toLocaleString()} <span className="text-xs text-muted-foreground font-sans font-normal">{opp.currency}</span>
                  </div>
                )}

                {/* Probability gauge */}
                <div>
                  <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                    <span>Win Probability</span>
                    <span className="font-mono">{opp.probability}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-emerald-400 h-full rounded-full"
                      style={{ width: `${opp.probability}%` }}
                    />
                  </div>
                </div>

                {opp.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 pt-1">
                    {opp.description}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-border space-y-1.5 text-xs text-muted-foreground">
                {opp.contact && (
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span>{opp.contact.full_name}</span>
                  </div>
                )}
                {opp.company && (
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-electric" />
                    <span>{opp.company.name}</span>
                  </div>
                )}
                {opp.next_action && (
                  <div className="text-[11px] text-foreground pt-1 flex items-center gap-1">
                    <ArrowRight className="w-3 h-3 text-primary" />
                    <span>Next: {opp.next_action}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}