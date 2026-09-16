import { Suspense } from 'react'
import { getVaultContext, getWorkspaceMetrics, getWorkspaceProjects } from '@/lib/vault/actions'
import { MetricSearchFilters } from '@/components/vault/metric/metric-search-filters'
import { MetricList } from '@/components/vault/metric/metric-list'
import { MetricCreateButton } from './create-button'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Metrics | Waynex Vault',
}

interface MetricsPageProps {
  searchParams: Promise<{
    q?: string
    category?: string
    status?: string
    direction?: string
    measurement_type?: string
    cadence?: string
    project_id?: string
  }>
}

export default async function MetricsPage({ searchParams }: MetricsPageProps) {
  const context = await getVaultContext()
  const activeWorkspace = context?.activeWorkspace

  if (!activeWorkspace) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Workspace not found or access denied.
      </div>
    )
  }

  const resolvedParams = await searchParams
  const q = resolvedParams?.q || ''
  const category = resolvedParams?.category || 'all'
  const status = resolvedParams?.status || 'all'

  let metrics: any[] = []
  let projects: any[] = []
  let loadError: string | null = null

  try {
    const [fetchedMetrics, fetchedProjects] = await Promise.all([
      getWorkspaceMetrics(activeWorkspace.id, {
        search: q,
        category,
        status,
        direction: resolvedParams?.direction,
        measurementType: resolvedParams?.measurement_type,
        cadence: resolvedParams?.cadence,
        projectId: resolvedParams?.project_id,
      }),
      getWorkspaceProjects(activeWorkspace.id),
    ])
    metrics = fetchedMetrics
    projects = fetchedProjects
  } catch (err: any) {
    console.error('[Vault Metrics Error]:', err?.message || err)
    loadError = 'Database query failure encountered while loading metrics.'
  }

  // Summary counts for restrained operational stat line
  const totalCount = metrics.length
  const activeCount = metrics.filter((m) => m.status === 'active').length
  const withTargetsCount = metrics.filter(
    (m) => m.current_target !== null && m.current_target !== undefined
  ).length
  const totalObservationsCount = metrics.reduce(
    (acc, m) => acc + (m.observations_count || 0),
    0
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-normal text-foreground tracking-tight">
            Metrics
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Operational measurement context
          </p>
        </div>

        <MetricCreateButton
          workspaceId={activeWorkspace.id}
          workspaceName={activeWorkspace.name}
          projects={projects}
        />
      </div>

      {/* Restrained Operational Stat Line */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground border-y border-border/60 py-2.5 px-0.5">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-foreground tabular-nums font-sans">{totalCount}</span>
          <span>Metrics</span>
        </div>
        <span className="text-border select-none">•</span>
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-foreground tabular-nums font-sans">{activeCount}</span>
          <span>Active</span>
        </div>
        <span className="text-border select-none">•</span>
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-foreground tabular-nums font-sans">{withTargetsCount}</span>
          <span>Targeted</span>
        </div>
        <span className="text-border select-none">•</span>
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-foreground tabular-nums font-sans">{totalObservationsCount}</span>
          <span>Observations</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <Suspense fallback={null}>
        <MetricSearchFilters
          initialSearch={q}
          initialCategory={category}
          initialStatus={status}
        />
      </Suspense>

      {/* Metrics List / Directory */}
      <MetricList
        metrics={metrics}
        workspaceId={activeWorkspace.id}
      />
    </div>
  )
}
