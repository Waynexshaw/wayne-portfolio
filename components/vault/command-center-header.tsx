import Link from 'next/link'
import { 
  Building2, 
  Shield, 
  Plus, 
  Users, 
  CheckSquare, 
  TrendingUp, 
  FolderGit2 
} from 'lucide-react'
import { VaultWorkspace, VaultIdentity } from '@/lib/vault/actions'

interface CommandCenterHeaderProps {
  activeWorkspace: VaultWorkspace | null
  activeIdentity: VaultIdentity | null
}

export function CommandCenterHeader({
  activeWorkspace,
  activeIdentity
}: CommandCenterHeaderProps) {
  return (
    <div className="space-y-4 pb-6 border-b border-border">
      {/* Top Title & Context Row */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl font-medium text-foreground tracking-tight">
              Command Center
            </h1>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
              LIVE
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Here&apos;s what needs your attention.
          </p>
        </div>

        {/* Dynamic Context Badges */}
        <div className="flex flex-wrap items-center gap-2.5">
          {activeWorkspace && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border text-xs">
              <span className="text-muted-foreground text-[10px] font-mono uppercase">Workspace</span>
              <span className="font-medium text-foreground">{activeWorkspace.name}</span>
              {activeWorkspace.workspace_type && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-card text-muted-foreground border border-border uppercase">
                  {activeWorkspace.workspace_type}
                </span>
              )}
            </div>
          )}

          {activeIdentity && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border text-xs">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span className="text-muted-foreground text-[10px] font-mono uppercase">Operating As</span>
              <span className="font-medium text-foreground">{activeIdentity.name}</span>
              {activeIdentity.handle && (
                <span className="text-[10px] font-mono text-muted-foreground">
                  @{activeIdentity.handle}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions Toolbar */}
      <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-[11px] font-mono uppercase text-muted-foreground mr-1">
          Quick Actions:
        </span>
        <Link
          href="/vault/interactions"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Log Interaction
        </Link>
        <Link
          href="/vault/follow-ups"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/70 hover:bg-secondary text-secondary-foreground border border-border font-medium transition-colors"
        >
          <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
          Create Follow-up
        </Link>
        <Link
          href="/vault/contacts"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/70 hover:bg-secondary text-secondary-foreground border border-border font-medium transition-colors"
        >
          <Users className="w-3.5 h-3.5 text-blue-400" />
          Add Contact
        </Link>
        <Link
          href="/vault/companies"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/70 hover:bg-secondary text-secondary-foreground border border-border font-medium transition-colors"
        >
          <Building2 className="w-3.5 h-3.5 text-cyan-400" />
          Add Company
        </Link>
        <Link
          href="/vault/opportunities"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/70 hover:bg-secondary text-secondary-foreground border border-border font-medium transition-colors"
        >
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          Create Opportunity
        </Link>
        <Link
          href="/vault/projects"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/70 hover:bg-secondary text-secondary-foreground border border-border font-medium transition-colors"
        >
          <FolderGit2 className="w-3.5 h-3.5 text-purple-400" />
          Create Project
        </Link>
      </div>
    </div>
  )
}
