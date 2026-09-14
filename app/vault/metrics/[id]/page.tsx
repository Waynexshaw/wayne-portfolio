import Link from 'next/link'
import { ArrowLeft, RotateCcw, Database } from 'lucide-react'
import {
  getVaultContext,
  getWorkspaceMetricDetail,
  getMetricTargets,
  getMetricObservations,
} from '@/lib/vault/actions'
import { MetricDetailView } from '@/components/vault/metric/metric-detail-view'

export const dynamic = 'force-dynamic'

interface MetricDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function MetricDetailPage({ params }: MetricDetailPageProps) {
  const { id } = await params
  const context = await getVaultContext()
  const activeWorkspace = context?.activeWorkspace

  let metric: any = null
  let targets: any[] = []
  let observations: any[] = []
  let dbError: string | null = null

  try {
    if (activeWorkspace?.id) {
      metric = await getWorkspaceMetricDetail(id, activeWorkspace.id)
      if (metric) {
        targets = await getMetricTargets(id, activeWorkspace.id)
        observations = await getMetricObservations(id, activeWorkspace.id)
      }
    }
  } catch (err: any) {
    console.error('[Vault Metric Detail Error]:', err?.message || err)
    dbError = 'Database query failure encountered while loading metric details.'
  }

  if (dbError) {
    return (
      <div className="py-24 text-center space-y-4 max-w-md mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto text-destructive shadow-sm">
          <Database className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="font-serif text-xl font-medium text-foreground">
            System Error
          </h2>
          <p className="text-xs text-muted-foreground">
            A database error occurred while retrieving this metric. This may indicate a pending schema migration or connection issue.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/vault/metrics"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to Metrics Directory
          </Link>
        </div>
      </div>
    )
  }

  if (!metric || !activeWorkspace?.id) {
    return (
      <div className="py-24 text-center space-y-4 max-w-md mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-secondary/80 border border-border flex items-center justify-center mx-auto text-muted-foreground shadow-sm">
          <RotateCcw className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="font-serif text-xl font-medium text-foreground">
            Metric Not Found
          </h2>
          <p className="text-xs text-muted-foreground">
            This metric does not exist, has been removed, or belongs to another workspace.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/vault/metrics"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to Metrics Directory
          </Link>
        </div>
      </div>
    )
  }

  return (
    <MetricDetailView
      metric={metric}
      workspaceId={activeWorkspace.id}
    />
  )
}
