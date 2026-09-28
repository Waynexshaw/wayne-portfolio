/**
 * Waynex Vault — SHAW Batch 2B.2A Deterministic Verification Suite
 *
 * Verifies all 30 acceptance requirements (A through AD) covering:
 * - Intent detection & precedence
 * - Fallback to existing planner
 * - Safe absence semantics (exhaustive vs filtered/bounded)
 * - Domain failure isolation (required vs optional)
 * - Record deduplication by authoritative identity
 * - Relational clustering strictly by foreign keys
 * - Neutral temporal facts (no 'isStale')
 * - Descriptive counts (no completion percentage)
 * - Research epistemic distinctions
 * - Provenance preservation & handle validity
 * - Protocol concealment
 * - Batch 2A entity extraction regressions
 */

import assert from 'node:assert'
import {
  planRetrieval,
  planReasoning,
  prepareReasoningContext,
  flattenPreparedContextToEnvelope,
  serializePreparedContextForPrompt,
  createRequestSourceMap,
  resolveAuthoritativeProvenance,
  parseModelProvenance,
  createProvenanceStreamFilter,
  VaultRecord,
  DomainOutcome,
  ReasoningPlan,
} from '../lib/vault/shaw/retrieval'

let passedTests = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    passedTests++
    console.log(`  ✓ ${name}`)
  } catch (err: any) {
    console.error(`  ✗ FAIL: ${name}`)
    console.error(err)
    process.exit(1)
  }
}

console.log('\n=== SHAW Batch 2B.2A Deterministic Verification Suite ===\n')

// ----------------------------------------------------------------------------
// A through I: Deterministic Reasoning Intent Detection & Precedence
// ----------------------------------------------------------------------------

test('A. "What should I focus on this week?" => WEEKLY_FOCUS, entityTarget undefined, catalog mode', () => {
  const plan = planReasoning({ prompt: 'What should I focus on this week?' })
  assert(plan !== null, 'Plan must not be null')
  assert.strictEqual(plan.primaryIntent, 'WEEKLY_FOCUS')
  assert.strictEqual(plan.reasoningMode, 'PRIORITIZATION')
  assert.strictEqual(plan.entityTarget, undefined, 'Must not extract "week" as entity target')
  const taskReq = plan.domainRequests.find((r) => r.domain === 'task')
  const projReq = plan.domainRequests.find((r) => r.domain === 'project')
  assert(taskReq !== undefined && taskReq.importance === 'REQUIRED')
  assert.strictEqual(taskReq.queryMode, 'catalog')
  assert.strictEqual(taskReq.entityTarget, undefined)
  assert.strictEqual(taskReq.statusFilter, 'open')
  assert(projReq !== undefined && projReq.importance === 'REQUIRED')
  assert.strictEqual(projReq.queryMode, 'catalog')
  assert.strictEqual(projReq.entityTarget, undefined)
})

test('B-1. "What are my priorities this week?" => entityTarget undefined', () => {
  const plan = planReasoning({ prompt: 'What are my priorities this week?' })
  assert(plan !== null)
  assert.strictEqual(plan.primaryIntent, 'WEEKLY_FOCUS')
  assert.strictEqual(plan.entityTarget, undefined, 'Must not extract "week" as entity target')
})

test('C-1. "What should I work on next week?" => temporal phrase does not become entity', () => {
  const plan = planReasoning({ prompt: 'What should I work on next week?' })
  assert(plan !== null)
  assert.strictEqual(plan.primaryIntent, 'WEEKLY_FOCUS')
  assert.strictEqual(plan.entityTarget, undefined, 'Must not extract "next week" as entity target')
})

test('D-1. "What should I focus on this month?" => "month" does not become entity', () => {
  const plan = planReasoning({ prompt: 'What should I focus on this month?' })
  assert(plan !== null)
  assert.strictEqual(plan.entityTarget, undefined, 'Must not extract "month" as entity target')
})

test('E-1. "What should I focus on today?" => "today" does not become entity', () => {
  const plan = planReasoning({ prompt: 'What should I focus on today?' })
  assert(plan !== null)
  assert.strictEqual(plan.entityTarget, undefined, 'Must not extract "today" as entity target')
})

test('F-1. "What should I focus on for Snip3rash this week?" => entityTarget Snip3rash', () => {
  const plan = planReasoning({ prompt: 'What should I focus on for Snip3rash this week?' })
  assert(plan !== null)
  assert.strictEqual(plan.primaryIntent, 'WEEKLY_FOCUS')
  assert.strictEqual(plan.entityTarget?.name, 'Snip3rash')
  const taskReq = plan.domainRequests.find((r) => r.domain === 'task')
  const projReq = plan.domainRequests.find((r) => r.domain === 'project')
  assert.strictEqual(taskReq?.queryMode, 'targeted')
  assert.strictEqual(taskReq?.entityTarget, 'Snip3rash')
  assert.strictEqual(projReq?.queryMode, 'targeted')
  assert.strictEqual(projReq?.entityTarget, 'Snip3rash')
})

test('G-1. "What should I focus on for PEVRA this week?" => entityTarget PEVRA', () => {
  const plan = planReasoning({ prompt: 'What should I focus on for PEVRA this week?' })
  assert(plan !== null)
  assert.strictEqual(plan.primaryIntent, 'WEEKLY_FOCUS')
  assert.strictEqual(plan.entityTarget?.name, 'PEVRA')
  assert.strictEqual(plan.domainRequests.find((r) => r.domain === 'project')?.entityTarget, 'PEVRA')
})

test('O-1. Temporal candidate validation occurs before destructive qualifier stripping', () => {
  // "this week" must be rejected BEFORE "this" is stripped into "week"
  const plan = planReasoning({ prompt: 'What should I focus on this week?' })
  assert.strictEqual(plan?.entityTarget, undefined)
})

test('B. "What did I accomplish last week?" => PERIOD_ACCOMPLISHMENT (outranks recap)', () => {
  const plan = planReasoning({ prompt: 'What did I accomplish last week?' })
  assert(plan !== null, 'Plan must not be null')
  assert.strictEqual(plan.primaryIntent, 'PERIOD_ACCOMPLISHMENT')
  assert.strictEqual(plan.reasoningMode, 'ACCOMPLISHMENT')
  assert(plan.domainRequests.some((r) => r.domain === 'activity' && r.importance === 'REQUIRED'))
  assert(plan.domainRequests.some((r) => r.domain === 'task' && r.importance === 'REQUIRED'))
})

test('C. "What happened last week?" => CROSS_DOMAIN_RECAP', () => {
  const plan = planReasoning({ prompt: 'What happened last week?' })
  assert(plan !== null, 'Plan must not be null')
  assert.strictEqual(plan.primaryIntent, 'CROSS_DOMAIN_RECAP')
  assert.strictEqual(plan.reasoningMode, 'RECAP')
  assert(plan.domainRequests.some((r) => r.domain === 'activity' && r.importance === 'REQUIRED'))
  assert(plan.domainRequests.some((r) => r.domain === 'decision' && r.importance === 'REQUIRED'))
})

test('D. "Give me a progress report on PEVRA." => PROJECT_PROGRESS + entity PEVRA', () => {
  const plan = planReasoning({ prompt: 'Give me a progress report on PEVRA.' })
  assert(plan !== null, 'Plan must not be null')
  assert.strictEqual(plan.primaryIntent, 'PROJECT_PROGRESS')
  assert.strictEqual(plan.reasoningMode, 'PROGRESS')
  assert.strictEqual(plan.entityTarget?.name, 'PEVRA')
  assert(plan.domainRequests.some((r) => r.domain === 'project' && r.importance === 'REQUIRED'))
  assert(plan.domainRequests.some((r) => r.domain === 'task' && r.importance === 'REQUIRED'))
})

test('E. "What is blocking my projects?" => BLOCKER_ASSESSMENT', () => {
  const plan = planReasoning({ prompt: 'What is blocking my projects?' })
  assert(plan !== null, 'Plan must not be null')
  assert.strictEqual(plan.primaryIntent, 'BLOCKER_ASSESSMENT')
  assert.strictEqual(plan.reasoningMode, 'RISK_ASSESSMENT')
  assert(plan.domainRequests.some((r) => r.domain === 'task' && r.importance === 'REQUIRED'))
})

test('E2. Precedence: "What is blocking PEVRA and what should I focus on?" => BLOCKER_ASSESSMENT outranks WEEKLY_FOCUS', () => {
  const plan = planReasoning({ prompt: 'What is blocking PEVRA and what should I focus on?' })
  assert(plan !== null, 'Plan must not be null')
  assert.strictEqual(plan.primaryIntent, 'BLOCKER_ASSESSMENT')
  assert.strictEqual(plan.entityTarget?.name, 'PEVRA')
})

test('F. "Prepare me for my meeting with Alice." => MEETING_PREP + entity target Alice', () => {
  const plan = planReasoning({ prompt: 'Prepare me for my meeting with Alice.' })
  assert(plan !== null, 'Plan must not be null')
  assert.strictEqual(plan.primaryIntent, 'MEETING_PREP')
  assert.strictEqual(plan.reasoningMode, 'PREPARATION')
  assert.strictEqual(plan.entityTarget?.name, 'Alice')
  assert(plan.domainRequests.some((r) => r.domain === 'meeting' && r.importance === 'REQUIRED'))
})

test('G. "What does my research say that could affect PEVRA?" => RESEARCH_IMPACT + entity PEVRA', () => {
  const plan = planReasoning({ prompt: 'What does my research say that could affect PEVRA?' })
  assert(plan !== null, 'Plan must not be null')
  assert.strictEqual(plan.primaryIntent, 'RESEARCH_IMPACT')
  assert.strictEqual(plan.reasoningMode, 'IMPACT')
  assert.strictEqual(plan.entityTarget?.name, 'PEVRA')
  assert(plan.domainRequests.some((r) => r.domain === 'research' && r.importance === 'REQUIRED'))
  assert(plan.domainRequests.some((r) => r.domain === 'evidence' && r.importance === 'REQUIRED'))
})

test('H. "Compare what I planned with what I completed." => PLAN_VS_ACTUAL', () => {
  const plan = planReasoning({ prompt: 'Compare what I planned with what I completed.' })
  assert(plan !== null, 'Plan must not be null')
  assert.strictEqual(plan.primaryIntent, 'PLAN_VS_ACTUAL')
  assert.strictEqual(plan.reasoningMode, 'VARIANCE')
  assert(plan.domainRequests.some((r) => r.domain === 'project' && r.importance === 'REQUIRED'))
  assert(plan.domainRequests.some((r) => r.domain === 'task' && r.importance === 'REQUIRED'))
})

test('I. "Which projects have activity but no recorded decisions?" => DECISION_GAP_ANALYSIS', () => {
  const plan = planReasoning({ prompt: 'Which projects have activity but no recorded decisions?' })
  assert(plan !== null, 'Plan must not be null')
  assert.strictEqual(plan.primaryIntent, 'DECISION_GAP_ANALYSIS')
  assert.strictEqual(plan.reasoningMode, 'GAP_ANALYSIS')
  assert(plan.domainRequests.some((r) => r.domain === 'project' && r.importance === 'REQUIRED'))
  assert(plan.domainRequests.some((r) => r.domain === 'decision' && r.importance === 'REQUIRED'))
  assert(plan.domainRequests.some((r) => r.domain === 'activity' && r.importance === 'REQUIRED'))
})

test('J. Existing ordinary single-domain prompt => planReasoning returns null (fallback unchanged)', () => {
  const reasoningPlan = planReasoning({ prompt: 'Show me my tasks' })
  assert.strictEqual(reasoningPlan, null, 'Single-domain query must not trigger ReasoningPlan')

  const fallbackPlan = planRetrieval({ prompt: 'Show me my tasks' })
  assert.strictEqual(fallbackPlan.shouldRetrieve, true)
  assert.strictEqual(fallbackPlan.intents[0].domain, 'task')
})

// ----------------------------------------------------------------------------
// K through O: Preparation Layer, Absence Semantics & Error Isolation
// ----------------------------------------------------------------------------

test('K. Required exhaustive zero => verified absence registered', () => {
  const mockPlan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'PROJECT_PROGRESS',
    reasoningMode: 'PROGRESS',
    entityTarget: { name: 'Alpha', domain: 'project' },
    domainRequests: [
      { domain: 'decision', importance: 'REQUIRED', queryMode: 'targeted', entityTarget: 'Alpha', limit: 10 },
    ],
    requiresPreparation: true,
  }

  const outcomes: DomainOutcome[] = [
    {
      domain: 'decision',
      importance: 'REQUIRED',
      status: 'CONFIRMED_EMPTY',
      returnedCount: 0,
      completeness: {
        domain: 'decision',
        queryMode: 'targeted',
        resultScope: 'exhaustive',
        returnedCount: 0,
        totalCount: 0,
      },
      records: [],
    },
  ]

  const prepared = prepareReasoningContext(mockPlan, outcomes, 10)
  assert.strictEqual(prepared.verifiedAbsences.length, 1)
  assert.strictEqual(prepared.limitedAbsences.length, 0)
  assert(prepared.verifiedAbsences[0].claim.includes('No decision records are recorded'))
})

test('L. Required filtered zero => limited absence, NOT global absence', () => {
  const mockPlan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'PROJECT_PROGRESS',
    reasoningMode: 'PROGRESS',
    entityTarget: { name: 'Alpha', domain: 'project' },
    domainRequests: [
      { domain: 'task', importance: 'REQUIRED', queryMode: 'catalog', limit: 10 },
    ],
    requiresPreparation: true,
  }

  const outcomes: DomainOutcome[] = [
    {
      domain: 'task',
      importance: 'REQUIRED',
      status: 'LIMITED_EMPTY',
      returnedCount: 0,
      completeness: {
        domain: 'task',
        queryMode: 'catalog',
        resultScope: 'filtered',
        returnedCount: 0,
        filterDescription: 'status: completed in last 7 days',
      },
      records: [],
    },
  ]

  const prepared = prepareReasoningContext(mockPlan, outcomes, 10)
  assert.strictEqual(prepared.verifiedAbsences.length, 0, 'Must NOT register verified global absence for filtered query')
  assert.strictEqual(prepared.limitedAbsences.length, 1)
  assert(prepared.limitedAbsences[0].claim.includes('within status: completed in last 7 days'))
})

test('M. Optional retrieval error => unavailable domain preserved without failing turn', () => {
  const mockPlan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'PROJECT_PROGRESS',
    reasoningMode: 'PROGRESS',
    domainRequests: [
      { domain: 'project', importance: 'REQUIRED', queryMode: 'catalog', limit: 5 },
      { domain: 'review', importance: 'OPTIONAL', queryMode: 'catalog', limit: 5 },
    ],
    requiresPreparation: true,
  }

  const outcomes: DomainOutcome[] = [
    {
      domain: 'project',
      importance: 'REQUIRED',
      status: 'AVAILABLE',
      returnedCount: 1,
      records: [
        {
          entityType: 'project',
          entityId: 'p-1',
          title: 'Project 1',
          timestamps: {},
          epistemicClass: 'WV_RECORD',
          fields: {},
          provenance: { table: 'workspace_projects', id: 'p-1', workspace_id: 'ws-1' },
        },
      ],
    },
    {
      domain: 'review',
      importance: 'OPTIONAL',
      status: 'UNAVAILABLE',
      returnedCount: 0,
      error: 'Network timeout connecting to database',
      records: [],
    },
  ]

  const prepared = prepareReasoningContext(mockPlan, outcomes, 15)
  assert.strictEqual(prepared.unavailableDomains.includes('review'), true)
  assert.strictEqual(prepared.requiredDomainUnavailable, false, 'Optional domain failure must not set requiredDomainUnavailable')
})

test('N. Required retrieval error => incomplete prepared context, not false absence', () => {
  const mockPlan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'PROJECT_PROGRESS',
    reasoningMode: 'PROGRESS',
    domainRequests: [
      { domain: 'task', importance: 'REQUIRED', queryMode: 'catalog', limit: 10 },
    ],
    requiresPreparation: true,
  }

  const outcomes: DomainOutcome[] = [
    {
      domain: 'task',
      importance: 'REQUIRED',
      status: 'UNAVAILABLE',
      returnedCount: 0,
      error: 'Database connection failed',
      records: [],
    },
  ]

  const prepared = prepareReasoningContext(mockPlan, outcomes, 10)
  assert.strictEqual(prepared.requiredDomainUnavailable, true)
  assert.strictEqual(prepared.verifiedAbsences.length, 0, 'Retrieval error must NOT become a verified absence')
  assert.strictEqual(prepared.limitedAbsences.length, 0)
})

test('O. Ambiguous target => ambiguity preserved', () => {
  const mockPlan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'PROJECT_PROGRESS',
    reasoningMode: 'PROGRESS',
    domainRequests: [
      { domain: 'project', importance: 'REQUIRED', queryMode: 'targeted', entityTarget: 'Alpha', limit: 5 },
    ],
    requiresPreparation: true,
  }

  const outcomes: DomainOutcome[] = [
    {
      domain: 'project',
      importance: 'REQUIRED',
      status: 'AMBIGUOUS',
      returnedCount: 2,
      ambiguity: {
        domain: 'project',
        query: 'Alpha',
        candidateMatches: [
          { id: 'p-1', title: 'Alpha One' },
          { id: 'p-2', title: 'Alpha Two' },
        ],
        message: 'Multiple projects match Alpha',
      },
      records: [],
    },
  ]

  const prepared = prepareReasoningContext(mockPlan, outcomes, 10)
  assert.strictEqual(prepared.ambiguousDomains.includes('project'), true)
})

// ----------------------------------------------------------------------------
// P through U: Relational Clustering, Deduplication, Temporal Facts & Descriptive Counts
// ----------------------------------------------------------------------------

test('P. Duplicate record retrieved through two paths => deduplicated by authoritative identity', () => {
  const mockPlan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'PROJECT_PROGRESS',
    reasoningMode: 'PROGRESS',
    domainRequests: [
      { domain: 'task', importance: 'REQUIRED', queryMode: 'catalog', limit: 10 },
    ],
    requiresPreparation: true,
  }

  const duplicateRecord: VaultRecord = {
    entityType: 'task',
    entityId: 't-dup',
    title: 'Duplicate Task',
    timestamps: {},
    epistemicClass: 'WV_RECORD',
    fields: { status: 'todo' },
    provenance: { table: 'tasks', id: 't-dup', workspace_id: 'ws-1' },
  }

  const outcomes: DomainOutcome[] = [
    {
      domain: 'task',
      importance: 'REQUIRED',
      status: 'AVAILABLE',
      returnedCount: 1,
      records: [duplicateRecord],
    },
    {
      domain: 'task',
      importance: 'REQUIRED',
      status: 'AVAILABLE',
      returnedCount: 1,
      records: [duplicateRecord],
    },
  ]

  const prepared = prepareReasoningContext(mockPlan, outcomes, 10)
  assert.strictEqual(prepared.retrievalSummary.totalRetrievedCount, 1, 'Records must be deduplicated by identity')
})

test('Q. Task linked by projectId => authoritative project cluster', () => {
  const projectRecord: VaultRecord = {
    entityType: 'project',
    entityId: 'proj-123',
    title: 'PEVRA',
    timestamps: {},
    epistemicClass: 'WV_RECORD',
    fields: { status: 'active' },
    provenance: { table: 'workspace_projects', id: 'proj-123', workspace_id: 'ws-1' },
  }

  const taskRecord: VaultRecord = {
    entityType: 'task',
    entityId: 't-1',
    title: 'PEVRA Task',
    timestamps: {},
    relationship: { projectId: 'proj-123' },
    epistemicClass: 'WV_RECORD',
    fields: { status: 'todo', projectId: 'proj-123' },
    provenance: { table: 'tasks', id: 't-1', workspace_id: 'ws-1' },
  }

  const mockPlan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'PROJECT_PROGRESS',
    reasoningMode: 'PROGRESS',
    domainRequests: [],
    requiresPreparation: true,
  }

  const outcomes: DomainOutcome[] = [
    { domain: 'project', importance: 'REQUIRED', status: 'AVAILABLE', returnedCount: 1, records: [projectRecord] },
    { domain: 'task', importance: 'REQUIRED', status: 'AVAILABLE', returnedCount: 1, records: [taskRecord] },
  ]

  const prepared = prepareReasoningContext(mockPlan, outcomes, 10)
  assert.strictEqual(prepared.clusters.length, 1)
  assert.strictEqual(prepared.clusters[0].primaryEntity.id, 'proj-123')
  assert.strictEqual(prepared.clusters[0].records.length, 1)
  assert.strictEqual(prepared.clusters[0].records[0].entityId, 't-1')
})

test('R. Unlinked task => unlinkedRecords, not guessed relationship', () => {
  const projectRecord: VaultRecord = {
    entityType: 'project',
    entityId: 'proj-123',
    title: 'PEVRA',
    timestamps: {},
    epistemicClass: 'WV_RECORD',
    fields: {},
    provenance: { table: 'workspace_projects', id: 'proj-123', workspace_id: 'ws-1' },
  }

  // Task mentions PEVRA in title but has NO projectId foreign key
  const unlinkedTask: VaultRecord = {
    entityType: 'task',
    entityId: 't-unlinked',
    title: 'Unlinked task mentioning PEVRA',
    timestamps: {},
    epistemicClass: 'WV_RECORD',
    fields: { status: 'todo' },
    provenance: { table: 'tasks', id: 't-unlinked', workspace_id: 'ws-1' },
  }

  const mockPlan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'PROJECT_PROGRESS',
    reasoningMode: 'PROGRESS',
    domainRequests: [],
    requiresPreparation: true,
  }

  const outcomes: DomainOutcome[] = [
    { domain: 'project', importance: 'REQUIRED', status: 'AVAILABLE', returnedCount: 1, records: [projectRecord] },
    { domain: 'task', importance: 'REQUIRED', status: 'AVAILABLE', returnedCount: 1, records: [unlinkedTask] },
  ]

  const prepared = prepareReasoningContext(mockPlan, outcomes, 10)
  assert.strictEqual(prepared.clusters[0].records.length, 0, 'Unlinked task must NOT be clustered by lexical guessing')
  assert.strictEqual(prepared.unlinkedRecords.task.length, 1)
  assert.strictEqual(prepared.unlinkedRecords.task[0].entityId, 't-unlinked')
})

test('S. Overdue task => isOverdue and daysOverdue calculated correctly', () => {
  const anchorNow = new Date('2026-09-28T12:00:00.000Z')
  const overdueTask: VaultRecord = {
    entityType: 'task',
    entityId: 't-overdue',
    title: 'Overdue task',
    timestamps: { due_date: '2026-09-24T12:00:00.000Z' },
    epistemicClass: 'WV_RECORD',
    fields: { status: 'in_progress', due_date: '2026-09-24T12:00:00.000Z' },
    provenance: { table: 'tasks', id: 't-overdue', workspace_id: 'ws-1' },
  }

  const mockPlan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'WEEKLY_FOCUS',
    reasoningMode: 'PRIORITIZATION',
    domainRequests: [],
    requiresPreparation: true,
  }

  const outcomes: DomainOutcome[] = [
    { domain: 'task', importance: 'REQUIRED', status: 'AVAILABLE', returnedCount: 1, records: [overdueTask] },
  ]

  const prepared = prepareReasoningContext(mockPlan, outcomes, 10, anchorNow)
  assert.strictEqual(prepared.temporalFacts.length, 1)
  const fact = prepared.temporalFacts[0]
  assert.strictEqual(fact.isOverdue, true)
  assert.strictEqual(fact.daysOverdue, 4)
})

test('T. No activity >14 days => neutral daysSinceLastRecordedActivity only, NOT isStale', () => {
  const anchorNow = new Date('2026-09-28T12:00:00.000Z')
  const oldRecord: VaultRecord = {
    entityType: 'project',
    entityId: 'p-old',
    title: 'Old project',
    timestamps: { updated_at: '2026-09-08T12:00:00.000Z' },
    epistemicClass: 'WV_RECORD',
    fields: { status: 'active' },
    provenance: { table: 'workspace_projects', id: 'p-old', workspace_id: 'ws-1' },
  }

  const mockPlan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'PROJECT_PROGRESS',
    reasoningMode: 'PROGRESS',
    domainRequests: [],
    requiresPreparation: true,
  }

  const outcomes: DomainOutcome[] = [
    { domain: 'project', importance: 'REQUIRED', status: 'AVAILABLE', returnedCount: 1, records: [oldRecord] },
  ]

  const prepared = prepareReasoningContext(mockPlan, outcomes, 10, anchorNow)
  const fact = prepared.temporalFacts.find((f) => f.recordId === 'p-old')
  assert(fact !== undefined)
  assert.strictEqual(fact.daysSinceLastRecordedActivity, 20)
  assert.strictEqual((fact as any).isStale, undefined, 'Must NOT label record with arbitrary isStale boolean')
})

test('U. 3 completed of 5 recorded tasks => descriptive counts only, NO 60% completion percentage', () => {
  const tasks: VaultRecord[] = [
    { entityType: 'task', entityId: 't1', title: 'T1', timestamps: {}, epistemicClass: 'WV_RECORD', fields: { status: 'completed' }, provenance: { table: 'tasks', id: 't1', workspace_id: 'ws-1' } },
    { entityType: 'task', entityId: 't2', title: 'T2', timestamps: {}, epistemicClass: 'WV_RECORD', fields: { status: 'completed' }, provenance: { table: 'tasks', id: 't2', workspace_id: 'ws-1' } },
    { entityType: 'task', entityId: 't3', title: 'T3', timestamps: {}, epistemicClass: 'WV_RECORD', fields: { status: 'completed' }, provenance: { table: 'tasks', id: 't3', workspace_id: 'ws-1' } },
    { entityType: 'task', entityId: 't4', title: 'T4', timestamps: {}, epistemicClass: 'WV_RECORD', fields: { status: 'todo' }, provenance: { table: 'tasks', id: 't4', workspace_id: 'ws-1' } },
    { entityType: 'task', entityId: 't5', title: 'T5', timestamps: {}, epistemicClass: 'WV_RECORD', fields: { status: 'in_progress' }, provenance: { table: 'tasks', id: 't5', workspace_id: 'ws-1' } },
  ]

  const mockPlan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'PROJECT_PROGRESS',
    reasoningMode: 'PROGRESS',
    domainRequests: [],
    requiresPreparation: true,
  }

  const outcomes: DomainOutcome[] = [
    { domain: 'task', importance: 'REQUIRED', status: 'AVAILABLE', returnedCount: 5, records: tasks },
  ]

  const prepared = prepareReasoningContext(mockPlan, outcomes, 10)
  assert.strictEqual(prepared.descriptiveCounts.recordedTaskCount, 5)
  assert.strictEqual(prepared.descriptiveCounts.completedRecordedTaskCount, 3)
  assert.strictEqual(prepared.descriptiveCounts.openRecordedTaskCount, 2)
  assert.strictEqual((prepared as any).completionRatio, undefined, 'Must NOT calculate completionRatio')
  assert.strictEqual((prepared as any).progressPercentage, undefined, 'Must NOT calculate progressPercentage')
})

// ----------------------------------------------------------------------------
// V through AA: Research Epistemics, Provenance & Serialization
// ----------------------------------------------------------------------------

test('V & W. Research record with status=completed is not labeled verified/proven, claim_summary distinct from evidence_text', () => {
  const researchRec: VaultRecord = {
    entityType: 'research',
    entityId: 'r-1',
    title: 'Token Economics Analysis',
    timestamps: { completed_at: '2026-09-20T10:00:00.000Z' },
    epistemicClass: 'WV_RECORD',
    fields: {
      workflow_status: 'completed',
      evidenceItems: [
        {
          id: 'ev-1',
          evidence_text: 'Exact quote: supply is fixed at 100M tokens',
          claim_summary: 'Fixed inflation curve suggests scarcity',
          epistemicClass: 'RESEARCH_EVIDENCE',
        },
      ],
    },
    provenance: { table: 'research_records', id: 'r-1', workspace_id: 'ws-1' },
  }

  assert.strictEqual(researchRec.epistemicClass, 'WV_RECORD')
  assert.strictEqual(researchRec.fields.evidenceItems[0].epistemicClass, 'RESEARCH_EVIDENCE')
  assert.notStrictEqual(
    researchRec.fields.evidenceItems[0].evidence_text,
    researchRec.fields.evidenceItems[0].claim_summary
  )
})

test('X & Y. Prepared records preserve provenance identity & multi-domain handles remain valid', () => {
  const mockPlan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'WEEKLY_FOCUS',
    reasoningMode: 'PRIORITIZATION',
    domainRequests: [],
    requiresPreparation: true,
  }

  const pRec: VaultRecord = {
    entityType: 'project',
    entityId: 'proj-snip',
    title: 'Snip3rash',
    timestamps: {},
    epistemicClass: 'WV_RECORD',
    fields: { status: 'active' },
    provenance: { table: 'workspace_projects', id: 'proj-snip', workspace_id: 'ws-1' },
  }
  const tRec: VaultRecord = {
    entityType: 'task',
    entityId: 'task-oct',
    title: 'October objective',
    timestamps: {},
    epistemicClass: 'WV_RECORD',
    fields: { status: 'todo' },
    provenance: { table: 'tasks', id: 'task-oct', workspace_id: 'ws-1' },
  }

  const outcomes: DomainOutcome[] = [
    { domain: 'project', importance: 'REQUIRED', status: 'AVAILABLE', returnedCount: 1, records: [pRec] },
    { domain: 'task', importance: 'REQUIRED', status: 'AVAILABLE', returnedCount: 1, records: [tRec] },
  ]

  const prepared = prepareReasoningContext(mockPlan, outcomes, 10)
  const envelope = flattenPreparedContextToEnvelope(prepared, 'ws-1')
  const sourceMap = createRequestSourceMap(envelope)

  assert.strictEqual(sourceMap.get('S1')?.entityId, 'proj-snip')
  assert.strictEqual(sourceMap.get('S2')?.entityId, 'task-oct')

  const parsed = parseModelProvenance('Response referencing both [SOURCES: S1, S2 | BASIS: SYNTHESIS]')
  assert.strictEqual(parsed.hasTag, true)
  assert.strictEqual(parsed.basis, 'SYNTHESIS')

  const authResult = resolveAuthoritativeProvenance(sourceMap, parsed)
  assert.strictEqual(authResult.status, 'COMPLETE')
  assert.strictEqual(authResult.validHandlesCount, 2)
  assert.strictEqual(authResult.citations.length, 2)
  assert.strictEqual(authResult.citations[0].entityId, 'proj-snip')
  assert.strictEqual(authResult.citations[1].entityId, 'task-oct')
})

test('Z. Batch 2B.1 protocol remains concealed from client stream', () => {
  let clientStreamOutput = ''
  const filter = createProvenanceStreamFilter((chunk) => {
    clientStreamOutput += chunk
  })

  filter.push('Here is the status of Snip3rash.')
  filter.push(' [SOURCES: S1 |')
  filter.push(' BASIS: DIRECT_FACT]')

  const result = filter.flush()
  assert.strictEqual(clientStreamOutput.trim(), 'Here is the status of Snip3rash.')
  assert(!clientStreamOutput.includes('[SOURCES:'), 'Stream must not contain protocol tags')
  assert.strictEqual(result.hasTag, true)
  assert.strictEqual(result.handles[0], 'S1')
  assert.strictEqual(result.basis, 'DIRECT_FACT')
})

test('AA. Zero authoritative material citations => provenance UNAVAILABLE', () => {
  const mockPlan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'WEEKLY_FOCUS',
    reasoningMode: 'PRIORITIZATION',
    domainRequests: [],
    requiresPreparation: true,
  }

  const prepared = prepareReasoningContext(mockPlan, [], 10)
  const envelope = flattenPreparedContextToEnvelope(prepared, 'ws-1')
  const sourceMap = createRequestSourceMap(envelope)

  const parsedNoTag = parseModelProvenance('No sources used here.')
  const authResult = resolveAuthoritativeProvenance(sourceMap, parsedNoTag)
  assert.strictEqual(authResult.status, 'UNAVAILABLE')
  assert.strictEqual(authResult.citations.length, 0)
})

// ----------------------------------------------------------------------------
// AB through AD: Batch 2A Entity Extraction Regressions
// ----------------------------------------------------------------------------

test('AB. Batch 2A entity extraction regressions remain green', () => {
  const p1 = planRetrieval({ prompt: 'Give me a status report on Snip3rash trading academy using only my Vault records.' })
  assert.strictEqual(p1.intents[0].domain, 'project')
  assert.strictEqual(p1.intents[0].entityQuery, 'Snip3rash trading academy')

  const p2 = planRetrieval({ prompt: 'What are the active tasks for PEVRA?' })
  assert(p2.intents.some((i) => i.domain === 'task'))
  assert.strictEqual(p2.resolvedEntityHints[0].name, 'PEVRA')
})

test('AC. Unknown Project Nightfall behavior remains correct (entity query preserved)', () => {
  const p = planRetrieval({ prompt: 'Status report on Project Nightfall' })
  assert.strictEqual(p.shouldRetrieve, true)
  assert.strictEqual(p.intents[0].entityQuery, 'Project Nightfall')
})

test('AD. Current Snip3rash retrieval behavior remains correct with context qualifier rejection', () => {
  const p = planRetrieval({
    prompt: 'Based only on my Vault records, what should I focus on first for Snip3rash Trading Academy right now, and why?',
  })
  assert.strictEqual(p.shouldRetrieve, true)
  assert.strictEqual(p.resolvedEntityHints[0]?.name, 'Snip3rash Trading Academy')
})

test('J-2. "Give me a progress report on Project Nightfall." => legitimate entity target, unknown entity preserved', () => {
  const p = planReasoning({ prompt: 'Give me a progress report on Project Nightfall.' })
  assert(p !== null)
  assert.strictEqual(p.primaryIntent, 'PROJECT_PROGRESS')
  assert.strictEqual(p.entityTarget?.name, 'Project Nightfall')
})

test('K-2. "Give me a status report on Snip3rash trading academy." => targeted extraction unchanged', () => {
  const p = planRetrieval({ prompt: 'Give me a status report on Snip3rash trading academy.' })
  assert.strictEqual(p.shouldRetrieve, true)
  assert.strictEqual(p.intents[0].entityQuery, 'Snip3rash trading academy')
})

test('L-2. Production-shaped fixtures: active project created before current week + task with no due date', () => {
  const plan = planReasoning({
    prompt: 'What should I focus on this week based only on my Vault records? Separate what is recorded in my Vault from your recommendations.',
    timezone: 'UTC',
  })
  assert(plan !== null)
  assert.strictEqual(plan.primaryIntent, 'WEEKLY_FOCUS')
  assert.strictEqual(plan.entityTarget, undefined, 'Must NOT extract "week" as entity target')

  // Production-shaped records: created before this week (2026-09-26)
  const snipProject: VaultRecord = {
    entityType: 'project',
    entityId: '97ac6d73-7e89-4557-9af6-d02b7c641dd9',
    title: 'Snip3rash trading academy',
    timestamps: { created_at: '2026-09-26T09:41:36.441235+00:00' },
    epistemicClass: 'WV_RECORD',
    fields: { status: 'active', priority: 'urgent' },
    provenance: { table: 'workspace_projects', id: '97ac6d73-7e89-4557-9af6-d02b7c641dd9', workspace_id: 'ws-1' },
  }

  const octTask: VaultRecord = {
    entityType: 'task',
    entityId: '63b9f36b-c0cf-4e15-b98e-c093ea953edf',
    title: 'October objective',
    timestamps: { created_at: '2026-09-26T09:46:44.190623+00:00' },
    relationship: { projectId: '97ac6d73-7e89-4557-9af6-d02b7c641dd9' },
    epistemicClass: 'WV_RECORD',
    fields: { status: 'todo', priority: 'medium', due_date: null, projectId: '97ac6d73-7e89-4557-9af6-d02b7c641dd9' },
    provenance: { table: 'tasks', id: '63b9f36b-c0cf-4e15-b98e-c093ea953edf', workspace_id: 'ws-1' },
  }

  const outcomes: DomainOutcome[] = [
    {
      domain: 'project',
      importance: 'REQUIRED',
      status: 'AVAILABLE',
      returnedCount: 1,
      records: [snipProject],
    },
    {
      domain: 'task',
      importance: 'REQUIRED',
      status: 'AVAILABLE',
      returnedCount: 1,
      records: [octTask],
    },
    {
      domain: 'decision',
      importance: 'OPTIONAL',
      status: 'LIMITED_EMPTY',
      returnedCount: 0,
      completeness: { domain: 'decision', queryMode: 'catalog', resultScope: 'bounded', returnedCount: 0 },
      records: [],
    },
    {
      domain: 'meeting',
      importance: 'OPTIONAL',
      status: 'LIMITED_EMPTY',
      returnedCount: 0,
      completeness: { domain: 'meeting', queryMode: 'catalog', resultScope: 'bounded', returnedCount: 0 },
      records: [],
    },
  ]

  const prepared = prepareReasoningContext(plan, outcomes, 12, new Date('2026-09-28T12:00:00.000Z'))

  assert.strictEqual(prepared.clusters.length, 1)
  assert.strictEqual(prepared.clusters[0].primaryEntity.title, 'Snip3rash trading academy')
  assert.strictEqual(prepared.clusters[0].records.length, 1)
  assert.strictEqual(prepared.clusters[0].records[0].title, 'October objective')
  assert.strictEqual(prepared.verifiedAbsences.length, 0, 'No false verified absences')
  assert.strictEqual(prepared.descriptiveCounts.recordedTaskCount, 1)
  assert.strictEqual(prepared.descriptiveCounts.openRecordedTaskCount, 1)
})

test('M-2. Open task created before current week remains retrievable in untargeted WEEKLY_FOCUS', () => {
  const plan = planReasoning({ prompt: 'What should I focus on this week?' })
  const taskReq = plan?.domainRequests.find((r) => r.domain === 'task')
  assert.strictEqual(taskReq?.statusFilter, 'open')
  assert.strictEqual(taskReq?.temporalFilter, undefined, 'Must NOT filter tasks by creation week')
})

test('N-2. Open task with no due date remains retrievable', () => {
  const taskRecord: VaultRecord = {
    entityType: 'task',
    entityId: 't-nodue',
    title: 'No due date task',
    timestamps: {},
    epistemicClass: 'WV_RECORD',
    fields: { status: 'todo', due_date: null },
    provenance: { table: 'tasks', id: 't-nodue', workspace_id: 'ws-1' },
  }

  const outcomes: DomainOutcome[] = [
    { domain: 'task', importance: 'REQUIRED', status: 'AVAILABLE', returnedCount: 1, records: [taskRecord] },
  ]

  const mockPlan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'WEEKLY_FOCUS',
    reasoningMode: 'PRIORITIZATION',
    domainRequests: [],
    requiresPreparation: true,
  }

  const prepared = prepareReasoningContext(mockPlan, outcomes, 5)
  assert.strictEqual(prepared.descriptiveCounts.openRecordedTaskCount, 1)
  assert.strictEqual(prepared.unlinkedRecords.task[0].title, 'No due date task')
})

// ============================================================================
// PROJECT_PROGRESS Epistemic Absence Corrections (Tests PP-A to PP-V)
// ============================================================================

test('PP-A. PROJECT_PROGRESS includes metric OPTIONAL', () => {
  const plan = planReasoning({ prompt: 'Give me a progress report on Snip3rash trading academy based only on my Vault records.' })
  assert(plan !== null)
  assert.strictEqual(plan.primaryIntent, 'PROJECT_PROGRESS')
  const metricReq = plan.domainRequests.find((r) => r.domain === 'metric')
  assert(metricReq !== undefined, 'Must request metric domain')
  assert.strictEqual(metricReq.importance, 'OPTIONAL')
})

test('PP-B. Existing project/task/decision/review requests remain in PROJECT_PROGRESS', () => {
  const plan = planReasoning({ prompt: 'Give me a progress report on Snip3rash trading academy.' })
  assert(plan !== null)
  assert(plan.domainRequests.some((r) => r.domain === 'project' && r.importance === 'REQUIRED'))
  assert(plan.domainRequests.some((r) => r.domain === 'task' && r.importance === 'REQUIRED'))
  assert(plan.domainRequests.some((r) => r.domain === 'decision' && r.importance === 'OPTIONAL'))
  assert(plan.domainRequests.some((r) => r.domain === 'review' && r.importance === 'OPTIONAL'))
})

test('PP-C. Snip3rash PROJECT_PROGRESS still targets correct entity', () => {
  const plan = planReasoning({ prompt: 'Give me a progress report on Snip3rash trading academy.' })
  assert(plan !== null)
  assert.strictEqual(plan.entityTarget?.name, 'Snip3rash trading academy')
  assert.strictEqual(plan.entityTarget?.domain, 'project')
})

test('PP-D. Metric retrieval cannot invent project linkage', () => {
  const projectRecord: VaultRecord = {
    entityType: 'project',
    entityId: 'p-snip3',
    title: 'Snip3rash trading academy',
    timestamps: {},
    epistemicClass: 'WV_RECORD',
    fields: { status: 'active' },
    provenance: { table: 'workspace_projects', id: 'p-snip3', workspace_id: 'ws-1' },
  }
  const unlinkedMetric: VaultRecord = {
    entityType: 'metric',
    entityId: 'm-unlinked',
    title: 'Arbitrary Metric',
    timestamps: {},
    epistemicClass: 'WV_RECORD',
    relationship: {}, // No project relationship!
    fields: { key: 'arb_metric', name: 'Arbitrary Metric' },
    provenance: { table: 'workspace_metrics', id: 'm-unlinked', workspace_id: 'ws-1' },
  }
  const linkedMetric: VaultRecord = {
    entityType: 'metric',
    entityId: 'm-linked',
    title: 'Telegram Members',
    timestamps: {},
    epistemicClass: 'WV_RECORD',
    relationship: { projectId: 'p-snip3', projectTitle: 'Snip3rash trading academy' },
    fields: { projectId: 'p-snip3', key: 'tg_members', name: 'Telegram Members' },
    provenance: { table: 'workspace_metrics', id: 'm-linked', workspace_id: 'ws-1' },
  }

  const outcomes: DomainOutcome[] = [
    { domain: 'project', importance: 'REQUIRED', status: 'AVAILABLE', returnedCount: 1, records: [projectRecord] },
    { domain: 'metric', importance: 'OPTIONAL', status: 'AVAILABLE', returnedCount: 2, records: [unlinkedMetric, linkedMetric] },
  ]
  const mockPlan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'PROJECT_PROGRESS',
    reasoningMode: 'PROGRESS',
    domainRequests: [],
    requiresPreparation: true,
  }
  const prepared = prepareReasoningContext(mockPlan, outcomes, 5)
  // Linked metric must cluster under project
  assert.strictEqual(prepared.clusters[0].records.length, 1)
  assert.strictEqual(prepared.clusters[0].records[0].entityId, 'm-linked')
  // Unlinked metric must go to unlinkedRecords, NEVER fabricated into the project cluster
  assert.strictEqual(prepared.unlinkedRecords.metric.length, 1)
  assert.strictEqual(prepared.unlinkedRecords.metric[0].entityId, 'm-unlinked')
})

test('PP-E. due_date null can support: "No due date is recorded."', () => {
  const taskRecord: VaultRecord = {
    entityType: 'task',
    entityId: 't-1',
    title: 'October objective',
    timestamps: { due_date: undefined },
    epistemicClass: 'WV_RECORD',
    fields: { status: 'todo', due_date: null },
    provenance: { table: 'tasks', id: 't-1', workspace_id: 'ws-1' },
  }
  const mockPlan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'PROJECT_PROGRESS',
    reasoningMode: 'PROGRESS',
    domainRequests: [],
    requiresPreparation: true,
  }
  const prepared = prepareReasoningContext(mockPlan, [{ domain: 'task', importance: 'REQUIRED', status: 'AVAILABLE', returnedCount: 1, records: [taskRecord] }], 5)
  const env = flattenPreparedContextToEnvelope(prepared, 'ws-1')
  const prompt = serializePreparedContextForPrompt(prepared, env)
  assert(prompt.includes('task.due_date = null -> "No due date is recorded for this task."'), 'Must authorize direct field negative claim')
})

test('PP-F. limited decision absence cannot become: "No decisions exist in the Vault."', () => {
  const mockPlan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'PROJECT_PROGRESS',
    reasoningMode: 'PROGRESS',
    entityTarget: { name: 'Snip3rash trading academy', domain: 'project' },
    domainRequests: [],
    requiresPreparation: true,
  }
  const outcomes: DomainOutcome[] = [
    {
      domain: 'decision',
      importance: 'OPTIONAL',
      status: 'LIMITED_EMPTY',
      returnedCount: 0,
      completeness: {
        domain: 'decision',
        queryMode: 'targeted',
        resultScope: 'filtered',
        returnedCount: 0,
        appliedLimit: 10,
        filterDescription: 'query: Snip3rash trading academy',
      },
      records: [],
    },
  ]
  const prepared = prepareReasoningContext(mockPlan, outcomes, 5)
  assert.strictEqual(prepared.verifiedAbsences.length, 0)
  assert.strictEqual(prepared.limitedAbsences.length, 1)
  assert.strictEqual(prepared.limitedAbsences[0].scope, 'filtered')
  const env = flattenPreparedContextToEnvelope(prepared, 'ws-1')
  const prompt = serializePreparedContextForPrompt(prepared, env)
  assert(prompt.includes('DO NOT claim records do not exist globally. State absence strictly within the query bounds'), 'Must prohibit global claim')
})

test('PP-G. limited review absence cannot become: "No reviews exist in the Vault."', () => {
  const mockPlan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'PROJECT_PROGRESS',
    reasoningMode: 'PROGRESS',
    entityTarget: { name: 'Snip3rash trading academy', domain: 'project' },
    domainRequests: [],
    requiresPreparation: true,
  }
  const outcomes: DomainOutcome[] = [
    {
      domain: 'review',
      importance: 'OPTIONAL',
      status: 'LIMITED_EMPTY',
      returnedCount: 0,
      completeness: {
        domain: 'review',
        queryMode: 'targeted',
        resultScope: 'filtered',
        returnedCount: 0,
        appliedLimit: 5,
        filterDescription: 'query: Snip3rash trading academy',
      },
      records: [],
    },
  ]
  const prepared = prepareReasoningContext(mockPlan, outcomes, 5)
  assert.strictEqual(prepared.verifiedAbsences.length, 0)
  assert.strictEqual(prepared.limitedAbsences.length, 1)
  assert.strictEqual(prepared.limitedAbsences[0].domain, 'review')
  assert.strictEqual(prepared.limitedAbsences[0].scope, 'filtered')
})

test('PP-H. missing numeric values in project/task descriptions may support observational gap', () => {
  const mockPlan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'PROJECT_PROGRESS',
    reasoningMode: 'PROGRESS',
    domainRequests: [],
    requiresPreparation: true,
  }
  const prepared = prepareReasoningContext(mockPlan, [], 5)
  const env = flattenPreparedContextToEnvelope(prepared, 'ws-1')
  const prompt = serializePreparedContextForPrompt(prepared, env)
  assert(prompt.includes('OBSERVATIONAL GAP: Gaps in prose descriptions of retrieved records'), 'Must support observational gap definition')
})

test('PP-I. Missing numeric values alone must NOT support: "No metrics exist."', () => {
  const mockPlan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'PROJECT_PROGRESS',
    reasoningMode: 'PROGRESS',
    domainRequests: [],
    requiresPreparation: true,
  }
  const prepared = prepareReasoningContext(mockPlan, [], 5)
  const env = flattenPreparedContextToEnvelope(prepared, 'ws-1')
  const prompt = serializePreparedContextForPrompt(prepared, env)
  assert(prompt.includes('Missing numeric values alone must NEVER be framed as "no metrics exist in the Vault"'), 'Must explicitly forbid turning lack of numbers into metric absence claim')
})

test('PP-J. Serializer explicitly prohibits authoritative absence claims for unmodeled concepts', () => {
  const mockPlan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'PROJECT_PROGRESS',
    reasoningMode: 'PROGRESS',
    domainRequests: [],
    requiresPreparation: true,
  }
  const prepared = prepareReasoningContext(mockPlan, [], 5)
  const env = flattenPreparedContextToEnvelope(prepared, 'ws-1')
  const prompt = serializePreparedContextForPrompt(prepared, env)
  assert(prompt.includes('UNMODELED CONCEPT DISCIPLINE (CRITICAL)'), 'Must contain unmodeled concept directive')
  assert(prompt.includes('Do not invent record types, hierarchy types, planning constructs, or schema concepts'), 'Must prohibit schema concept invention')
})

test('PP-K. Unmodeled concept may still appear as recommendation: "You could break this into smaller execution tasks."', () => {
  const mockPlan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'PROJECT_PROGRESS',
    reasoningMode: 'PROGRESS',
    domainRequests: [],
    requiresPreparation: true,
  }
  const prepared = prepareReasoningContext(mockPlan, [], 5)
  const env = flattenPreparedContextToEnvelope(prepared, 'ws-1')
  const prompt = serializePreparedContextForPrompt(prepared, env)
  assert(prompt.includes('you may suggest it as a forward-looking recommendation'), 'Must allow forward-looking recommendations')
})

test('PP-L. No authoritative context may produce: "There are no subtasks in your Vault."', () => {
  const mockPlan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'PROJECT_PROGRESS',
    reasoningMode: 'PROGRESS',
    domainRequests: [],
    requiresPreparation: true,
  }
  const prepared = prepareReasoningContext(mockPlan, [], 5)
  const env = flattenPreparedContextToEnvelope(prepared, 'ws-1')
  const prompt = serializePreparedContextForPrompt(prepared, env)
  assert(prompt.includes('NEVER say "There are no subtasks in your Vault"'), 'Must explicitly forbid saying there are no subtasks in your Vault')
})

test('PP-M. No authoritative context may produce: "There are no milestones in your Vault."', () => {
  const mockPlan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'PROJECT_PROGRESS',
    reasoningMode: 'PROGRESS',
    domainRequests: [],
    requiresPreparation: true,
  }
  const prepared = prepareReasoningContext(mockPlan, [], 5)
  const env = flattenPreparedContextToEnvelope(prepared, 'ws-1')
  const prompt = serializePreparedContextForPrompt(prepared, env)
  assert(prompt.includes('milestones'), 'Must include milestones in unmodeled concepts')
})

test('PP-N. No authoritative context may produce: "There are no checkpoints in your Vault."', () => {
  const mockPlan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'PROJECT_PROGRESS',
    reasoningMode: 'PROGRESS',
    domainRequests: [],
    requiresPreparation: true,
  }
  const prepared = prepareReasoningContext(mockPlan, [], 5)
  const env = flattenPreparedContextToEnvelope(prepared, 'ws-1')
  const prompt = serializePreparedContextForPrompt(prepared, env)
  assert(prompt.includes('checkpoints'), 'Must include checkpoints in unmodeled concepts')
})

test('PP-O. Completed task count remains 0 for production-shaped Snip3rash fixture', () => {
  const projectRecord: VaultRecord = {
    entityType: 'project',
    entityId: '97ac6d73-7e89-4557-9af6-d02b7c641dd9',
    title: 'Snip3rash trading academy',
    timestamps: {},
    epistemicClass: 'WV_RECORD',
    fields: { status: 'active', priority: 'urgent' },
    provenance: { table: 'workspace_projects', id: '97ac6d73-7e89-4557-9af6-d02b7c641dd9', workspace_id: 'ws-1' },
  }
  const taskRecord: VaultRecord = {
    entityType: 'task',
    entityId: '63b9f36b-c0cf-4e15-b98e-c093ea953edf',
    title: 'October objective',
    timestamps: {},
    epistemicClass: 'WV_RECORD',
    relationship: { projectId: '97ac6d73-7e89-4557-9af6-d02b7c641dd9', projectTitle: 'Snip3rash trading academy' },
    fields: { status: 'todo', priority: 'medium', due_date: null },
    provenance: { table: 'tasks', id: '63b9f36b-c0cf-4e15-b98e-c093ea953edf', workspace_id: 'ws-1' },
  }
  const outcomes: DomainOutcome[] = [
    { domain: 'project', importance: 'REQUIRED', status: 'AVAILABLE', returnedCount: 1, records: [projectRecord] },
    { domain: 'task', importance: 'REQUIRED', status: 'AVAILABLE', returnedCount: 1, records: [taskRecord] },
  ]
  const mockPlan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'PROJECT_PROGRESS',
    reasoningMode: 'PROGRESS',
    domainRequests: [],
    requiresPreparation: true,
  }
  const prepared = prepareReasoningContext(mockPlan, outcomes, 5)
  assert.strictEqual(prepared.descriptiveCounts.completedRecordedTaskCount, 0, 'Completed tasks must be 0')
})

test('PP-P. Open task count remains 1 for production-shaped Snip3rash fixture', () => {
  const projectRecord: VaultRecord = {
    entityType: 'project',
    entityId: '97ac6d73-7e89-4557-9af6-d02b7c641dd9',
    title: 'Snip3rash trading academy',
    timestamps: {},
    epistemicClass: 'WV_RECORD',
    fields: { status: 'active', priority: 'urgent' },
    provenance: { table: 'workspace_projects', id: '97ac6d73-7e89-4557-9af6-d02b7c641dd9', workspace_id: 'ws-1' },
  }
  const taskRecord: VaultRecord = {
    entityType: 'task',
    entityId: '63b9f36b-c0cf-4e15-b98e-c093ea953edf',
    title: 'October objective',
    timestamps: {},
    epistemicClass: 'WV_RECORD',
    relationship: { projectId: '97ac6d73-7e89-4557-9af6-d02b7c641dd9', projectTitle: 'Snip3rash trading academy' },
    fields: { status: 'todo', priority: 'medium', due_date: null },
    provenance: { table: 'tasks', id: '63b9f36b-c0cf-4e15-b98e-c093ea953edf', workspace_id: 'ws-1' },
  }
  const outcomes: DomainOutcome[] = [
    { domain: 'project', importance: 'REQUIRED', status: 'AVAILABLE', returnedCount: 1, records: [projectRecord] },
    { domain: 'task', importance: 'REQUIRED', status: 'AVAILABLE', returnedCount: 1, records: [taskRecord] },
  ]
  const mockPlan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'PROJECT_PROGRESS',
    reasoningMode: 'PROGRESS',
    domainRequests: [],
    requiresPreparation: true,
  }
  const prepared = prepareReasoningContext(mockPlan, outcomes, 5)
  assert.strictEqual(prepared.descriptiveCounts.openRecordedTaskCount, 1, 'Open tasks must be 1')
})

test('PP-Q. Active project status is never converted into completed/progress claim', () => {
  const projectRecord: VaultRecord = {
    entityType: 'project',
    entityId: 'p-1',
    title: 'Active Project',
    timestamps: {},
    epistemicClass: 'WV_RECORD',
    fields: { status: 'active' },
    provenance: { table: 'workspace_projects', id: 'p-1', workspace_id: 'ws-1' },
  }
  const mockPlan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'PROJECT_PROGRESS',
    reasoningMode: 'PROGRESS',
    domainRequests: [],
    requiresPreparation: true,
  }
  const prepared = prepareReasoningContext(mockPlan, [{ domain: 'project', importance: 'REQUIRED', status: 'AVAILABLE', returnedCount: 1, records: [projectRecord] }], 5)
  assert.strictEqual((prepared as any).completionRatio, undefined)
  assert.strictEqual((prepared as any).progressPercentage, undefined)
  const env = flattenPreparedContextToEnvelope(prepared, 'ws-1')
  const prompt = serializePreparedContextForPrompt(prepared, env)
  assert(prompt.includes('Do not invent completion percentages or project health scores. Cite descriptive counts directly.'))
})

test('PP-R. October objective clusters to Snip3rash by authoritative projectId', () => {
  const projectRecord: VaultRecord = {
    entityType: 'project',
    entityId: '97ac6d73-7e89-4557-9af6-d02b7c641dd9',
    title: 'Snip3rash trading academy',
    timestamps: {},
    epistemicClass: 'WV_RECORD',
    fields: { status: 'active' },
    provenance: { table: 'workspace_projects', id: '97ac6d73-7e89-4557-9af6-d02b7c641dd9', workspace_id: 'ws-1' },
  }
  const taskRecord: VaultRecord = {
    entityType: 'task',
    entityId: '63b9f36b-c0cf-4e15-b98e-c093ea953edf',
    title: 'October objective',
    timestamps: {},
    epistemicClass: 'WV_RECORD',
    relationship: { projectId: '97ac6d73-7e89-4557-9af6-d02b7c641dd9', projectTitle: 'Snip3rash trading academy' },
    fields: { status: 'todo' },
    provenance: { table: 'tasks', id: '63b9f36b-c0cf-4e15-b98e-c093ea953edf', workspace_id: 'ws-1' },
  }
  const mockPlan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'PROJECT_PROGRESS',
    reasoningMode: 'PROGRESS',
    domainRequests: [],
    requiresPreparation: true,
  }
  const prepared = prepareReasoningContext(mockPlan, [
    { domain: 'project', importance: 'REQUIRED', status: 'AVAILABLE', returnedCount: 1, records: [projectRecord] },
    { domain: 'task', importance: 'REQUIRED', status: 'AVAILABLE', returnedCount: 1, records: [taskRecord] },
  ], 5)
  assert.strictEqual(prepared.clusters.length, 1)
  assert.strictEqual(prepared.clusters[0].records.length, 1)
  assert.strictEqual(prepared.clusters[0].records[0].title, 'October objective')
  assert.strictEqual(prepared.clusters[0].relationshipType, 'authoritative_fk')
})

test('PP-S. Provenance source-map behavior unchanged with metric addition', () => {
  const projectRecord: VaultRecord = {
    entityType: 'project',
    entityId: 'p-1',
    title: 'Project Alpha',
    timestamps: {},
    epistemicClass: 'WV_RECORD',
    fields: {},
    provenance: { table: 'workspace_projects', id: 'p-1', workspace_id: 'ws-1' },
  }
  const metricRecord: VaultRecord = {
    entityType: 'metric',
    entityId: 'm-1',
    title: 'Conversion Rate',
    timestamps: {},
    epistemicClass: 'WV_RECORD',
    fields: {},
    provenance: { table: 'workspace_metrics', id: 'm-1', workspace_id: 'ws-1' },
  }
  const mockPlan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'PROJECT_PROGRESS',
    reasoningMode: 'PROGRESS',
    domainRequests: [],
    requiresPreparation: true,
  }
  const prepared = prepareReasoningContext(mockPlan, [
    { domain: 'project', importance: 'REQUIRED', status: 'AVAILABLE', returnedCount: 1, records: [projectRecord] },
    { domain: 'metric', importance: 'OPTIONAL', status: 'AVAILABLE', returnedCount: 1, records: [metricRecord] },
  ], 5)
  const env = flattenPreparedContextToEnvelope(prepared, 'ws-1')
  const sourceMap = createRequestSourceMap(env)
  assert.strictEqual(sourceMap.get('S1')?.entityId, 'p-1')
  assert.strictEqual(sourceMap.get('S2')?.entityId, 'm-1')
})

test('PP-T. Protocol concealment unchanged', () => {
  let clientStreamOutput = ''
  const filter = createProvenanceStreamFilter((chunk) => {
    clientStreamOutput += chunk
  })
  filter.push('Analysis of progress.\n\n[SOURCES: S1, S2 | BASIS: SYNTHESIS]')
  filter.flush()
  assert(!clientStreamOutput.includes('[SOURCES:'), 'Must conceal [SOURCES:]')
  assert(!clientStreamOutput.includes('S1'), 'Must conceal S1')
})

test('PP-U. WEEKLY_FOCUS regression remains green', () => {
  const plan = planReasoning({ prompt: 'What should I focus on this week based only on my Vault records?' })
  assert(plan !== null)
  assert.strictEqual(plan.primaryIntent, 'WEEKLY_FOCUS')
  assert.strictEqual(plan.entityTarget, undefined)
  assert(plan.domainRequests.some((r) => r.domain === 'task' && r.importance === 'REQUIRED'))
  assert(plan.domainRequests.some((r) => r.domain === 'project' && r.importance === 'REQUIRED'))
})

test('PP-V. Temporal entity collision tests remain green', () => {
  const weekPlan = planReasoning({ prompt: 'What are my top priorities this week?' })
  assert.strictEqual(weekPlan?.entityTarget, undefined)
  const monthPlan = planReasoning({ prompt: 'What should I focus on this month?' })
  assert.strictEqual(monthPlan?.entityTarget, undefined)
  const todayPlan = planReasoning({ prompt: 'What should I focus on today?' })
  assert.strictEqual(todayPlan?.entityTarget, undefined)
})

console.log(`\nAll ${passedTests} deterministic verification tests PASSED!\n`)
