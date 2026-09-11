import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Briefcase, FileText, MessageSquare, Star } from 'lucide-react'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const [
    { count: projectCount },
    { count: articleCount },
    { count: messageCount },
    { count: unreadCount },
  ] = await Promise.all([
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    supabase.from('articles').select('*', { count: 'exact', head: true }),
    supabase.from('messages').select('*', { count: 'exact', head: true }),
    supabase.from('messages').select('*', { count: 'exact', head: true }).eq('status', 'unread'),
  ])

  const stats = [
    { label: 'Projects', value: projectCount || 0, icon: Briefcase, href: '/admin/projects' },
    { label: 'Articles', value: articleCount || 0, icon: FileText, href: '/admin/writing' },
    { label: 'Messages', value: messageCount || 0, icon: MessageSquare, href: '/admin/messages' },
    { label: 'Unread', value: unreadCount || 0, icon: Star, href: '/admin/messages' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-serif font-medium mb-8">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="surface p-6 hover:border-border transition-colors"
            >
              <Icon size={20} className="text-violet-400 mb-3" />
              <p className="text-2xl font-medium">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { label: 'Add a project', href: '/admin/projects/new', desc: 'Document a new piece of work' },
          { label: 'Write an article', href: '/admin/writing/new', desc: 'Publish research or an essay' },
          { label: 'Update experience', href: '/admin/experience', desc: 'Add or edit work history' },
          { label: 'Read messages', href: '/admin/messages', desc: 'Review contact form submissions' },
          { label: 'Site settings', href: '/admin/settings', desc: 'Update bio, social links and SEO' },
          { label: 'View live site', href: '/', desc: 'Open the public website' },
        ].map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="surface p-5 hover:border-border transition-colors flex items-center justify-between group"
          >
            <div>
              <p className="font-medium text-sm text-foreground">{action.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{action.desc}</p>
            </div>
            <span className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all">
              ?
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
