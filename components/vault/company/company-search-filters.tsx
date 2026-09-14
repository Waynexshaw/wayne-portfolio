'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, X, Loader2, RotateCcw } from 'lucide-react'

interface CompanySearchFiltersProps {
  initialSearch?: string
  initialTier?: string
  initialStatus?: string
}

const TIER_OPTIONS = [
  { value: 'all', label: 'All Tiers' },
  { value: 'tier_1', label: 'Tier 1 (Priority)' },
  { value: 'tier_2', label: 'Tier 2 (Active)' },
  { value: 'tier_3', label: 'Tier 3 (Network)' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'active', label: 'Active' },
  { value: 'partner', label: 'Partner' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'past', label: 'Past' },
]

export function CompanySearchFilters({
  initialSearch = '',
  initialTier = 'all',
  initialStatus = 'all',
}: CompanySearchFiltersProps) {
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

  const activeTier = searchParams.get('tier') || 'all'
  const activeStatus = searchParams.get('status') || 'all'

  const hasActiveFilters = Boolean(
    (searchParams.get('q') && searchParams.get('q')?.trim() !== '') ||
    (activeTier && activeTier !== 'all') ||
    (activeStatus && activeStatus !== 'all')
  )

  // Apply filters via URL params with router.replace
  const applyFilters = useCallback(
    (newQ?: string, newTier?: string, newStatus?: string) => {
      const params = new URLSearchParams(searchParams.toString())

      const qVal = newQ !== undefined ? newQ : searchTerm
      const tierVal = newTier !== undefined ? newTier : activeTier
      const statusVal = newStatus !== undefined ? newStatus : activeStatus

      if (qVal.trim()) {
        params.set('q', qVal.trim())
      } else {
        params.delete('q')
      }

      if (tierVal && tierVal !== 'all') {
        params.set('tier', tierVal)
      } else {
        params.delete('tier')
      }

      if (statusVal && statusVal !== 'all') {
        params.set('status', statusVal)
      } else {
        params.delete('status')
      }

      const queryString = params.toString()
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname

      startTransition(() => {
        router.replace(newUrl, { scroll: false })
      })
    },
    [searchParams, searchTerm, activeTier, activeStatus, pathname, router]
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

  const handleTierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    applyFilters(undefined, e.target.value, undefined)
  }

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
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
          placeholder="Search by company name, industry, or domain..."
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
        {/* Tier Filter */}
        <select
          value={activeTier}
          onChange={handleTierChange}
          aria-label="Filter by tier"
          className="px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs cursor-pointer transition-colors"
        >
          {TIER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={activeStatus}
          onChange={handleStatusChange}
          aria-label="Filter by status"
          className="px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:border-primary text-xs cursor-pointer transition-colors"
        >
          {STATUS_OPTIONS.map((opt) => (
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
