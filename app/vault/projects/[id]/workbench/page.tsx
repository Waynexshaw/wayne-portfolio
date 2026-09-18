import { notFound } from 'next/navigation'
import { getVaultContext, getWorkspaceProjectDetail } from '@/lib/vault/actions'
import { getProjectWorkbenchDirectory } from '@/lib/vault/workbench-actions'
import { WorkbenchDirectoryView } from '@/components/vault/workbench/workbench-directory-view'

export const dynamic = 'force-dynamic'

interface WorkbenchPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ folder?: string; archived?: string }>
}

export default async function ProjectWorkbenchPage({
  params,
  searchParams,
}: WorkbenchPageProps) {
  const { id } = await params
  const { folder, archived } = await searchParams

  const context = await getVaultContext()
  const activeWorkspace = context?.activeWorkspace
  if (!activeWorkspace?.id) {
    notFound()
  }

  // Verify project belongs to active workspace
  const project = await getWorkspaceProjectDetail(id, activeWorkspace.id)
  if (!project) {
    notFound()
  }

  const directoryData = await getProjectWorkbenchDirectory(
    id,
    activeWorkspace.id,
    folder || null,
    {
      showArchived: archived === 'true',
    }
  )

  return (
    <WorkbenchDirectoryView
      items={directoryData.items}
      currentFolder={directoryData.currentFolder}
      breadcrumbs={directoryData.breadcrumbs}
      stats={directoryData.stats}
      projectId={id}
      workspaceId={activeWorkspace.id}
      projectName={project.title}
    />
  )
}
