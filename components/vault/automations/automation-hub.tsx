'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Inbox,
  Zap,
  History,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import {
  AutomationApproval,
  AutomationRule,
  AutomationRun
} from '@/lib/vault/automation/types'
import {
  respondToApprovalAction,
  toggleAutomationRuleAction,
  instantiateAutomationRuleFromTemplateAction
} from '@/lib/vault/automation-actions'
import { InboxTab } from './inbox-tab'
import { RulesTab } from './rules-tab'
import { HistoryTab } from './history-tab'
import { TemplatesView } from './templates-view'
import { cn } from '@/lib/utils'

interface AutomationHubProps {
  workspaceId: string
  initialApprovals: AutomationApproval[]
  initialRules: AutomationRule[]
  initialRuns: AutomationRun[]
  defaultView?: string
}

export function AutomationHub({
  workspaceId,
  initialApprovals,
  initialRules,
  initialRuns,
  defaultView,
}: AutomationHubProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const viewParam = searchParams.get('view') || defaultView || (initialApprovals.length > 0 ? 'inbox' : 'rules')

  const [currentTab, setCurrentTab] = useState<'inbox' | 'rules' | 'history' | 'templates'>(
    (viewParam as any) || (initialApprovals.length > 0 ? 'inbox' : 'rules')
  )

  const [approvals, setApprovals] = useState<AutomationApproval[]>(initialApprovals)
  const [rules, setRules] = useState<AutomationRule[]>(initialRules)
  const [runs, setRuns] = useState<AutomationRun[]>(initialRuns)
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleTabChange = (tab: 'inbox' | 'rules' | 'history' | 'templates') => {
    setCurrentTab(tab)
    router.replace(`/vault/automations?view=${tab}`, { scroll: false })
  }

  // 1. Approve / Edit & Approve
  const handleApprove = async (approvalId: string, modifiedPayload?: Record<string, any>) => {
    setNotificationMsg(null)
    startTransition(async () => {
      const res = await respondToApprovalAction(workspaceId, approvalId, 'approved', modifiedPayload)
      if (res.success) {
        setApprovals(prev => prev.filter(a => a.id !== approvalId))
        setNotificationMsg({ type: 'success', message: 'Action successfully approved and executed.' })
        router.refresh()
      } else {
        setNotificationMsg({ type: 'error', message: res.error || 'Failed to approve action.' })
      }
    })
  }

  // 2. Reject
  const handleReject = async (approvalId: string) => {
    setNotificationMsg(null)
    startTransition(async () => {
      const res = await respondToApprovalAction(workspaceId, approvalId, 'rejected')
      if (res.success) {
        setApprovals(prev => prev.filter(a => a.id !== approvalId))
        setNotificationMsg({ type: 'success', message: 'Suggestion rejected and dismissed.' })
        router.refresh()
      } else {
        setNotificationMsg({ type: 'error', message: res.error || 'Failed to reject action.' })
      }
    })
  }

  // 3. Toggle Rule Enable/Disable
  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    setNotificationMsg(null)
    startTransition(async () => {
      const res = await toggleAutomationRuleAction(workspaceId, ruleId, isActive)
      if (res.success) {
        setRules(prev => prev.map(r => (r.id === ruleId ? { ...r, is_active: isActive } : r)))
        setNotificationMsg({
          type: 'success',
          message: isActive ? 'Automation rule enabled.' : 'Automation rule paused.',
        })
        router.refresh()
      } else {
        setNotificationMsg({ type: 'error', message: res.error || 'Failed to toggle rule.' })
      }
    })
  }

  // 4. Activate Template
  const handleActivateTemplate = async (templateId: string) => {
    setNotificationMsg(null)
    startTransition(async () => {
      const res = await instantiateAutomationRuleFromTemplateAction(workspaceId, templateId)
      if (res.success) {
        setNotificationMsg({ type: 'success', message: 'Automation rule instantiated from template.' })
        setCurrentTab('rules')
        router.replace('/vault/automations?view=rules', { scroll: false })
        router.refresh()
      } else {
        setNotificationMsg({ type: 'error', message: res.error || 'Failed to activate template.' })
      }
    })
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Automation Hub Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-2xl font-medium tracking-tight text-foreground">
              Automations
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              Deterministic V1
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Manage automated event triggers, review human authorization queues, and inspect execution audit ledgers.
          </p>
        </div>

        {/* Secondary CTA: Browse Templates */}
        <button
          type="button"
          onClick={() => handleTabChange('templates')}
          className={cn(
            'px-3.5 py-2 rounded-lg text-xs font-medium transition-all shadow-sm flex items-center gap-2 self-start sm:self-auto shrink-0',
            currentTab === 'templates'
              ? 'bg-primary text-primary-foreground'
              : 'border border-border bg-card hover:bg-secondary text-foreground'
          )}
        >
          <Sparkles className="w-4 h-4 text-primary" /> Browse Templates
        </button>
      </div>

      {/* Global Action Notification Feedback */}
      {notificationMsg && (
        <div
          className={cn(
            'p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 animate-in fade-in',
            notificationMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
          )}
        >
          <div className="flex items-center gap-2">
            {notificationMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{notificationMsg.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotificationMsg(null)}
            className="text-[11px] font-mono opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-px overflow-x-auto text-xs">
        {/* 1. Inbox Tab */}
        <button
          type="button"
          onClick={() => handleTabChange('inbox')}
          className={cn(
            'px-4 py-2.5 rounded-t-lg font-medium transition-all flex items-center gap-2 border-b-2 -mb-px shrink-0',
            currentTab === 'inbox'
              ? 'border-primary text-foreground bg-card'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Inbox className="w-4 h-4" />
          <span>Inbox</span>
          {approvals.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 font-mono text-[10px] font-bold">
              {approvals.length}
            </span>
          )}
        </button>

        {/* 2. Rules Tab */}
        <button
          type="button"
          onClick={() => handleTabChange('rules')}
          className={cn(
            'px-4 py-2.5 rounded-t-lg font-medium transition-all flex items-center gap-2 border-b-2 -mb-px shrink-0',
            currentTab === 'rules'
              ? 'border-primary text-foreground bg-card'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Zap className="w-4 h-4" />
          <span>Rules</span>
          <span className="px-1.5 py-0.2 rounded-full bg-secondary text-muted-foreground font-mono text-[10px]">
            {rules.length}
          </span>
        </button>

        {/* 3. History Tab */}
        <button
          type="button"
          onClick={() => handleTabChange('history')}
          className={cn(
            'px-4 py-2.5 rounded-t-lg font-medium transition-all flex items-center gap-2 border-b-2 -mb-px shrink-0',
            currentTab === 'history'
              ? 'border-primary text-foreground bg-card'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <History className="w-4 h-4" />
          <span>History</span>
          <span className="px-1.5 py-0.2 rounded-full bg-secondary text-muted-foreground font-mono text-[10px]">
            {runs.length}
          </span>
        </button>

        {/* 4. Templates Tab */}
        <button
          type="button"
          onClick={() => handleTabChange('templates')}
          className={cn(
            'px-4 py-2.5 rounded-t-lg font-medium transition-all flex items-center gap-2 border-b-2 -mb-px shrink-0 sm:hidden',
            currentTab === 'templates'
              ? 'border-primary text-foreground bg-card'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Sparkles className="w-4 h-4" />
          <span>Templates</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {currentTab === 'inbox' && (
          <InboxTab
            approvals={approvals}
            onApprove={handleApprove}
            onReject={handleReject}
            isProcessing={isPending}
          />
        )}

        {currentTab === 'rules' && (
          <RulesTab
            rules={rules}
            onToggleRule={handleToggleRule}
            onSwitchToTemplates={() => handleTabChange('templates')}
            isProcessing={isPending}
          />
        )}

        {currentTab === 'history' && (
          <HistoryTab runs={runs} />
        )}

        {currentTab === 'templates' && (
          <TemplatesView
            existingRules={rules}
            onActivateTemplate={handleActivateTemplate}
            onSwitchToRules={() => handleTabChange('rules')}
            isProcessing={isPending}
          />
        )}
      </div>
    </div>
  )
}
