import Link from 'next/link'
import { FolderGit2, ArrowRight, Shield, Calendar } from 'lucide-react'

interface ActiveProjectsWidgetProps {
  projects: any[]
}

export function ActiveProjectsWidget({ projects }: ActiveProjectsWidgetProps) {
  const activeProjects = projects.filter(
    (p) => p.status !== 'archived' && p.status !== 'completed'
  )

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <FolderGit2 className="w-4 h-4 text-purple-400" />
          <h3 className="font-serif text-lg font-medium text-foreground">
            Active Workspace Projects
          </h3>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
            {activeProjects.length}
          </span>
        </div>
        <Link 
          href="/vault/projects"
          className="text-xs font-mono text-primary hover:text-primary/80 flex items-center gap-1"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Projects List */}
      {activeProjects.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground text-xs space-y-1">
          <p className="font-medium text-foreground">No active projects.</p>
          <p>Create initiatives within this workspace to track internal operational deliverables.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeProjects.slice(0, 6).map((proj) => {
            const targetDate = proj.target_date ? new Date(proj.target_date) : null

            return (
              <div
                key={proj.id}
                className="p-3.5 rounded-lg bg-secondary/30 border border-border space-y-2 hover:border-primary/40 transition-colors flex flex-col justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium text-foreground truncate">
                      {proj.title}
                    </h4>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                      {proj.status}
                    </span>
                  </div>

                  {proj.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {proj.description}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-border/80 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    {proj.identity && (
                      <span className="flex items-center gap-1 text-foreground/80">
                        <Shield className="w-3 h-3 text-primary" />
                        {proj.identity.name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase px-1.5 py-0.2 rounded bg-secondary text-muted-foreground">
                      {proj.priority}
                    </span>
                    {targetDate && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {targetDate.toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
