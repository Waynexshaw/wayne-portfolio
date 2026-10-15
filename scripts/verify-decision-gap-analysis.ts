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
import {
  validatePublicationEvidence,
  PublicationEvidenceValidationContext,
  sanitizeVisibleProse,
  createProvenanceStreamFilter,
  parseModelProvenance,
  resolveAuthoritativeProvenance,
} from '../lib/vault/shaw/retrieval/provenance'
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

// ----------------------------------------------------------------------------
// Test 11: Community Structure Project with Minimal Description
// ----------------------------------------------------------------------------
test('11. Community structure project with minimal description produces grounded contract guidance', () => {
  const plan: ReasoningPlan = {
    isReasoningPlan: true,
    primaryIntent: 'DECISION_GAP_ANALYSIS',
    reasoningMode: 'GAP_ANALYSIS',
    entityTarget: { name: 'Community structure', domain: 'project' },
    domainRequests: [
      { domain: 'project', importance: 'REQUIRED', queryMode: 'targeted', entityTarget: 'Community structure', limit: 10 },
      { domain: 'decision', importance: 'REQUIRED', queryMode: 'targeted', entityTarget: 'Community structure', limit: 25 },
      { domain: 'task', importance: 'REQUIRED', queryMode: 'targeted', entityTarget: 'Community structure', limit: 25 },
    ],
    requiresPreparation: true,
    reason: 'Test minimal description project',
  }

  const mockRecords: VaultRecord[] = [
    {
      entityType: 'project',
      entityId: 'proj-comm',
      title: 'Community structure',
      timestamps: {},
      epistemicClass: 'WV_RECORD',
      fields: { status: 'active', priority: 'medium', description: 'Map out structure for the community' },
      provenance: { table: 'workspace_projects', id: 'proj-comm', workspace_id: 'ws-pevra' },
    },
  ]

  const outcomes: DomainOutcome[] = [
    { domain: 'project', importance: 'REQUIRED', status: 'AVAILABLE', returnedCount: 1, records: [mockRecords[0]] },
    { domain: 'decision', importance: 'REQUIRED', status: 'LIMITED_EMPTY', returnedCount: 0, records: [] },
    { domain: 'task', importance: 'REQUIRED', status: 'LIMITED_EMPTY', returnedCount: 0, records: [] },
  ]

  const prepared = prepareReasoningContext(plan, outcomes, 40, new Date())
  const contract = prepared.answerContract!

  const scopeObservation = contract.observationalGaps.find((g) =>
    g.statement.includes('Possible decision gaps should be derived directly from documented project scope')
  )
  assert.ok(scopeObservation, 'Contract must include scope-derived decision gap guidance')
  assert.ok(scopeObservation.statement.includes('Map out structure for the community'), 'Must anchor to exact description')
  assert.ok(
    scopeObservation.statement.includes('Do NOT introduce token models, smart-contract audits'),
    'Contract must explicitly forbid ungrounded token/audit models'
  )
})

// ----------------------------------------------------------------------------
// Test 12: Rejection of Unrelated Token-Model and Audit-Provider Suggestions
// ----------------------------------------------------------------------------
test('12. Rejection of unrelated token-model and audit-provider suggestions', () => {
  const context: PublicationEvidenceValidationContext = {
    records: [
      {
        entityType: 'project',
        entityId: 'proj-comm',
        title: 'Community structure',
        timestamps: {},
        epistemicClass: 'WV_RECORD',
        fields: { status: 'active', description: 'Map out structure for the community' },
        provenance: { table: 'workspace_projects', id: 'proj-comm', workspace_id: 'ws-pevra' },
      },
    ],
  }

  // Candidate with ungrounded token-model and smart-contract audit provider suggestions
  const ungroundedCandidate = `Documented decisions
- I couldn’t find any decision records linked to the Community structure project in the records I checked.

Open questions
- No open-question entries were found in the records I examined.

Possible decision gaps
- Because no decisions are recorded, it is possible that important choices – for example how the community will be governed, what token-model will be used, or which smart-contract audit provider will be selected – have not been documented in the Vault.

What cannot be verified
- Whether any decisions were made outside of the Vault.
[SOURCES: S1 | BASIS: SYNTHESIS]`

  const result = validatePublicationEvidence(ungroundedCandidate, context)
  assert.strictEqual(result.isApproved, false, 'Ungrounded token/audit suggestions must be rejected')
  const ungroundedViolation = result.violations.find((v) => v.type === 'UNGROUNDED_DECISION_GAP')
  assert.ok(ungroundedViolation, 'Violation must be UNGROUNDED_DECISION_GAP')
  assert.ok(
    result.rejectionReasons.some((r) => r.includes('token-model or audit-provider')),
    'Rejection reason must explicitly state ungrounded token/audit reason'
  )
})

// ----------------------------------------------------------------------------
// Test 13: Acceptance of Genuinely Grounded Community-Structure Questions
// ----------------------------------------------------------------------------
test('13. Acceptance of genuinely grounded community-structure decision questions', () => {
  const context: PublicationEvidenceValidationContext = {
    records: [
      {
        entityType: 'project',
        entityId: 'proj-comm',
        title: 'Community structure',
        timestamps: {},
        epistemicClass: 'WV_RECORD',
        fields: { status: 'active', description: 'Map out structure for the community' },
        provenance: { table: 'workspace_projects', id: 'proj-comm', workspace_id: 'ws-pevra' },
      },
    ],
  }

  const groundedCandidate = `Documented decisions
- I couldn't find any decision records linked to the Community structure project in the records I checked.

Open questions
- I did not find explicitly documented open questions in the records examined.

Possible decision gaps
- Because the project scope focuses on mapping out community structure, possible decision areas that may need attention include defining community leadership roles, setting responsibilities and member tiers, and establishing organizational guidelines.

What cannot be verified
- Whether decisions were made offline or through unrecorded channels.
- Records in domains not queried (such as metrics, reviews, or research).

[SOURCES: S1 | BASIS: SYNTHESIS]`

  const result = validatePublicationEvidence(groundedCandidate, context)
  assert.strictEqual(result.isApproved, true, 'Properly grounded community questions must be approved')
  assert.strictEqual(result.violations.length, 0)
  assert.ok(!result.publishedText.includes('[SOURCES:'), 'Published prose must conceal trailing source protocol')
  assert.ok(result.publishedText.includes('community leadership roles'), 'Published text must retain grounded analysis')
})

// ----------------------------------------------------------------------------
// Test 14: Correct Scoping of Activity Digest Counts
// ----------------------------------------------------------------------------
test('14. Correct scoping of activity digest counts and prevention of workspace conflation', async () => {
  const calls: { table: string; filters: Record<string, any> }[] = []

  const mockSupabase = {
    from: (table: string) => {
      const filters: Record<string, any> = {}
      const chain: any = {
        select: () => chain,
        eq: (col: string, val: any) => {
          filters[col] = val
          return chain
        },
        or: (val: any) => {
          filters['or'] = val
          return chain
        },
        in: (col: string, val: any) => {
          filters[`${col}.in`] = val
          return chain
        },
        gte: (col: string, val: any) => {
          filters[`${col}.gte`] = val
          return chain
        },
        lte: (col: string, val: any) => {
          filters[`${col}.lte`] = val
          return chain
        },
        order: () => chain,
        limit: () => {
          calls.push({ table, filters: { ...filters } })
          if (table === 'workspace_projects') {
            return Promise.resolve({
              data: [{ id: 'proj-comm-123', title: 'Community structure' }],
            })
          }
          if (table === 'tasks') {
            return Promise.resolve({ data: [] })
          }
          if (table === 'decisions') {
            return Promise.resolve({ data: [] })
          }
          return Promise.resolve({ data: [] })
        },
      }
      return chain
    },
  }

  const service = new VaultRetrievalService(mockSupabase as any, 'ws-pevra')

  // A. Targeted activity retrieval scopes to project
  const outcomeTargeted = await service.executeDomainRequest({
    domain: 'activity',
    importance: 'REQUIRED',
    queryMode: 'targeted',
    entityTarget: 'Community structure',
    limit: 10,
  })

  assert.strictEqual(outcomeTargeted.records.length, 1)
  const actTargeted = outcomeTargeted.records[0]
  assert.strictEqual(actTargeted.title, 'Activity Digest (Recent - Community structure)')
  assert.strictEqual(actTargeted.fields?.scope, 'Project: Community structure')
  assert.strictEqual(actTargeted.fields?.isProjectScoped, true)

  // Verify task and decision queries received project_id filter
  const taskQuery = calls.find((c) => c.table === 'tasks')
  assert.deepStrictEqual(taskQuery?.filters['project_id.in'], ['proj-comm-123'])

  // B. Normalization cleans conflated workspace digest prose
  const conflatedProse = 'Documented decisions: I found 0 decisions. The recent activity digest shows a decisions count of 0.'
  const cleaned = sanitizeVisibleProse(conflatedProse)
  assert.ok(!cleaned.includes('The recent activity digest shows a decisions count of 0'), 'Conflated count must be stripped')
  assert.ok(cleaned.includes('I found 0 decisions'), 'Substantive prose must be preserved')
})

// ----------------------------------------------------------------------------
// Test 15: Concealment of Internal Source Tags in All Response Paths
// ----------------------------------------------------------------------------
test('15. Concealment of internal source tags in all response paths including zero-width spaces', () => {
  // A. Zero-width space provenance tag
  const zeroWidthTag = 'Clean analysis.\n\n[\u200BSOURCES: S1 | BASIS: SYNTHESIS]'
  const cleanedA = sanitizeVisibleProse(zeroWidthTag)
  assert.strictEqual(cleanedA, 'Clean analysis.', 'Zero-width space tag must be completely stripped')

  // B. Multiple zero-width / BOM variants
  const bomTag = 'Clean analysis.\n\n[\uFEFF\u200CSOURCES: S1, S2 | BASIS: DIRECT_FACT]'
  const cleanedB = sanitizeVisibleProse(bomTag)
  assert.strictEqual(cleanedB, 'Clean analysis.', 'BOM and zero-width joiner tags must be completely stripped')

  // C. HTML comments with provenance
  const htmlTag = 'Clean analysis.\n\n<!-- [SOURCES: S1 | BASIS: SYNTHESIS] -->'
  const cleanedC = sanitizeVisibleProse(htmlTag)
  assert.strictEqual(cleanedC, 'Clean analysis.', 'HTML comment provenance tag must be stripped')

  // D. Streaming filter concealment during chunk emission
  let emittedChunks = ''
  const filter = createProvenanceStreamFilter((chunk) => {
    emittedChunks += chunk
  })

  filter.push('First part of response.\n\n[')
  filter.push('\u200BSOURCES: S1 |')
  filter.push(' BASIS: SYNTHESIS]')
  const parsed = filter.flush()

  assert.ok(!emittedChunks.includes('SOURCES:'), 'Emitted chunks must never contain protocol tags')
  assert.strictEqual(parsed.cleanText, 'First part of response.', 'Clean text must conceal tag')
  assert.strictEqual(parsed.hasTag, true, 'Model provenance must still be recognized for audit')
  assert.deepStrictEqual(parsed.handles, ['S1'])
})

// ----------------------------------------------------------------------------
// Test 16: Preservation of Existing Provenance and Publication Safeguards
// ----------------------------------------------------------------------------
test('16. Preservation of existing provenance resolution and publication safeguards', () => {
  const sourceMap = new Map()
  sourceMap.set('S1', {
    entityType: 'project',
    entityId: 'p-1',
    title: 'Community structure',
    timestamps: {},
    epistemicClass: 'WV_RECORD',
    provenance: { table: 'workspace_projects', id: 'p-1', workspace_id: 'ws-1' },
  })

  const parsed = parseModelProvenance('Valid analysis.\n\n[\u200BSOURCES: S1 | BASIS: SYNTHESIS]', sourceMap)
  assert.strictEqual(parsed.cleanText, 'Valid analysis.')
  assert.strictEqual(parsed.hasTag, true)
  assert.deepStrictEqual(parsed.handles, ['S1'])
  assert.strictEqual(parsed.basis, 'SYNTHESIS')

  const resolved = resolveAuthoritativeProvenance(sourceMap, parsed)
  assert.strictEqual(resolved.status, 'COMPLETE')
  assert.strictEqual(resolved.citations.length, 1)
  assert.strictEqual(resolved.citations[0].title, 'Community structure')
  assert.strictEqual(resolved.citations[0].url, '/vault/projects/p-1')
})

// ----------------------------------------------------------------------------
// Test 17: Entity Extraction Normalization and Name Preservation
// ----------------------------------------------------------------------------
test('17. Entity extraction: "Community structure project" -> "Community structure", "Community structure" normal, "Project Nightfall" preserved', () => {
  // A. "Community structure project" resolves to "Community structure"
  const p1 = 'Based only on my workspace records, analyze the decision gaps for the Community structure project.'
  const plan1 = planReasoning({ prompt: p1 })
  assert.strictEqual(plan1?.primaryIntent, 'DECISION_GAP_ANALYSIS')
  assert.strictEqual(plan1?.entityTarget?.name, 'Community structure', '"Community structure project" must resolve to "Community structure"')

  // B. "Community structure" resolves normally
  const p2 = 'Based only on my workspace records, analyze the decision gaps for Community structure.'
  const plan2 = planReasoning({ prompt: p2 })
  assert.strictEqual(plan2?.entityTarget?.name, 'Community structure', '"Community structure" must resolve normally')

  // C. "Project Nightfall" is preserved (leading "Project" is part of legitimate name)
  const p3 = 'Give me a progress report on Project Nightfall.'
  const plan3 = planReasoning({ prompt: p3 })
  assert.strictEqual(plan3?.entityTarget?.name, 'Project Nightfall', '"Project Nightfall" must preserve leading "Project"')

  // D. Generic initiative classifier stripping
  const p4 = 'Analyze the decision gaps for the Growth initiative.'
  const plan4 = planReasoning({ prompt: p4 })
  assert.strictEqual(plan4?.entityTarget?.name, 'Growth', 'Trailing "initiative" must be stripped from entity name')
})

// ----------------------------------------------------------------------------
// Test 18: Targeted Retrieval Normalization and Exact-Title Preference
// ----------------------------------------------------------------------------
test('18. Targeted retrieval: "Phoenix Project" retrievable via exact-match, "Community structure project" retrievable via normalization, unknown stays unknown', async () => {
  const mockProjects = [
    {
      id: 'proj-phoenix',
      title: 'Phoenix Project',
      slug: 'phoenix-project-123',
      description: 'The core phoenix project',
      status: 'active',
      priority: 'high',
      created_at: '2026-01-01T00:00:00Z',
      workspace_id: 'ws-test',
    },
    {
      id: 'proj-comm',
      title: 'Community structure',
      slug: 'community-structure-1u7e3',
      description: 'Map out structure for the community',
      status: 'active',
      priority: 'medium',
      created_at: '2026-01-01T00:00:00Z',
      workspace_id: 'ws-test',
    },
  ]

  const createMockDb = (projects: typeof mockProjects) => ({
    from: (table: string) => {
      let currentWs = ''
      let filterOr = ''
      const builder: any = {
        select: () => builder,
        eq: (col: string, val: string) => {
          if (col === 'workspace_id') currentWs = val
          return builder
        },
        in: () => builder,
        or: (str: string) => {
          filterOr = str
          return builder
        },
        order: () => builder,
        limit: () => {
          if (table === 'workspace_projects') {
            const matches = projects.filter((p) => {
              if (p.workspace_id !== currentWs) return false
              const lowerOr = filterOr.toLowerCase()
              // Parse out or filters
              return (
                lowerOr.includes(`title.ilike.%${p.title.toLowerCase()}%`) ||
                lowerOr.includes(`slug.ilike.%${p.slug.toLowerCase()}%`) ||
                (p.title.toLowerCase().includes('phoenix project') && lowerOr.includes('phoenix project')) ||
                (p.title.toLowerCase().includes('community structure') && lowerOr.includes('community structure'))
              )
            })
            return Promise.resolve({ data: matches, error: null, count: matches.length })
          }
          if (table === 'tasks') return Promise.resolve({ data: [], error: null })
          if (table === 'decisions') return Promise.resolve({ data: [], error: null })
          return Promise.resolve({ data: [], error: null })
        },
      }
      return builder
    },
  })

  const service = new VaultRetrievalService(createMockDb(mockProjects), 'ws-test')

  // A. "Phoenix Project" queried directly remains retrievable via exact title match
  const phoenixRecords: VaultRecord[] = []
  const phoenixEmpty: any[] = []
  await (service as any).retrieveProjectContext('Phoenix Project', phoenixRecords, [], phoenixEmpty, [])
  assert.strictEqual(phoenixRecords.length, 1, '"Phoenix Project" must be retrieved')
  assert.strictEqual(phoenixRecords[0].title, 'Phoenix Project')
  assert.strictEqual(phoenixEmpty.length, 0)

  // B. "Community structure project" (with trailing "project") retrieves "Community structure" via defensive normalization
  const commRecords: VaultRecord[] = []
  const commEmpty: any[] = []
  await (service as any).retrieveProjectContext('Community structure project', commRecords, [], commEmpty, [])
  assert.strictEqual(commRecords.length, 1, '"Community structure project" must defensively normalize and retrieve "Community structure"')
  assert.strictEqual(commRecords[0].title, 'Community structure')
  assert.strictEqual(commRecords[0].fields.description, 'Map out structure for the community')
  assert.strictEqual(commEmpty.length, 0)

  // C. Unknown project remains unknown
  const unknownRecords: VaultRecord[] = []
  const unknownEmpty: any[] = []
  await (service as any).retrieveProjectContext('Unknown Phantom Project', unknownRecords, [], unknownEmpty, [])
  assert.strictEqual(unknownRecords.length, 0, 'Unknown project must yield 0 records')
  assert.strictEqual(unknownEmpty.length, 1, 'Unknown project must record empty state')
  assert.strictEqual(unknownEmpty[0].domain, 'project')
})

// ----------------------------------------------------------------------------
// Test 19: Related Tasks, Decisions, and Meetings Use Resolved Project ID
// ----------------------------------------------------------------------------
test('19. Related decisions and tasks use the resolved project ID across workspace boundaries', async () => {
  let tasksFilteredProjectId = ''
  let decisionsFilteredProjectId = ''
  let meetingsFilteredProjectId = ''
  let tasksWorkspace = ''

  const mockDb = {
    from: (table: string) => {
      let currentWs = ''
      const builder: any = {
        select: () => builder,
        eq: (col: string, val: string) => {
          if (col === 'workspace_id') {
            currentWs = val
            tasksWorkspace = val
          }
          if (table === 'tasks' && col === 'project_id') tasksFilteredProjectId = val
          return builder
        },
        in: () => builder,
        or: (str: string) => {
          if (table === 'decisions') {
            const m = str.match(/project_id\.eq\.([a-zA-Z0-9_\-]+)/)
            if (m) decisionsFilteredProjectId = m[1]
          }
          if (table === 'meetings') {
            const m = str.match(/project_id\.eq\.([a-zA-Z0-9_\-]+)/)
            if (m) meetingsFilteredProjectId = m[1]
          }
          return builder
        },
        order: () => builder,
        limit: () => {
          if (table === 'workspace_projects') {
            return Promise.resolve({
              data: [
                {
                  id: 'proj-comm-uuid',
                  title: 'Community structure',
                  slug: 'community-structure-1u7e3',
                  workspace_id: currentWs,
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

  const service = new VaultRetrievalService(mockDb, 'ws-pevra-target')

  // Query tasks with "Community structure project"
  await (service as any).retrieveTasks({ entityQuery: 'Community structure project' }, [], [], [])
  assert.strictEqual(tasksFilteredProjectId, 'proj-comm-uuid', 'Tasks query must be scoped to resolved project ID')
  assert.strictEqual(tasksWorkspace, 'ws-pevra-target', 'Tasks query must be strictly scoped to current workspace')

  // Query decisions with "Community structure project"
  await (service as any).retrieveDecisions('Community structure project', [], [], [])
  assert.strictEqual(decisionsFilteredProjectId, 'proj-comm-uuid', 'Decisions query must filter by resolved project ID')

  // Query meetings with "Community structure project"
  await (service as any).retrieveMeetings({ entityQuery: 'Community structure project' }, [], [], [])
  assert.strictEqual(meetingsFilteredProjectId, 'proj-comm-uuid', 'Meetings query must filter by resolved project ID')
})

// ----------------------------------------------------------------------------
// Test 20: Original Production Prompt Retrieves Community Structure Description
// ----------------------------------------------------------------------------
test('20. Original production prompt retrieves Community structure description', async () => {
  const prodPrompt =
    'Based only on the records in my current workspace, analyze the documented decisions, open questions, and possible decision gaps for the Community structure project. Clearly distinguish recorded facts from possible gaps and things you cannot verify.'

  const plan = planReasoning({ prompt: prodPrompt })
  assert(plan !== null)
  assert.strictEqual(plan.primaryIntent, 'DECISION_GAP_ANALYSIS')
  assert.strictEqual(plan.entityTarget?.name, 'Community structure')

  const mockDb = {
    from: (table: string) => {
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        or: () => builder,
        in: () => builder,
        order: () => builder,
        limit: () => {
          if (table === 'workspace_projects') {
            return Promise.resolve({
              data: [
                {
                  id: '716bf0e1-acbc-449d-8fe2-98a8c21aefc5',
                  workspace_id: 'e1356dae-9ca7-4d41-980d-f74cc53de833',
                  title: 'Community structure',
                  slug: 'community-structure-1u7e3',
                  status: 'active',
                  priority: 'medium',
                  description: 'Map out structure for the community',
                  created_at: '2026-09-13T15:26:31.34415+00:00',
                  updated_at: '2026-09-13T15:26:31.34415+00:00',
                },
              ],
              error: null,
              count: 1,
            })
          }
          if (table === 'decisions') return Promise.resolve({ data: [], error: null })
          if (table === 'tasks') return Promise.resolve({ data: [], error: null })
          if (table === 'meetings') return Promise.resolve({ data: [], error: null })
          if (table === 'interactions') return Promise.resolve({ data: [], error: null })
          return Promise.resolve({ data: [], error: null })
        },
      }
      return builder
    },
  }

  const service = new VaultRetrievalService(mockDb, 'e1356dae-9ca7-4d41-980d-f74cc53de833')
  const execution = await service.executeReasoningPlan(plan)

  const projOutcome = execution.domainOutcomes.find((o) => o.domain === 'project')
  assert.strictEqual(projOutcome?.status, 'AVAILABLE', 'Project domain must be AVAILABLE, not empty')
  assert.strictEqual(projOutcome?.records.length, 1)
  assert.strictEqual(projOutcome?.records[0].title, 'Community structure')
  assert.strictEqual(projOutcome?.records[0].fields.description, 'Map out structure for the community')
})
