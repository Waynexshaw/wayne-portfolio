import { notFound } from 'next/navigation'
import {
  getVaultContext,
  getWorkspaceProjects,
  getCompanies,
  getContacts,
} from '@/lib/vault/actions'
import {
  getTasksAction,
  getMeetingsAction,
  getDecisionsAction,
  getOperationsStatsAction,
} from '@/lib/vault/operations-actions'
import { OperationsView } from '@/components/vault/operations/operations-view'

export const dynamic = 'force-dynamic'

interface OperationsPageProps {
  searchParams: Promise<{
    view?: string
    projectId?: string
    project?: string
    search?: string
    includeArchived?: string
  }>
}

export default async function OperationsPage({ searchParams }: OperationsPageProps) {
  const params = await searchParams
  const context = await getVaultContext()
  const activeWorkspace = context?.activeWorkspace

  if (!activeWorkspace?.id) {
    notFound()
  }

  const workspaceId = activeWorkspace.id
  const targetProjectId = params.projectId || params.project
  const includeArchived = params.includeArchived === 'true'

  // Parallel fetch of operations entities, metadata, and stats
  const [tasks, meetings, decisions, stats, projects, companies, contacts] = await Promise.all([
    getTasksAction(workspaceId, {
      projectId: targetProjectId,
      includeArchived: true, // Fetch all so client tab can filter dynamically
    }).catch(() => []),
    getMeetingsAction(workspaceId, {
      projectId: targetProjectId,
      includeArchived: true,
    }).catch(() => []),
    getDecisionsAction(workspaceId, {
      projectId: targetProjectId,
      includeArchived: true,
    }).catch(() => []),
    getOperationsStatsAction(workspaceId, targetProjectId),
    getWorkspaceProjects(workspaceId).catch(() => []),
    getCompanies(workspaceId).catch(() => []),
    getContacts(workspaceId).catch(() => []),
  ])

  const isAdmin = Boolean(context?.activeWorkspace?.owner_id === context?.user?.id)

  return (
    <OperationsView
      workspaceId={workspaceId}
      isAdmin={isAdmin}
      initialTasks={tasks}
      initialMeetings={meetings}
      initialDecisions={decisions}
      stats={stats}
      projects={projects.map((p: any) => ({ id: p.id, title: p.title }))}
      companies={companies.map((c: any) => ({ id: c.id, name: c.name }))}
      contacts={contacts.map((c: any) => ({
        id: c.id,
        full_name: c.full_name,
        email: c.email || null,
        role_title: c.role_title || null,
      }))}
    />
  )
}
