/**
-- ============================================================================
-- Waynex Vault — Automation System V1 Types
-- ============================================================================
 */

export type AutomationTriggerType =
  // Record Event Triggers (Batch 1 Supported)
  | 'meeting.completed'
  | 'decision.created'
  | 'evidence.approved'
  | 'project.completed'
  | 'review.completed'
  | 'interaction.logged'
  // Time/Scheduled Event Triggers (Reserved for Batch 2)
  | 'task.due_date_approaching'
  | 'task.overdue_threshold'
  | 'meeting.upcoming_reminder'
  | 'follow_up.due_today'
  | 'crm.contact_inactive_threshold'
  // Manual
  | 'manual.invoke'

export type AutomationActionType =
  // Approval-Required Consequential Actions
  | 'suggest_task_creation'
  | 'suggest_follow_up_creation'
  | 'suggest_portfolio_snapshot'
  | 'suggest_review_creation'
  // Safe Autonomous Actions
  | 'create_internal_notification'

export type AutomationRunStatus =
  | 'pending'
  | 'awaiting_approval'
  | 'approved'
  | 'rejected'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'skipped'
  | 'cancelled'

export type AutomationApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired'

export type NotificationCategory =
  | 'approval_required'
  | 'automation_alert'
  | 'reminder'
  | 'system'

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'in'
  | 'not_in'
  | 'greater_than'
  | 'less_than'
  | 'is_null'
  | 'is_not_null'

export interface ConditionPredicate {
  field: string
  operator: ConditionOperator
  value?: any
}

export interface ConditionGroup {
  conjunction: 'AND' | 'OR'
  predicates: ConditionPredicate[]
}

export interface AutomationRule {
  id: string
  workspace_id: string
  template_id: string | null
  title: string
  description: string | null
  trigger_type: AutomationTriggerType
  trigger_config: Record<string, any>
  conditions: ConditionGroup
  action_type: AutomationActionType
  action_config: Record<string, any>
  requires_approval: boolean
  is_active: boolean
  version: number
  created_by: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
}

export interface AutomationEventRecord {
  id: string
  workspace_id: string
  event_type: AutomationTriggerType
  entity_type: string
  entity_id: string
  payload: Record<string, any>
  actor_id: string | null
  created_at: string
  processed_at: string | null
}

export interface AutomationRun {
  id: string
  workspace_id: string
  rule_id: string | null
  rule_snapshot: Record<string, any>
  trigger_event_id: string | null
  idempotency_key: string
  status: AutomationRunStatus
  target_entity_type: string
  target_entity_id: string | null
  execution_details: Record<string, any>
  error_details: string | null
  started_at: string
  completed_at: string | null
  created_at: string
}

export interface AutomationApproval {
  id: string
  workspace_id: string
  run_id: string
  action_type: AutomationActionType
  proposed_payload: Record<string, any>
  modified_payload: Record<string, any> | null
  status: AutomationApprovalStatus
  source_context: Record<string, any>
  reviewed_by: string | null
  reviewed_at: string | null
  expires_at: string
  created_at: string
}

export interface WorkspaceNotification {
  id: string
  workspace_id: string
  category: NotificationCategory
  title: string
  message: string
  link_url: string | null
  source_run_id: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
  archived_at: string | null
}

export interface AutomationTemplate {
  id: string
  title: string
  description: string
  trigger_type: AutomationTriggerType
  default_trigger_config: Record<string, any>
  default_conditions: ConditionGroup
  action_type: AutomationActionType
  default_action_config: Record<string, any>
  requires_approval: boolean
  is_batch2_scheduled?: boolean
  is_disabled_on_hobby?: boolean
  disabled_reason?: string
}
