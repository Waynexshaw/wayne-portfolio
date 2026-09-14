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
  BarChart3,
  BookOpen,
  RotateCcw,
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
  { href: '/vault/metrics', label: 'Metrics', icon: BarChart3 },
  { href: '/vault/research', label: 'Research', icon: BookOpen },
  { href: '/vault/reviews', label: 'Reviews', icon: RotateCcw },
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
    <aside className="w-64 border-r border-[hsl(var(--vault-sidebar-border))] bg-[hsl(var(--vault-sidebar-bg))] text-[hsl(var(--vault-sidebar-fg))] flex flex-col fixed inset-y-0 z-30 transition-colors duration-200">
      {/* Brand Header */}
      <div className="p-5 border-b border-[hsl(var(--vault-sidebar-border))]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[hsl(var(--vault-sidebar-active-bg))] border border-[hsl(var(--vault-sidebar-active-border))] flex items-center justify-center font-serif text-lg font-bold text-[hsl(var(--vault-sidebar-active-fg))]">
            WV
          </div>
          <h1 className="font-serif text-base font-medium tracking-tight text-[hsl(var(--vault-sidebar-fg))]">
            Waynex Vault
          </h1>
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
                  ? 'bg-[hsl(var(--vault-sidebar-active-bg))] text-[hsl(var(--vault-sidebar-active-fg))] border border-[hsl(var(--vault-sidebar-active-border))] font-semibold'
                  : 'text-[hsl(var(--vault-sidebar-muted))] hover:text-[hsl(var(--vault-sidebar-fg))] hover:bg-[hsl(var(--vault-sidebar-hover))]'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom Switcher Links */}
      <div className="p-3 border-t border-[hsl(var(--vault-sidebar-border))] space-y-1 bg-black/10">
        <Link
          href="/admin"
          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-[hsl(var(--vault-sidebar-muted))] hover:text-[hsl(var(--vault-sidebar-fg))] hover:bg-[hsl(var(--vault-sidebar-hover))] transition-colors"
        >
          <span className="flex items-center gap-2">
            <Briefcase className="w-3.5 h-3.5 text-[hsl(var(--vault-sidebar-active-border))]" />
            Admin Portfolio CMS
          </span>
          <ExternalLink className="w-3 h-3 opacity-60" />
        </Link>
        <Link
          href="/"
          target="_blank"
          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-[hsl(var(--vault-sidebar-muted))] hover:text-[hsl(var(--vault-sidebar-fg))] hover:bg-[hsl(var(--vault-sidebar-hover))] transition-colors"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5 text-[hsl(var(--vault-sidebar-active-border))]" />
            Public Portfolio
          </span>
          <span className="text-[10px] font-mono text-[hsl(var(--vault-sidebar-muted))]">Live</span>
        </Link>
      </div>
    </aside>
  )
}