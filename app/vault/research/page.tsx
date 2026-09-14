import { getVaultContext, getResearchRecords } from '@/lib/vault/actions'
import { ResearchSearchFilters } from '@/components/vault/research/research-search-filters'
import { ResearchList } from '@/components/vault/research/research-list'
import { ResearchCreateButton } from '@/components/vault/research/research-create-button'
import { Database, AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface VaultResearchPageProps {
  searchParams: Promise<{
    q?: string
    status?: string
    type?: string
    priority?: string
  }>
}

export default async function VaultResearchPage({
  searchParams,
}: VaultResearchPageProps) {
  const resolvedParams = await searchParams
  const q = resolvedParams?.q || ''
  const status = resolvedParams?.status || 'all'
  const type = resolvedParams?.type || 'all'
  const priority = resolvedParams?.priority || 'all'

  const context = await getVaultContext()
  const activeWorkspace = context?.activeWorkspace

  let records: any[] = []
  let loadError: string | null = null

  try {
    records = await getResearchRecords(activeWorkspace?.id, {
      q,
      status,
      type,
      priority,
    })
  } catch (err: any) {
    console.error('[Vault Research Error]:', err?.message || err)
    loadError = 'Database query failure encountered while loading research records. This may indicate a pending database migration or connectivity issue.'
  }

  const hasActiveFilters = Boolean(
    q.trim() !== '' ||
    (status && status !== 'all') ||
    (type && type !== 'all') ||
    (priority && priority !== 'all')
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Main Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl font-medium text-foreground">
              Research & Intelligence
            </h1>
            {!loadError && (
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                {records.length} {hasActiveFilters ? 'Found' : 'Total'}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Track inquiries, hypotheses, market investigations, and resulting actions for {activeWorkspace?.name || 'this workspace'}.
          </p>
        </div>

        <ResearchCreateButton
          workspaceId={activeWorkspace?.id}
          workspaceName={activeWorkspace?.name}
        />
      </div>

      {loadError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto text-destructive">
            <Database className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif text-base font-medium text-foreground">
              Database Query Error
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {loadError}
            </p>
          </div>
          <p className="text-[11px] font-mono text-muted-foreground">
            Ensure canonical migration <code className="bg-secondary px-1.5 py-0.5 rounded">007_wv_research.sql</code> has been applied to the database.
          </p>
        </div>
      ) : (
        <>
          {/* Search & Filter Controls */}
          <ResearchSearchFilters
            initialSearch={q}
            initialStatus={status}
            initialType={type}
            initialPriority={priority}
          />

          {/* Research Records Grid */}
          <ResearchList
            records={records}
            hasActiveFilters={hasActiveFilters}
            workspaceId={activeWorkspace?.id}
            workspaceName={activeWorkspace?.name}
          />
        </>
      )}
    </div>
  )
}
