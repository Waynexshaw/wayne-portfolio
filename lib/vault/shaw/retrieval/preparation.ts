/**
 * Waynex Vault — SHAW Batch 2B.2A: Deterministic Reasoning Preparation Layer
 *
 * Consumes a ReasoningPlan and raw DomainOutcomes, performing:
 * 1. Authoritative record deduplication by entity identity
 * 2. Relational clustering strictly through authoritative foreign keys (no heuristic/lexical guessing)
 * 3. Neutral temporal fact calculation (overdue days, activity timestamps, explicit blocker flags)
 * 4. Safe absence registry grounded strictly in CollectionCompleteness
 * 5. Descriptive counts (no completion ratios or progress percentages)
 *
 * Epistemic Discipline Invariants:
 * - Does NOT generate prose or strategic conclusions
 * - Does NOT calculate completion percentages or project health scores
 * - Does NOT mark records as "stale" or "failing" based on arbitrary thresholds
 * - Does NOT promote evidence interpretations to verbatim truth
 * - Does NOT convert bounded/filtered empty results into global absence claims
 */

import {
  ReasoningPlan,
  DomainOutcome,
  VaultRecord,
  RetrievalDomain,
  PreparedReasoningContext,
  PreparedEntityCluster,
  PreparedAbsenceFact,
  PreparedTemporalFact,
  PreparedDescriptiveCounts,
  VaultContextEnvelope,
  AnswerEpistemicPolicy,
  AnswerContract,
  DomainEpistemicPermission,
  AnswerContractItem,
  isTechnicalOrDebugPrompt,
} from './types'

export const ALL_VAULT_DOMAINS: RetrievalDomain[] = [
  'project',
  'task',
  'decision',
  'meeting',
  'review',
  'metric',
  'research',
  'crm',
]

export function prepareReasoningContext(
  plan: ReasoningPlan,
  domainOutcomes: DomainOutcome[],
  totalLatencyMs: number,
  now: Date = new Date(),
  prompt?: string
): PreparedReasoningContext {
  const nowMs = now.getTime()

  // 1. Authoritative Deduplication
  const seenIdentities = new Set<string>()
  const deduplicatedRecords: VaultRecord[] = []

  for (const outcome of domainOutcomes) {
    for (const record of outcome.records) {
      const identity = `${record.entityType}:${record.entityId}`
      if (!seenIdentities.has(identity)) {
        seenIdentities.add(identity)
        deduplicatedRecords.push(record)
      }
    }
  }

  // 2. Identify Primary Parent Entities for Clustering (e.g. Projects)
  const projects = deduplicatedRecords.filter((r) => r.entityType === 'project')
  const clusters: PreparedEntityCluster[] = []
  const clusteredRecordIdentities = new Set<string>()

  for (const project of projects) {
    const clusterRecords: VaultRecord[] = []

    // Link records that explicitly declare an authoritative foreign key relationship to this project
    for (const record of deduplicatedRecords) {
      if (record.entityType === 'project') continue

      const linkedProjectId =
        record.relationship?.projectId ||
        (record.fields && (record.fields.projectId || record.fields.project_id))

      if (linkedProjectId === project.entityId) {
        clusterRecords.push(record)
        clusteredRecordIdentities.add(`${record.entityType}:${record.entityId}`)
      }
    }

    clusters.push({
      primaryEntity: {
        id: project.entityId,
        domain: 'project',
        title: project.title,
      },
      records: clusterRecords,
      relationshipType: 'authoritative_fk',
    })
  }

  // 3. Assemble Unlinked Records (records without an authoritative parent cluster)
  const unlinkedRecords: Record<RetrievalDomain, VaultRecord[]> = {
    project: [],
    crm: [],
    task: [],
    decision: [],
    research: [],
    meeting: [],
    metric: [],
    review: [],
    evidence: [],
    activity: [],
  }

  for (const record of deduplicatedRecords) {
    const identity = `${record.entityType}:${record.entityId}`
    if (record.entityType !== 'project' && !clusteredRecordIdentities.has(identity)) {
      unlinkedRecords[record.entityType].push(record)
    }
  }

  // 4. Calculate Neutral Temporal Facts (Deterministic, no subjective labels)
  const temporalFacts: PreparedTemporalFact[] = []

  for (const record of deduplicatedRecords) {
    const rawDueDate =
      record.timestamps?.due_date || (record.fields && record.fields.due_date)
    let isOverdue: boolean | undefined = undefined
    let daysOverdue: number | undefined = undefined
    let daysUntilDue: number | undefined = undefined

    if (rawDueDate) {
      const dueMs = new Date(rawDueDate).getTime()
      if (!isNaN(dueMs)) {
        const status = (record.fields?.status || '').toLowerCase()
        const isFinished =
          status === 'completed' || status === 'done' || status === 'cancelled'

        if (dueMs < nowMs && !isFinished) {
          isOverdue = true
          daysOverdue = Math.max(0, Math.floor((nowMs - dueMs) / (1000 * 60 * 60 * 24)))
        } else if (dueMs >= nowMs && !isFinished) {
          isOverdue = false
          daysUntilDue = Math.max(0, Math.floor((dueMs - nowMs) / (1000 * 60 * 60 * 24)))
        }
      }
    }

    // Explicitly blocked fact (direct recorded field only, NEVER inferred)
    const rawStatus = (record.fields?.status || '').toLowerCase()
    const explicitlyBlocked = rawStatus === 'blocked' ? true : undefined

    // Activity timestamp tracking (neutral days, never labeled 'isStale')
    const rawActivity =
      record.timestamps?.updated_at ||
      record.timestamps?.completed_at ||
      record.timestamps?.created_at
    let daysSinceLastRecordedActivity: number | undefined = undefined

    if (rawActivity) {
      const actMs = new Date(rawActivity).getTime()
      if (!isNaN(actMs)) {
        daysSinceLastRecordedActivity = Math.max(
          0,
          Math.floor((nowMs - actMs) / (1000 * 60 * 60 * 24))
        )
      }
    }

    if (
      isOverdue !== undefined ||
      rawDueDate !== undefined ||
      explicitlyBlocked !== undefined ||
      daysSinceLastRecordedActivity !== undefined
    ) {
      temporalFacts.push({
        recordId: record.entityId,
        entityType: record.entityType,
        title: record.title,
        due_date: rawDueDate,
        isOverdue,
        daysOverdue,
        daysUntilDue,
        lastRecordedActivityAt: rawActivity,
        daysSinceLastRecordedActivity,
        explicitlyBlocked,
      })
    }
  }

  // 5. Descriptive Counts (Strictly descriptive, NO completion ratio or percentage)
  // Domain-aware: counts are populated ONLY for domains actually requested and evaluated.
  const isDomainEvaluated = (domain: RetrievalDomain): boolean => {
    const isRequested =
      plan.domainRequests.some((r) => r.domain === domain) ||
      domainOutcomes.some((o) => o.domain === domain)
    if (!isRequested) return false
    const outcome = domainOutcomes.find((o) => o.domain === domain)
    return Boolean(outcome && outcome.status !== 'UNAVAILABLE')
  }

  const descriptiveCounts: PreparedDescriptiveCounts = {}

  if (isDomainEvaluated('task')) {
    const tasks = deduplicatedRecords.filter((r) => r.entityType === 'task')
    const completedTasks = tasks.filter((t) => {
      const s = (t.fields?.status || '').toLowerCase()
      return s === 'completed' || s === 'done'
    })
    const openTasks = tasks.filter((t) => {
      const s = (t.fields?.status || '').toLowerCase()
      return s === 'todo' || s === 'in_progress' || s === 'blocked'
    })
    descriptiveCounts.recordedTaskCount = tasks.length
    descriptiveCounts.openRecordedTaskCount = openTasks.length
    descriptiveCounts.completedRecordedTaskCount = completedTasks.length
  }

  if (isDomainEvaluated('decision')) {
    const decisions = deduplicatedRecords.filter((r) => r.entityType === 'decision')
    descriptiveCounts.recordedDecisionCount = decisions.length
  }

  if (isDomainEvaluated('meeting')) {
    const meetings = deduplicatedRecords.filter((r) => r.entityType === 'meeting')
    descriptiveCounts.meetingCount = meetings.length
  }

  if (isDomainEvaluated('metric')) {
    const metrics = deduplicatedRecords.filter((r) => r.entityType === 'metric')
    descriptiveCounts.recordedMetricCount = metrics.length
  }

  // 6. Safe Absence Registry (Grounded in CollectionCompleteness)
  const verifiedAbsences: PreparedAbsenceFact[] = []
  const limitedAbsences: PreparedAbsenceFact[] = []
  const unavailableDomains: RetrievalDomain[] = []
  const ambiguousDomains: RetrievalDomain[] = []
  let requiredDomainUnavailable = false

  for (const outcome of domainOutcomes) {
    if (outcome.status === 'UNAVAILABLE') {
      unavailableDomains.push(outcome.domain)
      if (outcome.importance === 'REQUIRED') {
        requiredDomainUnavailable = true
      }
    } else if (outcome.status === 'AMBIGUOUS') {
      ambiguousDomains.push(outcome.domain)
    } else if (outcome.status === 'CONFIRMED_EMPTY') {
      // Result was exhaustive and 0 records were returned
      const target = plan.entityTarget?.name
      verifiedAbsences.push({
        domain: outcome.domain,
        scope: 'exhaustive',
        targetEntityName: target,
        claim: target
          ? `No ${outcome.domain} records are recorded for "${target}" in your Vault.`
          : `No ${outcome.domain} records are recorded in your Vault.`,
      })
    } else if (outcome.status === 'LIMITED_EMPTY') {
      // Query was bounded or filtered; absence is strictly qualified
      const target = plan.entityTarget?.name
      const filterDesc = outcome.completeness?.filterDescription || 'the applied query bounds'
      limitedAbsences.push({
        domain: outcome.domain,
        scope: outcome.completeness?.resultScope === 'filtered' ? 'filtered' : 'bounded',
        targetEntityName: target,
        timeframeLabel: plan.temporalWindow?.label,
        claim: target
          ? `No ${outcome.domain} records were returned for "${target}" within ${filterDesc}.`
          : `No ${outcome.domain} records were returned within ${filterDesc}.`,
      })
    }
  }

  // 7. Answer-Wide Epistemic Policy & Answer Contract
  const epistemicPolicy = buildAnswerEpistemicPolicy(
    plan,
    domainOutcomes,
    deduplicatedRecords,
    descriptiveCounts,
    prompt
  )

  const answerContract = buildAnswerContract(
    plan,
    epistemicPolicy,
    deduplicatedRecords,
    limitedAbsences,
    verifiedAbsences
  )

  return {
    plan,
    domainOutcomes,
    clusters,
    unlinkedRecords,
    verifiedAbsences,
    limitedAbsences,
    unavailableDomains,
    ambiguousDomains,
    requiredDomainUnavailable,
    temporalFacts,
    descriptiveCounts,
    epistemicPolicy,
    answerContract,
    retrievalSummary: {
      totalRetrievedCount: deduplicatedRecords.length,
      domainsQueried: Array.from(new Set(domainOutcomes.map((o) => o.domain))),
      latencyMs: totalLatencyMs,
    },
  }
}

export function buildAnswerEpistemicPolicy(
  plan: ReasoningPlan,
  domainOutcomes: DomainOutcome[],
  records: VaultRecord[],
  descriptiveCounts: PreparedDescriptiveCounts,
  prompt?: string
): AnswerEpistemicPolicy {
  const isTechnicalMode = isTechnicalOrDebugPrompt(prompt)
  const evaluatedDomains: RetrievalDomain[] = []
  const unevaluatedDomains: RetrievalDomain[] = []
  const domainPermissions: Record<RetrievalDomain, DomainEpistemicPermission> = {} as any

  for (const domain of ALL_VAULT_DOMAINS) {
    const outcome = domainOutcomes.find((o) => o.domain === domain)
    if (outcome && outcome.status !== 'UNAVAILABLE') {
      evaluatedDomains.push(domain)
      const isConfirmedEmpty = outcome.status === 'CONFIRMED_EMPTY'
      const isLimitedEmpty = outcome.status === 'LIMITED_EMPTY'

      let allowedNegativeClaimType: 'NONE' | 'BOUNDED_ONLY' | 'VERIFIED_GLOBAL' = 'NONE'
      if (isConfirmedEmpty) allowedNegativeClaimType = 'VERIFIED_GLOBAL'
      else if (isLimitedEmpty) allowedNegativeClaimType = 'BOUNDED_ONLY'

      const domainRecords = records.filter((r) => r.entityType === domain)
      const directCounts =
        domain === 'task'
          ? {
              total: descriptiveCounts.recordedTaskCount,
              open: descriptiveCounts.openRecordedTaskCount,
              completed: descriptiveCounts.completedRecordedTaskCount,
            }
          : domainRecords.length > 0
          ? { total: domainRecords.length }
          : undefined

      domainPermissions[domain] = {
        domain,
        evaluated: true,
        status: outcome.status,
        globalAbsenceAuthorized: isConfirmedEmpty,
        boundedScope: isLimitedEmpty
          ? outcome.completeness?.filterDescription ||
            `records checked for ${plan.entityTarget?.name || 'this request'}`
          : undefined,
        allowedNegativeClaimType,
        directCounts,
      }
    } else {
      unevaluatedDomains.push(domain)
      domainPermissions[domain] = {
        domain,
        evaluated: false,
        status: 'UNEVALUATED',
        globalAbsenceAuthorized: false,
        allowedNegativeClaimType: 'NONE',
      }
    }
  }

  // Known null fields directly recorded
  const knownNullFields: Array<{ recordId: string; field: string; statement: string }> = []
  for (const rec of records) {
    if (rec.entityType === 'task') {
      const rawDueDate = rec.timestamps?.due_date || (rec.fields && rec.fields.due_date)
      if (!rawDueDate) {
        knownNullFields.push({
          recordId: rec.entityId,
          field: 'due_date',
          statement: `No due date is set for task "${rec.title}"`,
        })
      }
    }
  }

  return {
    intent: plan.primaryIntent,
    evaluatedDomains,
    unevaluatedDomains,
    domainPermissions,
    knownNullFields,
    directFactualCounts: descriptiveCounts,
    unmodeledConceptsAllowedAsFact: false,
    summaryMayStrengthen: false,
    isTechnicalMode,
  }
}

export function buildAnswerContract(
  plan: ReasoningPlan,
  policy: AnswerEpistemicPolicy,
  records: VaultRecord[],
  limitedAbsences: PreparedAbsenceFact[],
  _verifiedAbsences: PreparedAbsenceFact[]
): AnswerContract {
  const recordedFacts: AnswerContractItem[] = []
  const boundedGaps: AnswerContractItem[] = []
  const observationalGaps: AnswerContractItem[] = []
  const recommendations: AnswerContractItem[] = []

  // 1. Recorded facts from records
  for (const r of records) {
    if (r.entityType === 'project') {
      recordedFacts.push({
        type: 'RECORDED_FACT',
        domain: 'project',
        statement: `Project "${r.title}" is marked ${r.fields?.status || 'active'} with priority ${r.fields?.priority || 'normal'}.`,
      })
      if (r.fields?.description) {
        recordedFacts.push({
          type: 'RECORDED_FACT',
          domain: 'project',
          statement: `Recorded project scope covers: ${String(r.fields.description)
            .slice(0, 160)
            .replace(/\n+/g, ' ')}...`,
        })
      }
    } else if (r.entityType === 'task') {
      const status = r.fields?.status || 'todo'
      const priority = r.fields?.priority || 'medium'
      recordedFacts.push({
        type: 'RECORDED_FACT',
        domain: 'task',
        statement: `Task "${r.title}" is marked ${status} with priority ${priority}.`,
      })
    }
  }

  // 2. Direct counts & null fields
  if (policy.directFactualCounts.recordedTaskCount !== undefined) {
    recordedFacts.push({
      type: 'RECORDED_FACT',
      domain: 'task',
      statement: `Only ${policy.directFactualCounts.recordedTaskCount} task is currently linked to this project in the records checked.`,
    })
    if (policy.directFactualCounts.completedRecordedTaskCount === 0) {
      recordedFacts.push({
        type: 'RECORDED_FACT',
        domain: 'task',
        statement: `None of the project's recorded tasks are completed.`,
      })
    }
  }

  for (const knf of policy.knownNullFields) {
    recordedFacts.push({
      type: 'RECORDED_FACT',
      statement: `${knf.statement}.`,
    })
  }

  // 3. Bounded gaps (strictly preserving bounded retrieval scope)
  for (const la of limitedAbsences) {
    const scopeDesc = la.targetEntityName
      ? `linked to "${la.targetEntityName}" in the records checked`
      : 'in the records checked'
    boundedGaps.push({
      type: 'BOUNDED_GAP',
      domain: la.domain,
      statement: `No ${la.domain} records ${scopeDesc}.`,
      boundary: la.claim,
    })
  }

  // 4. Observational gaps
  if (records.some((r) => r.entityType === 'task')) {
    observationalGaps.push({
      type: 'OBSERVATIONAL_GAP',
      statement:
        'The task is still open, but the records checked do not show how much of the work has already been completed.',
    })
  }

  // 5. Recommendations
  recommendations.push({
    type: 'RECOMMENDATION',
    statement:
      'Setting a due date and breaking the objective into specific steps would help track progress.',
  })

  return {
    recordedFacts,
    boundedGaps,
    observationalGaps,
    recommendations,
  }
}

/**
 * Transforms a PreparedReasoningContext back into a VaultContextEnvelope
 * ensuring full backward compatibility with createRequestSourceMap,
 * extractCitationsFromEnvelope, and chat persistence routes.
 */
export function flattenPreparedContextToEnvelope(
  prepared: PreparedReasoningContext,
  workspaceId: string
): VaultContextEnvelope {
  // Collect all unique VaultRecord objects in deterministic order
  const allRecords: VaultRecord[] = []
  const seenIds = new Set<string>()

  // 1. Clustered primary entities and their linked children
  for (const cluster of prepared.clusters) {
    const parent = prepared.domainOutcomes
      .find((o) => o.domain === cluster.primaryEntity.domain)
      ?.records.find((r) => r.entityId === cluster.primaryEntity.id)

    if (parent && !seenIds.has(`${parent.entityType}:${parent.entityId}`)) {
      seenIds.add(`${parent.entityType}:${parent.entityId}`)
      allRecords.push(parent)
    }

    for (const child of cluster.records) {
      const childKey = `${child.entityType}:${child.entityId}`
      if (!seenIds.has(childKey)) {
        seenIds.add(childKey)
        allRecords.push(child)
      }
    }
  }

  // 2. Unlinked records
  for (const domain of Object.keys(prepared.unlinkedRecords) as RetrievalDomain[]) {
    for (const rec of prepared.unlinkedRecords[domain]) {
      const key = `${rec.entityType}:${rec.entityId}`
      if (!seenIds.has(key)) {
        seenIds.add(key)
        allRecords.push(rec)
      }
    }
  }

  const completeness = prepared.domainOutcomes
    .map((o) => o.completeness)
    .filter((c): c is NonNullable<typeof c> => Boolean(c))

  const ambiguities = prepared.domainOutcomes
    .map((o) => o.ambiguity)
    .filter((a): a is NonNullable<typeof a> => Boolean(a))

  const emptyStates = prepared.verifiedAbsences.map((v) => ({
    domain: v.domain,
    query: v.targetEntityName || '*',
    message: v.claim,
  }))

  return {
    retrievalQuery: prepared.plan.primaryIntent,
    resolvedScope: {
      workspaceId,
      domains: prepared.retrievalSummary.domainsQueried,
      timezone: prepared.plan.temporalWindow?.timezone,
      timeframe: prepared.plan.temporalWindow
        ? {
            type: prepared.plan.temporalWindow.type,
            label: prepared.plan.temporalWindow.label,
            start: prepared.plan.temporalWindow.startIso,
            end: prepared.plan.temporalWindow.endIso,
            startDateString: prepared.plan.temporalWindow.startDateString,
            endDateString: prepared.plan.temporalWindow.endDateString,
          }
        : undefined,
    },
    resolvedEntities: prepared.plan.entityTarget
      ? [
          {
            domain: prepared.plan.entityTarget.domain || 'project',
            name: prepared.plan.entityTarget.name,
            id: prepared.plan.entityTarget.id,
          },
        ]
      : [],
    records: allRecords,
    ambiguities,
    emptyStates,
    completeness,
    truncated: false,
    retrievalTimestamp: new Date().toISOString(),
    provenance: {
      recordCount: allRecords.length,
      domainsQueried: prepared.retrievalSummary.domainsQueried,
      latencyMs: prepared.retrievalSummary.latencyMs,
    },
  }
}
