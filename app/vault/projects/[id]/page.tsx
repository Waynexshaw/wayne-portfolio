import { notFound } from 'next/navigation'
import {
  getVaultContext,
  getWorkspaceProjectDetail,
  getWorkspaceMetrics,
  getRelatedResearchForEntity,
  getRelatedReviewsForEntity,
} from '@/lib/vault/actions'
import { getProjectWorkbenchStats } from '@/lib/vault/workbench-actions'
import { ProjectDetailView } from '@/components/vault/project/project-detail-view'

export const dynamic = 'force-dynamic'

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params
  const context = await getVaultContext()
  const activeWorkspace = context?.activeWorkspace

  if (!activeWorkspace?.id) {
    notFound()
  }

  // 1. Resolve and verify project ownership within active workspace
  const project = await getWorkspaceProjectDetail(id, activeWorkspace.id)
  if (!project) {
    notFound()
  }

  // 2. Fetch related data in parallel (only after project ownership is established)
  const [metrics, relatedResearch, relatedReviews, workbenchStats] = await Promise.all([
    getWorkspaceMetrics(activeWorkspace.id, { projectId: id, status: 'all' }),
    getRelatedResearchForEntity('project', id, activeWorkspace.id),
    getRelatedReviewsForEntity(activeWorkspace.id, 'project', id),
    getProjectWorkbenchStats(id, activeWorkspace.id),
  ])

  return (
    <ProjectDetailView
      project={project}
      metrics={metrics}
      relatedResearch={relatedResearch}
      relatedReviews={relatedReviews}
      workbenchStats={workbenchStats}
      workspaceId={activeWorkspace.id}
      workspaceName={activeWorkspace.name}
      identities={context?.identities || []}
    />
  )
}
