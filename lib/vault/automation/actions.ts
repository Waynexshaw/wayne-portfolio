import { SupabaseClient } from '@supabase/supabase-js'
import { AutomationActionType } from './types'

export const APPROVAL_REQUIRED_ACTION_TYPES: Set<AutomationActionType> = new Set([
  'suggest_task_creation',
  'suggest_follow_up_creation',
  'suggest_portfolio_snapshot',
  'suggest_review_creation',
])

export const SAFE_AUTONOMOUS_ACTION_TYPES: Set<AutomationActionType> = new Set([
  'create_internal_notification',
])

export interface ActionDefinition {
  type: AutomationActionType
  label: string
  description: string
  requiresApproval: boolean
  validatePayload: (payload: any) => { valid: boolean; error?: string; normalized?: any }
  execute: (params: {
    supabase: SupabaseClient<any, any, any>
    workspaceId: string
    payload: any
    userId?: string | null
    runId?: string | null
  }) => Promise<{ success: boolean; entityId?: string; details?: any; error?: string }>
}

export function doesActionRequireApproval(actionType: AutomationActionType): boolean {
  // Hard safety invariant: The server-side registry is authoritative
  return APPROVAL_REQUIRED_ACTION_TYPES.has(actionType)
}

// ----------------------------------------------------------------------------
// Action Executors & Validators
// ----------------------------------------------------------------------------

export const ACTION_REGISTRY: Record<AutomationActionType, ActionDefinition> = {
  // 1. Suggest Task Creation
  suggest_task_creation: {
    type: 'suggest_task_creation',
    label: 'Suggest Task Creation',
    description: 'Proposes an operational action item linked to context',
    requiresApproval: true,
    validatePayload: (payload) => {
      if (!payload || typeof payload !== 'object') {
        return { valid: false, error: 'Payload must be an object' }
      }
      const title = payload.title?.trim()
      if (!title) return { valid: false, error: 'Task title is required' }

      const validPriorities = ['low', 'medium', 'high', 'urgent']
      const priority = validPriorities.includes(payload.priority) ? payload.priority : 'medium'
      const status = 'todo'

      return {
        valid: true,
        normalized: {
          title,
          description: payload.description?.trim() || null,
          priority,
          status,
          due_date: payload.due_date || null,
          project_id: payload.project_id || null,
          meeting_id: payload.meeting_id || null,
          decision_id: payload.decision_id || null,
        },
      }
    },
    execute: async ({ supabase, workspaceId, payload, userId, runId }) => {
      const normalized = ACTION_REGISTRY.suggest_task_creation.validatePayload(payload)
      if (!normalized.valid) {
        return { success: false, error: normalized.error }
      }

      const insertData = {
        ...normalized.normalized,
        workspace_id: workspaceId,
        created_by: userId || null,
      }

      const { data, error } = await (supabase as any)
        .from('tasks')
        .insert(insertData)
        .select('id, title, status, priority, due_date')
        .single()

      if (error || !data) {
        return { success: false, error: error?.message || 'Failed to create task' }
      }

      return {
        success: true,
        entityId: data.id,
        details: { taskId: data.id, title: data.title, status: data.status },
      }
    },
  },

  // 2. Suggest Follow-Up Creation
  suggest_follow_up_creation: {
    type: 'suggest_follow_up_creation',
    label: 'Suggest Follow-Up Creation',
    description: 'Proposes a relationship touchpoint for a contact',
    requiresApproval: true,
    validatePayload: (payload) => {
      if (!payload || typeof payload !== 'object') {
        return { valid: false, error: 'Payload must be an object' }
      }
      const title = payload.title?.trim()
      if (!title) return { valid: false, error: 'Follow-up title is required' }
      if (!payload.contact_id) return { valid: false, error: 'Contact ID is required' }

      const validPriorities = ['low', 'medium', 'high', 'urgent']
      const priority = validPriorities.includes(payload.priority) ? payload.priority : 'medium'
      const dueDate = payload.due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

      return {
        valid: true,
        normalized: {
          title,
          description: payload.description?.trim() || null,
          contact_id: payload.contact_id,
          interaction_id: payload.interaction_id || null,
          priority,
          status: 'pending',
          due_date: dueDate,
        },
      }
    },
    execute: async ({ supabase, workspaceId, payload, userId }) => {
      const normalized = ACTION_REGISTRY.suggest_follow_up_creation.validatePayload(payload)
      if (!normalized.valid) {
        return { success: false, error: normalized.error }
      }

      const insertData = {
        ...normalized.normalized,
        workspace_id: workspaceId,
        created_by: userId || null,
      }

      const { data, error } = await (supabase as any)
        .from('follow_ups')
        .insert(insertData)
        .select('id, title, status, priority, due_date, contact_id')
        .single()

      if (error || !data) {
        return { success: false, error: error?.message || 'Failed to create follow-up' }
      }

      return {
        success: true,
        entityId: data.id,
        details: { followUpId: data.id, title: data.title, contactId: data.contact_id },
      }
    },
  },

  // 3. Suggest Portfolio Snapshot
  suggest_portfolio_snapshot: {
    type: 'suggest_portfolio_snapshot',
    label: 'Suggest Portfolio Snapshot',
    description: 'Proposes creating a snapshot bridge between approved evidence and portfolio',
    requiresApproval: true,
    validatePayload: (payload) => {
      if (!payload || typeof payload !== 'object') {
        return { valid: false, error: 'Payload must be an object' }
      }
      if (!payload.evidence_id) return { valid: false, error: 'Evidence ID is required' }

      const hasProject = Boolean(payload.public_project_id)
      const hasCaseStudy = Boolean(payload.public_case_study_id)

      if ((hasProject && hasCaseStudy) || (!hasProject && !hasCaseStudy)) {
        return { valid: false, error: 'Exactly one of public_project_id or public_case_study_id must be provided' }
      }

      return {
        valid: true,
        normalized: {
          evidence_id: payload.evidence_id,
          public_project_id: payload.public_project_id || null,
          public_case_study_id: payload.public_case_study_id || null,
        },
      }
    },
    execute: async ({ supabase, workspaceId, payload, userId }) => {
      const normalized = ACTION_REGISTRY.suggest_portfolio_snapshot.validatePayload(payload)
      if (!normalized.valid) {
        return { success: false, error: normalized.error }
      }

      // Hard safety check: Verify evidence exists, belongs to workspace, and is approved & active
      const { data: evidence, error: evError } = await (supabase as any)
        .from('workspace_evidence')
        .select('id, workspace_id, title, public_claim, public_summary, result_statement, approval_status, archived_at')
        .eq('id', normalized.normalized.evidence_id)
        .eq('workspace_id', workspaceId)
        .maybeSingle()

      if (evError || !evidence) {
        return { success: false, error: 'Target evidence not found in this workspace' }
      }

      if (evidence.archived_at !== null) {
        return { success: false, error: 'Archived evidence cannot be bridged' }
      }

      if (evidence.approval_status !== 'approved') {
        return { success: false, error: 'Only approved evidence can produce a portfolio bridge snapshot' }
      }

      const insertData = {
        workspace_id: workspaceId,
        evidence_id: evidence.id,
        public_project_id: normalized.normalized.public_project_id,
        public_case_study_id: normalized.normalized.public_case_study_id,
        snapshot_title: evidence.title,
        snapshot_claim: evidence.public_claim,
        snapshot_summary: evidence.public_summary,
        snapshot_result: evidence.result_statement,
        snapshotted_at: new Date().toISOString(),
        created_by: userId || null,
      }

      const { data, error } = await (supabase as any)
        .from('portfolio_evidence_bridges')
        .insert(insertData)
        .select('id, evidence_id, public_project_id, public_case_study_id, snapshotted_at')
        .single()

      if (error || !data) {
        return { success: false, error: error?.message || 'Failed to create portfolio evidence bridge' }
      }

      return {
        success: true,
        entityId: data.id,
        details: { bridgeId: data.id, evidenceId: data.evidence_id },
      }
    },
  },

  // 4. Suggest Review Creation
  suggest_review_creation: {
    type: 'suggest_review_creation',
    label: 'Suggest Review Creation',
    description: 'Proposes initiating a draft retrospective review using canonical WV review schema',
    requiresApproval: true,
    validatePayload: (payload) => {
      if (!payload || typeof payload !== 'object') {
        return { valid: false, error: 'Payload must be an object' }
      }
      const title = payload.title?.trim()
      if (!title) return { valid: false, error: 'Review title is required' }

      // Canonical WV review types from Migration 010 (public.reviews)
      const canonicalTypes = [
        'project',
        'campaign',
        'growth',
        'strategy',
        'opportunity',
        'partnership',
        'period',
        'other',
      ]
      const reviewType = payload.review_type || 'project'
      if (!canonicalTypes.includes(reviewType)) {
        return {
          valid: false,
          error: `Invalid review_type '${reviewType}'. Must be one of canonical WV types: ${canonicalTypes.join(', ')}`,
        }
      }

      const periodStart = payload.period_start || payload.review_period_start || new Date().toISOString().split('T')[0]
      const periodEnd = payload.period_end || payload.review_period_end || new Date().toISOString().split('T')[0]

      if (periodStart && periodEnd && periodStart > periodEnd) {
        return { valid: false, error: 'period_start cannot be after period_end' }
      }

      return {
        valid: true,
        normalized: {
          title,
          review_type: reviewType,
          status: 'draft',
          period_start: periodStart,
          period_end: periodEnd,
          project_id: payload.project_id || null,
        },
      }
    },
    execute: async ({ supabase, workspaceId, payload, userId }) => {
      const normalized = ACTION_REGISTRY.suggest_review_creation.validatePayload(payload)
      if (!normalized.valid) {
        return { success: false, error: normalized.error }
      }

      const { title, review_type, period_start, period_end, project_id } = normalized.normalized

      const insertData = {
        workspace_id: workspaceId,
        title,
        review_type,
        status: 'draft',
        period_start,
        period_end,
        created_by: userId || null,
      }

      const { data, error } = await (supabase as any)
        .from('reviews')
        .insert(insertData)
        .select('id, title, status, review_type')
        .single()

      if (error || !data) {
        return { success: false, error: error?.message || 'Failed to create review draft' }
      }

      // If a project_id was linked, establish connection via review_connections (Migration 011)
      if (project_id) {
        await (supabase as any)
          .from('review_connections')
          .insert({
            workspace_id: workspaceId,
            review_id: data.id,
            project_id: project_id,
            relationship_type: 'subject',
            created_by: userId || null,
          })
          .catch((connErr: any) => {
            console.error('Failed to link review to project:', connErr)
          })
      }

      return {
        success: true,
        entityId: data.id,
        details: { reviewId: data.id, title: data.title, status: data.status, reviewType: data.review_type },
      }
    },
  },

  // 5. Create Internal Notification (Safe Autonomous)
  create_internal_notification: {
    type: 'create_internal_notification',
    label: 'Create Internal Notification',
    description: 'Emits an in-app alert or notification badge within Vault',
    requiresApproval: false,
    validatePayload: (payload) => {
      if (!payload || typeof payload !== 'object') {
        return { valid: false, error: 'Payload must be an object' }
      }
      const title = payload.title?.trim()
      const message = payload.message?.trim()
      if (!title) return { valid: false, error: 'Notification title is required' }
      if (!message) return { valid: false, error: 'Notification message is required' }

      const validCategories = ['approval_required', 'automation_alert', 'reminder', 'system']
      const category = validCategories.includes(payload.category) ? payload.category : 'automation_alert'

      return {
        valid: true,
        normalized: {
          title,
          message,
          category,
          link_url: payload.link_url || null,
        },
      }
    },
    execute: async ({ supabase, workspaceId, payload, runId }) => {
      const normalized = ACTION_REGISTRY.create_internal_notification.validatePayload(payload)
      if (!normalized.valid) {
        return { success: false, error: normalized.error }
      }

      const insertData = {
        ...normalized.normalized,
        workspace_id: workspaceId,
        source_run_id: runId || null,
        is_read: false,
      }

      const { data, error } = await (supabase as any)
        .from('workspace_notifications')
        .insert(insertData)
        .select('id, title, category, is_read')
        .single()

      if (error || !data) {
        return { success: false, error: error?.message || 'Failed to create workspace notification' }
      }

      return {
        success: true,
        entityId: data.id,
        details: { notificationId: data.id, title: data.title },
      }
    },
  },
}
