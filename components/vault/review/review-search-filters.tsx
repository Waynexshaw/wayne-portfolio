'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReviewSearchFiltersProps {
  initialSearch?: string
  initialStatus?: string
  initialType?: string
  className?: string
}

export const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
]

export const TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'project', label: 'Project' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'growth', label: 'Growth' },
  { value: 'strategy', label: 'Strategy' },
  { value: 'opportunity', label: 'Opportunity' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'period', label: 'Period' },
  { value: 'other', label: 'Other' },
]

export function ReviewSearchFilters({
  initialSearch = '',
  initialStatus = 'all',
  initialType = 'all',
  className = '',
}: ReviewSearchFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(initialSearch)
  const [status, setStatus] = useState(initialStatus)
  const [type, setType] = useState(initialType)

  // Synchronize state with URL search params changes
  useEffect(() => {
    setSearch(searchParams.get('q') || '')
    setStatus(searchParams.get('status') || 'all')
    setType(searchParams.get('type') || 'all')
  }, [searchParams])

  const applyFilters = useCallback(
    (newSearch?: string, newStatus?: string, newType?: string) => {
      const qVal = newSearch !== undefined ? newSearch : search
      const stVal = newStatus !== undefined ? newStatus : status
      const tyVal = newType !== undefined ? newType : type

      const params = new URLSearchParams(searchParams.toString())

      if (qVal.trim()) {
        params.set('q', qVal.trim())
      } else {
        params.delete('q')
      }

      if (stVal && stVal !== 'all') {
        params.set('status', stVal)
      } else {
        params.delete('status')
      }

      if (tyVal && tyVal !== 'all') {
        params.set('type', tyVal)
      } else {
        params.delete('type')
      }

      const queryString = params.toString()
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname

      startTransition(() => {
        router.replace(newUrl, { scroll: false })
      })
    },
    [search, status, type, searchParams, pathname, router]
  )

  // 300ms debounce for text search input
  useEffect(() => {
    const currentParamQ = searchParams.get('q') || ''
    if (search.trim() === currentParamQ.trim()) return

    const timer = setTimeout(() => {
      applyFilters(search, status, type)
    }, 300)

    return () => clearTimeout(timer)
  }, [search, status, type, searchParams, applyFilters])

  const handleClearSearch = () => {
    setSearch('')
    applyFilters('', status, type)
  }

  const handleClearAll = () => {
    setSearch('')
    setStatus('all')
    setType('all')
    startTransition(() => {
      router.replace(pathname, { scroll: false })
    })
  }

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus)
    applyFilters(search, newStatus, type)
  }

  const handleTypeChange = (newType: string) => {
    setType(newType)
    applyFilters(search, status, newType)
  }

  const hasActiveFilters = Boolean(
    search.trim() !== '' ||
    (status && status !== 'all') ||
    (type && type !== 'all')
  )

  return (
    <div className={cn('space-y-3', className)}>
      {/* Top Segmented Status Tabs */}
      <div className="flex items-center gap-1 border-b border-border/80 pb-px overflow-x-auto scrollbar-none">
        {STATUS_TABS.map((tab) => {
          const isActive = status === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => handleStatusChange(tab.value)}
              className={cn(
                'px-3.5 py-2 text-xs font-medium border-b-2 transition-all whitespace-nowrap',
                isActive
                  ? 'border-foreground text-foreground font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Secondary Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search reviews by title, objective, lessons, or summary..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg bg-card/60 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40 transition-colors"
          />
          {search && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Review Type Dropdown */}
          <select
            value={type}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg bg-card/60 border border-border text-foreground focus:outline-none focus:border-foreground/40 transition-colors cursor-pointer"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value} className="bg-card text-foreground">
                {t.label}
              </option>
            ))}
          </select>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={handleClearAll}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-border bg-card/40 text-muted-foreground hover:text-foreground hover:bg-card/80 transition-colors flex items-center gap-1"
              title="Reset all filters"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          {isPending && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-1" />
          )}
        </div>
      </div>
    </div>
  )
}
