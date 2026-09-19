'use client'

import Link from 'next/link'
import {
  Award,
  ShieldCheck,
  Clock,
  ExternalLink,
  Edit2,
  Archive,
  RotateCcw,
  Sparkles,
  Link2,
  Globe,
  Briefcase,
  Layers,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react'
import {
  WorkspaceEvidence,
  EvidenceType,
  ApprovalStatus,
} from '@/lib/vault/evidence/types'
import {
  approveEvidenceAction,
  returnEvidenceToDraftAction,
  archiveEvidenceAction,
  restoreEvidenceAction,
} from '@/lib/vault/evidence-actions'

interface EvidenceListProps {
  workspaceId: string
  evidence: WorkspaceEvidence[]
  onEdit: (item: WorkspaceEvidence) => void
  onRefresh: () => void
}

export function EvidenceList({
  workspaceId,
  evidence,
  onEdit,
  onRefresh,
}: EvidenceListProps) {
  if (evidence.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-neutral-900/30 border border-neutral-800 rounded-xl">
        <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mx-auto mb-3 text-neutral-400">
          <Award className="w-6 h-6" />
        </div>
        <h3 className="text-base font-medium text-neutral-200">No evidence claims found</h3>
        <p className="text-xs text-neutral-400 max-w-md mx-auto mt-1">
          Formulate professional accomplishments, results, and architecture decisions backed by workspace sources.
        </p>
      </div>
    )
  }

  const handleToggleApproval = async (item: WorkspaceEvidence) => {
    try {
      if (item.approval_status === 'approved') {
        await returnEvidenceToDraftAction(workspaceId, item.id)
      } else {
        await approveEvidenceAction(workspaceId, item.id)
      }
      onRefresh()
    } catch (err) {
      console.error('Error toggling approval status:', err)
    }
  }

  const handleToggleArchive = async (item: WorkspaceEvidence) => {
    try {
      if (item.archived_at) {
        await restoreEvidenceAction(workspaceId, item.id)
      } else {
        await archiveEvidenceAction(workspaceId, item.id)
      }
      onRefresh()
    } catch (err) {
      console.error('Error toggling archive status:', err)
    }
  }

  const getTypeBadge = (type: EvidenceType) => {
    switch (type) {
      case 'contribution':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Contribution
          </span>
        )
      case 'result':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Result
          </span>
        )
      case 'deliverable':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Deliverable
          </span>
        )
      case 'decision':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Strategic Decision
          </span>
        )
    }
  }

  const getStatusBadge = (status: ApprovalStatus, isArchived: boolean) => {
    if (isArchived) {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-800 text-neutral-400 border border-neutral-700">
          <Archive className="w-3 h-3" />
          Archived
        </span>
      )
    }
    if (status === 'approved') {
      return (
        <span
          title="Approved for professional reuse"
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
        >
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          Approved Claim
        </span>
      )
    }
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <Clock className="w-3 h-3" />
        Draft
      </span>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {evidence.map((item) => {
        const isArchived = !!item.archived_at
        return (
          <div
            key={item.id}
            className={`group p-5 bg-neutral-900 border rounded-xl transition duration-150 ${
              isArchived
                ? 'border-neutral-800/60 opacity-60 bg-neutral-900/40'
                : 'border-neutral-800 hover:border-neutral-700 bg-neutral-900/90'
            }`}
          >
            {/* Top Bar: Title, Type, Status, Project */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <Link
                  href={`/vault/evidence/${item.id}`}
                  prefetch={false}
                  className="text-base font-semibold text-neutral-100 hover:text-emerald-400 transition flex items-center gap-1.5"
                >
                  <span>{item.title}</span>
                  <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-emerald-400 transition" />
                </Link>
                {getTypeBadge(item.evidence_type)}
                {getStatusBadge(item.approval_status, isArchived)}
              </div>

              {item.project && (
                <div className="flex items-center gap-1.5 text-xs text-neutral-400 bg-neutral-800/60 px-2.5 py-1 rounded-md border border-neutral-700/50 self-start sm:self-auto">
                  <Briefcase className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{item.project.title}</span>
                </div>
              )}
            </div>

            {/* Public Claim Presentation */}
            <div className="p-3.5 rounded-lg bg-neutral-950/70 border border-neutral-800/80 mb-3 text-sm text-neutral-200 leading-relaxed font-sans">
              <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                Public Formulation
              </div>
              <p>{item.public_claim}</p>
            </div>

            {/* Result Statement (if present) */}
            {item.result_statement && (
              <div className="flex items-start gap-2 text-xs text-emerald-400/90 mb-3 bg-emerald-950/20 border border-emerald-800/30 px-3 py-2 rounded-md">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                <div>
                  <span className="font-semibold text-emerald-300">Measurable Outcome:</span>{' '}
                  {item.result_statement}
                </div>
              </div>
            )}

            {/* Bottom Bar: Provenance counts, dates, and action buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-neutral-800/60 text-xs text-neutral-400">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5" title="Supporting workspace sources">
                  <Link2 className="w-3.5 h-3.5 text-neutral-400" />
                  <span>
                    <strong className="text-neutral-200">{item.sources_count ?? 0}</strong> sources
                  </span>
                </div>

                <div className="flex items-center gap-1.5" title="Active portfolio snapshot bridges">
                  <Globe className="w-3.5 h-3.5 text-neutral-400" />
                  <span>
                    <strong className="text-neutral-200">{item.bridges_count ?? 0}</strong> portfolio bridges
                  </span>
                </div>

                <span className="text-neutral-600 hidden sm:inline">•</span>
                <span className="text-neutral-500">
                  Created {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {!isArchived && (
                  <button
                    onClick={() => handleToggleApproval(item)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition flex items-center gap-1.5 ${
                      item.approval_status === 'approved'
                        ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {item.approval_status === 'approved' ? (
                      <>
                        <Clock className="w-3.5 h-3.5" />
                        <span>Return to Draft</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={() => onEdit(item)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded transition"
                  title="Edit claim"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleToggleArchive(item)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded transition"
                  title={isArchived ? 'Restore claim' : 'Archive claim'}
                >
                  {isArchived ? (
                    <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Archive className="w-3.5 h-3.5" />
                  )}
                </button>

                <Link
                  href={`/vault/evidence/${item.id}`}
                  prefetch={false}
                  className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs font-medium transition flex items-center gap-1"
                >
                  <span>View Claim</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
