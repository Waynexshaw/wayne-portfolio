'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, X, Loader2, RotateCcw } from 'lucide-react'

interface ContactSearchFiltersProps {
  initialSearch?: string
  initialStage?: string
  initialPriority?: string
}

const STAGE_OPTIONS = [
  { value: 'all', label: 'All Stages' },
  { value: 'lead', label: 'Lead' },
  { value: 'outreach', label: 'Outreach' },
  { value: 'connected', label: 'Connected' },
  { value: 'in_discussion', label: 'In Discussion' },
  { value: 'partner', label: 'Partner' },
  { value: 'investor', label: 'Investor' },
  { value: 'client', label: 'Client' },
  { value: 'dormant', label: 'Dormant' },
  { value: 'archived', label: 'Archived' },
]

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'All Priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export function ContactSearchFilters({
  initialSearch = '',
  initialStage = 'all',
  initialPriority = 'all',
}: ContactSearchFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Local search text state for responsive typing
  const [searchTerm, setSearchTerm] = useState(initialSearch)

  // Keep local search term in sync if URL search params change externally
  useEffect(() => {
    setSearchTerm(searchParams.get('q') || '')
  }, [searchParams])

  const activeStage = searchParams.get('stage') || 'all'
  const activePriority = searchParams.get('priority') || 'all'

  const hasActiveFilters = Boolean(
    (searchParams.get('q') && searchParams.get('q')?.trim() !== '') ||
    (activeStage && activeStage !== 'all') ||
    (activePriority && activePriority !== 'all')
  )

  // Apply filters via URL params with router.replace
  const applyFilters = useCallback(
    (newQ?: string, newStage?: string, newPriority?: string) => {
      const params = new URLSearchParams(searchParams.toString())

      const qVal = newQ !== undefined ? newQ : searchTerm
      const stageVal = newStage !== undefined ? newStage : activeStage
      const priorityVal = newPriority !== undefined ? newPriority : activePriority

      if (qVal.trim()) {
        params.set('q', qVal.trim())
      } else {
        params.delete('q')
      }

      if (stageVal && stageVal !== 'all') {
        params.set('stage', stageVal)
      } else {
        params.delete('stage')
      }

      if (priorityVal && priorityVal !== 'all') {
        params.set('priority', priorityVal)
      } else {
        params.delete('priority')
      }

      const queryString = params.toString()
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname

      startTransition(() => {
        router.replace(newUrl, { scroll: false })
      })
    },
    [searchParams, searchTerm, activeStage, activePriority, pathname, router]
  )

  // Debounce search text input by 300ms
  useEffect(() => {
    const currentParamQ = searchParams.get('q') || ''
    if (searchTerm === currentParamQ) return

    const timer = setTimeout(() => {
      applyFilters(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm, searchParams, applyFilters])

  const handleStageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    applyFilters(undefined, e.target.value, undefined)
  }

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    applyFilters(undefined, undefined, e.target.value)
  }

  const handleClearFilters = () => {
    setSearchTerm('')
    startTransition(() => {
      router.replace(pathname, { scroll: false })
    })
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[220px]">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search contacts by name, company, or role..."
          className="w-full pl-9 pr-8 py-2 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary text-xs transition-colors"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-muted-foreground hover:text-foreground transition-colors"
            title="Clear search text"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Dropdowns & Controls */}
      <div className="flex items-center gap-2">
        {/* Stage Filter */}
        <select
          value={activeStage}
          onChange={handleStageChange}
          aria-label="Filter by relationship stage"
          className="px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs cursor-pointer transition-colors"
        >
          {STAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          value={activePriority}
          onChange={handlePriorityChange}
          aria-label="Filter by priority"
          className="px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs cursor-pointer transition-colors"
        >
          {PRIORITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Reset / Clear filters Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary/80 hover:bg-secondary border border-border text-foreground text-xs font-medium transition-colors"
            title="Clear all active filters"
          >
            <RotateCcw className="w-3 h-3 text-muted-foreground" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
      </div>
    </div>
  )
}
