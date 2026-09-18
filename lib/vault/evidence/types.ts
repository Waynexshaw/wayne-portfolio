// lib/vault/evidence/types.ts

export type EvidenceType = 'contribution' | 'result' | 'deliverable' | 'decision'
export type ApprovalStatus = 'draft' | 'approved'

export interface WorkspaceEvidence {
  id: string
  workspace_id: string
  project_id: string | null
  title: string
  evidence_type: EvidenceType
  public_claim: string
  public_summary: string | null
  result_statement: string | null
  internal_notes: string | null
  approval_status: ApprovalStatus
  approved_at: string | null
  approved_by: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
  project?: {
    id: string
    title: string
  } | null
  sources_count?: number
  bridges_count?: number
  sources?: WorkspaceEvidenceSource[]
  bridges?: PortfolioEvidenceBridge[]
}

export type EvidenceSourceType = 'review' | 'metric_observation' | 'decision' | 'document' | 'file'

export interface WorkspaceEvidenceSource {
  id: string
  workspace_id: string
  evidence_id: string
  review_id: string | null
  metric_observation_id: string | null
  decision_id: string | null
  document_id: string | null
  file_id: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  source_type?: EvidenceSourceType
  source_title?: string
  source_summary?: string | null
  source_date?: string | null
  review?: {
    id: string
    title: string
    review_type: string
    status: string
  } | null
  observation?: {
    id: string
    value: number
    observed_at: string
    notes?: string | null
    metric?: {
      id: string
      name: string
      unit: string | null
    } | null
  } | null
  decision?: {
    id: string
    title: string
    decision: string
  } | null
  document?: {
    id: string
    title: string
  } | null
  file?: {
    id: string
    display_name: string
    mime_type: string
    size_bytes: number
  } | null
}

export type BridgeTargetType = 'project' | 'case_study'
export type BridgeSyncStatus = 'current' | 'changed' | 'unapproved' | 'archived' | 'detached'

export interface PortfolioEvidenceBridge {
  id: string
  workspace_id: string
  evidence_id: string
  public_project_id: string | null
  public_case_study_id: string | null
  snapshot_title: string
  snapshot_claim: string
  snapshot_summary: string | null
  snapshot_result: string | null
  snapshotted_at: string
  created_by: string | null
  created_at: string
  updated_at: string
  detached_at: string | null
  target_type?: BridgeTargetType
  target_title?: string
  target_slug?: string
  public_project?: {
    id: string
    title: string
    slug: string
  } | null
  public_case_study?: {
    id: string
    project?: {
      id: string
      title: string
      slug: string
    } | null
  } | null
  sync_status?: BridgeSyncStatus
}

export interface EvidenceFilters {
  projectId?: string
  evidenceType?: EvidenceType
  approvalStatus?: ApprovalStatus
  search?: string
  includeArchived?: boolean
}

export interface EvidenceStats {
  total: number
  approved: number
  draft: number
  archived: number
  bridged: number
}

export interface SourceCandidateItem {
  id: string
  type: EvidenceSourceType
  title: string
  subtitle?: string | null
  date?: string | null
}

export interface BridgeTargetItem {
  id: string
  type: BridgeTargetType
  title: string
  slug: string
}
