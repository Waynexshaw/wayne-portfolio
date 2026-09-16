import React from 'react'
import { cn } from '@/lib/utils'

export interface VaultAttainmentProps {
  attainment: number | null | undefined
  suffix?: string
  variant?: 'badge' | 'inline' | 'stat'
  className?: string
  missingText?: string
}

export function formatAttainmentPercentage(val: number | null | undefined): string | null {
  if (val === null || val === undefined || isNaN(Number(val))) return null
  return `${Number(val).toFixed(1)}%`
}

/**
 * VaultAttainment
 * Centralized, neutral, arrow-free attainment presentation for Waynex Vault.
 * Strictly presents mathematical attainment percentage without evaluative judgment,
 * trend icons (TrendingUp/TrendingDown), or automated color judgment.
 */
export function VaultAttainment({
  attainment,
  suffix = 'Attainment',
  variant = 'badge',
  className,
  missingText,
}: VaultAttainmentProps) {
  const formatted = formatAttainmentPercentage(attainment)

  if (formatted === null) {
    const text = missingText ?? (variant === 'badge' ? 'No Target' : '—')
    if (variant === 'badge') {
      return (
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-sans font-medium bg-muted/40 text-muted-foreground border border-border/60',
            className
          )}
        >
          {text}
        </span>
      )
    }
    return (
      <span className={cn('text-muted-foreground font-sans', className)}>
        {text}
      </span>
    )
  }

  if (variant === 'stat') {
    return (
      <div className={cn('flex flex-col', className)}>
        <span className="text-2xl font-semibold text-foreground tracking-tight tabular-nums font-sans">
          {formatted}
        </span>
        {suffix && (
          <span className="text-xs text-muted-foreground mt-0.5 font-sans">
            {suffix}
          </span>
        )}
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <span className={cn('text-sm text-foreground font-sans tabular-nums', className)}>
        <span className="font-medium">{formatted}</span>
        {suffix && <span className="text-muted-foreground ml-1">{suffix}</span>}
      </span>
    )
  }

  // default: 'badge'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-sans font-medium tabular-nums bg-secondary/80 text-foreground border border-border/80',
        className
      )}
    >
      <span>{formatted}</span>
      {suffix && <span className="text-muted-foreground font-normal">{suffix}</span>}
    </span>
  )
}
