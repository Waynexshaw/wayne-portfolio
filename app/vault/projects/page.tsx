import { getVaultContext, getWorkspaceProjects } from '@/lib/vault/actions'
import { FolderGit2, Calendar, Shield } from 'lucide-react'
import { ProjectCreateButton } from './create-button'

export const dynamic = 'force-dynamic'

export default async function VaultProjectsPage() {
  const context = await getVaultContext()
  const activeWorkspace = context?.activeWorkspace
  const internalProjects = await getWorkspaceProjects(activeWorkspace?.id).catch(() => [])

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl font-medium text-foreground">
              Internal Workspace Projects
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
              {internalProjects.length} Total
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Operational ventures and private initiatives. Distinct from public portfolio showcases.
          </p>
        </div>

        <ProjectCreateButton
          workspaceId={activeWorkspace?.id}
          workspaceName={activeWorkspace?.name}
          identities={context?.identities || []}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {internalProjects.length === 0 ? (
          <div className="col-span-full py-16 text-center text-muted-foreground text-sm bg-card border border-border rounded-xl">
            <FolderGit2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No internal workspace projects registered. Create projects within your active workspace to track private operational work.</p>
          </div>
        ) : (
          internalProjects.map((proj: any) => (
            <div 
              key={proj.id} 
              className="p-5 rounded-xl bg-card border border-border space-y-3 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start justify-between">
                <h3 className="text-base font-medium text-foreground">{proj.title}</h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-primary/10 text-primary">
                  {proj.status}
                </span>
              </div>

              {proj.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {proj.description}
                </p>
              )}

              <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-mono">
                {proj.identity && (
                  <div className="flex items-center gap-1">
                    <Shield className="w-3 h-3 text-electric" />
                    <span>{proj.identity.name}</span>
                  </div>
                )}
                <span>Priority: {proj.priority}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}