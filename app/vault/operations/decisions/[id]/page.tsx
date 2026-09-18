import { notFound } from 'next/navigation'
import {
  getVaultContext,
  getWorkspaceProjects,
} from '@/lib/vault/actions'
import {
  getDecisionDetailAction,
  getTasksAction,
  getMeetingsAction,
} from '@/lib/vault/operations-actions'
import { DecisionDetailView } from '@/components/vault/operations/decision-detail-view'

export const dynamic = 'force-dynamic'

interface DecisionDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function DecisionDetailPage({ params }: DecisionDetailPageProps) {
  const { id } = await params
  const context = await getVaultContext()
  const activeWorkspace = context?.activeWorkspace

  if (!activeWorkspace?.id) {
    notFound()
  }

  const workspaceId = activeWorkspace.id

  let decision: any = null
  try {
    decision = await getDecisionDetailAction(workspaceId, id)
  } catch {
    notFound()
  }

  if (!decision) {
    notFound()
  }

  // Fetch linked tasks, workspace projects, and meetings in parallel
  const [tasks, projects, meetings] = await Promise.all([
    getTasksAction(workspaceId, { decisionId: id, includeArchived: true }).catch(() => []),
    getWorkspaceProjects(workspaceId).catch(() => []),
    getMeetingsAction(workspaceId, { includeArchived: false }).catch(() => []),
  ])

  const isAdmin = Boolean(context?.activeWorkspace?.owner_id === context?.user?.id)

  return (
    <DecisionDetailView
      decision={decision}
      workspaceId={workspaceId}
      isAdmin={isAdmin}
      linkedTasks={tasks}
      projects={projects.map((p: any) => ({ id: p.id, title: p.title }))}
      meetings={meetings.map((m: any) => ({ id: m.id, title: m.title }))}
    />
  )
}
