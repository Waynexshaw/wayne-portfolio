import { redirect } from 'next/navigation'
import { getVaultContext } from '@/lib/vault/actions'
import {
  getPendingApprovalsAction,
  getAutomationRulesAction,
  getAutomationRunsAction
} from '@/lib/vault/automation-actions'
import { AutomationHub } from '@/components/vault/automations/automation-hub'

export const dynamic = 'force-dynamic'

interface AutomationsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function AutomationsPage({ searchParams }: AutomationsPageProps) {
  const context = await getVaultContext()
  const activeWorkspaceId = context?.activeWorkspace?.id

  if (!context || !context.user || !activeWorkspaceId) {
    redirect('/vault/login')
  }

  const resolvedSearchParams = await searchParams
  const viewParam = typeof resolvedSearchParams.view === 'string' ? resolvedSearchParams.view : undefined

  // Fetch automation records in parallel
  const [approvals, rules, runs] = await Promise.all([
    getPendingApprovalsAction(activeWorkspaceId).catch(() => []),
    getAutomationRulesAction(activeWorkspaceId).catch(() => []),
    getAutomationRunsAction(activeWorkspaceId, { limit: 100 }).catch(() => []),
  ])

  return (
    <AutomationHub
      workspaceId={activeWorkspaceId}
      initialApprovals={approvals}
      initialRules={rules}
      initialRuns={runs}
      defaultView={viewParam}
    />
  )
}
