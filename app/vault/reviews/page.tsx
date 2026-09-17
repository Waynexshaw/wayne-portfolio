import { getVaultContext, getReviews } from '@/lib/vault/actions'
import { ReviewSearchFilters } from '@/components/vault/review/review-search-filters'
import { ReviewList } from '@/components/vault/review/review-list'
import { ReviewCreateButton } from './create-button'
import { Database } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface VaultReviewsPageProps {
  searchParams: Promise<{
    q?: string
    status?: string
    type?: string
  }>
}

export default async function VaultReviewsPage({
  searchParams,
}: VaultReviewsPageProps) {
  const resolvedParams = await searchParams
  const q = resolvedParams?.q || ''
  const status = resolvedParams?.status || 'all'
  const type = resolvedParams?.type || 'all'

  const context = await getVaultContext()
  const activeWorkspace = context?.activeWorkspace

  let records: any[] = []
  let loadError: string | null = null

  try {
    records = await getReviews(activeWorkspace?.id, {
      q,
      status,
      type,
    })
  } catch (err: any) {
    console.error('[Vault Reviews Error]:', err?.message || err)
    loadError = 'Database query failure encountered while loading reviews. This may indicate a pending database migration or connectivity issue.'
  }

  const hasActiveFilters = Boolean(
    q.trim() !== '' ||
    (status && status !== 'all') ||
    (type && type !== 'all')
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Main Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="font-serif text-2xl font-medium text-foreground tracking-tight">
            Reviews
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Retrospectives, post-mortems, and iterative learning loops for {activeWorkspace?.name || 'this workspace'}.
          </p>
        </div>

        <ReviewCreateButton
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
            Ensure migration <code className="bg-secondary px-1.5 py-0.5 rounded">010_wv_reviews.sql</code> has been applied to the database.
          </p>
        </div>
      ) : (
        <>
          {/* Search & Filter Controls */}
          <ReviewSearchFilters
            initialSearch={q}
            initialStatus={status}
            initialType={type}
          />

          {/* Reviews List */}
          <ReviewList
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
