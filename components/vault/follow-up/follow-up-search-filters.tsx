'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, X, SlidersHorizontal, AlertCircle, Clock, Calendar, CheckCircle2 } from 'lucide-react'

interface FollowUpSearchFiltersProps {
  initialSearch?: string
  initialStatus?: string
  initialPriority?: string
  initialDateState?: string
}

const STATUSES = [
  { value: 'all', label: 'All Statuses' },
  { value: 'open', label: 'Open (Pending)' },
  { value: 'completed', label: 'Completed' },
]

const PRIORITIES = [
  { value: 'all', label: 'All Priorities' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const DATE_STATES = [
  { value: 'all', label: 'All Dates' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Due Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'completed', label: 'Completed History' },
]

export function FollowUpSearchFilters({
  initialSearch = '',
  initialStatus = 'all',
  initialPriority = 'all',
  initialDateState = 'all',
}: FollowUpSearchFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(initialSearch)
  const [status, setStatus] = useState(initialStatus)
  const [priority, setPriority] = useState(initialPriority)
  const [dateState, setDateState] = useState(initialDateState)

  // Sync state if URL searchParams change externally
  useEffect(() => {
    setSearch(searchParams.get('q') || '')
    setStatus(searchParams.get('status') || 'all')
    setPriority(searchParams.get('priority') || 'all')
    setDateState(searchParams.get('date_state') || 'all')
  }, [searchParams])

  // Apply filters to URL
  const applyFilters = useCallback(
    (newSearch?: string, newStatus?: string, newPriority?: string, newDateState?: string) => {
      const qVal = newSearch !== undefined ? newSearch : search
      const stVal = newStatus !== undefined ? newStatus : status
      const prVal = newPriority !== undefined ? newPriority : priority
      const dsVal = newDateState !== undefined ? newDateState : dateState

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

      if (prVal && prVal !== 'all') {
        params.set('priority', prVal)
      } else {
        params.delete('priority')
      }

      if (dsVal && dsVal !== 'all') {
        params.set('date_state', dsVal)
      } else {
        params.delete('date_state')
      }

      const queryString = params.toString()
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname

      startTransition(() => {
        router.replace(newUrl, { scroll: false })
      })
    },
    [searchParams, search, status, priority, dateState, pathname, router]
  )

  // Debounce search text input by 300ms
  useEffect(() => {
    const currentParamQ = searchParams.get('q') || ''
    if (search === currentParamQ) return

    const timer = setTimeout(() => {
      applyFilters(search)
    }, 300)

    return () => clearTimeout(timer)
  }, [search, searchParams, applyFilters])

  const handleStatusChange = (val: string) => {
    setStatus(val)
    applyFilters(undefined, val, undefined, undefined)
  }

  const handlePriorityChange = (val: string) => {
    setPriority(val)
    applyFilters(undefined, undefined, val, undefined)
  }

  const handleDateStateChange = (val: string) => {
    setDateState(val)
    applyFilters(undefined, undefined, undefined, val)
  }

  const handleClearFilters = () => {
    setSearch('')
    setStatus('all')
    setPriority('all')
    setDateState('all')
    startTransition(() => {
      router.replace(pathname, { scroll: false })
    })
  }

  const hasActiveFilters = Boolean(
    search.trim() !== '' ||
    (status && status !== 'all') ||
    (priority && priority !== 'all') ||
    (dateState && dateState !== 'all')
  )

  return (
    <div className="space-y-3 bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
        {/* Search input */}
        <div className="relative lg:col-span-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks, commitments, contacts, companies..."
            className="w-full pl-9 pr-8 py-2 rounded-lg bg-secondary/50 border border-border text-foreground text-xs focus:outline-none focus:border-primary placeholder:text-muted-foreground/60 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search input"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Date State Filter (Overdue, Today, Upcoming, Completed) */}
        <div className="lg:col-span-3">
          <select
            value={dateState}
            onChange={(e) => handleDateStateChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground text-xs focus:outline-none focus:border-primary transition-colors"
          >
            {DATE_STATES.map((ds) => (
              <option key={ds.value} value={ds.value}>
                {ds.label}
              </option>
            ))}
          </select>
        </div>

        {/* Priority Filter */}
        <div className="lg:col-span-2">
          <select
            value={priority}
            onChange={(e) => handlePriorityChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground text-xs focus:outline-none focus:border-primary transition-colors capitalize"
          >
            {PRIORITIES.map((pr) => (
              <option key={pr.value} value={pr.value}>
                {pr.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="lg:col-span-2">
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground text-xs focus:outline-none focus:border-primary transition-colors"
          >
            {STATUSES.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active filters display & loading indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-mono text-muted-foreground uppercase flex items-center gap-1 mr-1">
            <SlidersHorizontal className="w-3 h-3" /> Filters:
          </span>

          {search.trim() && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-mono">
              Query: &ldquo;{search}&rdquo;
              <button onClick={() => setSearch('')} className="hover:text-primary/70">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {dateState && dateState !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-foreground text-[11px] font-mono border border-border capitalize">
              Date: {dateState}
              <button onClick={() => handleDateStateChange('all')} className="hover:text-muted-foreground">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {priority && priority !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-foreground text-[11px] font-mono border border-border capitalize">
              Priority: {priority}
              <button onClick={() => handlePriorityChange('all')} className="hover:text-muted-foreground">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {status && status !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-foreground text-[11px] font-mono border border-border capitalize">
              Status: {status}
              <button onClick={() => handleStatusChange('all')} className="hover:text-muted-foreground">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {!hasActiveFilters && (
            <span className="text-[11px] text-muted-foreground italic">
              Showing all scheduled action items
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isPending && (
            <span className="text-[11px] font-mono text-muted-foreground animate-pulse">
              Updating results...
            </span>
          )}

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-[11px] font-mono text-primary hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
