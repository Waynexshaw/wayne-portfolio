'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/theme-toggle'
import { LogOut, Shield, ChevronRight } from 'lucide-react'

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

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-16 border-b border-border bg-card/40 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-serif font-medium text-foreground">WV</span>
        <ChevronRight className="w-4 h-4 opacity-40" />
        <span className="text-foreground font-medium">{activeWorkspace?.name || 'Vault'}</span>
        {activeWorkspace?.workspace_type && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase font-mono tracking-wider ml-1">
            {activeWorkspace.workspace_type}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Active Identity Badge */}
        {activeIdentity && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/80 border border-border text-xs">
            <Shield className="w-3.5 h-3.5 text-electric" />
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