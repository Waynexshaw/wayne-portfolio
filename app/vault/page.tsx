import { 
  getVaultContext, 
  getContacts, 
  getCompanies, 
  getInteractions, 
  getFollowUps, 
  getOpportunities,
  getWorkspaceProjects
} from '@/lib/vault/actions'
import { CommandCenterHeader } from '@/components/vault/command-center-header'
import { AttentionSection } from '@/components/vault/attention-section'
import { RelationshipOverview } from '@/components/vault/relationship-overview'
import { PipelineOverview } from '@/components/vault/pipeline-overview'
import { ActiveProjectsWidget } from '@/components/vault/active-projects-widget'
import { RecentActivityWidget } from '@/components/vault/recent-activity-widget'

export const dynamic = 'force-dynamic'

export default async function VaultCommandCenterPage() {
  const context = await getVaultContext()
  const activeWorkspaceId = context?.activeWorkspace?.id

  // Fetch all workspace-scoped data in parallel through authenticated Supabase client
  const [contacts, companies, interactions, followUps, opportunities, projects] = await Promise.all([
    getContacts(activeWorkspaceId).catch(() => []),
    getCompanies(activeWorkspaceId).catch(() => []),
    getInteractions(activeWorkspaceId).catch(() => []),
    getFollowUps(activeWorkspaceId).catch(() => []),
    getOpportunities(activeWorkspaceId).catch(() => []),
    getWorkspaceProjects(activeWorkspaceId).catch(() => []),
  ])

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* 1. Command Center Header & Quick Actions */}
      <CommandCenterHeader 
        activeWorkspace={context?.activeWorkspace || null}
        activeIdentity={context?.activeIdentity || null}
      />

      {/* 2. Priority Attention Queue (Overdue, Due Today, Upcoming, Opportunities needing action) */}
      <AttentionSection 
        followUps={followUps}
        opportunities={opportunities}
      />

      {/* 3. Compact Opportunity Pipeline Overview */}
      <PipelineOverview 
        opportunities={opportunities}
      />

      {/* 4. Two-Column Layout: Relationship Overview & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RelationshipOverview 
          contacts={contacts}
        />
        <RecentActivityWidget 
          interactions={interactions}
        />
      </div>

      {/* 5. Active Workspace Projects */}
      <ActiveProjectsWidget 
        projects={projects}
      />
    </div>
  )
}