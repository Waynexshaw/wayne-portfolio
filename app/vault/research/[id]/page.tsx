import Link from 'next/link'
import { ArrowLeft, BookOpen, Database } from 'lucide-react'
import { getVaultContext, getResearchDetail, getResearchSources, getResearchEvidence, getResearchConnections } from '@/lib/vault/actions'
import { ResearchDetailView } from '@/components/vault/research/research-detail-view'

export const dynamic = 'force-dynamic'

interface ResearchDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ResearchDetailPage({ params }: ResearchDetailPageProps) {
  const { id } = await params
  const context = await getVaultContext()
  const activeWorkspace = context?.activeWorkspace

  let record: any = null
  let sources: any[] = []
  let evidence: any[] = []
  let connections: any[] = []
  let dbError: string | null = null

  try {
    record = await getResearchDetail(id, activeWorkspace?.id)
    if (record && activeWorkspace?.id) {
      const [sourcesRes, evidenceRes, connectionsRes] = await Promise.all([
        getResearchSources(id, activeWorkspace.id, true),
        getResearchEvidence(id, activeWorkspace.id, true),
        getResearchConnections(id, activeWorkspace.id)
      ])
      sources = sourcesRes
      evidence = evidenceRes
      connections = connectionsRes
    }
  } catch (err: any) {
    console.error('[Vault Research Detail Error]:', err?.message || err)
    dbError = 'Database query failure encountered while loading research record details.'
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
            A database error occurred while retrieving this research record. This may indicate a pending schema migration or connection issue.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/vault/research"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to Research Directory
          </Link>
        </div>
      </div>
    )
  }

  if (!record || !activeWorkspace?.id) {
    return (
      <div className="py-24 text-center space-y-4 max-w-md mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-secondary/80 border border-border flex items-center justify-center mx-auto text-muted-foreground shadow-sm">
          <BookOpen className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="font-serif text-xl font-medium text-foreground">
            Research Record Not Found
          </h2>
          <p className="text-xs text-muted-foreground">
            This research record does not exist or you do not have permission to view it in {activeWorkspace?.name || 'this workspace'}.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/vault/research"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to Research Directory
          </Link>
        </div>
      </div>
    )
  }

  return (
    <ResearchDetailView
      record={record}
      workspaceId={activeWorkspace.id}
      workspaceName={activeWorkspace.name}
      initialSources={sources}
      initialEvidence={evidence}
      initialConnections={connections}
    />
  )
}
