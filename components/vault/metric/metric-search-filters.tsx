'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, X, Filter, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type MetricCategoryOption =
  | 'all'
  | 'growth'
  | 'financial'
  | 'operational'
  | 'product'
  | 'marketing'
  | 'community'
  | 'other'

export type MetricStatusOption =
  | 'all'
  | 'active'
  | 'paused'
  | 'archived'

export interface MetricSearchFiltersProps {
  initialSearch?: string
  initialCategory?: MetricCategoryOption | string
  initialStatus?: MetricStatusOption | string
  className?: string
}

export const CATEGORY_OPTIONS: { value: MetricCategoryOption; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'growth', label: 'Growth' },
  { value: 'financial', label: 'Financial' },
  { value: 'operational', label: 'Operational' },
  { value: 'product', label: 'Product' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'community', label: 'Community' },
  { value: 'other', label: 'Other' },
]

export const STATUS_TABS: { value: MetricStatusOption; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'archived', label: 'Archived' },
]

export function MetricSearchFilters({
  initialSearch = '',
  initialCategory = 'all',
  initialStatus = 'all',
  className = '',
}: MetricSearchFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(initialSearch)
  const [category, setCategory] = useState(initialCategory)
  const [status, setStatus] = useState(initialStatus)

  // Synchronize state with URL search params changes
  useEffect(() => {
    setSearch(searchParams.get('q') || '')
    setCategory(searchParams.get('category') || 'all')
    setStatus(searchParams.get('status') || 'all')
  }, [searchParams])

  const applyFilters = useCallback(
    (newSearch?: string, newCategory?: string, newStatus?: string) => {
      const qVal = newSearch !== undefined ? newSearch : search
      const catVal = newCategory !== undefined ? newCategory : category
      const stVal = newStatus !== undefined ? newStatus : status

      const params = new URLSearchParams(searchParams.toString())

      if (qVal.trim()) {
        params.set('q', qVal.trim())
      } else {
        params.delete('q')
      }

      if (catVal && catVal !== 'all') {
        params.set('category', catVal)
      } else {
        params.delete('category')
      }

      if (stVal && stVal !== 'all') {
        params.set('status', stVal)
      } else {
        params.delete('status')
      }

      // Reset page when filter criteria change
      if (params.has('page')) {
        params.delete('page')
      }

      startTransition(() => {
        const queryStr = params.toString()
        router.push(queryStr ? `${pathname}?${queryStr}` : pathname)
      })
    },
    [search, category, status, searchParams, pathname, router]
  )

  // Debounced search input handler (350ms)
  useEffect(() => {
    const currentParamQ = searchParams.get('q') || ''
    if (search.trim() === currentParamQ.trim()) return

    const timer = setTimeout(() => {
      applyFilters(search, category, status)
    }, 350)

    return () => clearTimeout(timer)
  }, [search, searchParams, category, status, applyFilters])

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      applyFilters(search, category, status)
    }
  }

  const handleBlur = () => {
    const currentParamQ = searchParams.get('q') || ''
    if (search.trim() !== currentParamQ.trim()) {
      applyFilters(search, category, status)
    }
  }

  const handleClearSearch = () => {
    setSearch('')
    applyFilters('', category, status)
  }

  const handleClearAll = () => {
    setSearch('')
    setCategory('all')
    setStatus('all')
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('q')
      params.delete('category')
      params.delete('status')
      if (params.has('page')) {
        params.delete('page')
      }
      const queryStr = params.toString()
      router.push(queryStr ? `${pathname}?${queryStr}` : pathname)
    })
  }

  const hasActiveFilters =
    search.trim() !== '' ||
    (category && category !== 'all') ||
    (status && status !== 'all')

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Bar & Category */}
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search metrics by name, key, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onBlur={handleBlur}
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg bg-card/60 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
              aria-label="Search metrics"
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

          {/* Category Dropdown */}
          <div className="relative flex items-center">
            <Filter className="w-3 h-3 absolute left-2.5 text-muted-foreground pointer-events-none" />
            <select
              value={category}
              onChange={(e) => {
                const val = e.target.value
                setCategory(val)
                applyFilters(search, val, status)
              }}
              className="pl-7 pr-3 py-1.5 text-xs rounded-lg bg-card/60 border border-border text-foreground focus:outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors cursor-pointer"
              aria-label="Filter by category"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-card text-foreground">
                  {opt.label}
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
                    applyFilters(search, category, tab.value)
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

export default MetricSearchFilters
