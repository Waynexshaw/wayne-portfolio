'use client'

import { createContext, useContext, useState, useEffect } from 'react'
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
  Layers,
  ClipboardList,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { WorkspaceSwitcher } from './workspace-switcher'

interface VaultNavContextType {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

const VaultNavContext = createContext<VaultNavContextType>({
  isOpen: false,
  open: () => {},
  close: () => {},
  toggle: () => {},
})

export function VaultNavProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Auto-close drawer on route change
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Lock body scroll on mobile when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <VaultNavContext.Provider
      value={{
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen((prev) => !prev),
      }}
    >
      {children}
    </VaultNavContext.Provider>
  )
}

export function useVaultNav() {
  return useContext(VaultNavContext)
}

const navItems = [
  { href: '/vault', label: 'Overview', exact: true, icon: LayoutDashboard },
  { href: '/vault/contacts', label: 'Contacts', icon: Users },
  { href: '/vault/companies', label: 'Companies', icon: Building2 },
  { href: '/vault/interactions', label: 'Interactions', icon: MessageSquareShare },
  { href: '/vault/follow-ups', label: 'Follow-ups', icon: CheckSquare },
  { href: '/vault/opportunities', label: 'Opportunities', icon: TrendingUp },
  { href: '/vault/projects', label: 'Projects', icon: FolderGit2 },
  { href: '/vault/operations', label: 'Operations', icon: ClipboardList },
  { href: '/vault/metrics', label: 'Metrics', icon: BarChart3 },
  { href: '/vault/research', label: 'Research', icon: BookOpen },
  { href: '/vault/reviews', label: 'Reviews', icon: RotateCcw },
]

interface SidebarContentProps {
  workspaces: any[]
  activeWorkspace: any
  identities: any[]
  activeIdentity: any
  onNavigate?: () => void
  onClose?: () => void
  isMobile?: boolean
}

function SidebarContent({
  workspaces,
  activeWorkspace,
  identities,
  activeIdentity,
  onNavigate,
  onClose,
  isMobile = false,
}: SidebarContentProps) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div className="p-5 border-b border-[hsl(var(--vault-sidebar-border))] shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--vault-sidebar-active-bg))] border border-[hsl(var(--vault-sidebar-active-border))] flex items-center justify-center font-serif text-lg font-bold text-[hsl(var(--vault-sidebar-active-fg))]">
              WV
            </div>
            <h1 className="font-serif text-base font-medium tracking-tight text-[hsl(var(--vault-sidebar-fg))]">
              Waynex Vault
            </h1>
          </div>

          {isMobile && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[hsl(var(--vault-sidebar-muted))] hover:text-[hsl(var(--vault-sidebar-fg))] hover:bg-[hsl(var(--vault-sidebar-hover))] transition-colors"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
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
              onClick={onNavigate}
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
      <div className="p-3 border-t border-[hsl(var(--vault-sidebar-border))] space-y-1 bg-black/10 shrink-0">
        <Link
          href="/admin"
          onClick={onNavigate}
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
          onClick={onNavigate}
          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-[hsl(var(--vault-sidebar-muted))] hover:text-[hsl(var(--vault-sidebar-fg))] hover:bg-[hsl(var(--vault-sidebar-hover))] transition-colors"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5 text-[hsl(var(--vault-sidebar-active-border))]" />
            Public Portfolio
          </span>
          <span className="text-[10px] font-mono text-[hsl(var(--vault-sidebar-muted))]">Live</span>
        </Link>
      </div>
    </div>
  )
}

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
  const { isOpen, close } = useVaultNav()

  return (
    <>
      {/* Desktop Persistent Sidebar (>= md) */}
      <aside className="hidden md:flex w-64 border-r border-[hsl(var(--vault-sidebar-border))] bg-[hsl(var(--vault-sidebar-bg))] text-[hsl(var(--vault-sidebar-fg))] flex-col fixed inset-y-0 z-30 transition-colors duration-200">
        <SidebarContent
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
          identities={identities}
          activeIdentity={activeIdentity}
        />
      </aside>

      {/* Mobile Backdrop (< md) */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-200 md:hidden',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={close}
        aria-hidden="true"
      />

      {/* Mobile Off-Canvas Drawer (< md) */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] border-r border-[hsl(var(--vault-sidebar-border))] bg-[hsl(var(--vault-sidebar-bg))] text-[hsl(var(--vault-sidebar-fg))] flex flex-col md:hidden shadow-2xl transition-transform duration-200 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation drawer"
      >
        <SidebarContent
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
          identities={identities}
          activeIdentity={activeIdentity}
          onNavigate={close}
          onClose={close}
          isMobile
        />
      </aside>
    </>
  )
}