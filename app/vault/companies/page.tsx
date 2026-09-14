import Link from 'next/link'
import { getVaultContext, getCompanies } from '@/lib/vault/actions'
import { Building2, Globe, ExternalLink } from 'lucide-react'
import { CompanyCreateButton } from './create-button'
import { CompanySearchFilters } from '@/components/vault/company/company-search-filters'

export const dynamic = 'force-dynamic'

export default async function VaultCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tier?: string; status?: string }>
}) {
  const resolvedParams = await searchParams
  const q = resolvedParams?.q || ''
  const tier = resolvedParams?.tier || 'all'
  const status = resolvedParams?.status || 'all'

  const context = await getVaultContext()
  const activeWorkspace = context?.activeWorkspace
  const companies = await getCompanies(activeWorkspace?.id, { q, tier, status }).catch(() => [])

  const hasActiveFilters = Boolean(
    q.trim() !== '' || (tier && tier !== 'all') || (status && status !== 'all')
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl font-medium text-foreground">
              Organizations & Ecosystem
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
              {companies.length} {hasActiveFilters ? 'Found' : 'Total'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Global directory of protocols, partner entities, VCs, and companies.
          </p>
        </div>

        <CompanyCreateButton workspaceId={activeWorkspace?.id} />
      </div>

      {/* Search & Filter Toolbar */}
      <CompanySearchFilters
        initialSearch={q}
        initialTier={tier}
        initialStatus={status}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {companies.length === 0 ? (
          hasActiveFilters ? (
            <div className="col-span-full py-16 text-center text-muted-foreground text-sm bg-card border border-border rounded-xl px-4">
              <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="font-medium text-foreground mb-1">No organizations found</p>
              <p className="text-xs text-muted-foreground mb-4">
                No organizations match your current search or filter criteria. Try adjusting your search or clearing filters.
              </p>
              <Link
                href="/vault/companies"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
              >
                Clear filters
              </Link>
            </div>
          ) : (
            <div className="col-span-full py-16 text-center text-muted-foreground text-sm bg-card border border-border rounded-xl px-4">
              <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="font-medium text-foreground mb-1">No organizations yet</p>
              <p className="text-xs text-muted-foreground">
                No organizations registered in this workspace yet. Add companies to begin tracking partnerships and deals.
              </p>
            </div>
          )
        ) : (
          companies.map((company: any) => {
            const wsRel = company.workspace_companies?.[0]

            return (
              <div 
                key={company.id} 
                className="p-5 rounded-xl bg-card border border-border flex flex-col justify-between hover:border-primary/40 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-medium text-foreground">{company.name}</h3>
                      {company.industry && (
                        <p className="text-xs text-muted-foreground">{company.industry}</p>
                      )}
                    </div>
                    {wsRel?.tier && (
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {wsRel.tier.replace('_', ' ')}
                      </span>
                    )}
                  </div>

                  {company.domain && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                      <Globe className="w-3.5 h-3.5 text-electric" />
                      <span>{company.domain}</span>
                    </div>
                  )}

                  {company.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {company.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-mono text-[11px]">
                    Status: {wsRel?.status || 'Prospect'}
                  </span>
                  {company.website && (
                    <a 
                      href={company.website} 
                      target="_blank" 
                      rel="noreferrer"
                      className="p-1 hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}