/**
 * Waynex Vault — SHAW Batch 2A: WV Retrieval Core Types
 *
 * Defines the authoritative, reusable typed contracts for Vault retrieval,
 * context envelopes, epistemic classifications, and query intents.
 * Designed to be reusable by SHAW, controlled actions, and future NONI.
 */

export type EpistemicClass =
  | 'USER_SUPPLIED'
  | 'WV_RECORD'
  | 'RESEARCH_EVIDENCE'
  | 'WORKSPACE_EVIDENCE'
  | 'MODEL_INFERENCE'
  | 'UNKNOWN'
  | 'ILLUSTRATIVE'

export type RetrievalDomain =
  | 'project'
  | 'crm'
  | 'task'
  | 'decision'
  | 'research'
  | 'meeting'
  | 'metric'
  | 'review'
  | 'evidence'
  | 'activity'

export interface VaultRecord {
  entityType: RetrievalDomain
  entityId: string
  title: string
  timestamps: {
    created_at?: string
    updated_at?: string
    due_date?: string
    completed_at?: string
    decided_at?: string
    scheduled_at?: string
    observed_at?: string
    period_start?: string
    period_end?: string
    [key: string]: string | undefined
  }
  relationship?: {
    projectId?: string
    projectTitle?: string
    contactId?: string
    contactName?: string
    companyId?: string
    companyName?: string
    targetType?: string
    targetId?: string
    relationshipType?: string
    [key: string]: any
  }
  epistemicClass: EpistemicClass
  fields: Record<string, any>
  provenance: {
    table: string
    id: string
    workspace_id: string
    notes?: string
  }
}

export interface AmbiguityCandidate {
  id: string
  title: string
  slug?: string
  type?: string
  snippet?: string
}

export interface AmbiguityItem {
  domain: RetrievalDomain
  query: string
  candidateMatches: AmbiguityCandidate[]
  message: string
}

export interface NotFoundItem {
  domain: RetrievalDomain
  query: string
  message: string
}

export type QueryMode = 'catalog' | 'targeted'
export type ResultScope = 'exhaustive' | 'bounded' | 'filtered' | 'ambiguous'

export interface CollectionCompleteness {
  domain: RetrievalDomain
  queryMode: QueryMode
  resultScope: ResultScope
  returnedCount: number
  totalCount?: number
  appliedLimit?: number
  hasMore?: boolean
  filterDescription?: string
}

export interface VaultContextEnvelope {
  retrievalQuery: string
  resolvedScope: {
    workspaceId: string
    domains: RetrievalDomain[]
    timezone?: string
    timeframe?: {
      type: string
      label: string
      start?: string
      end?: string
      startDateString?: string
      endDateString?: string
    }
  }
  resolvedEntities: Array<{
    domain: RetrievalDomain
    id?: string
    name: string
  }>
  records: VaultRecord[]
  ambiguities: AmbiguityItem[]
  emptyStates: NotFoundItem[]
  completeness?: CollectionCompleteness[]
  truncated: boolean
  retrievalTimestamp: string
  provenance: {
    recordCount: number
    domainsQueried: RetrievalDomain[]
    latencyMs?: number
  }
}

export type TemporalExpression =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'last_7_days'
  | 'last_30_days'
  | 'custom'

export interface TemporalWindow {
  type: TemporalExpression
  label: string
  start: Date
  end: Date
  startIso: string
  endIso: string
  startDateString: string // YYYY-MM-DD
  endDateString: string   // YYYY-MM-DD
  timezone?: string       // Resolved timezone (e.g. 'America/New_York' or 'UTC')
}

export interface RetrievalIntent {
  domain: RetrievalDomain
  entityQuery?: string
  timeframe?: TemporalExpression
  statusFilter?: string
  priorityFilter?: string
  detailLevel?: 'summary' | 'detailed'
}

export interface RetrievalPlan {
  shouldRetrieve: boolean
  intents: RetrievalIntent[]
  resolvedEntityHints: Array<{
    domain: RetrievalDomain
    name: string
    id?: string
  }>
  timeframe?: TemporalWindow
  detailLevel: 'summary' | 'detailed'
  ambiguityPolicy: 'clarify_if_ambiguous' | 'return_first'
  reason?: string
}

// ============================================================================
// Phase 2B.2A: Multi-Domain Reasoning & Preparation Types
// ============================================================================

export type ReasoningIntent =
  | 'PROJECT_PROGRESS'
  | 'WEEKLY_FOCUS'
  | 'BLOCKER_ASSESSMENT'
  | 'CROSS_DOMAIN_RECAP'
  | 'PERIOD_ACCOMPLISHMENT'
  | 'MEETING_PREP'
  | 'RESEARCH_IMPACT'
  | 'PLAN_VS_ACTUAL'
  | 'DECISION_GAP_ANALYSIS'

export type DomainImportance = 'REQUIRED' | 'OPTIONAL'

export type DomainOutcomeStatus =
  | 'AVAILABLE'
  | 'CONFIRMED_EMPTY'
  | 'LIMITED_EMPTY'
  | 'UNAVAILABLE'
  | 'AMBIGUOUS'

export interface DomainOutcome {
  domain: RetrievalDomain
  importance: DomainImportance
  status: DomainOutcomeStatus
  returnedCount: number
  completeness?: CollectionCompleteness
  ambiguity?: AmbiguityItem
  error?: string
  records: VaultRecord[]
}

export interface ReasoningDomainRequest {
  domain: RetrievalDomain
  importance: DomainImportance
  queryMode: QueryMode
  entityTarget?: string
  temporalFilter?: TemporalExpression
  statusFilter?: string
  limit: number
}

export type ReasoningMode =
  | 'PROGRESS'
  | 'PRIORITIZATION'
  | 'RISK_ASSESSMENT'
  | 'RECAP'
  | 'ACCOMPLISHMENT'
  | 'PREPARATION'
  | 'IMPACT'
  | 'VARIANCE'
  | 'GAP_ANALYSIS'

export interface ReasoningPlan {
  isReasoningPlan: true
  primaryIntent: ReasoningIntent
  entityTarget?: {
    name: string
    domain?: RetrievalDomain
    id?: string
  }
  temporalWindow?: TemporalWindow
  domainRequests: ReasoningDomainRequest[]
  reasoningMode: ReasoningMode
  requiresPreparation: boolean
  reason?: string
}

export interface PreparedEntityCluster {
  primaryEntity: {
    id: string
    domain: RetrievalDomain
    title: string
  }
  records: VaultRecord[]
  relationshipType: 'authoritative_fk'
}

export interface PreparedAbsenceFact {
  domain: RetrievalDomain
  scope: 'exhaustive' | 'filtered' | 'bounded'
  targetEntityName?: string
  timeframeLabel?: string
  claim: string
}

export interface PreparedTemporalFact {
  recordId: string
  entityType: RetrievalDomain
  title: string
  due_date?: string
  isOverdue?: boolean
  daysOverdue?: number
  daysUntilDue?: number
  fallsWithinRequestedPeriod?: boolean
  lastRecordedActivityAt?: string
  daysSinceLastRecordedActivity?: number
  explicitlyBlocked?: boolean
}

export interface PreparedDescriptiveCounts {
  recordedTaskCount?: number
  openRecordedTaskCount?: number
  completedRecordedTaskCount?: number
  recordedDecisionCount?: number
  meetingCount?: number
  recordedMetricCount?: number
}

export interface DomainEpistemicPermission {
  domain: RetrievalDomain
  evaluated: boolean
  status: DomainOutcomeStatus | 'UNEVALUATED'
  globalAbsenceAuthorized: boolean
  boundedScope?: string
  allowedNegativeClaimType: 'NONE' | 'BOUNDED_ONLY' | 'VERIFIED_GLOBAL'
  directCounts?: {
    total?: number
    open?: number
    completed?: number
    blocked?: number
  }
}

export interface AnswerEpistemicPolicy {
  intent: ReasoningIntent
  evaluatedDomains: RetrievalDomain[]
  unevaluatedDomains: RetrievalDomain[]
  domainPermissions: Record<RetrievalDomain, DomainEpistemicPermission>
  knownNullFields: Array<{
    recordId: string
    field: string
    statement: string
  }>
  directFactualCounts: PreparedDescriptiveCounts
  unmodeledConceptsAllowedAsFact: false
  summaryMayStrengthen: false
  isTechnicalMode: boolean
}

export interface AnswerContractItem {
  type: 'RECORDED_FACT' | 'BOUNDED_GAP' | 'OBSERVATIONAL_GAP' | 'RECOMMENDATION'
  domain?: RetrievalDomain
  statement: string
  boundary?: string
}

export interface AnswerContract {
  recordedFacts: AnswerContractItem[]
  boundedGaps: AnswerContractItem[]
  observationalGaps: AnswerContractItem[]
  recommendations: AnswerContractItem[]
}

export interface PreparedReasoningContext {
  plan: ReasoningPlan
  domainOutcomes: DomainOutcome[]
  clusters: PreparedEntityCluster[]
  unlinkedRecords: Record<RetrievalDomain, VaultRecord[]>
  verifiedAbsences: PreparedAbsenceFact[]
  limitedAbsences: PreparedAbsenceFact[]
  unavailableDomains: RetrievalDomain[]
  ambiguousDomains: RetrievalDomain[]
  requiredDomainUnavailable: boolean
  temporalFacts: PreparedTemporalFact[]
  descriptiveCounts: PreparedDescriptiveCounts
  epistemicPolicy?: AnswerEpistemicPolicy
  answerContract?: AnswerContract
  retrievalSummary: {
    totalRetrievedCount: number
    domainsQueried: RetrievalDomain[]
    latencyMs: number
  }
}

export function isTechnicalOrDebugPrompt(prompt?: string): boolean {
  if (!prompt) return false
  const p = prompt.toLowerCase()
  return (
    p.includes('debug this') ||
    p.includes('technical details') ||
    p.includes('show provenance') ||
    p.includes('inspect retrieval') ||
    p.includes('explain the architecture') ||
    p.includes('developer mode') ||
    p.includes('technical mode')
  )
}

