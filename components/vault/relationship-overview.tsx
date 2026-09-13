import Link from 'next/link'
import { 
  Users, 
  UserCheck, 
  AlertCircle, 
  ArrowRight, 
  Building2, 
  Clock, 
  UserPlus 
} from 'lucide-react'

interface RelationshipOverviewProps {
  contacts: any[]
}

export function RelationshipOverview({ contacts }: RelationshipOverviewProps) {
  const totalContacts = contacts.length

  // Active relationships (not dormant or archived)
  const activeContacts = contacts.filter((c) => {
    const ws = c.workspace_contacts?.[0] || c.workspace_contacts
    const stage = ws?.relationship_stage
    return stage && stage !== 'dormant' && stage !== 'archived'
  })

  // Needing follow-up: has scheduled next_follow_up_at or has not been contacted yet in this workspace
  const needingFollowUp = contacts.filter((c) => {
    const ws = c.workspace_contacts?.[0] || c.workspace_contacts
    if (!ws) return false
    if (ws.next_follow_up_at) return true
    if (!ws.last_contacted_at && ws.relationship_stage !== 'archived') return true
    return false
  })

  // Stage distribution (derived from real data)
  const stageCounts: Record<string, number> = {}
  contacts.forEach((c) => {
    const ws = c.workspace_contacts?.[0] || c.workspace_contacts
    const stage = ws?.relationship_stage || 'lead'
    stageCounts[stage] = (stageCounts[stage] || 0) + 1
  })

  // Recently added contacts (up to 4)
  const recentContacts = [...contacts]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4)

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-400" />
          <h3 className="font-serif text-lg font-medium text-foreground">
            Relationship Overview
          </h3>
        </div>
        <Link 
          href="/vault/contacts"
          className="text-xs font-mono text-primary hover:text-primary/80 flex items-center gap-1"
        >
          View all contacts <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-secondary/40 border border-border/80">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[10px] font-mono uppercase">Total</span>
            <Users className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-serif font-bold text-foreground">
            {totalContacts}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">In current workspace</p>
        </div>

        <div className="p-3 rounded-lg bg-secondary/40 border border-border/80">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[10px] font-mono uppercase">Active</span>
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-serif font-bold text-foreground">
            {activeContacts.length}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Engaged contacts</p>
        </div>

        <div className="p-3 rounded-lg bg-secondary/40 border border-border/80">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[10px] font-mono uppercase">Follow-up Due</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-serif font-bold text-foreground">
            {needingFollowUp.length}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Touchpoint needed</p>
        </div>
      </div>

      {/* Relationship Stage Tags (if any exist) */}
      {Object.keys(stageCounts).length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="text-[10px] font-mono uppercase text-muted-foreground">
            Stage Distribution
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(stageCounts).map(([stage, count]) => (
              <span 
                key={stage}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-secondary/70 border border-border text-foreground flex items-center gap-1.5"
              >
                <span className="capitalize">{stage.replace('_', ' ')}</span>
                <span className="text-primary font-bold">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recently Added Contacts */}
      <div className="space-y-2 pt-1 border-t border-border">
        <div className="flex items-center justify-between text-[11px] font-mono uppercase text-muted-foreground">
          <span>Recently Added Contacts</span>
          <Link href="/vault/contacts" className="hover:text-primary transition-colors">
            + New Contact
          </Link>
        </div>

        {recentContacts.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No contacts recorded in this workspace yet.
          </p>
        ) : (
          <div className="space-y-2">
            {recentContacts.map((c) => {
              const ws = c.workspace_contacts?.[0] || c.workspace_contacts
              return (
                <div 
                  key={c.id}
                  className="p-2.5 rounded-lg bg-secondary/30 border border-border/60 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-medium text-foreground truncate">
                      {c.full_name}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
                      {c.role_title && <span>{c.role_title}</span>}
                      {c.role_title && c.company?.name && <span>·</span>}
                      {c.company?.name && <span>{c.company.name}</span>}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {ws?.relationship_stage && (
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border/70">
                        {ws.relationship_stage.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
