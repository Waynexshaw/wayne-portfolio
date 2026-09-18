import { getVaultContext, getFollowUps, getContacts, getInteractions } from '@/lib/vault/actions'
import { FollowUpSearchFilters } from '@/components/vault/follow-up/follow-up-search-filters'
import { FollowUpList } from '@/components/vault/follow-up/follow-up-list'
import { FollowUpCreateButton } from '@/components/vault/follow-up/follow-up-create-button'

export const dynamic = 'force-dynamic'

interface VaultFollowUpsPageProps {
  searchParams: Promise<{
    q?: string
    status?: string
    priority?: string
    date_state?: string
  }>
}

export default async function VaultFollowUpsPage({
  searchParams,
}: VaultFollowUpsPageProps) {
  const resolvedParams = await searchParams
  const q = resolvedParams?.q || ''
  const status = resolvedParams?.status || 'all'
  const priority = resolvedParams?.priority || 'all'
  const dateState = resolvedParams?.date_state || 'all'

  const context = await getVaultContext()
  const activeWorkspace = context?.activeWorkspace

  // Parallel fetch: follow-ups, contacts, and recent interactions
  const [followUps, contacts, interactions] = await Promise.all([
    getFollowUps(activeWorkspace?.id, {
      q,
      status,
      priority,
      dateState,
    }).catch(() => []),
    getContacts(activeWorkspace?.id).catch(() => []),
    getInteractions(activeWorkspace?.id).catch(() => []),
  ])

  const hasActiveFilters = Boolean(
    q.trim() !== '' ||
    (status && status !== 'all') ||
    (priority && priority !== 'all') ||
    (dateState && dateState !== 'all')
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Main Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="font-serif text-2xl font-medium text-foreground">
            Follow-ups
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Action items, commitments, and relationship reminders.
          </p>
        </div>

        <FollowUpCreateButton
          workspaceId={activeWorkspace?.id}
          workspaceName={activeWorkspace?.name}
          contacts={contacts}
          interactions={interactions}
        />
      </div>

      {/* Search & Filter Controls */}
      <FollowUpSearchFilters
        initialSearch={q}
        initialStatus={status}
        initialPriority={priority}
        initialDateState={dateState}
      />

      {/* Follow-ups List */}
      <FollowUpList
        followUps={followUps}
        hasActiveFilters={hasActiveFilters}
        workspaceId={activeWorkspace?.id}
        workspaceName={activeWorkspace?.name}
        contacts={contacts}
        interactions={interactions}
      />
    </div>
  )
}