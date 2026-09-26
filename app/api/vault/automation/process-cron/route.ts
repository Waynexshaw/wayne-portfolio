import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { emitAutomationEvent } from '@/lib/vault/automation/engine'
import { evaluateConditionGroup } from '@/lib/vault/automation/conditions'
import { AutomationRule } from '@/lib/vault/automation/types'

export const dynamic = 'force-dynamic'

/**
 * Scheduled Automation Processor (Cron Handler)
 *
 * Authenticates via Authorization: Bearer <CRON_SECRET>
 * Evaluates the 3 scheduled triggers:
 * 1. task.overdue_threshold (Date semantics)
 * 2. meeting.upcoming_reminder (Timestamp semantics)
 * 3. crm.contact_inactive_threshold (Contact activity semantics)
 *
 * Also performs bounded maintenance on expired pending approvals.
 */
export async function GET(request: NextRequest) {
  return handleCron(request)
}

export async function POST(request: NextRequest) {
  return handleCron(request)
}

async function handleCron(request: NextRequest) {
  try {
    // 1. Authenticate CRON_SECRET (Section 34)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Service-Role Boundary (Section 35, 36)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server configuration error: missing Supabase credentials' },
        { status: 500 }
      )
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const stats = {
      rulesProcessed: 0,
      candidatesEvaluated: 0,
      runsCreated: 0,
      skipped: 0,
      expiredApprovals: 0,
      failedCandidates: 0,
    }

    // 3. Approval Expiration Maintenance (Section 43)
    try {
      const nowIso = new Date().toISOString()
      const { data: expiredApprovals, error: expErr } = await (adminClient as any)
        .from('automation_approvals')
        .select('id, workspace_id, run_id')
        .eq('status', 'pending')
        .lt('expires_at', nowIso)

      if (!expErr && expiredApprovals && expiredApprovals.length > 0) {
        for (const app of expiredApprovals) {
          await (adminClient as any)
            .from('automation_approvals')
            .update({ status: 'expired' })
            .eq('id', app.id)
            .eq('workspace_id', app.workspace_id)

          await (adminClient as any)
            .from('automation_runs')
            .update({
              status: 'cancelled',
              error_details: 'Approval expired before human response',
              completed_at: nowIso,
            })
            .eq('id', app.run_id)
            .eq('workspace_id', app.workspace_id)

          stats.expiredApprovals++
        }
      }
    } catch (expErr) {
      console.error('Error during approval expiration maintenance:', expErr)
    }

    // 4. Load Active Scheduled Rules (Section 28)
    const { data: scheduledRules, error: rulesErr } = await (adminClient as any)
      .from('automation_rules')
      .select('*')
      .in('trigger_type', [
        'task.overdue_threshold',
        'meeting.upcoming_reminder',
        'crm.contact_inactive_threshold',
      ])
      .eq('is_active', true)
      .is('archived_at', null)

    if (rulesErr) {
      console.error('Error loading scheduled rules:', rulesErr)
      return NextResponse.json({ error: rulesErr.message, stats }, { status: 500 })
    }

    if (!scheduledRules || scheduledRules.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active scheduled automation rules found',
        stats,
      })
    }

    const now = new Date()
    const todayDateStr = now.toISOString().split('T')[0] // YYYY-MM-DD for DATE semantics

    // 5. Evaluate each scheduled rule with candidate failure isolation (Section 42, 62)
    for (const rule of scheduledRules as AutomationRule[]) {
      stats.rulesProcessed++

      try {
        if (rule.trigger_type === 'task.overdue_threshold') {
          // --- Trigger: task.overdue_threshold (Section 30) ---
          const daysOverdueThreshold = Number(rule.trigger_config?.days_overdue ?? 3)

          const { data: candidateTasks, error: taskErr } = await (adminClient as any)
            .from('tasks')
            .select('*')
            .eq('workspace_id', rule.workspace_id)
            .in('status', ['todo', 'in_progress', 'blocked'])
            .is('archived_at', null)
            .not('due_date', 'is', null)

          if (taskErr) {
            console.error(`Error querying tasks for rule ${rule.id}:`, taskErr)
            continue
          }

          for (const task of candidateTasks || []) {
            stats.candidatesEvaluated++
            try {
              // Date Semantics (Section 29): Compare calendar date bounds
              const taskDueDate = task.due_date // Format: YYYY-MM-DD
              const diffMs = new Date(todayDateStr).getTime() - new Date(taskDueDate).getTime()
              const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

              if (diffDays >= daysOverdueThreshold) {
                // Check condition predicates
                const conditionsMatch = evaluateConditionGroup(rule.conditions, task)
                if (conditionsMatch) {
                  // Deterministic daily idempotency key: rule + task + due_date + calendar date
                  const taskOverdueKey = crypto
                    .createHash('sha256')
                    .update(`task_overdue:${rule.id}:${task.id}:${taskDueDate}:${todayDateStr}`)
                    .digest('hex')

                  // Check if a run already exists for this task today
                  const { data: existingRun } = await (adminClient as any)
                    .from('automation_runs')
                    .select('id')
                    .eq('workspace_id', rule.workspace_id)
                    .eq('idempotency_key', taskOverdueKey)
                    .maybeSingle()

                  if (existingRun) {
                    stats.skipped++
                    continue
                  }

                  const result = await emitAutomationEvent({
                    workspaceId: rule.workspace_id,
                    eventType: 'task.overdue_threshold',
                    entityType: 'task',
                    entityId: task.id,
                    payload: {
                      ...task,
                      days_overdue: diffDays,
                      threshold_applied: daysOverdueThreshold,
                      evaluated_at: todayDateStr,
                    },
                    client: adminClient,
                    idempotencyKey: taskOverdueKey,
                  })
                  stats.runsCreated += result.runsCreated
                  stats.skipped += result.skipped
                } else {
                  stats.skipped++
                }
              } else {
                stats.skipped++
              }
            } catch (candErr) {
              console.error(`Failure processing task candidate ${task.id}:`, candErr)
              stats.failedCandidates++
            }
          }
        } else if (rule.trigger_type === 'meeting.upcoming_reminder') {
          // --- Trigger: meeting.upcoming_reminder (Section 31) ---
          const hoursBeforeThreshold = Number(rule.trigger_config?.hours_before ?? 2)
          const windowStart = now.toISOString()
          const windowEnd = new Date(now.getTime() + hoursBeforeThreshold * 60 * 60 * 1000).toISOString()

          const { data: candidateMeetings, error: meetErr } = await (adminClient as any)
            .from('meetings')
            .select('*')
            .eq('workspace_id', rule.workspace_id)
            .eq('status', 'scheduled')
            .is('archived_at', null)
            .gte('scheduled_at', windowStart)
            .lte('scheduled_at', windowEnd)

          if (meetErr) {
            console.error(`Error querying meetings for rule ${rule.id}:`, meetErr)
            continue
          }

          for (const meeting of candidateMeetings || []) {
            stats.candidatesEvaluated++
            try {
              // Timestamp Semantics (Section 29): Exact scheduled_at offset
              const scheduledTime = new Date(meeting.scheduled_at).getTime()
              const minutesUntil = Math.max(0, Math.round((scheduledTime - now.getTime()) / (1000 * 60)))

              const conditionsMatch = evaluateConditionGroup(rule.conditions, meeting)
              if (conditionsMatch) {
                // Deterministic meeting reminder key: rule + meeting + scheduled_at
                const meetingReminderKey = crypto
                  .createHash('sha256')
                  .update(`meeting_reminder:${rule.id}:${meeting.id}:${meeting.scheduled_at}`)
                  .digest('hex')

                // Check if a reminder run already exists for this meeting
                const { data: existingRun } = await (adminClient as any)
                  .from('automation_runs')
                  .select('id')
                  .eq('workspace_id', rule.workspace_id)
                  .eq('idempotency_key', meetingReminderKey)
                  .maybeSingle()

                if (existingRun) {
                  stats.skipped++
                  continue
                }

                const result = await emitAutomationEvent({
                  workspaceId: rule.workspace_id,
                  eventType: 'meeting.upcoming_reminder',
                  entityType: 'meeting',
                  entityId: meeting.id,
                  payload: {
                    ...meeting,
                    minutes_until: minutesUntil,
                    window_hours: hoursBeforeThreshold,
                  },
                  client: adminClient,
                  idempotencyKey: meetingReminderKey,
                })
                stats.runsCreated += result.runsCreated
                stats.skipped += result.skipped
              } else {
                stats.skipped++
              }
            } catch (candErr) {
              console.error(`Failure processing meeting candidate ${meeting.id}:`, candErr)
              stats.failedCandidates++
            }
          }
        } else if (rule.trigger_type === 'crm.contact_inactive_threshold') {
          // --- Trigger: crm.contact_inactive_threshold (Section 32) ---
          const daysInactiveThreshold = Number(rule.trigger_config?.days_threshold ?? 45)

          const { data: candidateContacts, error: contactErr } = await (adminClient as any)
            .from('workspace_contacts')
            .select(`
              id,
              workspace_id,
              contact_id,
              relationship_type,
              relationship_stage,
              relationship_score,
              priority,
              last_contacted_at,
              created_at,
              contacts (
                id,
                full_name,
                email,
                role_title,
                created_at
              )
            `)
            .eq('workspace_id', rule.workspace_id)
            .not('relationship_stage', 'in', '("dormant","archived")')

          if (contactErr) {
            console.error(`Error querying contacts for rule ${rule.id}:`, contactErr)
            continue
          }

          for (const item of candidateContacts || []) {
            stats.candidatesEvaluated++
            try {
              const contactRecord = item.contacts
              if (!contactRecord) continue

              // Canonical CRM activity timestamp: last_contacted_at or workspace_contacts.created_at
              const lastActivity = item.last_contacted_at || item.created_at || contactRecord.created_at
              const diffMs = now.getTime() - new Date(lastActivity).getTime()
              const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

              if (diffDays >= daysInactiveThreshold) {
                const evaluationContext = {
                  ...contactRecord,
                  relationship_type: item.relationship_type,
                  relationship_stage: item.relationship_stage,
                  relationship_score: item.relationship_score,
                  days_inactive: diffDays,
                }

                const conditionsMatch = evaluateConditionGroup(rule.conditions, evaluationContext)
                if (conditionsMatch) {
                  // Deterministic 30-day inactivity cycle bucket:
                  const lastActivityDateStr = new Date(lastActivity).toISOString().split('T')[0]
                  const cycleBucket = Math.floor(diffDays / 30) // e.g. 45-74 days = cycle 1, 75-104 days = cycle 2
                  const contactInactiveKey = crypto
                    .createHash('sha256')
                    .update(`contact_inactive:${rule.id}:${item.contact_id}:${lastActivityDateStr}:${cycleBucket}`)
                    .digest('hex')

                  // 1. Check if a run already exists for this contact in this 30-day cycle
                  const { data: existingRun } = await (adminClient as any)
                    .from('automation_runs')
                    .select('id')
                    .eq('workspace_id', rule.workspace_id)
                    .eq('idempotency_key', contactInactiveKey)
                    .maybeSingle()

                  if (existingRun) {
                    stats.skipped++
                    continue
                  }

                  // 2. Also check if there is ANY active pending approval for this contact
                  const { data: existingPendingApproval } = await (adminClient as any)
                    .from('automation_approvals')
                    .select('id')
                    .eq('workspace_id', rule.workspace_id)
                    .eq('action_type', 'suggest_follow_up_creation')
                    .eq('status', 'pending')
                    .contains('proposed_payload', { contact_id: item.contact_id })
                    .maybeSingle()

                  if (existingPendingApproval) {
                    stats.skipped++
                    continue
                  }

                  // Creates an APPROVAL proposal for suggest_follow_up_creation (Section 32)
                  const result = await emitAutomationEvent({
                    workspaceId: rule.workspace_id,
                    eventType: 'crm.contact_inactive_threshold',
                    entityType: 'contact',
                    entityId: item.contact_id,
                    payload: {
                      contact_id: item.contact_id,
                      contact_name: contactRecord.full_name,
                      days_inactive: diffDays,
                      threshold: daysInactiveThreshold,
                      relationship_score: item.relationship_score,
                      next_action: `Reconnect with ${contactRecord.full_name} (${diffDays} days inactive)`,
                      notes: `Automated suggestion: Contact has had no interaction recorded for ${diffDays} days.`,
                    },
                    client: adminClient,
                    idempotencyKey: contactInactiveKey,
                  })
                  stats.runsCreated += result.runsCreated
                  stats.skipped += result.skipped
                } else {
                  stats.skipped++
                }
              } else {
                stats.skipped++
              }
            } catch (candErr) {
              console.error(`Failure processing contact candidate ${item.id}:`, candErr)
              stats.failedCandidates++
            }
          }
        }
      } catch (ruleErr) {
        console.error(`Failure processing rule ${rule.id}:`, ruleErr)
      }
    }

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (fatalErr: any) {
    console.error('Fatal error in process-cron handler:', fatalErr)
    return NextResponse.json(
      { error: 'Internal server error during scheduled automation processing' },
      { status: 500 }
    )
  }
}
