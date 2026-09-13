import { getVaultContext, getCompanies } from '@/lib/vault/actions'
import { Building2, Globe, ExternalLink } from 'lucide-react'
import { CompanyCreateButton } from './create-button'

export const dynamic = 'force-dynamic'

export default async function VaultCompaniesPage() {
  const context = await getVaultContext()
  const activeWorkspace = context?.activeWorkspace
  const companies = await getCompanies(activeWorkspace?.id).catch(() => [])

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl font-medium text-foreground">
              Organizations & Ecosystem
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
              {companies.length} Total
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Global directory of protocols, partner entities, VCs, and companies.
          </p>
        </div>

        <CompanyCreateButton workspaceId={activeWorkspace?.id} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {companies.length === 0 ? (
          <div className="col-span-full py-16 text-center text-muted-foreground text-sm bg-card border border-border rounded-xl">
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No organizations registered yet. Add companies to track partnerships and deals.</p>
          </div>
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