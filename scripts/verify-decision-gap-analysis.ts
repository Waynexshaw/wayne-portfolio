/**
 * Waynex Vault — SHAW Batch 2B.2A: DECISION_GAP_ANALYSIS Verification Suite
 *
 * Verifies:
 * 1. Correct intent classification for the PEVRA test prompt
 * 2. Project-targeted retrieval versus workspace-wide catalog mode
 * 3. Project-linked decision and meeting retrieval
 * 4. Exclusion of unrelated records and preservation of workspace access restrictions
 * 5. Evidence-grounded possible decision gaps
 * 6. Accurate handling of no matching decisions (no proof of non-occurrence)
 * 7. Explicitly unresolved questions versus merely inferred questions
 * 8. Rejection of unsupported global absence claims
 * 9. Acceptance of appropriately scoped uncertainty statements
 * 10. Retrieval limits, unavailable domains, and safe fallback behavior
 */

import assert from 'node:assert'
import test from 'node:test'
import { planReasoning, detectDecisionGapAnalysis } from '../lib/vault/shaw/retrieval/planner'
import { VaultRetrievalService } from '../lib/vault/shaw/retrieval/service'
import {
  prepareReasoningContext,
  buildAnswerContract,
} from '../lib/vault/shaw/retrieval/preparation'
import { serializePreparedContextForPrompt } from '../lib/vault/shaw/retrieval/serializer'
import { validatePublicationEvidence, PublicationEvidenceValidationContext } from '../lib/vault/shaw/retrieval/provenance'
import {
  ReasoningPlan,
  DomainOutcome,
  VaultRecord,
} from '../lib/vault/shaw/retrieval/types'

// ----------------------------------------------------------------------------
// Test 1: Intent Classification for PEVRA Test Prompt
// ----------------------------------------------------------------------------
test('1. Production test prompt triggers DECISION_GAP_ANALYSIS with entityTarget PEVRA', () => {
  const prompt =
    'Based only on my Vault records, analyze the important decisions and unresolved questions for PEVRA. Separate documented decisions, open questions, possible decision gaps, and things you cannot verify. Do not invent decisions or assume that missing records mean no decision was made.'

  assert.strictEqual(detectDecisionGapAnalysis(prompt), true)
  const plan = planReasoning({ prompt })

  assert(plan !== null, 'Reasoning plan must be generated')
  assert.strictEqual(plan.primaryIntent, 'DECISION_GAP_ANALYSIS')
  assert.strictEqual(plan.reasoningMode, 'GAP_ANALYSIS')
  assert.strictEqual(plan.entityTarget?.name, 'PEVRA')
  assert.strictEqual(plan.entityTarget?.domain, 'project')
})

// ----------------------------------------------------------------------------
// Test 2: Project-Targeted Retrieval vs. Workspace-Wide Catalog Mode
// ----------------------------------------------------------------------------
test('2. Targeted mode wires entityTarget to project, decision, task, meeting; catalog mode preserves workspace scan', () => {
  const targetedPrompt =
    'Based only on my Vault records, analyze the important decisions and unresolved questions for PEVRA.'
  const targetedPlan = planReasoning({ prompt: targetedPrompt })
  assert(targetedPlan !== null)

  const projReq = targetedPlan.domainRequests.find((r) => r.domain === 'project')
  const decReq = targetedPlan.domainRequests.find((r) => r.domain === 'decision')
  const taskReq = targetedPlan.domainRequests.find((r) => r.domain === 'task')
  const meetReq = targetedPlan.domainRequests.find((r) => r.domain === 'meeting')
  const actReq = targetedPlan.domainRequests.find((r) => r.domain === 'activity')

  assert.strictEqual(projReq?.queryMode, 'targeted')
  assert.strictEqual(projReq?.entityTarget, 'PEVRA')
  assert.strictEqual(decReq?.queryMode, 'targeted')
  assert.strictEqual(decReq?.entityTarget, 'PEVRA')
  assert.strictEqual(taskReq?.queryMode, 'targeted')
  assert.strictEqual(taskReq?.entityTarget, 'PEVRA')
  assert.strictEqual(meetReq?.queryMode, 'targeted')
  assert.strictEqual(meetReq?.entityTarget, 'PEVRA')
  assert.strictEqual(actReq?.queryMode, 'catalog')

  // Catalog mode: Workspace-wide query without an entity target
  const catalogPrompt = 'Which projects have activity but no recorded decisions?'
  const catalogPlan = planReasoning({ prompt: catalogPrompt })
  assert(catalogPlan !== null)
  assert.strictEqual(catalogPlan.entityTarget, undefined)

  const catProj = catalogPlan.domainRequests.find((r) => r.domain === 'project')
  const catDec = catalogPlan.domainRequests.find((r) => r.domain === 'decision')
  const catMeet = catalogPlan.domainRequests.find((r) => r.domain === 'meeting')

  assert.strictEqual(catProj?.queryMode, 'catalog')
  assert.strictEqual(catProj?.entityTarget, undefined)
  assert.strictEqual(catDec?.queryMode, 'catalog')
  assert.strictEqual(catDec?.entityTarget, undefined)
  assert.strictEqual(catMeet?.queryMode, 'catalog')
  assert.strictEqual(catMeet?.entityTarget, undefined)
})

// ----------------------------------------------------------------------------
// Test 3: Project-Linked Decision and Meeting Retrieval
// ----------------------------------------------------------------------------
test('3. Project-targeted retrieval queries project_id relationships and supported textual matches', async () => {
  const calls: string[] = []

  const mockSupabase = {
    from: (table: string) => {
      calls.push(`from:${table}`)
      const builder: any = {
        select: (_cols: string, _opts?: any) => builder,
        eq: (col: string, val: string) => {
          calls.push(`eq:${col}=${val}`)
          return builder
        },
        or: (filterStr: string) => {
          calls.push(`or:${filterStr}`)
          return builder
        },
        order: (col: string, _opts: any) => {
          calls.push(`order:${col}`)
          return builder
        },
        limit: (lim: number) => {
          calls.push(`limit:${lim}`)
          if (table === 'workspace_projects') {
            return Promise.resolve({ data: [{ id: 'proj-pevra-uuid', title: 'PEVRA', slug: 'pevra' }], error: null, count: 1 })
          }
          if (table === 'decisions') {
            return Promise.resolve({
              data: [
                {
                  id: 'dec-1',
                  project_id: 'proj-pevra-uuid',
                  title: 'Polygon Network Selection',
                  decision: 'Deploy contracts to Polygon POS for low transaction fees',
                  decided_at: '2025-02-01T00:00:00Z',
                  workspace_projects: { title: 'PEVRA', slug: 'pevra' },
                },
              ],
              error: null,
            })
          }
          if (table === 'meetings') {
            return Promise.resolve({
              data: [
                {
                  id: 'meet-1',
                  project_id: 'proj-pevra-uuid',
                  title: 'PEVRA Smart Contract Architecture Sync',
                  meeting_type: 'architecture',
                  status: 'completed',
                  scheduled_at: '2025-02-10T14:00:00Z',
                  ended_at: '2025-02-10T15:00:00Z',
                  agenda: 'Review token standards. What is our audit timeline?',
                  notes: 'Agreed on soulbound non-transferable token model.',
                  outcomes: 'Approved ERC-5192 standard for tokenized numbers.',
                  workspace_projects: { title: 'PEVRA' },
                },
              ],
              error: null,
            })
          }
          return Promise.resolve({ data: [], error: null })
        },
      }
      return builder
    },
  }

  const service = new VaultRetrievalService(mockSupabase, 'ws-123')
  const plan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'DECISION_GAP_ANALYSIS',
    reasoningMode: 'GAP_ANALYSIS',
    entityTarget: { name: 'PEVRA', domain: 'project' },
    domainRequests: [
      { domain: 'decision', importance: 'REQUIRED', queryMode: 'targeted', entityTarget: 'PEVRA', limit: 25 },
      { domain: 'meeting', importance: 'OPTIONAL', queryMode: 'targeted', entityTarget: 'PEVRA', limit: 5 },
    ],
    requiresPreparation: true,
  }

  const result = await service.executeReasoningPlan(plan)
  assert.strictEqual(result.domainOutcomes.length, 2)

  const decOutcome = result.domainOutcomes.find((o) => o.domain === 'decision')
  assert.strictEqual(decOutcome?.status, 'AVAILABLE')
  assert.strictEqual(decOutcome?.records.length, 1)
  assert.strictEqual(decOutcome?.records[0].title, 'Polygon Network Selection')

  const meetOutcome = result.domainOutcomes.find((o) => o.domain === 'meeting')
  assert.strictEqual(meetOutcome?.status, 'AVAILABLE')
  assert.strictEqual(meetOutcome?.records.length, 1)
  assert.strictEqual(meetOutcome?.records[0].title, 'PEVRA Smart Contract Architecture Sync')

  // Verify that queries checked project_id relationship AND textual matches
  assert(calls.some((c) => c.includes('or:project_id.eq.proj-pevra-uuid,title.ilike.%PEVRA%')))
})

// ----------------------------------------------------------------------------
// Test 4: Workspace Isolation & Exclusion of Unrelated Records
// ----------------------------------------------------------------------------
test('4. All queries strictly scope to workspace_id and filter by target entity', async () => {
  let workspaceChecked = false
  const mockSupabase = {
    from: (table: string) => ({
      select: () => ({
        eq: (col: string, val: string) => {
          if (col === 'workspace_id' && val === 'tenant-alpha') {
            workspaceChecked = true
          }
          return {
            or: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
            limit: () => Promise.resolve({ data: [], error: null }),
          }
        },
      }),
    }),
  }

  const service = new VaultRetrievalService(mockSupabase, 'tenant-alpha')
  const plan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'DECISION_GAP_ANALYSIS',
    reasoningMode: 'GAP_ANALYSIS',
    entityTarget: { name: 'PEVRA', domain: 'project' },
    domainRequests: [
      { domain: 'meeting', importance: 'OPTIONAL', queryMode: 'targeted', entityTarget: 'PEVRA', limit: 5 },
    ],
    requiresPreparation: true,
  }

  await service.executeReasoningPlan(plan)
  assert.strictEqual(workspaceChecked, true, 'Workspace isolation must be enforced')
})

// ----------------------------------------------------------------------------
// Test 5: Evidence-Grounded Possible Decision Gaps
// ----------------------------------------------------------------------------
test('5. Answer contract anchors possible decision gaps in retrieved project scope and tasks', () => {
  const plan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'DECISION_GAP_ANALYSIS',
    reasoningMode: 'GAP_ANALYSIS',
    entityTarget: { name: 'PEVRA', domain: 'project' },
    domainRequests: [
      { domain: 'project', importance: 'REQUIRED', queryMode: 'targeted', entityTarget: 'PEVRA', limit: 10 },
      { domain: 'decision', importance: 'REQUIRED', queryMode: 'targeted', entityTarget: 'PEVRA', limit: 25 },
    ],
    requiresPreparation: true,
  }

  const mockRecords: VaultRecord[] = [
    {
      entityType: 'project',
      entityId: 'proj-1',
      title: 'PEVRA',
      timestamps: {},
      epistemicClass: 'WV_RECORD',
      fields: {
        status: 'active',
        priority: 'high',
        description: 'Telecommunications platform requiring smart contract audit and token governance.',
      },
      provenance: { table: 'workspace_projects', id: 'proj-1', workspace_id: 'ws-1' },
    },
    {
      entityType: 'task',
      entityId: 'task-1',
      title: 'Prepare smart contract audit documentation',
      timestamps: {},
      relationship: { projectId: 'proj-1' },
      epistemicClass: 'WV_RECORD',
      fields: { status: 'todo', priority: 'high', notes: 'Should we use OpenZeppelin or CertiK?' },
      provenance: { table: 'tasks', id: 'task-1', workspace_id: 'ws-1' },
    },
  ]

  const outcomes: DomainOutcome[] = [
    { domain: 'project', importance: 'REQUIRED', status: 'AVAILABLE', returnedCount: 1, records: [mockRecords[0]] },
    { domain: 'decision', importance: 'REQUIRED', status: 'LIMITED_EMPTY', returnedCount: 0, records: [] },
    { domain: 'task', importance: 'REQUIRED', status: 'AVAILABLE', returnedCount: 1, records: [mockRecords[1]] },
  ]

  const prepared = prepareReasoningContext(plan, outcomes, 50, new Date())
  const contract = prepared.answerContract!

  // Verify that an observational gap points to documented project scope for decision gaps
  const gapObservation = contract.observationalGaps.find((g) =>
    g.statement.includes('Possible decision gaps should be derived directly from documented project scope')
  )
  assert(gapObservation !== null && gapObservation !== undefined, 'Possible decision gaps must be anchored in documented scope')

  // Verify recommendation is context-specific, not generic
  const rec = contract.recommendations[0]
  assert(rec.statement.includes('PEVRA'), 'Recommendation must refer to PEVRA specifically')
  assert(!rec.statement.includes('Setting a due date and breaking the objective'), 'Generic recommendation must not appear')
})

// ----------------------------------------------------------------------------
// Test 6: Accurate Handling of No Matching Decisions (No Proof of Non-Occurrence)
// ----------------------------------------------------------------------------
test('6. Empty decision records are framed as absence in records checked, never as proof no decision occurred', () => {
  const plan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'DECISION_GAP_ANALYSIS',
    reasoningMode: 'GAP_ANALYSIS',
    entityTarget: { name: 'PEVRA', domain: 'project' },
    domainRequests: [
      { domain: 'decision', importance: 'REQUIRED', queryMode: 'targeted', entityTarget: 'PEVRA', limit: 25 },
    ],
    requiresPreparation: true,
  }

  const outcomes: DomainOutcome[] = [
    {
      domain: 'decision',
      importance: 'REQUIRED',
      status: 'LIMITED_EMPTY',
      returnedCount: 0,
      records: [],
      completeness: {
        domain: 'decision',
        queryMode: 'targeted',
        resultScope: 'filtered',
        returnedCount: 0,
        appliedLimit: 25,
        filterDescription: 'query: PEVRA',
      },
    },
  ]

  const prepared = prepareReasoningContext(plan, outcomes, 50, new Date())
  const observationalGap = prepared.answerContract!.observationalGaps.find((g) =>
    g.statement.includes('indicates a documentation gap in the Vault, not proof that no decisions were made')
  )

  assert(observationalGap !== null && observationalGap !== undefined)
  assert(observationalGap.statement.includes('PEVRA'))
})

// ----------------------------------------------------------------------------
// Test 7: Explicitly Unresolved Questions vs Merely Inferred Questions
// ----------------------------------------------------------------------------
test('7. Explicitly unresolved questions in notes are extracted as RECORDED_FACT', () => {
  const plan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'DECISION_GAP_ANALYSIS',
    reasoningMode: 'GAP_ANALYSIS',
    entityTarget: { name: 'PEVRA', domain: 'project' },
    domainRequests: [{ domain: 'task', importance: 'REQUIRED', queryMode: 'targeted', entityTarget: 'PEVRA', limit: 10 }],
    requiresPreparation: true,
  }

  const taskRecord: VaultRecord = {
    entityType: 'task',
    entityId: 't-question',
    title: 'Audit Planning',
    timestamps: {},
    relationship: { projectId: 'p-1' },
    epistemicClass: 'WV_RECORD',
    fields: { status: 'todo', notes: 'Who will fund the external audit?' },
    provenance: { table: 'tasks', id: 't-question', workspace_id: 'ws-1' },
  }

  const outcomes: DomainOutcome[] = [
    { domain: 'task', importance: 'REQUIRED', status: 'AVAILABLE', returnedCount: 1, records: [taskRecord] },
  ]

  const prepared = prepareReasoningContext(plan, outcomes, 50, new Date())
  const questionFact = prepared.answerContract!.recordedFacts.find((f) =>
    f.statement.includes('contains recorded open question: Who will fund the external audit?')
  )

  assert(questionFact !== undefined, 'Explicit open question in task notes must be extracted as recorded fact')
})

// ----------------------------------------------------------------------------
// Test 8: Rejection of Unsupported Global Absence Claims
// ----------------------------------------------------------------------------
test('8. Validator rejects unsupported global claims about questions or non-occurrence of decisions', () => {
  const context: PublicationEvidenceValidationContext = {
    isTechnicalMode: false,
    policy: {
      intent: 'DECISION_GAP_ANALYSIS',
      evaluatedDomains: ['project', 'decision', 'task'],
      unevaluatedDomains: ['meeting', 'research'],
      domainPermissions: {
        project: { domain: 'project', evaluated: true, status: 'AVAILABLE', globalAbsenceAuthorized: false, allowedNegativeClaimType: 'NONE' },
        decision: { domain: 'decision', evaluated: true, status: 'LIMITED_EMPTY', globalAbsenceAuthorized: false, allowedNegativeClaimType: 'BOUNDED_ONLY' },
        task: { domain: 'task', evaluated: true, status: 'AVAILABLE', globalAbsenceAuthorized: false, allowedNegativeClaimType: 'NONE' },
        meeting: { domain: 'meeting', evaluated: false, status: 'UNEVALUATED', globalAbsenceAuthorized: false, allowedNegativeClaimType: 'NONE' },
        crm: { domain: 'crm', evaluated: false, status: 'UNEVALUATED', globalAbsenceAuthorized: false, allowedNegativeClaimType: 'NONE' },
        review: { domain: 'review', evaluated: false, status: 'UNEVALUATED', globalAbsenceAuthorized: false, allowedNegativeClaimType: 'NONE' },
        metric: { domain: 'metric', evaluated: false, status: 'UNEVALUATED', globalAbsenceAuthorized: false, allowedNegativeClaimType: 'NONE' },
        evidence: { domain: 'evidence', evaluated: false, status: 'UNEVALUATED', globalAbsenceAuthorized: false, allowedNegativeClaimType: 'NONE' },
        research: { domain: 'research', evaluated: false, status: 'UNEVALUATED', globalAbsenceAuthorized: false, allowedNegativeClaimType: 'NONE' },
        activity: { domain: 'activity', evaluated: false, status: 'UNEVALUATED', globalAbsenceAuthorized: false, allowedNegativeClaimType: 'NONE' },
      },
      knownNullFields: [],
      directFactualCounts: {},
      unmodeledConceptsAllowedAsFact: false,
      summaryMayStrengthen: false,
      isTechnicalMode: false,
    },
    records: [],
  }

  // Case A: The Vault contains no unanswered questions
  const candidateA = `Documented Decisions:
I couldn't find any decision records linked to PEVRA in the records I checked.

Open Questions:
The Vault contains no unanswered questions about PEVRA.

[SOURCES: S1 | BASIS: VAULT_RECORDS]`

  const resultA = validatePublicationEvidence(candidateA, context)
  assert.strictEqual(resultA.isApproved, false, 'Broad claim "Vault contains no unanswered questions" must be rejected')
  assert(resultA.rejectionReasons.some((r) => r.includes('unmodeled or unexamined questions')))

  // Case B: No decisions were made for PEVRA
  const candidateB = `Documented Decisions:
No decisions were made for PEVRA.

[SOURCES: S1 | BASIS: VAULT_RECORDS]`

  const resultB = validatePublicationEvidence(candidateB, context)
  assert.strictEqual(resultB.isApproved, false, 'Claim "No decisions were made" must be rejected')
  assert(resultB.rejectionReasons.some((r) => r.includes('proof that no decisions occurred')))
})

// ----------------------------------------------------------------------------
// Test 9: Acceptance of Appropriately Scoped Uncertainty Statements
// ----------------------------------------------------------------------------
test('9. Validator approves properly scoped statements regarding questions and decisions', () => {
  const context: PublicationEvidenceValidationContext = {
    isTechnicalMode: false,
    policy: {
      intent: 'DECISION_GAP_ANALYSIS',
      evaluatedDomains: ['project', 'decision', 'task', 'meeting'],
      unevaluatedDomains: ['research', 'crm'],
      domainPermissions: {
        project: { domain: 'project', evaluated: true, status: 'AVAILABLE', globalAbsenceAuthorized: false, allowedNegativeClaimType: 'NONE' },
        decision: { domain: 'decision', evaluated: true, status: 'LIMITED_EMPTY', globalAbsenceAuthorized: false, allowedNegativeClaimType: 'BOUNDED_ONLY' },
        task: { domain: 'task', evaluated: true, status: 'AVAILABLE', globalAbsenceAuthorized: false, allowedNegativeClaimType: 'NONE' },
        meeting: { domain: 'meeting', evaluated: true, status: 'LIMITED_EMPTY', globalAbsenceAuthorized: false, allowedNegativeClaimType: 'BOUNDED_ONLY' },
        crm: { domain: 'crm', evaluated: false, status: 'UNEVALUATED', globalAbsenceAuthorized: false, allowedNegativeClaimType: 'NONE' },
        review: { domain: 'review', evaluated: false, status: 'UNEVALUATED', globalAbsenceAuthorized: false, allowedNegativeClaimType: 'NONE' },
        metric: { domain: 'metric', evaluated: false, status: 'UNEVALUATED', globalAbsenceAuthorized: false, allowedNegativeClaimType: 'NONE' },
        evidence: { domain: 'evidence', evaluated: false, status: 'UNEVALUATED', globalAbsenceAuthorized: false, allowedNegativeClaimType: 'NONE' },
        research: { domain: 'research', evaluated: false, status: 'UNEVALUATED', globalAbsenceAuthorized: false, allowedNegativeClaimType: 'NONE' },
        activity: { domain: 'activity', evaluated: false, status: 'UNEVALUATED', globalAbsenceAuthorized: false, allowedNegativeClaimType: 'NONE' },
      },
      knownNullFields: [],
      directFactualCounts: {},
      unmodeledConceptsAllowedAsFact: false,
      summaryMayStrengthen: false,
      isTechnicalMode: false,
    },
    records: [
      {
        entityType: 'project',
        entityId: 'proj-pevra',
        title: 'PEVRA',
        timestamps: {},
        epistemicClass: 'WV_RECORD',
        fields: { status: 'active', description: 'Telecom on Polygon' },
        provenance: { table: 'workspace_projects', id: 'proj-pevra', workspace_id: 'ws-1' },
      },
    ],
  }

  const validAnswer = `Documented Decisions:
I couldn't find any decision records linked to PEVRA in the records I checked.

Open Questions:
I did not find explicitly documented open questions in the records examined.

Possible Decision Gaps:
Because PEVRA's scope involves smart contracts on Polygon, key technical decisions such as smart contract auditor selection and deployment timelines may need to be confirmed.

What Cannot Be Verified:
Research and CRM records were not checked for this query. Whether decisions occurred outside the Vault cannot be verified from the records examined.

[SOURCES: S1 | BASIS: VAULT_RECORDS]`

  const result = validatePublicationEvidence(validAnswer, context)
  assert.strictEqual(result.isApproved, true, 'Properly scoped answer must be approved')
  assert.strictEqual(result.violations.length, 0)
})

// ----------------------------------------------------------------------------
// Test 10: Retrieval Limits, Unavailable Domains, and Safe Fallback Behavior
// ----------------------------------------------------------------------------
test('10. Safe handling of unavailable required domains and adherence to query limits', () => {
  const plan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'DECISION_GAP_ANALYSIS',
    reasoningMode: 'GAP_ANALYSIS',
    entityTarget: { name: 'PEVRA', domain: 'project' },
    domainRequests: [
      { domain: 'project', importance: 'REQUIRED', queryMode: 'targeted', entityTarget: 'PEVRA', limit: 10 },
      { domain: 'decision', importance: 'REQUIRED', queryMode: 'targeted', entityTarget: 'PEVRA', limit: 25 },
    ],
    requiresPreparation: true,
  }

  // Decision domain failed with an error
  const outcomes: DomainOutcome[] = [
    {
      domain: 'project',
      importance: 'REQUIRED',
      status: 'AVAILABLE',
      returnedCount: 1,
      records: [
        {
          entityType: 'project',
          entityId: 'p1',
          title: 'PEVRA',
          timestamps: {},
          epistemicClass: 'WV_RECORD',
          fields: {},
          provenance: { table: 'workspace_projects', id: 'p1', workspace_id: 'ws-1' },
        },
      ],
    },
    {
      domain: 'decision',
      importance: 'REQUIRED',
      status: 'UNAVAILABLE',
      returnedCount: 0,
      records: [],
      error: 'Database connection timeout',
    },
  ]

  const prepared = prepareReasoningContext(plan, outcomes, 80, new Date())
  assert.strictEqual(prepared.requiredDomainUnavailable, true, 'Required domain failure must mark requiredDomainUnavailable')
  assert(prepared.unavailableDomains.includes('decision'))

  const serialized = serializePreparedContextForPrompt(prepared, {
    retrievalQuery: 'decision:PEVRA',
    resolvedScope: { workspaceId: 'ws-1', domains: ['project', 'decision'] },
    resolvedEntities: [],
    records: prepared.domainOutcomes.flatMap((o) => o.records),
    ambiguities: [],
    emptyStates: [],
    completeness: [],
    truncated: false,
    retrievalTimestamp: new Date().toISOString(),
    provenance: { recordCount: 1, domainsQueried: ['project', 'decision'], latencyMs: 80 },
  })

  assert(
    serialized.includes('<unmet_requirement>One or more required domains could not be retrieved'),
    'Prompt must inform model of unmet requirement'
  )
})
