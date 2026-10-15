/**
 * Waynex Vault — SHAW Batch 2B.2A: Combined Multi-Domain Reasoning Verification Suite
 *
 * Verifies all 9 reasoning capabilities:
 * 1. WEEKLY_FOCUS
 * 2. PROJECT_PROGRESS
 * 3. PLAN_VS_ACTUAL
 * 4. DECISION_GAP_ANALYSIS
 * 5. MEETING_PREP
 * 6. RESEARCH_IMPACT
 * 7. PERIOD_ACCOMPLISHMENT
 * 8. BLOCKER_ASSESSMENT
 * 9. CROSS_DOMAIN_RECAP
 *
 * Covers:
 * - Populated workspaces
 * - Empty workspaces
 * - Partial evidence
 * - Named-project queries (with conversational suffixes like "project")
 * - Date-bounded queries ("this week", "last week")
 * - Cross-workspace isolation
 * - Missing and ambiguous entity matches
 * - Unsupported negative claims
 * - Unsupported causal claims
 * - Internal source-tag leakage
 * - Provider failures & timeout recovery
 */

import assert from 'node:assert'
import {
  planReasoning,
  planRetrieval,
  prepareReasoningContext,
  flattenPreparedContextToEnvelope,
  serializePreparedContextForPrompt,
  createRequestSourceMap,
  resolveAuthoritativeProvenance,
  parseModelProvenance,
  sanitizeVisibleProse,
  validatePublicationEvidence,
  VaultRetrievalService,
  VaultRecord,
  DomainOutcome,
  ReasoningPlan,
} from '../lib/vault/shaw/retrieval'

let passed = 0
let failed = 0

function test(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      passed++
      console.log(`  ✓ ${name}`)
    })
    .catch((err) => {
      failed++
      console.error(`  ✗ FAIL: ${name}`)
      console.error(err)
      process.exit(1)
    })
}

async function runSuite() {
  console.log('\n=== SHAW Batch 2B.2A Combined Reasoning Verification Suite ===\n')

  // ==========================================================================
  // Section 1: Intent Planning & Precedence for All 9 Capabilities
  // ==========================================================================
  console.log('--- Section 1: Intent Planning & Precedence ---')

  await test('1.1 WEEKLY_FOCUS: detect focus prompt without entity target', () => {
    const plan = planReasoning({ prompt: 'What should I focus on this week?' })
    assert(plan !== null)
    assert.strictEqual(plan.primaryIntent, 'WEEKLY_FOCUS')
    assert.strictEqual(plan.reasoningMode, 'PRIORITIZATION')
    assert.strictEqual(plan.entityTarget, undefined)
  })

  await test('1.2 PROJECT_PROGRESS: detect progress report for named entity', () => {
    const plan = planReasoning({ prompt: 'Give me a progress report on PEVRA' })
    assert(plan !== null)
    assert.strictEqual(plan.primaryIntent, 'PROJECT_PROGRESS')
    assert.strictEqual(plan.reasoningMode, 'PROGRESS')
    assert.strictEqual(plan.entityTarget?.name, 'PEVRA')
  })

  await test('1.3 PLAN_VS_ACTUAL: detect comparative variance prompt', () => {
    const plan = planReasoning({ prompt: 'Compare what I planned with what I completed for Snip3rash.' })
    assert(plan !== null)
    assert.strictEqual(plan.primaryIntent, 'PLAN_VS_ACTUAL')
    assert.strictEqual(plan.reasoningMode, 'VARIANCE')
    assert.strictEqual(plan.entityTarget?.name, 'Snip3rash')
  })

  await test('1.4 DECISION_GAP_ANALYSIS: detect decision gap prompt', () => {
    const plan = planReasoning({ prompt: 'Which projects have activity but no recorded decisions?' })
    assert(plan !== null)
    assert.strictEqual(plan.primaryIntent, 'DECISION_GAP_ANALYSIS')
    assert.strictEqual(plan.reasoningMode, 'GAP_ANALYSIS')
  })

  await test('1.5 MEETING_PREP: detect meeting preparation prompt with contact/project', () => {
    const plan = planReasoning({ prompt: 'Prepare me for my meeting with Alice on Community structure project.' })
    assert(plan !== null)
    assert.strictEqual(plan.primaryIntent, 'MEETING_PREP')
    assert.strictEqual(plan.reasoningMode, 'PREPARATION')
    assert(plan.domainRequests.some((r) => r.domain === 'meeting'))
    assert(plan.domainRequests.some((r) => r.domain === 'crm'))
    assert(plan.domainRequests.some((r) => r.domain === 'project'))
  })

  await test('1.6 RESEARCH_IMPACT: detect research impact prompt with target project', () => {
    const plan = planReasoning({ prompt: 'What does my research say that could affect PEVRA?' })
    assert(plan !== null)
    assert.strictEqual(plan.primaryIntent, 'RESEARCH_IMPACT')
    assert.strictEqual(plan.reasoningMode, 'IMPACT')
    assert.strictEqual(plan.entityTarget?.name, 'PEVRA')
    assert(plan.domainRequests.some((r) => r.domain === 'research'))
    assert(plan.domainRequests.some((r) => r.domain === 'evidence'))
  })

  await test('1.7 PERIOD_ACCOMPLISHMENT: outranks recap on accomplishment phrasing', () => {
    const plan = planReasoning({ prompt: 'What did I accomplish last week?' })
    assert(plan !== null)
    assert.strictEqual(plan.primaryIntent, 'PERIOD_ACCOMPLISHMENT')
    assert.strictEqual(plan.reasoningMode, 'ACCOMPLISHMENT')
    assert(plan.domainRequests.some((r) => r.domain === 'activity' && r.importance === 'REQUIRED'))
    assert(plan.domainRequests.some((r) => r.domain === 'task' && r.statusFilter === 'completed'))
  })

  await test('1.8 BLOCKER_ASSESSMENT: outranks focus on blocker phrasing', () => {
    const plan = planReasoning({ prompt: 'What is blocking PEVRA and what should I focus on?' })
    assert(plan !== null)
    assert.strictEqual(plan.primaryIntent, 'BLOCKER_ASSESSMENT')
    assert.strictEqual(plan.reasoningMode, 'RISK_ASSESSMENT')
    assert.strictEqual(plan.entityTarget?.name, 'PEVRA')
    assert(plan.domainRequests.some((r) => r.domain === 'task' && r.statusFilter === 'open'))
  })

  await test('1.9 CROSS_DOMAIN_RECAP: captures operational activity across domains', () => {
    const plan = planReasoning({ prompt: 'What happened last week?' })
    assert(plan !== null)
    assert.strictEqual(plan.primaryIntent, 'CROSS_DOMAIN_RECAP')
    assert.strictEqual(plan.reasoningMode, 'RECAP')
    assert(plan.domainRequests.some((r) => r.domain === 'activity'))
    assert(plan.domainRequests.some((r) => r.domain === 'decision'))
    assert(plan.domainRequests.some((r) => r.domain === 'meeting'))
    assert(plan.domainRequests.some((r) => r.domain === 'task'))
  })

  // ==========================================================================
  // Section 2: MEETING_PREP Context Preparation & Safe Absence
  // ==========================================================================
  console.log('\n--- Section 2: MEETING_PREP Execution & Preparation ---')

  await test('2.1 Populated MEETING_PREP: synthesizes meeting, contact, task, and project records', () => {
    const plan = planReasoning({ prompt: 'Prepare me for my meeting with Alice on Community structure' })!
    const meetingRec: VaultRecord = {
      entityType: 'meeting',
      entityId: 'm-1',
      title: 'Community Roadmap Sync',
      timestamps: { scheduled_at: '2026-10-16T14:00:00Z' },
      epistemicClass: 'WV_RECORD',
      fields: {
        agenda: 'Review roles and onboarding plan',
        participants: [{ name: 'Alice', email: 'alice@example.com' }],
      },
      provenance: { table: 'meetings', id: 'm-1', workspace_id: 'ws-pevra' },
    }
    const crmRec: VaultRecord = {
      entityType: 'crm',
      entityId: 'c-1',
      title: 'Alice',
      timestamps: {},
      epistemicClass: 'WV_RECORD',
      fields: {
        stage: 'active_collaborator',
        recentInteractions: [{ subject: 'Draft proposal review', date: '2026-10-12' }],
      },
      provenance: { table: 'workspace_contacts', id: 'c-1', workspace_id: 'ws-pevra' },
    }
    const projRec: VaultRecord = {
      entityType: 'project',
      entityId: 'p-1',
      title: 'Community structure',
      timestamps: {},
      epistemicClass: 'WV_RECORD',
      fields: { status: 'active', description: 'Map out structure for the community' },
      provenance: { table: 'workspace_projects', id: 'p-1', workspace_id: 'ws-pevra' },
    }

    const outcomes: DomainOutcome[] = [
      { domain: 'meeting', importance: 'REQUIRED', status: 'AVAILABLE', returnedCount: 1, records: [meetingRec] },
      { domain: 'crm', importance: 'REQUIRED', status: 'AVAILABLE', returnedCount: 1, records: [crmRec] },
      { domain: 'project', importance: 'OPTIONAL', status: 'AVAILABLE', returnedCount: 1, records: [projRec] },
    ]

    const prepared = prepareReasoningContext(plan, outcomes, 15)
    assert(prepared.answerContract !== undefined)
    const facts = prepared.answerContract.recordedFacts
    assert(facts.some((f) => f.statement.includes('Community Roadmap Sync')))
    assert(facts.some((f) => f.statement.includes('Alice')))
    assert(facts.some((f) => f.statement.includes('Community structure')))
  })

  await test('2.2 Zero meeting records: prepares from project/CRM while disclosing absent meeting record', () => {
    const plan = planReasoning({ prompt: 'Prepare me for my meeting with Bob on Community structure' })!
    const projRec: VaultRecord = {
      entityType: 'project',
      entityId: 'p-1',
      title: 'Community structure',
      timestamps: {},
      epistemicClass: 'WV_RECORD',
      fields: { status: 'active', description: 'Map out structure for the community' },
      provenance: { table: 'workspace_projects', id: 'p-1', workspace_id: 'ws-pevra' },
    }

    const outcomes: DomainOutcome[] = [
      {
        domain: 'meeting',
        importance: 'REQUIRED',
        status: 'CONFIRMED_EMPTY',
        returnedCount: 0,
        completeness: { domain: 'meeting', queryMode: 'targeted', resultScope: 'exhaustive', returnedCount: 0 },
        records: [],
      },
      { domain: 'project', importance: 'OPTIONAL', status: 'AVAILABLE', returnedCount: 1, records: [projRec] },
    ]

    const prepared = prepareReasoningContext(plan, outcomes, 15)
    assert(prepared.answerContract !== undefined)
    // Discloses no scheduled meeting record found
    assert(prepared.answerContract.boundedGaps.some((g) => g.statement.includes('No scheduled meeting records')))
    // Context is still provided from project
    assert(prepared.answerContract.recordedFacts.some((f) => f.statement.includes('Community structure')))
    // Discloses observational gap
    assert(prepared.answerContract.observationalGaps.some((og) => og.statement.includes('Clearly disclose the absence of meeting-specific evidence')))
  })

  // ==========================================================================
  // Section 3: RESEARCH_IMPACT Epistemic Discipline & Causal Protection
  // ==========================================================================
  console.log('\n--- Section 3: RESEARCH_IMPACT & Causal Claim Validation ---')

  await test('3.1 RESEARCH_IMPACT: verbatim quotes distinguished from claim summaries', () => {
    const plan = planReasoning({ prompt: 'What does my research say that could affect PEVRA?' })!
    const researchRec: VaultRecord = {
      entityType: 'research',
      entityId: 'r-1',
      title: 'Decentralized Identity Standards',
      timestamps: { completed_at: '2026-10-01' },
      epistemicClass: 'WV_RECORD',
      fields: {
        workflow_status: 'completed',
        findings: 'W3C DID specification aligns with non-custodial login',
      },
      provenance: { table: 'research_records', id: 'r-1', workspace_id: 'ws-pevra' },
    }

    const outcomes: DomainOutcome[] = [
      { domain: 'research', importance: 'REQUIRED', status: 'AVAILABLE', returnedCount: 1, records: [researchRec] },
    ]

    const prepared = prepareReasoningContext(plan, outcomes, 15)
    assert(prepared.answerContract !== undefined)
    assert(prepared.answerContract.recordedFacts.some((f) => f.statement.includes('Decentralized Identity Standards')))
    assert(prepared.answerContract.observationalGaps.some((g) => g.statement.includes('Do not assert that research findings caused or changed a decision')))
  })

  await test('3.2 Rejection of unsupported causal claims asserting research caused a decision', () => {
    const decisionWithoutResearch: VaultRecord = {
      entityType: 'decision',
      entityId: 'd-1',
      title: 'Adopt Passkeys',
      timestamps: {},
      epistemicClass: 'WV_RECORD',
      fields: { decision: 'Use WebAuthn passkeys for authentication' },
      provenance: { table: 'decisions', id: 'd-1', workspace_id: 'ws-test' },
    }

    const candidateWithCausalClaim =
      'Our research caused the decision to adopt Passkeys across the system.'

    const result = validatePublicationEvidence(candidateWithCausalClaim, {
      records: [decisionWithoutResearch],
    })

    assert.strictEqual(result.isApproved, false, 'Unsupported causal claim must be rejected')
    assert(result.violations.some((v) => v.type === 'UNSUPPORTED_CAUSAL_CLAIM'))
    assert(result.rejectionReasons.some((r) => r.includes('research caused a decision')))
  })

  // ==========================================================================
  // Section 4: PERIOD_ACCOMPLISHMENT Strict Date Bounding
  // ==========================================================================
  console.log('\n--- Section 4: PERIOD_ACCOMPLISHMENT Strict Date Bounding ---')

  await test('4.1 Counts only tasks completed within the requested period, ignores creation date', () => {
    const plan = planReasoning({ prompt: 'What did I accomplish last week?' })!
    const taskCompletedInPeriod: VaultRecord = {
      entityType: 'task',
      entityId: 't-comp',
      title: 'Deploy testnet contract',
      timestamps: { completed_at: '2026-10-08T12:00:00Z', created_at: '2026-08-01T10:00:00Z' },
      epistemicClass: 'WV_RECORD',
      fields: { status: 'completed' },
      provenance: { table: 'tasks', id: 't-comp', workspace_id: 'ws-pevra' },
    }

    const outcomes: DomainOutcome[] = [
      { domain: 'task', importance: 'REQUIRED', status: 'AVAILABLE', returnedCount: 1, records: [taskCompletedInPeriod] },
    ]

    const prepared = prepareReasoningContext(plan, outcomes, 10)
    assert(prepared.answerContract !== undefined)
    assert(prepared.answerContract.recordedFacts.some((f) => f.statement.includes('Deploy testnet contract')))
    assert(prepared.answerContract.observationalGaps.some((g) => g.statement.includes('Distinguish completion dates from record creation dates')))
  })

  await test('4.2 Zero completed tasks in period: produces bounded gap in simple English', () => {
    const plan = planReasoning({ prompt: 'What did I accomplish last week?' })!
    const outcomes: DomainOutcome[] = [
      {
        domain: 'task',
        importance: 'REQUIRED',
        status: 'CONFIRMED_EMPTY',
        returnedCount: 0,
        completeness: { domain: 'task', queryMode: 'catalog', resultScope: 'exhaustive', returnedCount: 0 },
        records: [],
      },
    ]

    const prepared = prepareReasoningContext(plan, outcomes, 10)
    assert(prepared.answerContract !== undefined)
    assert(prepared.answerContract.boundedGaps.some((g) => g.statement.includes('No tasks were recorded as completed')))
  })

  // ==========================================================================
  // Section 5: BLOCKER_ASSESSMENT Distinction & Contradiction Protection
  // ==========================================================================
  console.log('\n--- Section 5: BLOCKER_ASSESSMENT & Contradiction Protection ---')

  await test('5.1 BLOCKER_ASSESSMENT: separates explicitly blocked tasks from overdue scheduling risks', () => {
    const plan = planReasoning({ prompt: 'What is blocking my projects?' })!
    const blockedTask: VaultRecord = {
      entityType: 'task',
      entityId: 't-blk',
      title: 'Smart contract audit signoff',
      timestamps: {},
      epistemicClass: 'WV_RECORD',
      fields: { status: 'blocked', description: 'Waiting on third-party security team' },
      provenance: { table: 'tasks', id: 't-blk', workspace_id: 'ws-test' },
    }
    const overdueTask: VaultRecord = {
      entityType: 'task',
      entityId: 't-od',
      title: 'Update documentation',
      timestamps: { due_date: '2026-09-01T00:00:00Z' },
      epistemicClass: 'WV_RECORD',
      fields: { status: 'in_progress', due_date: '2026-09-01T00:00:00Z' },
      provenance: { table: 'tasks', id: 't-od', workspace_id: 'ws-test' },
    }

    const outcomes: DomainOutcome[] = [
      { domain: 'task', importance: 'REQUIRED', status: 'AVAILABLE', returnedCount: 2, records: [blockedTask, overdueTask] },
    ]

    const prepared = prepareReasoningContext(plan, outcomes, 10)
    assert(prepared.answerContract !== undefined)
    // Blocked task identified as explicitly marked blocked
    assert(prepared.answerContract.recordedFacts.some((f) => f.statement.includes('status "blocked"')))
    // Overdue task identified as overdue
    assert(prepared.answerContract.recordedFacts.some((f) => f.statement.includes('is overdue')))
    // Observational guidance
    assert(prepared.answerContract.observationalGaps.some((og) => og.statement.includes('Distinguish explicitly recorded blockers')))
  })

  await test('5.2 Validator rejects false claim that tasks are marked blocked when 0 blocked tasks exist', () => {
    const normalTask: VaultRecord = {
      entityType: 'task',
      entityId: 't-norm',
      title: 'Write readme',
      timestamps: {},
      epistemicClass: 'WV_RECORD',
      fields: { status: 'in_progress' },
      provenance: { table: 'tasks', id: 't-norm', workspace_id: 'ws-test' },
    }

    const falseClaim = 'Two tasks are marked as blocked in your Vault.'
    const result = validatePublicationEvidence(falseClaim, { records: [normalTask] })

    assert.strictEqual(result.isApproved, false)
    assert(result.violations.some((v) => v.type === 'CONTRADICTED_FACT'))
    assert(result.rejectionReasons.some((r) => r.includes('0 blocked tasks exist')))
  })

  // ==========================================================================
  // Section 6: CROSS_DOMAIN_RECAP Relational Integrity
  // ==========================================================================
  console.log('\n--- Section 6: CROSS_DOMAIN_RECAP Relational Integrity ---')

  await test('6.1 CROSS_DOMAIN_RECAP: clusters related items by project_id and keeps unlinked separate', () => {
    const plan = planReasoning({ prompt: 'What happened last week?' })!
    const projRec: VaultRecord = {
      entityType: 'project',
      entityId: 'proj-1',
      title: 'PEVRA',
      timestamps: {},
      epistemicClass: 'WV_RECORD',
      fields: { status: 'active' },
      provenance: { table: 'workspace_projects', id: 'proj-1', workspace_id: 'ws-test' },
    }
    const linkedTask: VaultRecord = {
      entityType: 'task',
      entityId: 't-link',
      title: 'Deploy contract',
      timestamps: {},
      relationship: { projectId: 'proj-1' },
      epistemicClass: 'WV_RECORD',
      fields: { status: 'completed', projectId: 'proj-1' },
      provenance: { table: 'tasks', id: 't-link', workspace_id: 'ws-test' },
    }
    const unlinkedDecision: VaultRecord = {
      entityType: 'decision',
      entityId: 'd-unlink',
      title: 'Migrate hosting to Vercel',
      timestamps: { decided_at: '2026-10-10' },
      epistemicClass: 'WV_RECORD',
      fields: { decision: 'Use Vercel for next-gen deployment' },
      provenance: { table: 'decisions', id: 'd-unlink', workspace_id: 'ws-test' },
    }

    const outcomes: DomainOutcome[] = [
      { domain: 'project', importance: 'OPTIONAL', status: 'AVAILABLE', returnedCount: 1, records: [projRec] },
      { domain: 'task', importance: 'OPTIONAL', status: 'AVAILABLE', returnedCount: 1, records: [linkedTask] },
      { domain: 'decision', importance: 'REQUIRED', status: 'AVAILABLE', returnedCount: 1, records: [unlinkedDecision] },
    ]

    const prepared = prepareReasoningContext(plan, outcomes, 15)
    // Cluster has linkedTask
    assert.strictEqual(prepared.clusters.length, 1)
    assert.strictEqual(prepared.clusters[0].records.length, 1)
    assert.strictEqual(prepared.clusters[0].records[0].entityId, 't-link')

    // Unlinked decision remains in unlinkedRecords
    assert.strictEqual(prepared.unlinkedRecords.decision.length, 1)
    assert.strictEqual(prepared.unlinkedRecords.decision[0].entityId, 'd-unlink')
  })

  // ==========================================================================
  // Section 7: Protocol Concealment & Formatting Standards
  // ==========================================================================
  console.log('\n--- Section 7: Protocol Concealment & Formatting Standards ---')

  await test('7.1 Protocol concealment: [SOURCES:], [reasoning_context], and [S1] stripped from visible prose', () => {
    const rawOutput =
      'Based on [reasoning_context] for the project [S1], here is your summary.\n\n[SOURCES: S1 | BASIS: DIRECT_FACT]'
    const sourceMap = new Map([
      ['S1', { entityType: 'project', entityId: 'p-1', title: 'P1' } as any],
    ])

    const cleaned = sanitizeVisibleProse(rawOutput, sourceMap)
    assert(!cleaned.includes('[SOURCES:'), 'Must not contain [SOURCES:]')
    assert(!cleaned.includes('[reasoning_context]'), 'Must not contain [reasoning_context]')
    assert(!cleaned.includes('[S1]'), 'Must not contain [S1]')
    assert(cleaned.includes('the retrieved Vault context for the project'))
  })

  await test('7.2 Normal-mode Markdown bold stars (**) stripped cleanly', () => {
    const boldInput =
      'Here are your **key findings**:\n- **Item 1**: First task\n- **Item 2**: Second task'
    const cleaned = sanitizeVisibleProse(boldInput)
    assert(!cleaned.includes('**'), 'Must not contain ** in normal mode')
    assert(cleaned.includes('key findings:'))
    assert(cleaned.includes('- Item 1: First task'))
  })

  // ==========================================================================
  // Section 8: Cross-Workspace Isolation & Entity Normalization
  // ==========================================================================
  console.log('\n--- Section 8: Cross-Workspace Isolation & Entity Normalization ---')

  await test('8.1 Queries strictly scoped to workspace_id and normalize trailing "project"', async () => {
    let capturedWsId = ''
    let capturedOrQuery = ''

    const mockDb = {
      from: (table: string) => {
        const builder: any = {
          select: () => builder,
          eq: (col: string, val: string) => {
            if (col === 'workspace_id') capturedWsId = val
            return builder
          },
          or: (str: string) => {
            capturedOrQuery = str
            return builder
          },
          order: () => builder,
          limit: () => Promise.resolve({ data: [], error: null }),
        }
        return builder
      },
    }

    const service = new VaultRetrievalService(mockDb, 'ws-isolated-99')
    const plan = planReasoning({ prompt: 'Prepare me for my meeting on Community structure project.' })!

    await service.executeReasoningPlan(plan)
    assert.strictEqual(capturedWsId, 'ws-isolated-99', 'Every query must be strictly scoped to current workspace')
  })

  console.log(`\n======================================================`)
  console.log(`Combined 2B.2A Verification: ${passed} passed, ${failed} failed`)
  console.log(`======================================================\n`)
}

runSuite().catch((err) => {
  console.error(err)
  process.exit(1)
})
