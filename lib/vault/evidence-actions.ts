'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  WorkspaceEvidence,
  WorkspaceEvidenceSource,
  PortfolioEvidenceBridge,
  EvidenceFilters,
  EvidenceStats,
  EvidenceType,
  ApprovalStatus,
  EvidenceSourceType,
  BridgeTargetType,
  BridgeTargetItem,
  SourceCandidateItem,
  BridgeSyncStatus,
} from './evidence/types'

async function requireWorkspaceAccess(workspaceId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: membership } = await (supabase as any)
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) throw new Error('Unauthorized')
  return { supabase, user, role: membership.role }
}

// ==========================================
// 1. EVIDENCE CORE ACTIONS
// ==========================================

export async function getEvidenceListAction(
  workspaceId: string,
  filters?: EvidenceFilters
): Promise<WorkspaceEvidence[]> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  let query = (supabase as any)
    .from('workspace_evidence')
    .select(
      `
      id,
      workspace_id,
      project_id,
      title,
      evidence_type,
      public_claim,
      public_summary,
      result_statement,
      internal_notes,
      approval_status,
      approved_at,
      approved_by,
      created_by,
      created_at,
      updated_at,
      archived_at,
      project:workspace_projects(id, title)
    `
    )
    .eq('workspace_id', workspaceId)

  if (filters?.includeArchived) {
    query = query.not('archived_at', 'is', null)
  } else {
    query = query.is('archived_at', null)
  }

  if (filters?.projectId) {
    query = query.eq('project_id', filters.projectId)
  }

  if (filters?.evidenceType) {
    query = query.eq('evidence_type', filters.evidenceType)
  }

  if (filters?.approvalStatus) {
    query = query.eq('approval_status', filters.approvalStatus)
  }

  if (filters?.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,public_claim.ilike.%${filters.search}%,result_statement.ilike.%${filters.search}%`
    )
  }

  query = query.order('created_at', { ascending: false })

  const { data: evidenceList, error } = await query
  if (error) {
    console.error('Error fetching evidence list:', error)
    throw new Error('Failed to load evidence list')
  }

  if (!evidenceList || evidenceList.length === 0) return []

  // Fetch counts of sources and bridges for each evidence
  const evidenceIds = evidenceList.map((e: any) => e.id)

  const [{ data: sourcesData }, { data: bridgesData }] = await Promise.all([
    (supabase as any)
      .from('workspace_evidence_sources')
      .select('evidence_id')
      .in('evidence_id', evidenceIds),
    (supabase as any)
      .from('portfolio_evidence_bridges')
      .select('evidence_id')
      .in('evidence_id', evidenceIds)
      .is('detached_at', null),
  ])

  const sourceCounts: Record<string, number> = {}
  sourcesData?.forEach((s: any) => {
    sourceCounts[s.evidence_id] = (sourceCounts[s.evidence_id] || 0) + 1
  })

  const bridgeCounts: Record<string, number> = {}
  bridgesData?.forEach((b: any) => {
    bridgeCounts[b.evidence_id] = (bridgeCounts[b.evidence_id] || 0) + 1
  })

  return evidenceList.map((e: any) => ({
    ...e,
    sources_count: sourceCounts[e.id] || 0,
    bridges_count: bridgeCounts[e.id] || 0,
  }))
}

export async function getEvidenceStatsAction(
  workspaceId: string
): Promise<EvidenceStats> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  const { data, error } = await (supabase as any)
    .from('workspace_evidence')
    .select('id, approval_status, archived_at')
    .eq('workspace_id', workspaceId)

  if (error) {
    console.error('Error fetching evidence stats:', error)
    return { total: 0, approved: 0, draft: 0, archived: 0, bridged: 0 }
  }

  const active = (data || []).filter((e: any) => !e.archived_at)
  const archived = (data || []).filter((e: any) => !!e.archived_at)
  const approved = active.filter((e: any) => e.approval_status === 'approved')
  const draft = active.filter((e: any) => e.approval_status === 'draft')

  const { count: bridgeCount } = await (supabase as any)
    .from('portfolio_evidence_bridges')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .is('detached_at', null)

  return {
    total: active.length,
    approved: approved.length,
    draft: draft.length,
    archived: archived.length,
    bridged: bridgeCount || 0,
  }
}

export async function getEvidenceDetailAction(
  workspaceId: string,
  evidenceId: string
): Promise<WorkspaceEvidence | null> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  const { data: evidence, error } = await (supabase as any)
    .from('workspace_evidence')
    .select(
      `
      id,
      workspace_id,
      project_id,
      title,
      evidence_type,
      public_claim,
      public_summary,
      result_statement,
      internal_notes,
      approval_status,
      approved_at,
      approved_by,
      created_by,
      created_at,
      updated_at,
      archived_at,
      project:workspace_projects(id, title)
    `
    )
    .eq('workspace_id', workspaceId)
    .eq('id', evidenceId)
    .maybeSingle()

  if (error || !evidence) {
    if (error) console.error('Error fetching evidence detail:', error)
    return null
  }

  // Fetch sources
  const { data: rawSources } = await (supabase as any)
    .from('workspace_evidence_sources')
    .select(
      `
      id,
      workspace_id,
      evidence_id,
      review_id,
      metric_observation_id,
      decision_id,
      document_id,
      file_id,
      notes,
      created_by,
      created_at,
      review:reviews(id, title, review_type, status),
      decision:decisions(id, title, decision),
      document:project_documents(id, title),
      file:project_files(id, display_name, mime_type, size_bytes)
    `
    )
    .eq('evidence_id', evidenceId)
    .order('created_at', { ascending: false })

  // Fetch metric observations if any
  const obsIds = (rawSources || [])
    .map((s: any) => s.metric_observation_id)
    .filter(Boolean)

  let obsMap: Record<string, any> = {}
  if (obsIds.length > 0) {
    const { data: obsData } = await (supabase as any)
      .from('workspace_metric_observations')
      .select(
        `
        id,
        value,
        observed_at,
        notes,
        metric:workspace_metrics(id, name, unit)
      `
      )
      .in('id', obsIds)

    obsData?.forEach((o: any) => {
      obsMap[o.id] = o
    })
  }

  const sources: WorkspaceEvidenceSource[] = (rawSources || []).map((s: any) => {
    let sourceType: EvidenceSourceType = 'review'
    let sourceTitle = 'Source Item'
    let sourceSummary: string | null = null
    let sourceDate: string | null = null

    if (s.review_id && s.review) {
      sourceType = 'review'
      sourceTitle = s.review.title
      sourceSummary = `Review (${s.review.review_type}) · Status: ${s.review.status}`
    } else if (s.metric_observation_id) {
      sourceType = 'metric_observation'
      const obs = obsMap[s.metric_observation_id]
      sourceTitle = obs?.metric?.name ? `${obs.metric.name}: ${obs.value} ${obs.metric.unit || ''}` : `Observation: ${obs?.value ?? ''}`
      sourceSummary = obs?.notes || 'Performance Metric Observation'
      sourceDate = obs?.observed_at || null
    } else if (s.decision_id && s.decision) {
      sourceType = 'decision'
      sourceTitle = s.decision.title
      sourceSummary = s.decision.decision
    } else if (s.document_id && s.document) {
      sourceType = 'document'
      sourceTitle = s.document.title
      sourceSummary = 'Workbench Project Document'
    } else if (s.file_id && s.file) {
      sourceType = 'file'
      sourceTitle = s.file.display_name
      sourceSummary = `${s.file.mime_type} · ${(s.file.size_bytes / 1024).toFixed(1)} KB`
    }

    return {
      ...s,
      source_type: sourceType,
      source_title: sourceTitle,
      source_summary: sourceSummary,
      source_date: sourceDate,
      observation: s.metric_observation_id ? obsMap[s.metric_observation_id] : null,
    }
  })

  // Fetch bridges
  const { data: rawBridges } = await (supabase as any)
    .from('portfolio_evidence_bridges')
    .select(
      `
      id,
      workspace_id,
      evidence_id,
      public_project_id,
      public_case_study_id,
      snapshot_title,
      snapshot_claim,
      snapshot_summary,
      snapshot_result,
      snapshotted_at,
      created_by,
      created_at,
      updated_at,
      detached_at,
      public_project:projects(id, title, slug),
      public_case_study:case_studies(id, project:projects(id, title, slug))
    `
    )
    .eq('evidence_id', evidenceId)
    .order('created_at', { ascending: false })

  const bridges: PortfolioEvidenceBridge[] = (rawBridges || []).map((b: any) => {
    const targetType: BridgeTargetType = b.public_project_id ? 'project' : 'case_study'
    const targetTitle =
      b.public_project?.title ||
      (b.public_case_study?.project?.title ? `${b.public_case_study.project.title} Case Study` : 'Case Study Target')
    const targetSlug = b.public_project?.slug || b.public_case_study?.project?.slug || ''

    // Determine sync status
    let syncStatus: BridgeSyncStatus = 'current'
    if (b.detached_at) {
      syncStatus = 'detached'
    } else if (evidence.archived_at) {
      syncStatus = 'archived'
    } else if (evidence.approval_status !== 'approved') {
      syncStatus = 'unapproved'
    } else if (
      b.snapshot_title !== evidence.title ||
      b.snapshot_claim !== evidence.public_claim ||
      (b.snapshot_summary || '') !== (evidence.public_summary || '') ||
      (b.snapshot_result || '') !== (evidence.result_statement || '')
    ) {
      syncStatus = 'changed'
    }

    return {
      ...b,
      target_type: targetType,
      target_title: targetTitle,
      target_slug: targetSlug,
      sync_status: syncStatus,
    }
  })

  return {
    ...evidence,
    sources_count: sources.length,
    bridges_count: bridges.filter((b) => !b.detached_at).length,
    sources,
    bridges,
  }
}

export async function createEvidenceAction(
  workspaceId: string,
  data: {
    projectId?: string | null
    title: string
    evidenceType: EvidenceType
    publicClaim: string
    publicSummary?: string | null
    resultStatement?: string | null
    internalNotes?: string | null
  }
): Promise<WorkspaceEvidence> {
  const { supabase, user } = await requireWorkspaceAccess(workspaceId)

  if (!data.title?.trim()) {
    throw new Error('Title is required')
  }
  if (!data.publicClaim?.trim()) {
    throw new Error('Public claim is required')
  }

  const { data: evidence, error } = await (supabase as any)
    .from('workspace_evidence')
    .insert({
      workspace_id: workspaceId,
      project_id: data.projectId || null,
      title: data.title.trim(),
      evidence_type: data.evidenceType,
      public_claim: data.publicClaim.trim(),
      public_summary: data.publicSummary?.trim() || null,
      result_statement: data.resultStatement?.trim() || null,
      internal_notes: data.internalNotes?.trim() || null,
      approval_status: 'draft',
      approved_at: null,
      approved_by: null,
      created_by: user.id,
    })
    .select(
      `
      id,
      workspace_id,
      project_id,
      title,
      evidence_type,
      public_claim,
      public_summary,
      result_statement,
      internal_notes,
      approval_status,
      approved_at,
      approved_by,
      created_by,
      created_at,
      updated_at,
      archived_at,
      project:workspace_projects(id, title)
    `
    )
    .single()

  if (error) {
    console.error('Error creating evidence:', error)
    throw new Error('Failed to create evidence claim')
  }

  revalidatePath('/vault/evidence')
  if (data.projectId) {
    revalidatePath(`/vault/projects/${data.projectId}`)
  }

  return {
    ...evidence,
    sources_count: 0,
    bridges_count: 0,
  }
}

export async function updateEvidenceAction(
  workspaceId: string,
  evidenceId: string,
  data: {
    projectId?: string | null
    title?: string
    evidenceType?: EvidenceType
    publicClaim?: string
    publicSummary?: string | null
    resultStatement?: string | null
    internalNotes?: string | null
  }
): Promise<WorkspaceEvidence> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  const updatePayload: Record<string, any> = {}

  if (data.projectId !== undefined) updatePayload.project_id = data.projectId || null
  if (data.title !== undefined) {
    if (!data.title.trim()) throw new Error('Title cannot be empty')
    updatePayload.title = data.title.trim()
  }
  if (data.evidenceType !== undefined) updatePayload.evidence_type = data.evidenceType
  if (data.publicClaim !== undefined) {
    if (!data.publicClaim.trim()) throw new Error('Public claim cannot be empty')
    updatePayload.public_claim = data.publicClaim.trim()
  }
  if (data.publicSummary !== undefined) updatePayload.public_summary = data.publicSummary?.trim() || null
  if (data.resultStatement !== undefined) updatePayload.result_statement = data.resultStatement?.trim() || null
  if (data.internalNotes !== undefined) updatePayload.internal_notes = data.internalNotes?.trim() || null

  const { data: evidence, error } = await (supabase as any)
    .from('workspace_evidence')
    .update(updatePayload)
    .eq('workspace_id', workspaceId)
    .eq('id', evidenceId)
    .select(
      `
      id,
      workspace_id,
      project_id,
      title,
      evidence_type,
      public_claim,
      public_summary,
      result_statement,
      internal_notes,
      approval_status,
      approved_at,
      approved_by,
      created_by,
      created_at,
      updated_at,
      archived_at,
      project:workspace_projects(id, title)
    `
    )
    .single()

  if (error) {
    console.error('Error updating evidence:', error)
    throw new Error('Failed to update evidence claim')
  }

  revalidatePath('/vault/evidence')
  revalidatePath(`/vault/evidence/${evidenceId}`)
  if (evidence.project_id) {
    revalidatePath(`/vault/projects/${evidence.project_id}`)
  }

  return evidence
}

export async function approveEvidenceAction(
  workspaceId: string,
  evidenceId: string
): Promise<WorkspaceEvidence> {
  const { supabase, user } = await requireWorkspaceAccess(workspaceId)

  const { data: evidence, error } = await (supabase as any)
    .from('workspace_evidence')
    .update({
      approval_status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: user.id,
    })
    .eq('workspace_id', workspaceId)
    .eq('id', evidenceId)
    .select(
      `
      id,
      workspace_id,
      project_id,
      title,
      evidence_type,
      public_claim,
      public_summary,
      result_statement,
      internal_notes,
      approval_status,
      approved_at,
      approved_by,
      created_by,
      created_at,
      updated_at,
      archived_at,
      project:workspace_projects(id, title)
    `
    )
    .single()

  if (error) {
    console.error('Error approving evidence:', error)
    throw new Error('Failed to approve evidence')
  }

  revalidatePath('/vault/evidence')
  revalidatePath(`/vault/evidence/${evidenceId}`)
  if (evidence.project_id) {
    revalidatePath(`/vault/projects/${evidence.project_id}`)
  }

  return evidence
}

export async function returnEvidenceToDraftAction(
  workspaceId: string,
  evidenceId: string
): Promise<WorkspaceEvidence> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  const { data: evidence, error } = await (supabase as any)
    .from('workspace_evidence')
    .update({
      approval_status: 'draft',
      approved_at: null,
      approved_by: null,
    })
    .eq('workspace_id', workspaceId)
    .eq('id', evidenceId)
    .select(
      `
      id,
      workspace_id,
      project_id,
      title,
      evidence_type,
      public_claim,
      public_summary,
      result_statement,
      internal_notes,
      approval_status,
      approved_at,
      approved_by,
      created_by,
      created_at,
      updated_at,
      archived_at,
      project:workspace_projects(id, title)
    `
    )
    .single()

  if (error) {
    console.error('Error returning evidence to draft:', error)
    throw new Error('Failed to return evidence to draft')
  }

  revalidatePath('/vault/evidence')
  revalidatePath(`/vault/evidence/${evidenceId}`)
  if (evidence.project_id) {
    revalidatePath(`/vault/projects/${evidence.project_id}`)
  }

  return evidence
}

export async function archiveEvidenceAction(
  workspaceId: string,
  evidenceId: string
): Promise<void> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  const { error } = await (supabase as any)
    .from('workspace_evidence')
    .update({ archived_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId)
    .eq('id', evidenceId)

  if (error) {
    console.error('Error archiving evidence:', error)
    throw new Error('Failed to archive evidence')
  }

  revalidatePath('/vault/evidence')
  revalidatePath(`/vault/evidence/${evidenceId}`)
}

export async function restoreEvidenceAction(
  workspaceId: string,
  evidenceId: string
): Promise<void> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  const { error } = await (supabase as any)
    .from('workspace_evidence')
    .update({ archived_at: null })
    .eq('workspace_id', workspaceId)
    .eq('id', evidenceId)

  if (error) {
    console.error('Error restoring evidence:', error)
    throw new Error('Failed to restore evidence')
  }

  revalidatePath('/vault/evidence')
  revalidatePath(`/vault/evidence/${evidenceId}`)
}

// ==========================================
// 2. EVIDENCE SOURCES ACTIONS
// ==========================================

export async function getSourceCandidatesAction(
  workspaceId: string,
  type: EvidenceSourceType,
  projectId?: string
): Promise<SourceCandidateItem[]> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  switch (type) {
    case 'review': {
      let q = (supabase as any)
        .from('reviews')
        .select('id, title, review_type, status, created_at')
        .eq('workspace_id', workspaceId)
        .is('archived_at', null)
        .order('created_at', { ascending: false })

      if (projectId) q = q.eq('project_id', projectId)
      const { data } = await q
      return (data || []).map((r: any) => ({
        id: r.id,
        type: 'review',
        title: r.title,
        subtitle: `Type: ${r.review_type} · Status: ${r.status}`,
        date: r.created_at,
      }))
    }

    case 'metric_observation': {
      let q = (supabase as any)
        .from('workspace_metric_observations')
        .select(
          `
          id,
          value,
          observed_at,
          notes,
          metric:workspace_metrics(id, name, unit, project_id)
        `
        )
        .eq('workspace_id', workspaceId)
        .order('observed_at', { ascending: false })

      const { data } = await q
      let list = data || []
      if (projectId) {
        list = list.filter((o: any) => o.metric?.project_id === projectId)
      }
      return list.map((o: any) => ({
        id: o.id,
        type: 'metric_observation',
        title: o.metric?.name ? `${o.metric.name}: ${o.value} ${o.metric.unit || ''}` : `Observation: ${o.value}`,
        subtitle: o.notes || 'Metric observation',
        date: o.observed_at,
      }))
    }

    case 'decision': {
      let q = (supabase as any)
        .from('decisions')
        .select('id, title, decision, created_at')
        .eq('workspace_id', workspaceId)
        .is('archived_at', null)
        .order('created_at', { ascending: false })

      if (projectId) q = q.eq('project_id', projectId)
      const { data } = await q
      return (data || []).map((d: any) => ({
        id: d.id,
        type: 'decision',
        title: d.title,
        subtitle: d.decision?.slice(0, 100),
        date: d.created_at,
      }))
    }

    case 'document': {
      let q = (supabase as any)
        .from('project_documents')
        .select('id, title, created_at')
        .eq('workspace_id', workspaceId)
        .is('archived_at', null)
        .order('created_at', { ascending: false })

      if (projectId) q = q.eq('project_id', projectId)
      const { data } = await q
      return (data || []).map((doc: any) => ({
        id: doc.id,
        type: 'document',
        title: doc.title,
        subtitle: 'Workbench Project Document',
        date: doc.created_at,
      }))
    }

    case 'file': {
      let q = (supabase as any)
        .from('project_files')
        .select('id, display_name, mime_type, size_bytes, created_at')
        .eq('workspace_id', workspaceId)
        .is('archived_at', null)
        .order('created_at', { ascending: false })

      if (projectId) q = q.eq('project_id', projectId)
      const { data } = await q
      return (data || []).map((f: any) => ({
        id: f.id,
        type: 'file',
        title: f.display_name,
        subtitle: `${f.mime_type} · ${(f.size_bytes / 1024).toFixed(1)} KB`,
        date: f.created_at,
      }))
    }
    default:
      return []
  }
}

export async function attachEvidenceSourceAction(
  workspaceId: string,
  evidenceId: string,
  payload: {
    sourceType: EvidenceSourceType
    sourceId: string
    notes?: string
  }
): Promise<WorkspaceEvidenceSource> {
  const { supabase, user } = await requireWorkspaceAccess(workspaceId)

  const insertData: Record<string, any> = {
    workspace_id: workspaceId,
    evidence_id: evidenceId,
    notes: payload.notes?.trim() || null,
    created_by: user.id,
  }

  switch (payload.sourceType) {
    case 'review':
      insertData.review_id = payload.sourceId
      break
    case 'metric_observation':
      insertData.metric_observation_id = payload.sourceId
      break
    case 'decision':
      insertData.decision_id = payload.sourceId
      break
    case 'document':
      insertData.document_id = payload.sourceId
      break
    case 'file':
      insertData.file_id = payload.sourceId
      break
    default:
      throw new Error(`Invalid source type: ${payload.sourceType}`)
  }

  const { data, error } = await (supabase as any)
    .from('workspace_evidence_sources')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('This source is already attached to this evidence claim')
    }
    console.error('Error attaching evidence source:', error)
    throw new Error('Failed to attach source to evidence')
  }

  revalidatePath(`/vault/evidence/${evidenceId}`)
  return data
}

export async function removeEvidenceSourceAction(
  workspaceId: string,
  sourceId: string,
  evidenceId: string
): Promise<void> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  const { error } = await (supabase as any)
    .from('workspace_evidence_sources')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('id', sourceId)

  if (error) {
    console.error('Error removing evidence source:', error)
    throw new Error('Failed to remove source')
  }

  revalidatePath(`/vault/evidence/${evidenceId}`)
}

// ==========================================
// 3. PORTFOLIO BRIDGE ACTIONS
// ==========================================

export async function getBridgeTargetsAction(): Promise<BridgeTargetItem[]> {
  const supabase = await createClient()

  const [{ data: projectsData }, { data: caseStudiesData }] = await Promise.all([
    (supabase as any).from('projects').select('id, title, slug').order('title'),
    (supabase as any).from('case_studies').select('id, project:projects(id, title, slug)'),
  ])

  const targets: BridgeTargetItem[] = []

  projectsData?.forEach((p: any) => {
    targets.push({
      id: p.id,
      type: 'project',
      title: p.title || 'Untitled Project',
      slug: p.slug,
    })
  })

  caseStudiesData?.forEach((cs: any) => {
    targets.push({
      id: cs.id,
      type: 'case_study',
      title: cs.project?.title ? `${cs.project.title} Case Study` : 'Untitled Case Study',
      slug: cs.project?.slug || '',
    })
  })

  return targets
}

export async function createPortfolioBridgeAction(
  workspaceId: string,
  evidenceId: string,
  target: {
    targetType: BridgeTargetType
    targetId: string
  }
): Promise<PortfolioEvidenceBridge> {
  const { supabase, user } = await requireWorkspaceAccess(workspaceId)

  // Verify evidence is approved and active
  const { data: evidence, error: evError } = await (supabase as any)
    .from('workspace_evidence')
    .select('id, title, public_claim, public_summary, result_statement, approval_status, archived_at')
    .eq('workspace_id', workspaceId)
    .eq('id', evidenceId)
    .single()

  if (evError || !evidence) {
    throw new Error('Evidence item not found')
  }

  if (evidence.archived_at) {
    throw new Error('Cannot bridge archived evidence to the portfolio')
  }

  if (evidence.approval_status !== 'approved') {
    throw new Error('Only approved evidence can be bridged to the portfolio')
  }

  const insertData: Record<string, any> = {
    workspace_id: workspaceId,
    evidence_id: evidenceId,
    snapshot_title: evidence.title,
    snapshot_claim: evidence.public_claim,
    snapshot_summary: evidence.public_summary,
    snapshot_result: evidence.result_statement,
    snapshotted_at: new Date().toISOString(),
    created_by: user.id,
    detached_at: null,
  }

  if (target.targetType === 'project') {
    insertData.public_project_id = target.targetId
    insertData.public_case_study_id = null
  } else if (target.targetType === 'case_study') {
    insertData.public_case_study_id = target.targetId
    insertData.public_project_id = null
  } else {
    throw new Error(`Invalid target type: ${target.targetType}`)
  }

  const { data, error } = await (supabase as any)
    .from('portfolio_evidence_bridges')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('An active bridge already exists for this evidence and target')
    }
    console.error('Error creating portfolio bridge:', error)
    throw new Error('Failed to create portfolio bridge')
  }

  revalidatePath(`/vault/evidence/${evidenceId}`)
  revalidatePath('/vault/evidence')
  return data
}

export async function refreshPortfolioBridgeAction(
  workspaceId: string,
  bridgeId: string
): Promise<PortfolioEvidenceBridge> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  // Get bridge and parent evidence
  const { data: bridge, error: bError } = await (supabase as any)
    .from('portfolio_evidence_bridges')
    .select('id, evidence_id, detached_at')
    .eq('workspace_id', workspaceId)
    .eq('id', bridgeId)
    .single()

  if (bError || !bridge) {
    throw new Error('Portfolio bridge not found')
  }

  if (bridge.detached_at) {
    throw new Error('Cannot refresh a detached bridge')
  }

  const { data: evidence, error: evError } = await (supabase as any)
    .from('workspace_evidence')
    .select('id, title, public_claim, public_summary, result_statement, approval_status, archived_at')
    .eq('workspace_id', workspaceId)
    .eq('id', bridge.evidence_id)
    .single()

  if (evError || !evidence) {
    throw new Error('Parent evidence not found')
  }

  if (evidence.archived_at) {
    throw new Error('Cannot refresh bridge from archived evidence')
  }

  if (evidence.approval_status !== 'approved') {
    throw new Error('Parent evidence must be in approved status to refresh bridge snapshot')
  }

  const { data: updatedBridge, error: uError } = await (supabase as any)
    .from('portfolio_evidence_bridges')
    .update({
      snapshot_title: evidence.title,
      snapshot_claim: evidence.public_claim,
      snapshot_summary: evidence.public_summary,
      snapshot_result: evidence.result_statement,
      snapshotted_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)
    .eq('id', bridgeId)
    .select()
    .single()

  if (uError) {
    console.error('Error refreshing portfolio bridge:', uError)
    throw new Error('Failed to refresh portfolio bridge')
  }

  revalidatePath(`/vault/evidence/${bridge.evidence_id}`)
  revalidatePath('/vault/evidence')
  return updatedBridge
}

export async function detachPortfolioBridgeAction(
  workspaceId: string,
  bridgeId: string,
  evidenceId: string
): Promise<void> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  const { error } = await (supabase as any)
    .from('portfolio_evidence_bridges')
    .update({ detached_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId)
    .eq('id', bridgeId)

  if (error) {
    console.error('Error detaching portfolio bridge:', error)
    throw new Error('Failed to detach bridge')
  }

  revalidatePath(`/vault/evidence/${evidenceId}`)
  revalidatePath('/vault/evidence')
}

export async function getProjectEvidenceCountsAction(
  workspaceId: string,
  projectId: string
): Promise<{ approved: number; draft: number; total: number }> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  const { data, error } = await (supabase as any)
    .from('workspace_evidence')
    .select('id, approval_status')
    .eq('workspace_id', workspaceId)
    .eq('project_id', projectId)
    .is('archived_at', null)

  if (error || !data) {
    return { approved: 0, draft: 0, total: 0 }
  }

  const approved = data.filter((e: any) => e.approval_status === 'approved').length
  const draft = data.filter((e: any) => e.approval_status === 'draft').length

  return { approved, draft, total: data.length }
}

