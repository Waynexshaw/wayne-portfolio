'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, X, SlidersHorizontal, Loader2 } from 'lucide-react'

interface ResearchSearchFiltersProps {
  initialSearch?: string
  initialStatus?: string
  initialType?: string
  initialPriority?: string
}

const STATUSES = [
  { value: 'all', label: 'All Statuses' },
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
]

const TYPES = [
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

const PRIORITIES = [
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
}: ResearchSearchFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(initialSearch)
  const [status, setStatus] = useState(initialStatus)
  const [type, setType] = useState(initialType)
  const [priority, setPriority] = useState(initialPriority)

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
    const timer = setTimeout(() => {
      if (search !== (searchParams.get('q') || '')) {
        applyFilters(search, status, type, priority)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [search, status, type, priority, searchParams, applyFilters])

  const handleClear = () => {
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
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row gap-3">
        {/* Text Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search research question, title, objective, findings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm bg-secondary/30 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
          />
          {search && (
            <button
              onClick={() => {
                setSearch('')
                applyFilters('', status, type, priority)
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              title="Clear search text"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Dropdown */}
        <div className="w-full md:w-44">
          <select
            value={status}
            onChange={(e) => {
              const val = e.target.value
              setStatus(val)
              applyFilters(search, val, type, priority)
            }}
            className="w-full px-3 py-2 text-sm bg-secondary/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors cursor-pointer"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value} className="bg-background text-foreground">
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Type Dropdown */}
        <div className="w-full md:w-44">
          <select
            value={type}
            onChange={(e) => {
              const val = e.target.value
              setType(val)
              applyFilters(search, status, val, priority)
            }}
            className="w-full px-3 py-2 text-sm bg-secondary/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors cursor-pointer"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value} className="bg-background text-foreground">
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Priority Dropdown */}
        <div className="w-full md:w-40">
          <select
            value={priority}
            onChange={(e) => {
              const val = e.target.value
              setPriority(val)
              applyFilters(search, status, type, val)
            }}
            className="w-full px-3 py-2 text-sm bg-secondary/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors cursor-pointer"
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value} className="bg-background text-foreground">
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Filter Chips & Status Indicator */}
      <div className="flex items-center justify-between min-h-[28px]">
        <div className="flex flex-wrap items-center gap-2">
          {hasActiveFilters && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3" /> Filters:
            </span>
          )}

          {search.trim() && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-primary/10 text-primary border border-primary/20">
              Query: &quot;{search.trim()}&quot;
              <button
                onClick={() => {
                  setSearch('')
                  applyFilters('', status, type, priority)
                }}
                className="hover:opacity-75 ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {status !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-secondary border border-border text-foreground">
              Status: {STATUSES.find((s) => s.value === status)?.label}
              <button
                onClick={() => {
                  setStatus('all')
                  applyFilters(search, 'all', type, priority)
                }}
                className="hover:opacity-75 ml-0.5 text-muted-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {type !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-secondary border border-border text-foreground">
              Type: {TYPES.find((t) => t.value === type)?.label}
              <button
                onClick={() => {
                  setType('all')
                  applyFilters(search, status, 'all', priority)
                }}
                className="hover:opacity-75 ml-0.5 text-muted-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {priority !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-secondary border border-border text-foreground">
              Priority: {PRIORITIES.find((p) => p.value === priority)?.label}
              <button
                onClick={() => {
                  setPriority('all')
                  applyFilters(search, status, type, 'all')
                }}
                className="hover:opacity-75 ml-0.5 text-muted-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {hasActiveFilters && (
            <button
              onClick={handleClear}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 ml-1"
            >
              Clear all
            </button>
          )}
        </div>

        {isPending && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
            <span>Updating...</span>
          </div>
        )}
      </div>
    </div>
  )
}
