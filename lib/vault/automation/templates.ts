import { AutomationTemplate } from './types'

export const AUTOMATION_TEMPLATES: Record<string, AutomationTemplate> = {
  // 1. Meeting to Task Suggestion (Batch 1 Supported)
  meeting_task_suggestion: {
    id: 'meeting_task_suggestion',
    title: 'Meeting to Task Suggestion',
    description: 'Suggests creating follow-up operating tasks when a meeting is marked completed',
    trigger_type: 'meeting.completed',
    default_trigger_config: {},
    default_conditions: {
      conjunction: 'AND',
      predicates: [],
    },
    action_type: 'suggest_task_creation',
    default_action_config: {
      priority: 'medium',
    },
    requires_approval: true,
    is_batch2_scheduled: false,
  },

  // 2. Decision Action Item Generator (Batch 1 Supported)
  decision_task_suggestion: {
    id: 'decision_task_suggestion',
    title: 'Decision Action Item Generator',
    description: 'Suggests creating implementation tasks when a key architectural or business decision is recorded',
    trigger_type: 'decision.created',
    default_trigger_config: {},
    default_conditions: {
      conjunction: 'AND',
      predicates: [],
    },
    action_type: 'suggest_task_creation',
    default_action_config: {
      priority: 'high',
    },
    requires_approval: true,
    is_batch2_scheduled: false,
  },

  // 3. Evidence Portfolio Bridge Suggestion (Batch 1 Supported)
  evidence_portfolio_snapshot_suggestion: {
    id: 'evidence_portfolio_snapshot_suggestion',
    title: 'Evidence Portfolio Bridge Suggestion',
    description: 'Suggests snapshotting an approved evidence claim to the public portfolio bridge',
    trigger_type: 'evidence.approved',
    default_trigger_config: {},
    default_conditions: {
      conjunction: 'AND',
      predicates: [],
    },
    action_type: 'suggest_portfolio_snapshot',
    default_action_config: {},
    requires_approval: true,
    is_batch2_scheduled: false,
  },

  // 4. Project Retrospective Prompt (Batch 1 Supported)
  project_retrospective_prompt: {
    id: 'project_retrospective_prompt',
    title: 'Project Retrospective Prompt',
    description: 'Suggests initiating a retrospective review when a project is completed',
    trigger_type: 'project.completed',
    default_trigger_config: {},
    default_conditions: {
      conjunction: 'AND',
      predicates: [],
    },
    action_type: 'suggest_review_creation',
    default_action_config: {
      review_type: 'project',
    },
    requires_approval: true,
    is_batch2_scheduled: false,
  },

  // 5. Stale Contact Reconnection Alert (SCHEDULED_TRIGGER — BATCH 2)
  stale_contact_reconnection_alert: {
    id: 'stale_contact_reconnection_alert',
    title: 'Stale Contact Reconnection Alert',
    description: 'Suggests reconnecting with contacts who have had no interactions for 45+ days',
    trigger_type: 'crm.contact_inactive_threshold',
    default_trigger_config: {
      days_threshold: 45,
    },
    default_conditions: {
      conjunction: 'AND',
      predicates: [
        { field: 'relationship_score', operator: 'greater_than', value: 4 },
      ],
    },
    action_type: 'suggest_follow_up_creation',
    default_action_config: {
      priority: 'medium',
    },
    requires_approval: true,
    is_batch2_scheduled: true, // Reserved for Batch 2
  },

  // 6. Task Overdue Escalation Notice (SCHEDULED_TRIGGER — BATCH 2)
  task_overdue_escalation_notice: {
    id: 'task_overdue_escalation_notice',
    title: 'Task Overdue Escalation Notice',
    description: 'Emits an internal alert notification when an urgent task remains overdue for > 3 days',
    trigger_type: 'task.overdue_threshold',
    default_trigger_config: {
      days_overdue: 3,
    },
    default_conditions: {
      conjunction: 'AND',
      predicates: [
        { field: 'priority', operator: 'in', value: ['high', 'urgent'] },
      ],
    },
    action_type: 'create_internal_notification',
    default_action_config: {
      category: 'automation_alert',
    },
    requires_approval: false,
    is_batch2_scheduled: true, // Reserved for Batch 2
  },

  // 7. Upcoming Meeting Briefing Alert (SCHEDULED_TRIGGER — BATCH 2)
  upcoming_meeting_briefing_alert: {
    id: 'upcoming_meeting_briefing_alert',
    title: 'Upcoming Meeting Briefing Alert',
    description: 'Emits an internal notification reminder 2 hours before a scheduled meeting begins',
    trigger_type: 'meeting.upcoming_reminder',
    default_trigger_config: {
      hours_before: 2,
    },
    default_conditions: {
      conjunction: 'AND',
      predicates: [],
    },
    action_type: 'create_internal_notification',
    default_action_config: {
      category: 'reminder',
    },
    requires_approval: false,
    is_batch2_scheduled: true, // Reserved for Batch 2
    is_disabled_on_hobby: true,
    disabled_reason: 'Requires higher-frequency scheduler (deployment currently scheduled once daily at 06:00 UTC)',
  },
}

export function getAvailableTemplates(): AutomationTemplate[] {
  return Object.values(AUTOMATION_TEMPLATES)
}

export function getTemplateById(templateId: string): AutomationTemplate | null {
  return AUTOMATION_TEMPLATES[templateId] || null
}
