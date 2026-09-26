import { redirect } from 'next/navigation'
import { getVaultContextCached } from '@/lib/vault/context'
import { getShawConversationsAction, getShawUserPreferencesAction } from '@/lib/vault/shaw-actions'
import { ShawWorkspace } from '@/components/vault/shaw/shaw-workspace'

export const metadata = {
  title: 'SHAW — Waynex Vault',
  description: 'Native intelligence and reasoning layer for Waynex Vault',
}

export default async function ShawPage() {
  const context = await getVaultContextCached()

  if (!context || !context.user) {
    redirect('/vault/login')
  }

  const activeWorkspace = context.activeWorkspace
  if (!activeWorkspace) {
    redirect('/vault')
  }

  // Load conversations and user preferences in parallel
  const [conversations, preferences] = await Promise.all([
    getShawConversationsAction(activeWorkspace.id),
    getShawUserPreferencesAction(activeWorkspace.id),
  ])

  return (
    <div className="space-y-4">
      <ShawWorkspace
        workspaceId={activeWorkspace.id}
        activeIdentity={context.activeIdentity}
        initialConversations={conversations}
        defaultRoutingMode={preferences?.routing_mode || 'auto_free_first'}
      />
    </div>
  )
}
