import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getVaultContext } from '@/lib/vault/actions'
import { VaultSidebar, VaultNavProvider } from '@/components/vault/sidebar'
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
    <VaultNavProvider>
      <div className="vault-theme min-h-screen bg-background text-foreground flex">
        <VaultSidebar
          workspaces={vaultContext?.workspaces || []}
          activeWorkspace={vaultContext?.activeWorkspace}
          identities={vaultContext?.identities || []}
          activeIdentity={vaultContext?.activeIdentity}
        />
        <div className="flex-1 ml-0 md:ml-64 flex flex-col min-h-screen min-w-0">
          <VaultHeader
            activeIdentity={vaultContext?.activeIdentity}
            activeWorkspace={vaultContext?.activeWorkspace}
            userEmail={user.email}
          />
          <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto min-w-0">
            {children}
          </main>
        </div>
      </div>
    </VaultNavProvider>
  )
}