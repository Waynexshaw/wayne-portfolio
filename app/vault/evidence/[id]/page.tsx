import { notFound } from 'next/navigation'
import { getVaultContext, getWorkspaceProjects } from '@/lib/vault/actions'
import { getEvidenceDetailAction } from '@/lib/vault/evidence-actions'
import { EvidenceDetailView } from '@/components/vault/evidence/evidence-detail-view'

export const dynamic = 'force-dynamic'

interface EvidenceDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EvidenceDetailPage({ params }: EvidenceDetailPageProps) {
  const { id } = await params
  const context = await getVaultContext()
  const activeWorkspace = context?.activeWorkspace

  if (!activeWorkspace?.id) {
    notFound()
  }

  const workspaceId = activeWorkspace.id

  const [evidence, projects] = await Promise.all([
    getEvidenceDetailAction(workspaceId, id),
    getWorkspaceProjects(workspaceId).catch(() => []),
  ])

  if (!evidence) {
    notFound()
  }

  const isAdmin = Boolean(context?.activeWorkspace?.owner_id === context?.user?.id)

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
      <EvidenceDetailView
        workspaceId={workspaceId}
        evidence={evidence}
        projects={(projects || []).map((p: any) => ({ id: p.id, title: p.title }))}
        isAdmin={isAdmin}
      />
    </div>
  )
}
