'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, X, SlidersHorizontal, Loader2 } from 'lucide-react'

interface ReviewSearchFiltersProps {
  initialSearch?: string
  initialStatus?: string
  initialType?: string
}

const STATUSES = [
  { value: 'all', label: 'All (Active)' },
  { value: 'draft', label: 'Draft' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
]

const TYPES = [
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
}: ReviewSearchFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(initialSearch)
  const [status, setStatus] = useState(initialStatus)
  const [type, setType] = useState(initialType)

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

      startTransition(() => {
        const queryStr = params.toString()
        router.push(queryStr ? `${pathname}?${queryStr}` : pathname)
      })
    },
    [search, status, type, searchParams, pathname, router]
  )

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      applyFilters(search, status, type)
    }
  }

  const handleClear = () => {
    setSearch('')
    setStatus('all')
    setType('all')
    startTransition(() => {
      router.push(pathname)
    })
  }

  const hasActiveFilters =
    search.trim() !== '' ||
    (status && status !== 'all') ||
    (type && type !== 'all')

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search reviews by title, objective, lessons, or summary..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            onBlur={() => applyFilters(search, status, type)}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-lg bg-card/60 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
          {search && (
            <button
              onClick={() => {
                setSearch('')
                applyFilters('', status, type)
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {STATUSES.map((st) => {
            const isActive = status === st.value
            return (
              <button
                key={st.value}
                onClick={() => {
                  setStatus(st.value)
                  applyFilters(search, st.value, type)
                }}
                className={`px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-colors border ${
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary font-medium shadow-sm'
                    : 'bg-card/40 text-muted-foreground border-border hover:text-foreground hover:bg-card/80'
                }`}
              >
                {st.label}
              </button>
            )
          })}
        </div>

        {/* Type Dropdown */}
        <div className="flex items-center gap-2">
          <select
            value={type}
            onChange={(e) => {
              const val = e.target.value
              setType(val)
              applyFilters(search, status, val)
            }}
            className="px-3 py-1.5 text-xs rounded-lg bg-card/60 border border-border text-foreground focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
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
              onClick={handleClear}
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
