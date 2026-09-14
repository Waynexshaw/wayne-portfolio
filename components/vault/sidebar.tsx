'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  MessageSquareShare, 
  CheckSquare, 
  TrendingUp, 
  FolderGit2, 
  BookOpen,
  Briefcase, 
  ExternalLink,
  Shield,
  Layers
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { WorkspaceSwitcher } from './workspace-switcher'

const navItems = [
  { href: '/vault', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/vault/contacts', label: 'Contacts', icon: Users },
  { href: '/vault/companies', label: 'Companies', icon: Building2 },
  { href: '/vault/interactions', label: 'Interactions', icon: MessageSquareShare },
  { href: '/vault/follow-ups', label: 'Follow-ups', icon: CheckSquare },
  { href: '/vault/opportunities', label: 'Opportunities', icon: TrendingUp },
  { href: '/vault/projects', label: 'Projects', icon: FolderGit2 },
  { href: '/vault/research', label: 'Research', icon: BookOpen },
]

export function VaultSidebar({ 
  workspaces, 
  activeWorkspace,
  identities,
  activeIdentity
}: { 
  workspaces: any[]
  activeWorkspace: any
  identities: any[]
  activeIdentity: any
}) {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r border-border bg-card/60 backdrop-blur-md flex flex-col fixed inset-y-0 z-30">
      {/* Brand Header */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center font-serif text-lg font-bold text-primary">
            WV
          </div>
          <div>
            <h1 className="font-serif text-base font-medium tracking-tight text-foreground">
              Waynex Vault
            </h1>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              Professional OS
            </p>
          </div>
        </div>

        {/* Interactive Workspace Switcher */}
        <WorkspaceSwitcher
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
          activeIdentity={activeIdentity}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.exact 
            ? pathname === item.href 
            : pathname.startsWith(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/15 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom Switcher Links */}
      <div className="p-3 border-t border-border space-y-1 bg-card/40">
        <Link
          href="/admin"
          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Briefcase className="w-3.5 h-3.5 text-primary" />
            Admin Portfolio CMS
          </span>
          <ExternalLink className="w-3 h-3 opacity-60" />
        </Link>
        <Link
          href="/"
          target="_blank"
          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5 text-electric" />
            Public Portfolio
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">Live</span>
        </Link>
      </div>
    </aside>
  )
}