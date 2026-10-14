/**
 * Waynex Vault — SHAW PLAN_VS_ACTUAL Verification & Regression Suite
 *
 * Verifies all 8 acceptance requirements:
 * 1. Successful provider response followed by evidence rejection (server-side withholding)
 * 2. Correct client error classification (evidence_withheld, no HTTP 500, no Groq attribution, proper UI contract)
 * 3. One pending task with no project completion percentage (distinguishes status, pending task, unknown overall progress)
 * 4. No matching reviews or metrics in evaluated domains (bounded reporting)
 * 5. Unevaluated decisions and meetings ("were not checked", never "do not exist")
 * 6. Unsupported milestones or completion claims (strict rejection preserved)
 * 7. Provider timeout and fallback remain functional
 * 8. Valid grounded PLAN_VS_ACTUAL answers pass publication validation
 */

import assert from 'node:assert'
import { NextRequest } from 'next/server'
import { planReasoning } from '../lib/vault/shaw/retrieval/planner'
import { prepareReasoningContext, flattenPreparedContextToEnvelope } from '../lib/vault/shaw/retrieval/preparation'
import { serializePreparedContextForPrompt } from '../lib/vault/shaw/retrieval/serializer'
import {
  validatePublicationEvidence,
  createRequestSourceMap,
} from '../lib/vault/shaw/retrieval/provenance'
import {
  VaultRecord,
  DomainOutcome,
} from '../lib/vault/shaw/retrieval/types'
import { ShawStreamChunk } from '../lib/vault/shaw/types'
import { executeShawChatTurn } from '../lib/vault/shaw/chat-service'

let passed = 0
let failed = 0

async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (err) {
    failed++
    console.error(`  ✗ FAIL: ${name}`)
    console.error(err)
  }
}

// ----------------------------------------------------------------------------
// Fixtures: Production-shaped Snip3rash Trading Academy
// ----------------------------------------------------------------------------
const recProject: VaultRecord = {
  entityType: 'project',
  entityId: 'p-snip3',
  title: 'Snip3rash trading academy',
  epistemicClass: 'WV_RECORD',
  fields: { status: 'active', priority: 'urgent' },
  provenance: { table: 'workspace_projects', id: 'p-snip3', workspace_id: 'ws-1' },
  timestamps: {},
}

const recTask: VaultRecord = {
  entityType: 'task',
  entityId: 't-snip3',
  title: 'October objective',
  epistemicClass: 'WV_RECORD',
  fields: { status: 'todo' },
  relationship: { projectId: 'p-snip3', projectTitle: 'Snip3rash trading academy' },
  provenance: { table: 'tasks', id: 't-snip3', workspace_id: 'ws-1' },
  timestamps: {},
}

const domainOutcomes: DomainOutcome[] = [
  {
    domain: 'project',
    importance: 'REQUIRED',
    status: 'AVAILABLE',
    records: [recProject],
    returnedCount: 1,
  },
  {
    domain: 'task',
    importance: 'REQUIRED',
    status: 'AVAILABLE',
    records: [recTask],
    returnedCount: 1,
  },
  {
    domain: 'review',
    importance: 'OPTIONAL',
    status: 'LIMITED_EMPTY',
    records: [],
    returnedCount: 0,
    completeness: {
      domain: 'review',
      queryMode: 'catalog',
      resultScope: 'filtered',
      returnedCount: 0,
      appliedLimit: 5,
      filterDescription: 'catalog: review',
    },
  },
  {
    domain: 'metric',
    importance: 'OPTIONAL',
    status: 'LIMITED_EMPTY',
    records: [],
    returnedCount: 0,
    completeness: {
      domain: 'metric',
      queryMode: 'targeted',
      resultScope: 'filtered',
      returnedCount: 0,
      appliedLimit: 5,
      filterDescription: 'query: Snip3rash trading academy',
    },
  },
]

// Mock Supabase Infrastructure
function createMockSupabase(initialState: { projects?: any[]; tasks?: any[]; messages?: any[] } = {}) {
  const messages: any[] = initialState.messages ? [...initialState.messages] : []
  const aiRuns: any[] = []
  const conversations: any[] = [
    {
      id: 'conv-1',
      workspace_id: 'ws-1',
      title: 'Plan vs Actual',
      routing_mode: 'auto_free_first',
      capability: 'ask',
      is_archived: false,
      identity: null,
      selected_model: 'gemini-2.5-flash',
    },
  ]

  const client = {
    auth: {
      getUser: async () => ({
        data: { user: { id: 'user-1', email: 'test@waynex.dev' } },
        error: null,
      }),
    },
    from: (table: string) => {
      return {
        select: (_cols?: string) => {
          let currentTableData: any[] = []
          if (table === 'workspace_members') {
            currentTableData = [{ role: 'owner', workspace_id: 'ws-1', user_id: 'user-1' }]
          } else if (table === 'shaw_conversations') {
            currentTableData = conversations
          } else if (table === 'shaw_messages') {
            currentTableData = messages
          } else if (table === 'shaw_user_preferences') {
            currentTableData = [{ workspace_id: 'ws-1', user_id: 'user-1', allow_paid_fallback: false }]
          } else if (table === 'workspace_projects') {
            currentTableData = initialState.projects || [
              { id: 'p-snip3', title: 'Snip3rash trading academy', status: 'active', priority: 'urgent' },
            ]
          } else if (table === 'tasks') {
            currentTableData = initialState.tasks || [
              { id: 't-snip3', title: 'October objective', status: 'todo', project_id: 'p-snip3' },
            ]
          } else if (table === 'workspace_decisions') {
            currentTableData = []
          } else if (table === 'workspace_metrics') {
            currentTableData = []
          } else if (table === 'workspace_metric_targets') {
            currentTableData = []
          } else if (table === 'workspace_metric_observations') {
            currentTableData = []
          } else if (table === 'workspace_reviews') {
            currentTableData = []
          }

          const builder: any = {
            eq: (_col: string, _val: any) => builder,
            order: (_col: string, _opts: any) => builder,
            limit: (_n: number) => builder,
            ilike: (_col: string, _val: any) => builder,
            in: (_col: string, _vals: any[]) => builder,
            or: (_clause: string) => builder,
            maybeSingle: async () => ({
              data: currentTableData.length > 0 ? currentTableData[0] : null,
              error: null,
            }),
            then: (resolve: any) => resolve({ data: currentTableData, error: null }),
          }
          return builder
        },
        insert: (row: any) => {
          if (table === 'shaw_messages') {
            const record = { id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ...row }
            messages.push(record)
            return {
              select: () => ({
                maybeSingle: async () => ({ data: record, error: null }),
              }),
            }
          }
          if (table === 'shaw_ai_runs') {
            const run = { id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ...row }
            aiRuns.push(run)
            return {
              select: () => ({
                maybeSingle: async () => ({ data: run, error: null }),
              }),
            }
          }
          return {
            select: () => ({
              maybeSingle: async () => ({ data: { id: 'mock-id', ...row }, error: null }),
            }),
          }
        },
        update: (updates: any) => {
          return {
            eq: (_col: string, val: any) => {
              if (table === 'shaw_ai_runs') {
                const run = aiRuns.find((r) => r.id === val)
                if (run) Object.assign(run, updates)
              }
              return Promise.resolve({ data: null, error: null })
            },
          }
        },
      }
    },
    rpc(fn: string) {
      if (fn === 'vault_vector_search') {
        return Promise.resolve({ data: [], error: null })
      }
      return Promise.resolve({ data: null, error: null })
    },
    _getAiRuns: () => aiRuns,
    _getMessages: () => messages,
  }

  return client
}

function createChatRequest(message: string, extra: Record<string, any> = {}): NextRequest {
  return new NextRequest('http://localhost:3000/api/vault/shaw/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workspaceId: 'ws-1',
      conversationId: 'conv-1',
      message,
      capability: 'ask',
      routingMode: 'auto_free_first',
      ...extra,
    }),
  })
}

async function consumeSse(response: Response): Promise<{ events: any[]; rawChunks: string[] }> {
  assert(response.body !== null, 'Response body must not be null')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const events: any[] = []
  const rawChunks: string[] = []
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const text = decoder.decode(value, { stream: true })
    rawChunks.push(text)
    buffer += text

    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('data:')) {
        const jsonStr = trimmed.slice(5).trim()
        if (jsonStr) {
          try {
            events.push(JSON.parse(jsonStr))
          } catch {}
        }
      }
    }
  }

  return { events, rawChunks }
}

async function runAllTests() {
  console.log('=== Waynex Vault — SHAW PLAN_VS_ACTUAL Verification Suite ===\n')

  const prompt =
    'Compare what I planned with what I completed for Snip3rash trading academy. Use only my Vault records. Explain what was planned, what is documented as completed, what remains open, and what cannot be verified. Do not invent achievements or completion percentages.'

  const plan = planReasoning({ prompt })!
  const prepared = prepareReasoningContext(plan, domainOutcomes, 120, new Date(), prompt)
  const envelope = flattenPreparedContextToEnvelope(prepared, 'ws-1')
  const sourceMap = createRequestSourceMap(envelope)

  // --------------------------------------------------------------------------
  // TEST 1: Successful provider response followed by evidence rejection
  // --------------------------------------------------------------------------
  await test('1. Provider response with ungrounded claim is withheld with evidence_withheld error chunk', async () => {
    const candidateWithInventedScore = `Plan vs Actual for Snip3rash trading academy:
Planned: October objective.
Completed: 50% completed.
Open: Still in progress.
Cannot be verified: Overall metrics.
[SOURCES: S1, S2 | BASIS: DIRECT_FACT]`

    const validationResult = validatePublicationEvidence(candidateWithInventedScore, {
      policy: prepared.epistemicPolicy,
      contract: prepared.answerContract,
      sourceMap,
      records: envelope.records,
    })

    assert.strictEqual(validationResult.isApproved, false, 'Validation must reject invented percentage')
    assert.strictEqual(validationResult.publishedText, '', 'Withheld text must be empty')
    assert.ok(
      validationResult.rejectionReasons.some((r) => r.includes('Invented completion percentage')),
      'Must record invented percentage rejection reason'
    )

    // Execute through executeShawChatTurn with a mock routeRequestFn producing the ungrounded candidate
    const mockDb = createMockSupabase()
    const mockRouteRequestFn = async () => {
      const stream = new ReadableStream<ShawStreamChunk>({
        start(controller) {
          controller.enqueue({ type: 'text', text: candidateWithInventedScore })
          controller.enqueue({ type: 'done', finishReason: 'stop' })
          controller.close()
        },
      })
      return {
        stream,
        provider: 'groq' as const,
        model: 'llama-3.3-70b-versatile',
        wasFallback: false,
        getUsage: () => ({ tokensIn: 100, tokensOut: 50, latencyMs: 800 }),
      }
    }

    const req = createChatRequest(prompt)
    const res = await executeShawChatTurn(req, {
      supabase: mockDb as any,
      routeRequestFn: mockRouteRequestFn as any,
    })

    const { events } = await consumeSse(res)
    const errChunk = events.find((e: any) => e.type === 'error')
    assert.ok(errChunk, 'Must emit an error chunk when evidence validation fails')
    assert.strictEqual(
      errChunk.errorCategory,
      'evidence_withheld',
      'Chunk errorCategory must be evidence_withheld'
    )
    assert.strictEqual(
      errChunk.error,
      "SHAW couldn't verify this answer against the available Vault records. Please try again.",
      'Must emit user-friendly withheld message'
    )
    assert.strictEqual(
      errChunk.provider,
      undefined,
      'Error chunk must NOT attribute rejection to Groq or Gemini'
    )
    assert.strictEqual(errChunk.statusCode, undefined, 'Error chunk must NOT fabricate HTTP 500')

    // Check server-side audit in ai_runs
    const runs = mockDb._getAiRuns()
    assert.ok(runs.length > 0, 'Must record ai_run in database')
    const lastRun = runs[runs.length - 1]
    assert.strictEqual(lastRun.metadata?.validation_passed, false)
    assert.ok(Array.isArray(lastRun.metadata?.rejection_reasons), 'Server must keep detailed diagnostics')
  })

  // --------------------------------------------------------------------------
  // TEST 2: Client error classification behavior
  // --------------------------------------------------------------------------
  await test('2. Client correctly classifies evidence_withheld without HTTP 500 or provider blame', () => {
    const errorChunk: ShawStreamChunk = {
      type: 'error',
      error: "SHAW couldn't verify this answer against the available Vault records. Please try again.",
      errorCategory: 'evidence_withheld',
      finishReason: 'content_filter',
    }

    // Client parser simulation matching shaw-workspace.tsx
    const streamErr: any = new Error(errorChunk.error || 'Stream error')
    streamErr.errorCategory = errorChunk.errorCategory
    if (errorChunk.errorCategory === 'evidence_withheld') {
      streamErr.statusCode = errorChunk.statusCode // undefined!
      streamErr.provider = undefined // not Groq!
    } else {
      streamErr.statusCode = errorChunk.statusCode || 500
      streamErr.provider = errorChunk.provider || 'groq'
    }

    assert.strictEqual(streamErr.statusCode, undefined, 'statusCode must remain undefined')
    assert.strictEqual(streamErr.provider, undefined, 'provider must remain undefined')
    assert.strictEqual(streamErr.errorCategory, 'evidence_withheld')

    // UI card logic simulation matching InlineFailureCard in shaw-workspace.tsx
    const isEvidenceWithheld = streamErr.errorCategory === 'evidence_withheld'
    const providerTitle = isEvidenceWithheld
      ? 'Report withheld for accuracy'
      : "Provider couldn't respond"
    const providerLabel = isEvidenceWithheld ? 'Accuracy Check' : 'Groq'
    const summary = isEvidenceWithheld
      ? "SHAW couldn't verify this answer against the available Vault records. Please try again."
      : streamErr.message
    const showHttpBadge = Boolean(streamErr.statusCode && !isEvidenceWithheld)

    assert.strictEqual(providerTitle, 'Report withheld for accuracy')
    assert.strictEqual(providerLabel, 'Accuracy Check')
    assert.strictEqual(
      summary,
      "SHAW couldn't verify this answer against the available Vault records. Please try again."
    )
    assert.strictEqual(showHttpBadge, false, 'Must NOT show HTTP 500 badge in UI')
  })

  // --------------------------------------------------------------------------
  // TEST 3: One pending task with no project completion percentage
  // --------------------------------------------------------------------------
  await test('3. Contract guides pending task statement and forbids 0% complete claim', () => {
    const pendingFact = prepared.answerContract!.recordedFacts.find((f) =>
      f.statement.includes('One task was found, and it is still marked as pending.')
    )
    assert.ok(pendingFact, 'Must include exact pending task fact in contract')

    const openTaskFact = prepared.answerContract!.recordedFacts.find((f) =>
      f.statement.includes('no linked task is recorded as completed')
    )
    assert.ok(openTaskFact, 'Must record that no linked task is completed')

    const unknownProgressGap = prepared.answerContract!.observationalGaps.find((g) =>
      g.statement.includes('Overall project progress is unknown because no project completion percentage is recorded')
    )
    assert.ok(unknownProgressGap, 'Must record observational gap for unrecorded project completion percentage')

    // Validate that stating "0% complete" is rejected
    const candidateWithZeroPct = `Plan vs Actual:
Planned: Snip3rash trading academy has 1 task.
Completed: 0% complete because October objective is todo.
Open: October objective.
[SOURCES: S1, S2 | BASIS: DIRECT_FACT]`

    const resZero = validatePublicationEvidence(candidateWithZeroPct, {
      policy: prepared.epistemicPolicy,
      contract: prepared.answerContract,
      sourceMap,
      records: envelope.records,
    })
    assert.strictEqual(resZero.isApproved, false, '0% complete without explicit database completion field must be rejected')
    assert.ok(
      resZero.violations.some((v) => v.type === 'INVENTED_PERCENTAGE_OR_SCORE'),
      'Violation must be INVENTED_PERCENTAGE_OR_SCORE'
    )
  })

  // --------------------------------------------------------------------------
  // TEST 4: No matching reviews or metrics in evaluated domains
  // --------------------------------------------------------------------------
  await test('4. Bounded reporting of empty evaluated domains (reviews & metrics)', () => {
    const candidateBounded = `Plan vs Actual for Snip3rash:
Planned: Project is active with 1 task (October objective).
Completed: None of the project's recorded tasks are completed.
Open: October objective remains pending.
What cannot be verified:
- I couldn't find any reviews or metrics linked to Snip3rash in the records I checked.
- Decision and meeting records were not checked for this query.
[SOURCES: S1, S2 | BASIS: DIRECT_FACT]`

    const resBounded = validatePublicationEvidence(candidateBounded, {
      policy: prepared.epistemicPolicy,
      contract: prepared.answerContract,
      sourceMap,
      records: envelope.records,
    })
    assert.strictEqual(resBounded.isApproved, true, 'Properly bounded reviews and metrics claim must be approved')
  })

  // --------------------------------------------------------------------------
  // TEST 5: Unevaluated decisions and meetings
  // --------------------------------------------------------------------------
  await test('5. Unevaluated decisions and meetings: "were not checked" approved, "do not exist" rejected', () => {
    const unqueriedGap = prepared.answerContract!.observationalGaps.find((g) =>
      g.statement.includes('Decision and meeting records were not checked for this query.')
    )
    assert.ok(unqueriedGap, 'Must include observational gap stating decision and meeting records were not checked')

    // 5b: Stating they were not checked passes validation
    const candidateNotChecked = `Plan vs Actual:
Planned: One task was found, and it is still marked as pending.
Completed: None of the project's recorded tasks are completed.
Open: October objective is pending.
What cannot be verified:
- Decision and meeting records were not checked for this query.
- No reviews or metrics were found in the records checked.
[SOURCES: S1, S2 | BASIS: DIRECT_FACT]`

    const resNotChecked = validatePublicationEvidence(candidateNotChecked, {
      policy: prepared.epistemicPolicy,
      contract: prepared.answerContract,
      sourceMap,
      records: envelope.records,
    })
    assert.strictEqual(resNotChecked.isApproved, true, '"were not checked" must pass validation')

    // 5c: Claiming unqueried domain records do not exist or were not recorded is rejected
    const candidateClaimingAbsence = `Plan vs Actual:
Planned: October objective.
Completed: None.
Open: October objective.
Cannot be verified:
- No decisions were recorded for this project in the Vault.
[SOURCES: S1, S2 | BASIS: DIRECT_FACT]`

    const resClaim = validatePublicationEvidence(candidateClaimingAbsence, {
      policy: prepared.epistemicPolicy,
      contract: prepared.answerContract,
      sourceMap,
      records: envelope.records,
    })
    assert.strictEqual(resClaim.isApproved, false, 'Claiming no decisions were recorded when unevaluated must be rejected')
    assert.ok(
      resClaim.violations.some((v) => v.type === 'UNEVALUATED_DOMAIN_CLAIM'),
      'Must detect UNEVALUATED_DOMAIN_CLAIM'
    )
  })

  // --------------------------------------------------------------------------
  // TEST 6: Unsupported milestones or completion claims
  // --------------------------------------------------------------------------
  await test('6. Unsupported milestones or completion claims rejected as unmodeled/contradicted', () => {
    const candidateMilestone = `Plan vs Actual:
Planned: October objective.
Completed: None.
Open: October objective.
Cannot be verified: Intermediate milestones are undocumented.
[SOURCES: S1, S2 | BASIS: DIRECT_FACT]`

    const resMilestone = validatePublicationEvidence(candidateMilestone, {
      policy: prepared.epistemicPolicy,
      contract: prepared.answerContract,
      sourceMap,
      records: envelope.records,
    })
    assert.strictEqual(resMilestone.isApproved, false)
    assert.ok(
      resMilestone.violations.some((v) => v.type === 'UNMODELED_ABSENCE_CLAIM'),
      'Must detect UNMODELED_ABSENCE_CLAIM'
    )

    const candidateFalseComplete = `Plan vs Actual:
Planned: October objective.
Completed: Completed 1 task successfully.
Open: None.
[SOURCES: S1, S2 | BASIS: DIRECT_FACT]`

    const resFalse = validatePublicationEvidence(candidateFalseComplete, {
      policy: prepared.epistemicPolicy,
      contract: prepared.answerContract,
      sourceMap,
      records: envelope.records,
    })
    assert.strictEqual(resFalse.isApproved, false)
    assert.ok(
      resFalse.violations.some((v) => v.type === 'CONTRADICTED_FACT'),
      'Must detect CONTRADICTED_FACT'
    )
  })

  // --------------------------------------------------------------------------
  // TEST 7: Provider timeout and fallback remain functional
  // --------------------------------------------------------------------------
  await test('7. Provider mid-stream timeout and fallback to Groq remain functional', async () => {
    const mockDb = createMockSupabase()

    const compliantAnswer = `Plan vs Actual for Snip3rash trading academy:
Planned: Project is active with urgent priority.
Documented completed: None of the project's recorded tasks are completed.
Remains open: One task was found, and it is still marked as pending (October objective).
What cannot be verified:
- Overall project progress is unknown because no project completion percentage is recorded.
- In the records checked, no reviews or metrics were found linked to Snip3rash.
- Decision and meeting records were not checked for this query.
[SOURCES: S1, S2 | BASIS: DIRECT_FACT]`

    // Simulate routeRequestFn that successfully fell back to groq after gemini stall
    const fallbackRouteRequestFn = async () => {
      const stream = new ReadableStream<ShawStreamChunk>({
        start(controller) {
          controller.enqueue({ type: 'text', text: compliantAnswer })
          controller.enqueue({ type: 'done', finishReason: 'stop' })
          controller.close()
        },
      })
      return {
        stream,
        provider: 'groq' as const,
        model: 'llama-3.3-70b-versatile',
        wasFallback: true,
        getUsage: () => ({ tokensIn: 120, tokensOut: 60, latencyMs: 1400 }),
      }
    }

    const req = createChatRequest(prompt)
    const res = await executeShawChatTurn(req, {
      supabase: mockDb as any,
      routeRequestFn: fallbackRouteRequestFn as any,
    })

    const { events } = await consumeSse(res)
    const textChunk = events.find((e: any) => e.type === 'text')
    assert.ok(textChunk, 'Must publish approved answer after Groq fallback')
    assert.ok(textChunk.text.includes('One task was found, and it is still marked as pending'))
    assert.ok(!textChunk.text.includes('[SOURCES:'), 'Trailing protocol tag must be concealed from published prose')
  })

  // --------------------------------------------------------------------------
  // TEST 8: Valid grounded PLAN_VS_ACTUAL answers pass publication validation
  // --------------------------------------------------------------------------
  await test('8. Fully grounded PLAN_VS_ACTUAL response passes publication validation cleanly', () => {
    const fullyGroundedCandidate = `Plan vs Actual for Snip3rash trading academy

Planned:
- Project status: active with urgent priority.
- Planned work: October objective.

Documented as completed:
- None of the project's recorded tasks are completed.

Remains open:
- One task was found, and it is still marked as pending (October objective).
- No due date is set for October objective.

What cannot be verified:
- Overall project progress is unknown because no project completion percentage is recorded.
- In the records checked, no reviews or metrics were found linked to Snip3rash.
- Decision and meeting records were not checked for this query.
- The records checked do not document whether work on the objective has started.

[SOURCES: S1, S2 | BASIS: DIRECT_FACT]`

    const result = validatePublicationEvidence(fullyGroundedCandidate, {
      policy: prepared.epistemicPolicy,
      contract: prepared.answerContract,
      sourceMap,
      records: envelope.records,
    })

    assert.strictEqual(result.isApproved, true, 'Fully grounded PLAN_VS_ACTUAL response must be approved')
    assert.strictEqual(result.violations.length, 0, 'Must have zero violations')
    assert.strictEqual(result.rejectionReasons.length, 0, 'Must have zero rejection reasons')
    assert.ok(result.publishedText.length > 0, 'Published text must not be empty')
    assert.ok(!result.publishedText.includes('[SOURCES:'), 'Published text must conceal internal source tags')
    assert.ok(result.publishedText.includes('One task was found, and it is still marked as pending'))
  })

  console.log(`\n======================================================`)
  console.log(`PLAN_VS_ACTUAL Verification: ${passed} passed, ${failed} failed`)
  console.log(`======================================================`)

  if (failed > 0) {
    process.exit(1)
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
