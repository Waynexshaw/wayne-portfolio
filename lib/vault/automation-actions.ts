'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  AutomationRule,
  AutomationApproval,
  AutomationRun,
  WorkspaceNotification,
  AutomationActionType,
} from './automation/types'
import { ACTION_REGISTRY } from './automation/actions'
import { getTemplateById } from './automation/templates'

// Helper to verify user and workspace membership
async function requireWorkspaceAccess(workspaceId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: membership } = await (supabase as any)
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) throw new Error('Unauthorized')
  return { supabase, user, role: membership.role }
}

// ============================================================================
// 1. APPROVAL ACTIONS
// ============================================================================

export async function respondToApprovalAction(
  workspaceId: string,
  approvalId: string,
  decision: 'approved' | 'rejected',
  modifiedPayload?: Record<string, any>
): Promise<{ success: boolean; error?: string; entityId?: string }> {
  const { supabase, user } = await requireWorkspaceAccess(workspaceId)
  const nowIso = new Date().toISOString()

  // Concurrency-Safe Atomic Claim:
  // Update status ONLY if current status is exactly 'pending'.
  // If two requests race concurrently, exactly one will update 1 row, and the other will update 0 rows.
  const targetStatus = decision === 'approved' ? 'approved' : 'rejected'

  const { data: claimedApproval, error: claimErr } = await (supabase as any)
    .from('automation_approvals')
    .update({
      status: targetStatus,
      reviewed_by: user.id,
      reviewed_at: nowIso,
      modified_payload: modifiedPayload || null,
    })
    .eq('id', approvalId)
    .eq('workspace_id', workspaceId)
    .eq('status', 'pending')
    .select('id, workspace_id, run_id, action_type, proposed_payload, expires_at')
    .maybeSingle()

  if (claimErr || !claimedApproval) {
    return {
      success: false,
      error: 'Approval request is no longer pending (it may have already been reviewed or claimed by a concurrent request)',
    }
  }

  // Check expiration (Section 14)
  if (claimedApproval.expires_at && new Date(claimedApproval.expires_at) < new Date()) {
    await (supabase as any)
      .from('automation_approvals')
      .update({ status: 'expired' })
      .eq('id', approvalId)
      .eq('workspace_id', workspaceId)

    await (supabase as any)
      .from('automation_runs')
      .update({
        status: 'cancelled',
        error_details: 'Approval request expired before human response',
        completed_at: nowIso,
      })
      .eq('id', claimedApproval.run_id)
      .eq('workspace_id', workspaceId)

    revalidatePath('/vault')
    return {
      success: false,
      error: 'This approval request has expired and is no longer actionable.',
    }
  }

  if (decision === 'rejected') {
    // 1. Mark run as rejected
    await (supabase as any)
      .from('automation_runs')
      .update({
        status: 'rejected',
        completed_at: nowIso,
      })
      .eq('id', claimedApproval.run_id)
      .eq('workspace_id', workspaceId)

    revalidatePath('/vault')
    return { success: true }
  }

  // Decision === 'approved'
  const finalPayload = modifiedPayload || claimedApproval.proposed_payload
  const actionDef = ACTION_REGISTRY[claimedApproval.action_type as AutomationActionType]

  if (!actionDef) {
    // Revert claim on unknown action
    await (supabase as any)
      .from('automation_approvals')
      .update({ status: 'pending', reviewed_by: null, reviewed_at: null })
      .eq('id', approvalId)
      .eq('workspace_id', workspaceId)
    return { success: false, error: `Unknown action type: ${claimedApproval.action_type}` }
  }

  // Validate payload before execution
  const validation = actionDef.validatePayload(finalPayload)
  if (!validation.valid) {
    // Revert claim on malformed payload
    await (supabase as any)
      .from('automation_approvals')
      .update({ status: 'pending', reviewed_by: null, reviewed_at: null })
      .eq('id', approvalId)
      .eq('workspace_id', workspaceId)
    return { success: false, error: `Invalid payload: ${validation.error}` }
  }

  // Mark run as running
  await (supabase as any)
    .from('automation_runs')
    .update({ status: 'running' })
    .eq('id', claimedApproval.run_id)
    .eq('workspace_id', workspaceId)

  // Execute deterministic action
  const execResult = await actionDef.execute({
    supabase,
    workspaceId,
    payload: finalPayload,
    userId: user.id,
    runId: claimedApproval.run_id,
  })

  if (!execResult.success) {
    // Update run as failed
    await (supabase as any)
      .from('automation_runs')
      .update({
        status: 'failed',
        error_details: execResult.error || 'Execution failed during approval',
        completed_at: nowIso,
      })
      .eq('id', claimedApproval.run_id)
      .eq('workspace_id', workspaceId)

    return { success: false, error: execResult.error || 'Failed to execute approved action' }
  }

  // Update run as succeeded
  await (supabase as any)
    .from('automation_runs')
    .update({
      status: 'succeeded',
      execution_details: execResult.details || {},
      completed_at: nowIso,
    })
    .eq('id', claimedApproval.run_id)
    .eq('workspace_id', workspaceId)

  revalidatePath('/vault')
  return { success: true, entityId: execResult.entityId }
}

export async function getPendingApprovalsAction(
  workspaceId: string
): Promise<AutomationApproval[]> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  const { data, error } = await (supabase as any)
    .from('automation_approvals')
    .select(`
      id,
      workspace_id,
      run_id,
      action_type,
      proposed_payload,
      modified_payload,
      status,
      source_context,
      reviewed_by,
      reviewed_at,
      expires_at,
      created_at
    `)
    .eq('workspace_id', workspaceId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching pending approvals:', error)
    return []
  }

  return (data || []) as AutomationApproval[]
}

// ============================================================================
// 2. RULE MANAGEMENT ACTIONS
// ============================================================================

export async function getAutomationRulesAction(
  workspaceId: string
): Promise<AutomationRule[]> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  const { data, error } = await (supabase as any)
    .from('automation_rules')
    .select('*')
    .eq('workspace_id', workspaceId)
    .is('archived_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching automation rules:', error)
    return []
  }

  return (data || []) as AutomationRule[]
}

export async function instantiateAutomationRuleFromTemplateAction(
  workspaceId: string,
  templateId: string,
  overrides?: {
    title?: string
    description?: string
    action_config?: Record<string, any>
    conditions?: any
  }
): Promise<{ success: boolean; ruleId?: string; error?: string }> {
  const { supabase, user } = await requireWorkspaceAccess(workspaceId)

  const template = getTemplateById(templateId)
  if (!template) {
    return { success: false, error: `Template '${templateId}' not found` }
  }

  // Prevent activation of templates requiring higher-frequency scheduling on Hobby deployment
  if (template.is_disabled_on_hobby) {
    return {
      success: false,
      error: `Activation unavailable: "${template.title}" requires a higher-frequency scheduler. Current deployment runs once daily at 06:00 UTC.`,
    }
  }

  // Prevent accidental duplicate active instances of the same template in workspace (Section 20)
  const { data: existingActive } = await (supabase as any)
    .from('automation_rules')
    .select('id, title')
    .eq('workspace_id', workspaceId)
    .eq('template_id', template.id)
    .eq('is_active', true)
    .is('archived_at', null)
    .maybeSingle()

  if (existingActive) {
    return {
      success: false,
      error: `An active automation rule based on "${template.title}" is already running in this workspace.`,
      ruleId: existingActive.id,
    }
  }

  const insertData = {
    workspace_id: workspaceId,
    template_id: template.id,
    title: overrides?.title || template.title,
    description: overrides?.description || template.description,
    trigger_type: template.trigger_type,
    trigger_config: template.default_trigger_config,
    conditions: overrides?.conditions || template.default_conditions,
    action_type: template.action_type,
    action_config: overrides?.action_config || template.default_action_config,
    requires_approval: template.requires_approval,
    is_active: true,
    version: 1,
    created_by: user.id,
  }

  const { data, error } = await (supabase as any)
    .from('automation_rules')
    .insert(insertData)
    .select('id')
    .single()

  if (error || !data) {
    return { success: false, error: error?.message || 'Failed to instantiate rule' }
  }

  revalidatePath('/vault')
  return { success: true, ruleId: data.id }
}

export async function toggleAutomationRuleAction(
  workspaceId: string,
  ruleId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  const { error } = await (supabase as any)
    .from('automation_rules')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', ruleId)
    .eq('workspace_id', workspaceId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/vault')
  return { success: true }
}

export async function updateAutomationRuleAction(
  workspaceId: string,
  ruleId: string,
  updates: {
    title?: string
    description?: string
    action_config?: Record<string, any>
    conditions?: any
    trigger_config?: Record<string, any>
  }
): Promise<{ success: boolean; error?: string }> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  const { data: existing, error: getErr } = await (supabase as any)
    .from('automation_rules')
    .select('version')
    .eq('id', ruleId)
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (getErr || !existing) {
    return { success: false, error: 'Rule not found' }
  }

  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
    version: (existing.version || 1) + 1, // Rule version increment on configuration change
  }

  if (updates.title !== undefined) updatePayload.title = updates.title.trim()
  if (updates.description !== undefined) updatePayload.description = updates.description?.trim() || null
  if (updates.action_config !== undefined) updatePayload.action_config = updates.action_config
  if (updates.conditions !== undefined) updatePayload.conditions = updates.conditions
  if (updates.trigger_config !== undefined) updatePayload.trigger_config = updates.trigger_config

  const { error } = await (supabase as any)
    .from('automation_rules')
    .update(updatePayload)
    .eq('id', ruleId)
    .eq('workspace_id', workspaceId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/vault')
  return { success: true }
}

export async function archiveAutomationRuleAction(
  workspaceId: string,
  ruleId: string
): Promise<{ success: boolean; error?: string }> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  const { error } = await (supabase as any)
    .from('automation_rules')
    .update({
      is_active: false,
      archived_at: new Date().toISOString(),
    })
    .eq('id', ruleId)
    .eq('workspace_id', workspaceId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/vault')
  return { success: true }
}

// ============================================================================
// 3. RUN AUDIT ACTIONS
// ============================================================================

export async function getAutomationRunsAction(
  workspaceId: string,
  filters?: {
    ruleId?: string
    status?: string
    limit?: number
  }
): Promise<AutomationRun[]> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  let query = (supabase as any)
    .from('automation_runs')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (filters?.ruleId) {
    query = query.eq('rule_id', filters.ruleId)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.limit) {
    query = query.limit(filters.limit)
  } else {
    query = query.limit(50)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching automation runs:', error)
    return []
  }

  return (data || []) as AutomationRun[]
}

// ============================================================================
// 4. NOTIFICATION ACTIONS
// ============================================================================

export async function getWorkspaceNotificationsAction(
  workspaceId: string
): Promise<WorkspaceNotification[]> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  const { data, error } = await (supabase as any)
    .from('workspace_notifications')
    .select('*')
    .eq('workspace_id', workspaceId)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) {
    console.error('Error fetching notifications:', error)
    return []
  }

  return (data || []) as WorkspaceNotification[]
}

export async function markNotificationReadAction(
  workspaceId: string,
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  const { error } = await (supabase as any)
    .from('workspace_notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', notificationId)
    .eq('workspace_id', workspaceId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/vault')
  return { success: true }
}

export async function getUnreadNotificationCountAction(
  workspaceId: string
): Promise<{ unreadCount: number }> {
  try {
    const { supabase } = await requireWorkspaceAccess(workspaceId)
    const { count, error } = await (supabase as any)
      .from('workspace_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('is_read', false)
      .is('archived_at', null)

    if (error) {
      console.error('Error fetching unread notification count:', error)
      return { unreadCount: 0 }
    }
    return { unreadCount: count || 0 }
  } catch {
    return { unreadCount: 0 }
  }
}

export async function markAllNotificationsReadAction(
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)
  const { error } = await (supabase as any)
    .from('workspace_notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)
    .eq('is_read', false)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/vault')
  return { success: true }
}

export async function getCommandCenterAutomationAttentionAction(
  workspaceId: string
): Promise<{ pendingApprovalsCount: number; recentFailuresCount: number }> {
  try {
    const { supabase } = await requireWorkspaceAccess(workspaceId)

    // 1. Pending approvals count
    const { count: pendingCount, error: appErr } = await (supabase as any)
      .from('automation_approvals')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'pending')

    // 2. Recent failed runs in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { count: failCount, error: failErr } = await (supabase as any)
      .from('automation_runs')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'failed')
      .gte('created_at', sevenDaysAgo)

    return {
      pendingApprovalsCount: (!appErr && pendingCount) ? pendingCount : 0,
      recentFailuresCount: (!failErr && failCount) ? failCount : 0,
    }
  } catch {
    return { pendingApprovalsCount: 0, recentFailuresCount: 0 }
  }
}
