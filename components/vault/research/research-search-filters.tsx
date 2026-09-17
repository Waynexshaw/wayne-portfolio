'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, X, Filter, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ResearchSearchFiltersProps {
  initialSearch?: string
  initialStatus?: string
  initialType?: string
  initialPriority?: string
  className?: string
}

export const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
]

export const TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'protocol', label: 'Protocol' },
  { value: 'market', label: 'Market' },
  { value: 'tokenomics', label: 'Tokenomics' },
  { value: 'growth', label: 'Growth' },
  { value: 'company', label: 'Company' },
  { value: 'person', label: 'Person' },
  { value: 'product', label: 'Product' },
  { value: 'technology', label: 'Technology' },
  { value: 'regulatory', label: 'Regulatory' },
  { value: 'pevra', label: 'PEVRA' },
  { value: 'other', label: 'Other' },
]

export const PRIORITIES = [
  { value: 'all', label: 'All Priorities' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

export function ResearchSearchFilters({
  initialSearch = '',
  initialStatus = 'all',
  initialType = 'all',
  initialPriority = 'all',
  className = '',
}: ResearchSearchFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(initialSearch)
  const [status, setStatus] = useState(initialStatus)
  const [type, setType] = useState(initialType)
  const [priority, setPriority] = useState(initialPriority)

  // Synchronize state with URL search params changes
  useEffect(() => {
    setSearch(searchParams.get('q') || '')
    setStatus(searchParams.get('status') || 'all')
    setType(searchParams.get('type') || 'all')
    setPriority(searchParams.get('priority') || 'all')
  }, [searchParams])

  const applyFilters = useCallback(
    (newSearch?: string, newStatus?: string, newType?: string, newPriority?: string) => {
      const qVal = newSearch !== undefined ? newSearch : search
      const stVal = newStatus !== undefined ? newStatus : status
      const tyVal = newType !== undefined ? newType : type
      const prVal = newPriority !== undefined ? newPriority : priority

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

      if (prVal && prVal !== 'all') {
        params.set('priority', prVal)
      } else {
        params.delete('priority')
      }

      const queryString = params.toString()
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname

      startTransition(() => {
        router.replace(newUrl, { scroll: false })
      })
    },
    [search, status, type, priority, searchParams, pathname, router]
  )

  // 300ms debounce for text search input
  useEffect(() => {
    const currentParamQ = searchParams.get('q') || ''
    if (search.trim() === currentParamQ.trim()) return

    const timer = setTimeout(() => {
      applyFilters(search, status, type, priority)
    }, 300)

    return () => clearTimeout(timer)
  }, [search, status, type, priority, searchParams, applyFilters])

  const handleClearSearch = () => {
    setSearch('')
    applyFilters('', status, type, priority)
  }

  const handleClearAll = () => {
    setSearch('')
    setStatus('all')
    setType('all')
    setPriority('all')
    startTransition(() => {
      router.replace(pathname, { scroll: false })
    })
  }

  const hasActiveFilters = Boolean(
    search.trim() !== '' ||
    (status && status !== 'all') ||
    (type && type !== 'all') ||
    (priority && priority !== 'all')
  )

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Bar & Secondary Filters */}
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Text Search Input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search research question, title, objective, findings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg bg-card/60 border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
              aria-label="Search research"
            />
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                aria-label="Clear search input"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Research Type Select */}
          <div className="relative flex items-center">
            <Filter className="w-3 h-3 absolute left-2.5 text-muted-foreground pointer-events-none" />
            <select
              value={type}
              onChange={(e) => {
                const val = e.target.value
                setType(val)
                applyFilters(search, status, val, priority)
              }}
              className="pl-7 pr-3 py-1.5 text-xs rounded-lg bg-card/60 border border-border text-foreground focus:outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors cursor-pointer"
              aria-label="Filter by research type"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value} className="bg-card text-foreground">
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Select */}
          <div className="relative flex items-center">
            <select
              value={priority}
              onChange={(e) => {
                const val = e.target.value
                setPriority(val)
                applyFilters(search, status, type, val)
              }}
              className="px-3 py-1.5 text-xs rounded-lg bg-card/60 border border-border text-foreground focus:outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors cursor-pointer"
              aria-label="Filter by priority"
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value} className="bg-card text-foreground">
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Segmented Pill Tabs & Reset */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/40 border border-border/60">
            {STATUS_TABS.map((tab) => {
              const isSelected = (status || 'all') === tab.value
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    setStatus(tab.value)
                    applyFilters(search, tab.value, type, priority)
                  }}
                  className={cn(
                    'px-2.5 py-1 text-xs font-medium rounded-md transition-all focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none',
                    isSelected
                      ? 'bg-card text-foreground shadow-sm border border-border/80'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearAll}
              className="px-2 py-1 text-xs rounded-lg border border-border bg-card/40 text-muted-foreground hover:text-foreground hover:bg-card/80 transition-colors flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
              title="Reset all filters"
              aria-label="Reset all filters"
            >
              <X className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

          {isPending && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground ml-1" />
          )}
        </div>
      </div>
    </div>
  )
}
