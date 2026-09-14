'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, X, Filter, Loader2 } from 'lucide-react'

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

export const STATUS_OPTIONS: { value: MetricStatusOption; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
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
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search metrics by name, key, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            onBlur={handleBlur}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-lg bg-card/60 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
            aria-label="Search metrics"
          />
          {search && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
              aria-label="Clear search input"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters Group: Category & Status dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <div className="relative flex items-center">
            <Filter className="w-3.5 h-3.5 absolute left-2.5 text-muted-foreground pointer-events-none" />
            <select
              value={category}
              onChange={(e) => {
                const val = e.target.value
                setCategory(val)
                applyFilters(search, val, status)
              }}
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-card/60 border border-border text-foreground focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
              aria-label="Filter by category"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-card text-foreground">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="relative flex items-center">
            <select
              value={status}
              onChange={(e) => {
                const val = e.target.value
                setStatus(val)
                applyFilters(search, category, val)
              }}
              className="px-3 py-1.5 text-xs rounded-lg bg-card/60 border border-border text-foreground focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
              aria-label="Filter by status"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-card text-foreground">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearAll}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-border bg-card/40 text-muted-foreground hover:text-foreground hover:bg-card/80 transition-colors flex items-center gap-1"
              title="Reset all filters"
              aria-label="Reset all filters"
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

export default MetricSearchFilters
