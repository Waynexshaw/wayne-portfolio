'use client'

import { useState, useTransition, useEffect, useRef, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, X, Filter, SlidersHorizontal, ArrowUpRight, ArrowDownLeft, Shield } from 'lucide-react'

interface InteractionSearchFiltersProps {
  initialSearch?: string
  initialChannel?: string
  initialDirection?: string
  initialIdentity?: string
  identities: any[]
}

const CHANNELS = [
  { value: 'all', label: 'All Channels' },
  { value: 'x', label: '𝕏 / Twitter' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'email', label: 'Email' },
  { value: 'call', label: 'Call (Phone/Zoom)' },
  { value: 'meeting', label: 'Meeting (In-Person)' },
  { value: 'in_person', label: 'In-Person Event' },
  { value: 'other', label: 'Other' },
]

const DIRECTIONS = [
  { value: 'all', label: 'All Directions' },
  { value: 'outbound', label: 'Outbound (Sent)' },
  { value: 'inbound', label: 'Inbound (Received)' },
  { value: 'internal_note', label: 'Internal Note' },
]

export function InteractionSearchFilters({
  initialSearch = '',
  initialChannel = 'all',
  initialDirection = 'all',
  initialIdentity = 'all',
  identities = [],
}: InteractionSearchFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(initialSearch)
  const [channel, setChannel] = useState(initialChannel)
  const [direction, setDirection] = useState(initialDirection)
  const [identity, setIdentity] = useState(initialIdentity)

  // Sync state if URL searchParams change externally
  useEffect(() => {
    setSearch(searchParams.get('q') || '')
    setChannel(searchParams.get('channel') || 'all')
    setDirection(searchParams.get('direction') || 'all')
    setIdentity(searchParams.get('identity') || 'all')
  }, [searchParams])

  // Apply filters to URL
  const applyFilters = useCallback(
    (newSearch?: string, newChannel?: string, newDirection?: string, newIdentity?: string) => {
      const qVal = newSearch !== undefined ? newSearch : search
      const chVal = newChannel !== undefined ? newChannel : channel
      const dirVal = newDirection !== undefined ? newDirection : direction
      const idVal = newIdentity !== undefined ? newIdentity : identity

      const params = new URLSearchParams(searchParams.toString())

      if (qVal.trim()) {
        params.set('q', qVal.trim())
      } else {
        params.delete('q')
      }

      if (chVal && chVal !== 'all') {
        params.set('channel', chVal)
      } else {
        params.delete('channel')
      }

      if (dirVal && dirVal !== 'all') {
        params.set('direction', dirVal)
      } else {
        params.delete('direction')
      }

      if (idVal && idVal !== 'all') {
        params.set('identity', idVal)
      } else {
        params.delete('identity')
      }

      const queryString = params.toString()
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname

      startTransition(() => {
        router.replace(newUrl, { scroll: false })
      })
    },
    [searchParams, search, channel, direction, identity, pathname, router]
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

  const handleChannelChange = (val: string) => {
    setChannel(val)
    applyFilters(undefined, val, undefined, undefined)
  }

  const handleDirectionChange = (val: string) => {
    setDirection(val)
    applyFilters(undefined, undefined, val, undefined)
  }

  const handleIdentityChange = (val: string) => {
    setIdentity(val)
    applyFilters(undefined, undefined, undefined, val)
  }

  const handleClearFilters = () => {
    setSearch('')
    setChannel('all')
    setDirection('all')
    setIdentity('all')
    startTransition(() => {
      router.replace(pathname, { scroll: false })
    })
  }

  const hasActiveFilters = Boolean(
    search.trim() !== '' ||
    (channel && channel !== 'all') ||
    (direction && direction !== 'all') ||
    (identity && identity !== 'all')
  )

  const selectedIdentityName = identities.find(i => i.id === identity)?.name

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
            placeholder="Search by contact, company, purpose, outcome..."
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

        {/* Channel Filter */}
        <div className="lg:col-span-3">
          <select
            value={channel}
            onChange={(e) => handleChannelChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground text-xs focus:outline-none focus:border-primary transition-colors capitalize"
          >
            {CHANNELS.map((ch) => (
              <option key={ch.value} value={ch.value}>
                {ch.label}
              </option>
            ))}
          </select>
        </div>

        {/* Direction Filter */}
        <div className="lg:col-span-2">
          <select
            value={direction}
            onChange={(e) => handleDirectionChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground text-xs focus:outline-none focus:border-primary transition-colors capitalize"
          >
            {DIRECTIONS.map((dir) => (
              <option key={dir.value} value={dir.value}>
                {dir.label}
              </option>
            ))}
          </select>
        </div>

        {/* Identity Filter */}
        <div className="lg:col-span-2">
          <select
            value={identity}
            onChange={(e) => handleIdentityChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground text-xs focus:outline-none focus:border-primary transition-colors"
          >
            <option value="all">All Identities</option>
            {identities.map((id: any) => (
              <option key={id.id} value={id.id}>
                @{id.name}
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

          {channel && channel !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-foreground text-[11px] font-mono border border-border capitalize">
              Channel: {channel}
              <button onClick={() => handleChannelChange('all')} className="hover:text-muted-foreground">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {direction && direction !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-foreground text-[11px] font-mono border border-border capitalize">
              Direction: {direction.replace('_', ' ')}
              <button onClick={() => handleDirectionChange('all')} className="hover:text-muted-foreground">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {identity && identity !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-foreground text-[11px] font-mono border border-border">
              Identity: @{selectedIdentityName || identity}
              <button onClick={() => handleIdentityChange('all')} className="hover:text-muted-foreground">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {!hasActiveFilters && (
            <span className="text-[11px] text-muted-foreground italic">
              Showing all historical touchpoints
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
