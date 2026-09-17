'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/theme-toggle'
import { LogOut, Shield, ChevronRight, Menu } from 'lucide-react'
import { useVaultNav } from '@/components/vault/sidebar'

export function VaultHeader({
  activeIdentity,
  activeWorkspace,
  userEmail,
}: {
  activeIdentity?: any
  activeWorkspace?: any
  userEmail?: string
}) {
  const router = useRouter()
  const { toggle, isOpen } = useVaultNav()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-16 border-b border-border bg-card/40 backdrop-blur-md px-4 md:px-8 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-2 sm:gap-3 text-sm text-muted-foreground min-w-0">
        {/* Mobile Menu Trigger (< md) */}
        <button
          type="button"
          onClick={toggle}
          className="p-2 -ml-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors md:hidden shrink-0"
          aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isOpen}
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 truncate">
          <span className="font-serif font-medium text-foreground shrink-0">WV</span>
          <ChevronRight className="w-4 h-4 opacity-40 shrink-0" />
          <span className="text-foreground font-medium truncate">{activeWorkspace?.name || 'Vault'}</span>
          {activeWorkspace?.workspace_type && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase font-mono tracking-wider ml-0.5 shrink-0 hidden sm:inline-block">
              {activeWorkspace.workspace_type}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Active Identity Badge */}
        {activeIdentity && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/80 border border-border text-xs">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span className="text-muted-foreground font-mono">Operating:</span>
            <strong className="text-foreground font-medium">{activeIdentity.name}</strong>
            {activeIdentity.handle && (
              <span className="text-muted-foreground font-mono text-[11px]">{activeIdentity.handle}</span>
            )}
          </div>
        )}

        <ThemeToggle />

        <button
          onClick={handleSignOut}
          title="Sign out"
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}