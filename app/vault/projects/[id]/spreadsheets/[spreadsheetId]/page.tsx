import { notFound } from 'next/navigation'
import { getVaultContext, getWorkspaceProjectDetail } from '@/lib/vault/actions'
import { getProjectSpreadsheet } from '@/lib/vault/workbench-actions'
import { SpreadsheetEditorView } from '@/components/vault/workbench/spreadsheet-editor-view'

export const dynamic = 'force-dynamic'

interface SpreadsheetPageProps {
  params: Promise<{ id: string; spreadsheetId: string }>
}

export default async function ProjectSpreadsheetPage({ params }: SpreadsheetPageProps) {
  const { id, spreadsheetId } = await params

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

  // Fetch spreadsheet
  const sheet = await getProjectSpreadsheet(spreadsheetId, id, activeWorkspace.id)
  if (!sheet) {
    notFound()
  }

  return (
    <SpreadsheetEditorView
      spreadsheet={sheet}
      projectId={id}
      workspaceId={activeWorkspace.id}
      projectName={project.title}
    />
  )
}
