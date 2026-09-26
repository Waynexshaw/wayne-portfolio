import { AutomationTriggerType } from './types'

export interface TriggerDefinition {
  type: AutomationTriggerType
  label: string
  description: string
  entityType: string
  isScheduled: boolean
  supportedInBatch1: boolean
}

export const TRIGGER_REGISTRY: Record<AutomationTriggerType, TriggerDefinition> = {
  // Batch 1 Supported Record Events
  'meeting.completed': {
    type: 'meeting.completed',
    label: 'Meeting Completed',
    description: 'Triggered when a meeting status transitions to completed',
    entityType: 'meeting',
    isScheduled: false,
    supportedInBatch1: true,
  },
  'decision.created': {
    type: 'decision.created',
    label: 'Decision Created',
    description: 'Triggered when a new strategic or operational decision is recorded',
    entityType: 'decision',
    isScheduled: false,
    supportedInBatch1: true,
  },
  'evidence.approved': {
    type: 'evidence.approved',
    label: 'Evidence Approved',
    description: 'Triggered when an evidence claim transitions from draft to approved',
    entityType: 'evidence',
    isScheduled: false,
    supportedInBatch1: true,
  },
  'project.completed': {
    type: 'project.completed',
    label: 'Project Completed',
    description: 'Triggered when a workspace project status transitions to completed',
    entityType: 'project',
    isScheduled: false,
    supportedInBatch1: true,
  },
  'review.completed': {
    type: 'review.completed',
    label: 'Review Completed',
    description: 'Triggered when a retrospective review is completed',
    entityType: 'review',
    isScheduled: false,
    supportedInBatch1: true,
  },
  'interaction.logged': {
    type: 'interaction.logged',
    label: 'Interaction Logged',
    description: 'Triggered when a new CRM interaction is recorded for a contact',
    entityType: 'interaction',
    isScheduled: false,
    supportedInBatch1: true,
  },

  // Batch 2 Scheduled Events (Architecture Reserved)
  'task.due_date_approaching': {
    type: 'task.due_date_approaching',
    label: 'Task Due Date Approaching',
    description: 'Triggered when a task due date is within scheduled threshold',
    entityType: 'task',
    isScheduled: true,
    supportedInBatch1: false,
  },
  'task.overdue_threshold': {
    type: 'task.overdue_threshold',
    label: 'Task Overdue Threshold',
    description: 'Triggered when an incomplete task passes its due date threshold',
    entityType: 'task',
    isScheduled: true,
    supportedInBatch1: false,
  },
  'meeting.upcoming_reminder': {
    type: 'meeting.upcoming_reminder',
    label: 'Upcoming Meeting Reminder',
    description: 'Triggered before a scheduled meeting starts',
    entityType: 'meeting',
    isScheduled: true,
    supportedInBatch1: false,
  },
  'follow_up.due_today': {
    type: 'follow_up.due_today',
    label: 'Follow-up Due Today',
    description: 'Triggered on the day a contact follow-up is scheduled',
    entityType: 'follow_up',
    isScheduled: true,
    supportedInBatch1: false,
  },
  'crm.contact_inactive_threshold': {
    type: 'crm.contact_inactive_threshold',
    label: 'Contact Inactive Threshold',
    description: 'Triggered when no interaction has occurred with a contact for N days',
    entityType: 'contact',
    isScheduled: true,
    supportedInBatch1: false,
  },

  // Manual
  'manual.invoke': {
    type: 'manual.invoke',
    label: 'Manual Invoke',
    description: 'Triggered manually by user from the UI',
    entityType: 'manual',
    isScheduled: false,
    supportedInBatch1: true,
  },
}

export function isBatch1SupportedTrigger(triggerType: AutomationTriggerType): boolean {
  return TRIGGER_REGISTRY[triggerType]?.supportedInBatch1 ?? false
}
