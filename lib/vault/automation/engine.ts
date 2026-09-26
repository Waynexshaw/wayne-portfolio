import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import {
  AutomationTriggerType,
  AutomationRule,
  AutomationRun,
  AutomationApproval,
} from './types'
import { evaluateConditionGroup } from './conditions'
import {
  ACTION_REGISTRY,
  doesActionRequireApproval,
  APPROVAL_REQUIRED_ACTION_TYPES,
} from './actions'
import { isBatch1SupportedTrigger, isTriggerSupported } from './triggers'

export interface EmitAutomationEventParams {
  workspaceId: string
  eventType: AutomationTriggerType
  entityType: string
  entityId: string
  payload: Record<string, any>
  actorId?: string | null
  client?: any
  idempotencyKey?: string
}

export function generateIdempotencyKey(
  ruleId: string,
  eventId: string,
  actionType: string,
  targetEntityId: string
): string {
  const raw = `${ruleId}:${eventId}:${actionType}:${targetEntityId}`
  return crypto.createHash('sha256').update(raw).digest('hex')
}

/**
 * Builds a proposed payload based on action type, rule configuration, and triggering event data.
 */
function buildProposedPayload(
  actionType: string,
  actionConfig: Record<string, any>,
  eventParams: { entityType: string; entityId: string; payload: Record<string, any> }
): Record<string, any> {
  const { entityType, entityId, payload } = eventParams

  switch (actionType) {
    case 'suggest_task_creation': {
      let title = payload.title ? `Action: ${payload.title}` : `Follow-up on ${entityType}`
      if (entityType === 'decision' && payload.decision) {
        title = `Implement: ${payload.title || payload.decision.substring(0, 50)}`
      }
      return {
        title,
        description: payload.outcomes || payload.consequences || payload.description || null,
        priority: actionConfig.priority || 'medium',
        project_id: payload.project_id || null,
        meeting_id: entityType === 'meeting' ? entityId : (payload.meeting_id || null),
        decision_id: entityType === 'decision' ? entityId : (payload.decision_id || null),
        due_date: payload.due_date || null,
      }
    }

    case 'suggest_follow_up_creation': {
      return {
        title: payload.next_action || `Reconnect with ${payload.contact_name || 'contact'}`,
        description: payload.notes || payload.content || null,
        contact_id: payload.contact_id,
        interaction_id: entityType === 'interaction' ? entityId : null,
        priority: actionConfig.priority || 'medium',
        due_date: payload.follow_up_at || null,
      }
    }

    case 'suggest_portfolio_snapshot': {
      return {
        evidence_id: entityId,
        public_project_id: actionConfig.public_project_id || payload.public_project_id || null,
        public_case_study_id: actionConfig.public_case_study_id || payload.public_case_study_id || null,
      }
    }

    case 'suggest_review_creation': {
      const todayStr = new Date().toISOString().split('T')[0]
      return {
        title: `Retrospective: ${payload.title || 'Project Completion'}`,
        review_type: actionConfig.review_type || 'project',
        project_id: entityType === 'project' ? entityId : (payload.project_id || null),
        period_start: payload.completed_at ? payload.completed_at.split('T')[0] : todayStr,
        period_end: todayStr,
      }
    }

    case 'create_internal_notification': {
      return {
        title: actionConfig.title || `Alert: ${eventParams.entityType} ${eventParams.entityId}`,
        message: actionConfig.message || `Automated alert triggered by ${eventParams.entityType}`,
        category: actionConfig.category || 'automation_alert',
        link_url: actionConfig.link_url || null,
      }
    }

    default:
      return { ...actionConfig, ...payload }
  }
}

/**
 * Reusable server-side event emitter and processor.
 * Fails safely: Primary business operation is NEVER rolled back due to automation failure.
 */
export async function emitAutomationEvent(
  params: EmitAutomationEventParams
): Promise<{ eventId?: string; runsCreated: number; skipped: number; error?: string }> {
  try {
    const { workspaceId, eventType, entityType, entityId, payload, actorId } = params

    if (!isTriggerSupported(eventType)) {
      return { runsCreated: 0, skipped: 0 }
    }

    const supabase = params.client || (await createClient())

    // If deterministic idempotencyKey is supplied, check if run already exists before logging event
    if (params.idempotencyKey) {
      const { data: existingRun } = await (supabase as any)
        .from('automation_runs')
        .select('id, status')
        .eq('workspace_id', workspaceId)
        .eq('idempotency_key', params.idempotencyKey)
        .maybeSingle()

      if (existingRun) {
        return { runsCreated: 0, skipped: 1 }
      }
    }

    // 1. Record event in automation_event_log
    const { data: eventRecord, error: eventErr } = await (supabase as any)
      .from('automation_event_log')
      .insert({
        workspace_id: workspaceId,
        event_type: eventType,
        entity_type: entityType,
        entity_id: entityId,
        payload,
        actor_id: actorId || null,
      })
      .select('id')
      .single()

    if (eventErr || !eventRecord) {
      console.error('Failed to log automation event:', eventErr)
      return { runsCreated: 0, skipped: 0, error: eventErr?.message }
    }

    const eventId = eventRecord.id

    // 2. Load active, non-archived rules for this workspace & trigger_type
    const { data: rules, error: rulesErr } = await (supabase as any)
      .from('automation_rules')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('trigger_type', eventType)
      .eq('is_active', true)
      .is('archived_at', null)

    if (rulesErr) {
      console.error('Failed to load automation rules for event:', rulesErr)
      return { eventId, runsCreated: 0, skipped: 0, error: rulesErr.message }
    }

    let runsCreated = 0
    let skipped = 0

    if (!rules || rules.length === 0) {
      // Mark event as processed with no matching rules
      await (supabase as any)
        .from('automation_event_log')
        .update({ processed_at: new Date().toISOString() })
        .eq('id', eventId)
        .eq('workspace_id', workspaceId)

      return { eventId, runsCreated: 0, skipped: 0 }
    }

    // 3. Process each matching rule
    for (const rule of rules as AutomationRule[]) {
      const conditionsMatch = evaluateConditionGroup(rule.conditions, payload)
      if (!conditionsMatch) {
        skipped++
        continue
      }

      // Compute deterministic idempotency key
      const idempotencyKey = params.idempotencyKey || generateIdempotencyKey(rule.id, eventId, rule.action_type, entityId)

      // Check if run already exists
      const { data: existingRun } = await (supabase as any)
        .from('automation_runs')
        .select('id, status')
        .eq('workspace_id', workspaceId)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle()

      if (existingRun) {
        skipped++
        continue
      }

      // Hard safety check: Server-side registry is authoritative on approval requirement
      const requiresApproval = doesActionRequireApproval(rule.action_type) || rule.requires_approval

      const ruleSnapshot = {
        rule_id: rule.id,
        title: rule.title,
        version: rule.version,
        trigger_type: rule.trigger_type,
        conditions: rule.conditions,
        action_type: rule.action_type,
        action_config: rule.action_config,
        requires_approval: requiresApproval,
      }

      const initialStatus = requiresApproval ? 'awaiting_approval' : 'running'

      // Create the automation run
      const { data: run, error: runErr } = await (supabase as any)
        .from('automation_runs')
        .insert({
          workspace_id: workspaceId,
          rule_id: rule.id,
          rule_snapshot: ruleSnapshot,
          trigger_event_id: eventId,
          idempotency_key: idempotencyKey,
          status: initialStatus,
          target_entity_type: entityType,
          target_entity_id: entityId,
          execution_details: {},
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (runErr || !run) {
        console.error('Failed to create automation run:', runErr)
        continue
      }

      runsCreated++

      if (requiresApproval) {
        // Consequential Action: Stage in automation_approvals
        const proposedPayload = buildProposedPayload(rule.action_type, rule.action_config, {
          entityType,
          entityId,
          payload,
        })

        const sourceContext = {
          eventType,
          entityType,
          entityId,
          title: payload.title || payload.decision || null,
          ruleTitle: rule.title,
        }

        await (supabase as any).from('automation_approvals').insert({
          workspace_id: workspaceId,
          run_id: run.id,
          action_type: rule.action_type,
          proposed_payload: proposedPayload,
          status: 'pending',
          source_context: sourceContext,
        })
      } else {
        // Safe Autonomous Action: Execute immediately
        const actionDef = ACTION_REGISTRY[rule.action_type]
        if (!actionDef || actionDef.requiresApproval) {
          // Safety violation: Attempt to run consequential action as safe action
          await (supabase as any)
            .from('automation_runs')
            .update({
              status: 'failed',
              error_details: 'Security violation: Action requires approval but was routed to autonomous execution',
              completed_at: new Date().toISOString(),
            })
            .eq('id', run.id)
            .eq('workspace_id', workspaceId)
          continue
        }

        const proposedPayload = buildProposedPayload(rule.action_type, rule.action_config, {
          entityType,
          entityId,
          payload,
        })

        const execResult = await actionDef.execute({
          supabase,
          workspaceId,
          payload: proposedPayload,
          userId: actorId,
          runId: run.id,
        })

        if (execResult.success) {
          await (supabase as any)
            .from('automation_runs')
            .update({
              status: 'succeeded',
              execution_details: execResult.details || {},
              completed_at: new Date().toISOString(),
            })
            .eq('id', run.id)
            .eq('workspace_id', workspaceId)
        } else {
          await (supabase as any)
            .from('automation_runs')
            .update({
              status: 'failed',
              error_details: execResult.error || 'Execution failed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', run.id)
            .eq('workspace_id', workspaceId)
        }
      }
    }

    // Mark event log record as processed
    await (supabase as any)
      .from('automation_event_log')
      .update({ processed_at: new Date().toISOString() })
      .eq('id', eventId)
      .eq('workspace_id', workspaceId)

    return { eventId, runsCreated, skipped }
  } catch (err: any) {
    // Primary business operation is never rolled back
    console.error('Unhandled error in emitAutomationEvent:', err)
    return { runsCreated: 0, skipped: 0, error: err?.message || 'Unknown error' }
  }
}
