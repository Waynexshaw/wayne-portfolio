import { getVaultContext, getInteractions, getContacts } from '@/lib/vault/actions'
import { InteractionSearchFilters } from '@/components/vault/interaction/interaction-search-filters'
import { InteractionList } from '@/components/vault/interaction/interaction-list'
import { InteractionCreateButton } from '@/components/vault/interaction/interaction-create-button'

export const dynamic = 'force-dynamic'

interface VaultInteractionsPageProps {
  searchParams: Promise<{
    q?: string
    channel?: string
    direction?: string
    identity?: string
  }>
}

export default async function VaultInteractionsPage({
  searchParams,
}: VaultInteractionsPageProps) {
  const resolvedParams = await searchParams
  const q = resolvedParams?.q || ''
  const channel = resolvedParams?.channel || 'all'
  const direction = resolvedParams?.direction || 'all'
  const identity = resolvedParams?.identity || 'all'

  const context = await getVaultContext()
  const activeWorkspace = context?.activeWorkspace

  // Query interactions scoped to active workspace with filters
  const [interactions, contacts] = await Promise.all([
    getInteractions(activeWorkspace?.id, {
      q,
      channel,
      direction,
      identityId: identity,
    }).catch(() => []),
    getContacts(activeWorkspace?.id).catch(() => []),
  ])

  const hasActiveFilters = Boolean(
    q.trim() !== '' ||
    (channel && channel !== 'all') ||
    (direction && direction !== 'all') ||
    (identity && identity !== 'all')
  )

  const defaultIdentityId = activeWorkspace?.primary_identity?.id || context?.activeIdentity?.id

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Main Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl font-medium text-foreground">
              Interactions & Touchpoints
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
              {interactions.length} {hasActiveFilters ? 'Found' : 'Total'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Complete professional conversational memory across 𝕏, Telegram, LinkedIn, email, and meetings.
          </p>
        </div>

        <InteractionCreateButton
          workspaceId={activeWorkspace?.id}
          workspaceName={activeWorkspace?.name}
          contacts={contacts}
          identities={context?.identities || []}
          defaultIdentityId={defaultIdentityId}
        />
      </div>

      {/* Search & Filter Toolbar */}
      <InteractionSearchFilters
        initialSearch={q}
        initialChannel={channel}
        initialDirection={direction}
        initialIdentity={identity}
        identities={context?.identities || []}
      />

      {/* Interactions Directory List */}
      <InteractionList
        interactions={interactions}
        hasActiveFilters={hasActiveFilters}
        workspaceId={activeWorkspace?.id}
        workspaceName={activeWorkspace?.name}
        contacts={contacts}
        identities={context?.identities || []}
        defaultIdentityId={defaultIdentityId}
      />
    </div>
  )
}