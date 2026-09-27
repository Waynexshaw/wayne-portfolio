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
  | 'VERIFIED_RESEARCH_EVIDENCE'
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

export interface VaultContextEnvelope {
  retrievalQuery: string
  resolvedScope: {
    workspaceId: string
    domains: RetrievalDomain[]
    timeframe?: {
      type: string
      label: string
      start?: string
      end?: string
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
