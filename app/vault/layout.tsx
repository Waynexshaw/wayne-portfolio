import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getVaultContext } from '@/lib/vault/actions'
import { VaultSidebar } from '@/components/vault/sidebar'
import { VaultHeader } from '@/components/vault/header'

export default async function VaultLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/vault/login')
  }

  const vaultContext = await getVaultContext()

  return (
    <div className="vault-theme min-h-screen bg-background text-foreground flex">
      <VaultSidebar
        workspaces={vaultContext?.workspaces || []}
        activeWorkspace={vaultContext?.activeWorkspace}
        identities={vaultContext?.identities || []}
        activeIdentity={vaultContext?.activeIdentity}
      />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <VaultHeader
          activeIdentity={vaultContext?.activeIdentity}
          activeWorkspace={vaultContext?.activeWorkspace}
          userEmail={user.email}
        />
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}