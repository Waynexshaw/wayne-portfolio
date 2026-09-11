'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, FileText, Briefcase, GraduationCap,
  Settings, MessageSquare, Image, Star, BarChart3,
  Wrench, LogOut
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/projects', label: 'Projects', icon: Briefcase },
  { href: '/admin/writing', label: 'Writing', icon: FileText },
  { href: '/admin/experience', label: 'Experience', icon: GraduationCap },
  { href: '/admin/services', label: 'Services', icon: Wrench },
  { href: '/admin/testimonials', label: 'Testimonials', icon: Star },
  { href: '/admin/metrics', label: 'Metrics', icon: BarChart3 },
  { href: '/admin/messages', label: 'Messages', icon: MessageSquare },
  { href: '/admin/media', label: 'Media', icon: Image },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <Link href="/" className="font-serif text-xl font-medium">Wayne</Link>
        <p className="text-xs text-muted-foreground mt-1">Admin</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-violet-600/20 text-violet-400 font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-1"
          target="_blank"
        >
          View site ?
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
