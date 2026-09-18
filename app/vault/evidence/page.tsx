import { notFound } from 'next/navigation'
import { getVaultContext, getWorkspaceProjects } from '@/lib/vault/actions'
import {
  getEvidenceListAction,
  getEvidenceStatsAction,
} from '@/lib/vault/evidence-actions'
import { EvidenceView } from '@/components/vault/evidence/evidence-view'

export const dynamic = 'force-dynamic'

interface EvidencePageProps {
  searchParams: Promise<{
    projectId?: string
    project?: string
    status?: string
    search?: string
  }>
}

export default async function EvidencePage({ searchParams }: EvidencePageProps) {
  const params = await searchParams
  const context = await getVaultContext()
  const activeWorkspace = context?.activeWorkspace

  if (!activeWorkspace?.id) {
    notFound()
  }

  const workspaceId = activeWorkspace.id
  const targetProjectId = params.projectId || params.project

  // Parallel fetch evidence items, stats, and projects
  const [activeEvidence, archivedEvidence, stats, projects] = await Promise.all([
    getEvidenceListAction(workspaceId, {
      projectId: targetProjectId,
      includeArchived: false,
    }).catch(() => []),
    getEvidenceListAction(workspaceId, {
      projectId: targetProjectId,
      includeArchived: true,
    }).catch(() => []),
    getEvidenceStatsAction(workspaceId).catch(() => ({
      total: 0,
      approved: 0,
      draft: 0,
      archived: 0,
      bridged: 0,
    })),
    getWorkspaceProjects(workspaceId).catch(() => []),
  ])

  // Combine so client tab can filter seamlessly
  const allEvidence = [...activeEvidence, ...archivedEvidence]
  const isAdmin = Boolean(context?.activeWorkspace?.owner_id === context?.user?.id)

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
      <EvidenceView
        workspaceId={workspaceId}
        isAdmin={isAdmin}
        initialEvidence={allEvidence}
        stats={stats}
        projects={(projects || []).map((p: any) => ({ id: p.id, title: p.title }))}
      />
    </div>
  )
}
