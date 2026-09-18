import { notFound } from 'next/navigation'
import { getVaultContext, getWorkspaceProjectDetail } from '@/lib/vault/actions'
import { getProjectDocument } from '@/lib/vault/workbench-actions'
import { DocumentEditorView } from '@/components/vault/workbench/document-editor-view'

export const dynamic = 'force-dynamic'

interface DocumentPageProps {
  params: Promise<{ id: string; documentId: string }>
}

export default async function ProjectDocumentPage({ params }: DocumentPageProps) {
  const { id, documentId } = await params

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

  // Fetch document
  const doc = await getProjectDocument(documentId, id, activeWorkspace.id)
  if (!doc) {
    notFound()
  }

  return (
    <DocumentEditorView
      document={doc}
      projectId={id}
      workspaceId={activeWorkspace.id}
      projectName={project.title}
    />
  )
}
