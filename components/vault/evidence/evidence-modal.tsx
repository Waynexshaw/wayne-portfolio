'use client'

import { useState, useEffect } from 'react'
import {
  X,
  Award,
  Sparkles,
  Info,
  Layers,
  FileCheck,
} from 'lucide-react'
import {
  WorkspaceEvidence,
  EvidenceType,
} from '@/lib/vault/evidence/types'
import {
  createEvidenceAction,
  updateEvidenceAction,
} from '@/lib/vault/evidence-actions'

interface EvidenceModalProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
  initialData?: WorkspaceEvidence | null
  projects: { id: string; title: string }[]
  defaultProjectId?: string
  onSuccess: () => void
}

export function EvidenceModal({
  isOpen,
  onClose,
  workspaceId,
  initialData,
  projects,
  defaultProjectId,
  onSuccess,
}: EvidenceModalProps) {
  const isEditing = !!initialData

  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState<string>('')
  const [evidenceType, setEvidenceType] = useState<EvidenceType>('contribution')
  const [publicClaim, setPublicClaim] = useState('')
  const [publicSummary, setPublicSummary] = useState('')
  const [resultStatement, setResultStatement] = useState('')
  const [internalNotes, setInternalNotes] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '')
      setProjectId(initialData.project_id || '')
      setEvidenceType(initialData.evidence_type || 'contribution')
      setPublicClaim(initialData.public_claim || '')
      setPublicSummary(initialData.public_summary || '')
      setResultStatement(initialData.result_statement || '')
      setInternalNotes(initialData.internal_notes || '')
    } else {
      setTitle('')
      setProjectId(defaultProjectId || '')
      setEvidenceType('contribution')
      setPublicClaim('')
      setPublicSummary('')
      setResultStatement('')
      setInternalNotes('')
    }
    setError(null)
  }, [initialData, defaultProjectId, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (!publicClaim.trim()) {
      setError('Public claim formulation is required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      if (isEditing && initialData) {
        await updateEvidenceAction(workspaceId, initialData.id, {
          title,
          projectId: projectId || null,
          evidenceType,
          publicClaim,
          publicSummary: publicSummary || null,
          resultStatement: resultStatement || null,
          internalNotes: internalNotes || null,
        })
      } else {
        await createEvidenceAction(workspaceId, {
          title,
          projectId: projectId || null,
          evidenceType,
          publicClaim,
          publicSummary: publicSummary || null,
          resultStatement: resultStatement || null,
          internalNotes: internalNotes || null,
        })
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error saving evidence:', err)
      setError(err.message || 'Failed to save evidence claim')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-100">
                {isEditing ? 'Edit Evidence Claim' : 'New Evidence Claim'}
              </h2>
              <p className="text-xs text-neutral-400">
                Formulate a professional achievement, result, or contribution
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 p-1.5 rounded-lg hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {!isEditing && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                Claims are created in <span className="font-semibold text-blue-200">Draft</span> status. Once reviewed and backed with supporting sources (reviews, metrics, decisions, documents, files), you can mark them Approved and bridge them to public portfolio assets.
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Claim Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Architected Multi-tenant Vault Partitioning Model"
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition"
                required
              />
            </div>

            {/* Type & Project Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Evidence Type <span className="text-red-400">*</span>
                </label>
                <select
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value as EvidenceType)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-100 focus:outline-none focus:border-emerald-500 transition"
                >
                  <option value="contribution">Contribution (Engineering/Architecture)</option>
                  <option value="result">Result</option>
                  <option value="deliverable">Deliverable (System/Component)</option>
                  <option value="decision">Decision (Strategic Direction)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Associated Project (Optional)
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-100 focus:outline-none focus:border-emerald-500 transition"
                >
                  <option value="">No Project (General Vault Claim)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Public Claim */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-neutral-300">
                  Formulated Public Claim <span className="text-red-400">*</span>
                </label>
                <span className="text-[11px] text-neutral-500">
                  The primary formulated statement approved for professional reuse
                </span>
              </div>
              <textarea
                value={publicClaim}
                onChange={(e) => setPublicClaim(e.target.value)}
                rows={3}
                placeholder="e.g., Designed and implemented strict tenant isolation with row-level security and zero cross-tenant query leakage across 15 database migrations."
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition"
                required
              />
            </div>

            {/* Result Statement */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-neutral-300">
                  Result Statement / Measurable Impact (Optional)
                </label>
                <span className="text-[11px] text-neutral-500">
                  Key outcome or measurable impact
                </span>
              </div>
              <textarea
                value={resultStatement}
                onChange={(e) => setResultStatement(e.target.value)}
                rows={2}
                placeholder="e.g., Reduced database query latency by 45% and passed 100% of multi-tenant security regression tests."
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* Public Summary */}
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Public Context / Narrative Summary (Optional)
              </label>
              <textarea
                value={publicSummary}
                onChange={(e) => setPublicSummary(e.target.value)}
                rows={2}
                placeholder="Additional background context for portfolio case studies..."
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* Internal Notes */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-neutral-300">
                  Internal Vault Notes (Private)
                </label>
                <span className="text-[11px] text-amber-500/80">
                  Never included in portfolio snapshots
                </span>
              </div>
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={2}
                placeholder="Internal notes, caveats, or private reference links..."
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition font-mono text-xs"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-neutral-400 hover:text-neutral-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  <span>{isEditing ? 'Save Changes' : 'Create Evidence Claim'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
