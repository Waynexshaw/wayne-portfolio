'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import Link from 'next/link'
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Info,
  Check,
  ExternalLink,
  ChevronRight,
  ShieldAlert
} from 'lucide-react'
import { WorkspaceNotification } from '@/lib/vault/automation/types'
import {
  getWorkspaceNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction
} from '@/lib/vault/automation-actions'
import { cn } from '@/lib/utils'

interface NotificationBellProps {
  workspaceId: string
  initialUnreadCount?: number
}

export function NotificationBell({
  workspaceId,
  initialUnreadCount = 0
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<WorkspaceNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load notifications when popover opens
  const fetchNotifications = async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      const items = await getWorkspaceNotificationsAction(workspaceId)
      setNotifications(items)
      const unread = items.filter(n => !n.is_read).length
      setUnreadCount(unread)
    } catch (err) {
      console.error('Failed to load notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications()
    }
    setIsOpen(prev => !prev)
  }

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    startTransition(async () => {
      await markNotificationReadAction(workspaceId, id)
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    })
  }

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllNotificationsReadAction(workspaceId)
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      )
      setUnreadCount(0)
    })
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'approval_required':
        return <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
      case 'automation_alert':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
      case 'reminder':
        return <Clock className="w-3.5 h-3.5 text-primary" />
      default:
        return <Info className="w-3.5 h-3.5 text-muted-foreground" />
    }
  }

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / (1000 * 60))
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays === 1) return 'Yesterday'
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={isOpen}
        className={cn(
          'relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors',
          isOpen && 'bg-secondary/70 text-foreground'
        )}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-primary text-[10px] font-mono font-bold text-primary-foreground leading-none animate-in fade-in zoom-in">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] rounded-xl bg-card border border-border shadow-2xl z-50 overflow-hidden text-xs animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-border flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-mono font-medium">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isPending}
                className="text-[11px] font-mono text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-border/50">
            {loading ? (
              <div className="p-6 text-center text-muted-foreground font-mono text-xs">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="w-6 h-6 text-muted-foreground/40 mx-auto" />
                <p className="font-medium text-foreground text-xs">No notifications</p>
                <p className="text-[11px] text-muted-foreground">You are all caught up.</p>
              </div>
            ) : (
              notifications.map(item => (
                <div
                  key={item.id}
                  className={cn(
                    'p-3.5 transition-colors relative group hover:bg-muted/30 flex items-start gap-3',
                    !item.is_read && 'bg-primary/5'
                  )}
                >
                  <div className="mt-0.5 shrink-0 p-1 rounded-md bg-secondary/80 border border-border">
                    {getCategoryIcon(item.category)}
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn('truncate font-medium text-foreground', !item.is_read && 'font-semibold')}>
                        {item.title}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                        {formatTimestamp(item.created_at)}
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>

                    <div className="pt-1 flex items-center gap-3">
                      {item.link_url && (
                        <Link
                          href={item.link_url}
                          prefetch={false}
                          onClick={() => {
                            if (!item.is_read) handleMarkAsRead(item.id)
                            setIsOpen(false)
                          }}
                          className="text-[11px] font-mono text-primary hover:underline flex items-center gap-1"
                        >
                          View <ChevronRight className="w-3 h-3" />
                        </Link>
                      )}

                      {!item.is_read && (
                        <button
                          type="button"
                          onClick={e => handleMarkAsRead(item.id, e)}
                          className="text-[10px] font-mono text-muted-foreground hover:text-foreground opacity-80 hover:opacity-100"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>

                  {!item.is_read && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-border bg-muted/10 text-center">
            <Link
              href="/vault/automations?view=inbox"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              Open Automations Inbox
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
