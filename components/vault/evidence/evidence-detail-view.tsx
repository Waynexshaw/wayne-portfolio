'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Award,
  ArrowLeft,
  ShieldCheck,
  Clock,
  Archive,
  RotateCcw,
  Edit2,
  Share2,
  Globe,
  Link2,
  Plus,
  Trash2,
  RefreshCw,
  Sparkles,
  Briefcase,
  FileCheck,
  BarChart3,
  GitBranch,
  FileText,
  FileCode,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Lock,
} from 'lucide-react'
import {
  WorkspaceEvidence,
  WorkspaceEvidenceSource,
  PortfolioEvidenceBridge,
  EvidenceType,
  ApprovalStatus,
  BridgeSyncStatus,
} from '@/lib/vault/evidence/types'
import {
  approveEvidenceAction,
  returnEvidenceToDraftAction,
  archiveEvidenceAction,
  restoreEvidenceAction,
  removeEvidenceSourceAction,
  refreshPortfolioBridgeAction,
  detachPortfolioBridgeAction,
} from '@/lib/vault/evidence-actions'
import { EvidenceModal } from './evidence-modal'
import { EvidenceSourceModal } from './evidence-source-modal'
import { PortfolioSnapshotModal } from './portfolio-snapshot-modal'

interface EvidenceDetailViewProps {
  workspaceId: string
  evidence: WorkspaceEvidence
  projects: { id: string; title: string }[]
  isAdmin?: boolean
}

export function EvidenceDetailView({
  workspaceId,
  evidence,
  projects,
  isAdmin = false,
}: EvidenceDetailViewProps) {
  const router = useRouter()

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false)
  const [isBridgeModalOpen, setIsBridgeModalOpen] = useState(false)

  const [isRefreshingBridgeId, setIsRefreshingBridgeId] = useState<string | null>(null)
  const [isDetachingBridgeId, setIsDetachingBridgeId] = useState<string | null>(null)
  const [isRemovingSourceId, setIsRemovingSourceId] = useState<string | null>(null)

  const isArchived = !!evidence.archived_at
  const isApproved = evidence.approval_status === 'approved'

  const handleRefresh = () => {
    router.refresh()
  }

  const handleToggleApproval = async () => {
    try {
      if (isApproved) {
        await returnEvidenceToDraftAction(workspaceId, evidence.id)
      } else {
        await approveEvidenceAction(workspaceId, evidence.id)
      }
      handleRefresh()
    } catch (err) {
      console.error('Error toggling approval status:', err)
    }
  }

  const handleToggleArchive = async () => {
    try {
      if (isArchived) {
        await restoreEvidenceAction(workspaceId, evidence.id)
      } else {
        await archiveEvidenceAction(workspaceId, evidence.id)
      }
      handleRefresh()
    } catch (err) {
      console.error('Error toggling archive status:', err)
    }
  }

  const handleRemoveSource = async (sourceId: string) => {
    if (!confirm('Are you sure you want to remove this supporting source link?')) return
    setIsRemovingSourceId(sourceId)
    try {
      await removeEvidenceSourceAction(workspaceId, sourceId, evidence.id)
      handleRefresh()
    } catch (err) {
      console.error('Error removing source:', err)
    } finally {
      setIsRemovingSourceId(null)
    }
  }

  const handleRefreshBridge = async (bridgeId: string) => {
    setIsRefreshingBridgeId(bridgeId)
    try {
      await refreshPortfolioBridgeAction(workspaceId, bridgeId)
      handleRefresh()
    } catch (err) {
      console.error('Error refreshing bridge snapshot:', err)
    } finally {
      setIsRefreshingBridgeId(null)
    }
  }

  const handleDetachBridge = async (bridgeId: string) => {
    if (!confirm('Are you sure you want to detach this portfolio bridge? The public portfolio will no longer reference this live evidence item.')) return
    setIsDetachingBridgeId(bridgeId)
    try {
      await detachPortfolioBridgeAction(workspaceId, bridgeId, evidence.id)
      handleRefresh()
    } catch (err) {
      console.error('Error detaching bridge:', err)
    } finally {
      setIsDetachingBridgeId(null)
    }
  }

  const getTypeBadge = (type: EvidenceType) => {
    switch (type) {
      case 'contribution':
        return (
          <span className="px-2.5 py-1 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Contribution
          </span>
        )
      case 'result':
        return (
          <span className="px-2.5 py-1 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Result
          </span>
        )
      case 'deliverable':
        return (
          <span className="px-2.5 py-1 rounded text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Deliverable
          </span>
        )
      case 'decision':
        return (
          <span className="px-2.5 py-1 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Strategic Decision
          </span>
        )
    }
  }

  const getSyncBadge = (status?: BridgeSyncStatus) => {
    switch (status) {
      case 'current':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Snapshot Synced
          </span>
        )
      case 'changed':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            Live Claim Changed
          </span>
        )
      case 'unapproved':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-orange-500/15 text-orange-300 border border-orange-500/30">
            <Clock className="w-3 h-3 text-orange-400" />
            Claim Returned to Draft
          </span>
        )
      case 'archived':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-800 text-neutral-400 border border-neutral-700">
            <Archive className="w-3 h-3" />
            Claim Archived
          </span>
        )
      case 'detached':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-800 text-neutral-400 border border-neutral-700">
            Detached
          </span>
        )
      default:
        return null
    }
  }

  const getSourceIcon = (type?: string) => {
    switch (type) {
      case 'review':
        return <FileCheck className="w-4 h-4 text-purple-400" />
      case 'metric_observation':
        return <BarChart3 className="w-4 h-4 text-emerald-400" />
      case 'decision':
        return <GitBranch className="w-4 h-4 text-amber-400" />
      case 'document':
        return <FileText className="w-4 h-4 text-blue-400" />
      case 'file':
        return <FileCode className="w-4 h-4 text-cyan-400" />
      default:
        return <Link2 className="w-4 h-4 text-neutral-400" />
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Breadcrumb / Nav */}
      <div>
        <Link
          href="/vault/evidence"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Evidence Directory</span>
        </Link>

        {/* Header Strip */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-neutral-900 border border-neutral-800 rounded-xl">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap mb-2">
              <h1 className="text-xl font-bold text-neutral-100">{evidence.title}</h1>
              {getTypeBadge(evidence.evidence_type)}
              {isArchived ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-800 text-neutral-400 border border-neutral-700">
                  <Archive className="w-3 h-3" />
                  Archived
                </span>
              ) : isApproved ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Approved Claim
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Clock className="w-3.5 h-3.5" />
                  Draft Claim
                </span>
              )}
            </div>

            {evidence.project && (
              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                <Briefcase className="w-3.5 h-3.5 text-neutral-400" />
                <span>Project: {evidence.project.title}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {!isArchived && (
              <>
                <button
                  onClick={handleToggleApproval}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                    isApproved
                      ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {isApproved ? (
                    <>
                      <Clock className="w-3.5 h-3.5" />
                      <span>Return to Draft</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Approve Claim</span>
                    </>
                  )}
                </button>

                {isApproved ? (
                  <button
                    onClick={() => setIsBridgeModalOpen(true)}
                    className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                  >
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Bridge to Portfolio</span>
                  </button>
                ) : (
                  <div className="relative group">
                    <button
                      disabled
                      className="px-3 py-1.5 bg-neutral-800 text-neutral-500 rounded-lg text-xs font-medium cursor-not-allowed flex items-center gap-1.5"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Bridge to Portfolio</span>
                    </button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-neutral-950 text-neutral-300 text-[11px] px-2.5 py-1 rounded shadow-lg border border-neutral-800 whitespace-nowrap z-10">
                      Approve claim first before bridging
                    </div>
                  </div>
                )}
              </>
            )}

            <button
              onClick={() => setIsEditModalOpen(true)}
              className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition"
              title="Edit Claim"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            <button
              onClick={handleToggleArchive}
              className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition"
              title={isArchived ? 'Restore Claim' : 'Archive Claim'}
            >
              {isArchived ? (
                <RotateCcw className="w-4 h-4 text-emerald-400" />
              ) : (
                <Archive className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Section 1: Professional Claim Formulation */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <h2 className="text-sm font-semibold text-neutral-200 uppercase tracking-wider">
              Formulated Professional Claim
            </h2>
          </div>
          <span className="text-[11px] text-neutral-500">Approved for Professional Reuse</span>
        </div>

        {/* Public Claim */}
        <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 text-base text-neutral-100 font-sans leading-relaxed">
          {evidence.public_claim}
        </div>

        {/* Result Statement */}
        {evidence.result_statement && (
          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-800/30 text-emerald-300 text-xs">
            <Sparkles className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold text-emerald-200 mb-0.5">Result / Measurable Impact:</div>
              <div>{evidence.result_statement}</div>
            </div>
          </div>
        )}

        {/* Public Summary */}
        {evidence.public_summary && (
          <div className="p-3.5 rounded-lg bg-neutral-950/40 border border-neutral-800/60 text-xs text-neutral-300">
            <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1">
              Context & Narrative Summary
            </div>
            <p className="leading-relaxed">{evidence.public_summary}</p>
          </div>
        )}
      </div>

      {/* Section 2: Supporting Sources & Provenance */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-neutral-200 uppercase tracking-wider">
              Supporting Sources & Provenance
            </h2>
            <span className="text-xs bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full">
              {evidence.sources?.length ?? 0}
            </span>
          </div>

          <button
            onClick={() => setIsSourceModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-medium transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Attach Source</span>
          </button>
        </div>

        {(!evidence.sources || evidence.sources.length === 0) ? (
          <div className="text-center py-8 px-4 bg-neutral-950/60 border border-neutral-800/60 rounded-lg">
            <Link2 className="w-6 h-6 text-neutral-500 mx-auto mb-2" />
            <div className="text-xs font-medium text-neutral-300">No supporting sources attached</div>
            <p className="text-[11px] text-neutral-500 max-w-sm mx-auto mt-0.5">
              Back this claim by linking active sprint reviews, performance metric observations, architecture decisions, or workbench documents.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {evidence.sources.map((source) => (
              <div
                key={source.id}
                className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg flex items-start justify-between gap-3 group hover:border-neutral-700 transition"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-md bg-neutral-900 border border-neutral-800 mt-0.5">
                    {getSourceIcon(source.source_type)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-neutral-200 truncate">
                      {source.source_title}
                    </div>
                    {source.source_summary && (
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        {source.source_summary}
                      </div>
                    )}
                    {source.notes && (
                      <div className="text-[11px] text-neutral-500 italic mt-1 bg-neutral-900/60 px-2 py-1 rounded border border-neutral-800/60">
                        &quot;{source.notes}&quot;
                      </div>
                    )}
                    <div className="text-[10px] text-neutral-500 mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Attached {new Date(source.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveSource(source.id)}
                  disabled={isRemovingSourceId === source.id}
                  className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-900 rounded transition shrink-0"
                  title="Remove source link"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 3: Portfolio Usage & Snapshot Bridges */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-neutral-200 uppercase tracking-wider">
              Portfolio Usage & Snapshot Bridges
            </h2>
            <span className="text-xs bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full">
              {evidence.bridges?.filter((b) => !b.detached_at).length ?? 0}
            </span>
          </div>

          {isApproved && (
            <button
              onClick={() => setIsBridgeModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-medium transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Bridge to Portfolio</span>
            </button>
          )}
        </div>

        {/* Reassurance Architecture Banner */}
        <div className="p-3.5 rounded-lg bg-neutral-950/60 border border-neutral-800 text-xs text-neutral-400 leading-relaxed flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <strong>Point-in-Time Snapshot Architecture:</strong> Bridges freeze the claim values at the time of publication. Edits to your private Vault claim will indicate a <span className="text-amber-400 font-medium">Live Claim Changed</span> status, allowing you to review before deliberately refreshing the public snapshot. Public case studies are never automatically altered.
          </div>
        </div>

        {(!evidence.bridges || evidence.bridges.length === 0) ? (
          <div className="text-center py-8 px-4 bg-neutral-950/60 border border-neutral-800/60 rounded-lg">
            <Globe className="w-6 h-6 text-neutral-500 mx-auto mb-2" />
            <div className="text-xs font-medium text-neutral-300">No portfolio bridges created</div>
            <p className="text-[11px] text-neutral-500 max-w-sm mx-auto mt-0.5">
              {isApproved
                ? 'Bridge this approved evidence to a public project or case study.'
                : 'Once approved, you can create snapshot bridges to public portfolio assets.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {evidence.bridges.map((bridge) => {
              const isDetached = !!bridge.detached_at
              return (
                <div
                  key={bridge.id}
                  className={`p-4 bg-neutral-950 border rounded-xl space-y-3 transition ${
                    isDetached ? 'border-neutral-800/50 opacity-50' : 'border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider bg-neutral-800 text-neutral-300">
                        {bridge.target_type === 'project' ? 'Project Target' : 'Case Study Target'}
                      </span>
                      <span className="text-xs font-semibold text-neutral-100">
                        {bridge.target_title}
                      </span>
                      {getSyncBadge(bridge.sync_status)}
                    </div>

                    {/* Action buttons */}
                    {!isDetached && (
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {bridge.sync_status === 'changed' && isApproved && (
                          <button
                            onClick={() => handleRefreshBridge(bridge.id)}
                            disabled={isRefreshingBridgeId === bridge.id}
                            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-xs font-medium transition flex items-center gap-1.5"
                          >
                            <RefreshCw className={`w-3 h-3 ${isRefreshingBridgeId === bridge.id ? 'animate-spin' : ''}`} />
                            <span>Refresh Snapshot</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleDetachBridge(bridge.id)}
                          disabled={isDetachingBridgeId === bridge.id}
                          className="px-2.5 py-1 text-neutral-400 hover:text-red-400 hover:bg-neutral-900 rounded text-xs transition"
                          title="Detach bridge"
                        >
                          Detach
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Snapshot Preview Box */}
                  <div className="p-3 bg-neutral-900/60 border border-neutral-800/80 rounded-lg text-xs space-y-1.5 text-neutral-300">
                    <div>
                      <span className="text-neutral-500 font-medium">Snapshot Claim:</span>{' '}
                      <span>{bridge.snapshot_claim}</span>
                    </div>
                    {bridge.snapshot_result && (
                      <div className="text-emerald-400/90 text-[11px]">
                        <span className="text-neutral-500 font-medium">Snapshot Result:</span>{' '}
                        <span>{bridge.snapshot_result}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-[10px] text-neutral-500 flex items-center justify-between">
                    <span>Snapshotted at: {new Date(bridge.snapshotted_at).toLocaleString()}</span>
                    {isDetached && (
                      <span className="text-neutral-400 font-mono">
                        Detached {new Date(bridge.detached_at!).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Section 4: Internal Vault Notes (Private) */}
      {evidence.internal_notes && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300 uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Internal Vault Notes (Private)</span>
          </div>
          <p className="text-xs text-neutral-300 font-mono bg-neutral-950 p-3 rounded-lg border border-neutral-800/80 whitespace-pre-wrap leading-relaxed">
            {evidence.internal_notes}
          </p>
        </div>
      )}

      {/* Section 5: Metadata & Audit Trail */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-5 text-xs text-neutral-500 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <div className="text-neutral-400 font-medium">Created At</div>
          <div>{new Date(evidence.created_at).toLocaleString()}</div>
        </div>
        <div>
          <div className="text-neutral-400 font-medium">Approval Status</div>
          <div className="capitalize text-neutral-300">{evidence.approval_status}</div>
        </div>
        <div>
          <div className="text-neutral-400 font-medium">Approved At</div>
          <div>{evidence.approved_at ? new Date(evidence.approved_at).toLocaleString() : 'Not approved'}</div>
        </div>
        <div>
          <div className="text-neutral-400 font-medium">Last Updated</div>
          <div>{new Date(evidence.updated_at).toLocaleString()}</div>
        </div>
      </div>

      {/* Modals */}
      <EvidenceModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        workspaceId={workspaceId}
        initialData={evidence}
        projects={projects}
        onSuccess={handleRefresh}
      />

      <EvidenceSourceModal
        isOpen={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
        workspaceId={workspaceId}
        evidenceId={evidence.id}
        projectId={evidence.project_id}
        onSuccess={handleRefresh}
      />

      <PortfolioSnapshotModal
        isOpen={isBridgeModalOpen}
        onClose={() => setIsBridgeModalOpen(false)}
        workspaceId={workspaceId}
        evidence={evidence}
        onSuccess={handleRefresh}
      />
    </div>
  )
}
