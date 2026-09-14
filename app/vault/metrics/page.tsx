import { Suspense } from 'react'
import { getVaultContext, getWorkspaceMetrics, getWorkspaceProjects } from '@/lib/vault/actions'
import { MetricSearchFilters } from '@/components/vault/metric/metric-search-filters'
import { MetricList } from '@/components/vault/metric/metric-list'
import { MetricCreateButton } from './create-button'
import { BarChart2, TrendingUp, Target, Activity } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Metrics & Performance | Waynex Vault',
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
      <div className="p-8 text-center text-zinc-400">
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

  // Summary counts
  const totalCount = metrics.length
  const activeCount = metrics.filter((m) => m.status === 'active').length
  const withTargetsCount = metrics.filter((m) => m.current_target !== null && m.current_target !== undefined).length
  const achievedCount = metrics.filter(
    (m) => m.attainment_rate !== null && m.attainment_rate !== undefined && m.attainment_rate >= 100
  ).length

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <BarChart2 className="w-5 h-5" />
            </div>
            <span>Metrics & Performance</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Operational measurements, intended targets, and empirical performance tracking
          </p>
        </div>

        <MetricCreateButton
          workspaceId={activeWorkspace.id}
          workspaceName={activeWorkspace.name}
        />
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-xl">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-1">
            <span>TOTAL METRICS</span>
            <Activity className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-100">{totalCount}</div>
          <div className="text-[11px] text-zinc-500 mt-0.5">{activeCount} active</div>
        </div>

        <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-xl">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-1">
            <span>ACTIVE</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{activeCount}</div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Actively tracked</div>
        </div>

        <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-xl">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-1">
            <span>TARGETED</span>
            <Target className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400">{withTargetsCount}</div>
          <div className="text-[11px] text-zinc-500 mt-0.5">With current targets</div>
        </div>

        <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-xl">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-1">
            <span>TARGET MET</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{achievedCount}</div>
          <div className="text-[11px] text-zinc-500 mt-0.5">100%+ attainment</div>
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
