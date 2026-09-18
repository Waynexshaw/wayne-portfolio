import { notFound } from 'next/navigation'
import {
  getVaultContext,
  getWorkspaceProjects,
  getCompanies,
  getContacts,
} from '@/lib/vault/actions'
import {
  getMeetingDetailAction,
  getTasksAction,
  getDecisionsAction,
} from '@/lib/vault/operations-actions'
import { MeetingDetailView } from '@/components/vault/operations/meeting-detail-view'

export const dynamic = 'force-dynamic'

interface MeetingDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function MeetingDetailPage({ params }: MeetingDetailPageProps) {
  const { id } = await params
  const context = await getVaultContext()
  const activeWorkspace = context?.activeWorkspace

  if (!activeWorkspace?.id) {
    notFound()
  }

  const workspaceId = activeWorkspace.id

  let meeting: any = null
  try {
    meeting = await getMeetingDetailAction(workspaceId, id)
  } catch {
    notFound()
  }

  if (!meeting) {
    notFound()
  }

  // Fetch linked tasks, decisions, and workspace lookups in parallel
  const [tasks, decisions, projects, companies, contacts] = await Promise.all([
    getTasksAction(workspaceId, { meetingId: id, includeArchived: true }).catch(() => []),
    getDecisionsAction(workspaceId, { meetingId: id, includeArchived: true }).catch(() => []),
    getWorkspaceProjects(workspaceId).catch(() => []),
    getCompanies(workspaceId).catch(() => []),
    getContacts(workspaceId).catch(() => []),
  ])

  const isAdmin = Boolean(context?.activeWorkspace?.owner_id === context?.user?.id)

  return (
    <MeetingDetailView
      meeting={meeting}
      workspaceId={workspaceId}
      isAdmin={isAdmin}
      linkedTasks={tasks}
      linkedDecisions={decisions}
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
