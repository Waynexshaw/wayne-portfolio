import React from 'react'
import { cn } from '@/lib/utils'

export type VaultStatus = 'planning' | 'active' | 'paused' | 'completed' | 'archived' | string
export type VaultPriority = 'low' | 'medium' | 'high' | 'urgent' | string

export function getStatusBadgeClasses(status: VaultStatus): string {
  switch (status?.toLowerCase()) {
    case 'completed':
      // Vivid Green canonical anchor (#2DB52D). Accessible dark green text in light mode, vivid green in dark mode.
      return 'bg-[#2DB52D]/10 text-[#136C13] dark:text-[#2DB52D] border-[#2DB52D]/30'
    case 'active':
      // Purple / brand-active: Deep Purple in light mode, Soft Violet in dark mode
      return 'bg-primary/10 text-primary border-primary/25'
    case 'paused':
      // Amber warning semantic
      return 'bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/30'
    case 'planning':
      // Neutral
      return 'bg-muted/60 text-muted-foreground border-border'
    case 'archived':
      // Muted neutral
      return 'bg-muted/30 text-muted-foreground/75 border-border/50'
    default:
      return 'bg-muted/40 text-muted-foreground border-border/70'
  }
}

export function getPriorityBadgeClasses(priority: VaultPriority): string {
  switch (priority?.toLowerCase()) {
    case 'urgent':
      // Crimson canonical anchor (#DC143C). Accessible deep crimson in light mode, bright crimson in dark mode.
      return 'bg-[#DC143C]/10 text-[#A30F2D] dark:text-[#FF5C77] border-[#DC143C]/30'
    case 'high':
      // Amber warning
      return 'bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/30'
    case 'medium':
      // Neutral with stronger emphasis (NOT purple)
      return 'bg-secondary text-foreground border-border font-medium'
    case 'low':
      // Neutral muted
      return 'bg-muted/40 text-muted-foreground border-border/60'
    default:
      return 'bg-muted/30 text-muted-foreground border-border/50'
  }
}

interface VaultStatusBadgeProps {
  status: VaultStatus
  className?: string
  showDot?: boolean
}

export function VaultStatusBadge({ status, className, showDot = false }: VaultStatusBadgeProps) {
  const badgeClasses = getStatusBadgeClasses(status)
  
  const getDotColor = (s: VaultStatus) => {
    switch (s?.toLowerCase()) {
      case 'completed': return 'bg-[#2DB52D]'
      case 'active': return 'bg-primary'
      case 'paused': return 'bg-amber-500'
      case 'planning': return 'bg-muted-foreground'
      case 'archived': return 'bg-muted-foreground/60'
      default: return 'bg-muted-foreground'
    }
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono capitalize border tracking-wide',
        badgeClasses,
        className
      )}
    >
      {showDot && (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', getDotColor(status))} />
      )}
      <span>{status}</span>
    </span>
  )
}

interface VaultPriorityBadgeProps {
  priority: VaultPriority
  className?: string
}

export function VaultPriorityBadge({ priority, className }: VaultPriorityBadgeProps) {
  const badgeClasses = getPriorityBadgeClasses(priority)

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono capitalize border tracking-wide',
        badgeClasses,
        className
      )}
    >
      {priority}
    </span>
  )
}
