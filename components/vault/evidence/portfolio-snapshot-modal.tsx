'use client'

import { useState, useEffect } from 'react'
import {
  X,
  Globe,
  Share2,
  CheckCircle2,
  Search,
  ShieldCheck,
  AlertCircle,
  FileCheck,
  Info,
} from 'lucide-react'
import {
  WorkspaceEvidence,
  BridgeTargetItem,
  BridgeTargetType,
} from '@/lib/vault/evidence/types'
import {
  getBridgeTargetsAction,
  createPortfolioBridgeAction,
} from '@/lib/vault/evidence-actions'

interface PortfolioSnapshotModalProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
  evidence: WorkspaceEvidence
  onSuccess: () => void
}

export function PortfolioSnapshotModal({
  isOpen,
  onClose,
  workspaceId,
  evidence,
  onSuccess,
}: PortfolioSnapshotModalProps) {
  const [targets, setTargets] = useState<BridgeTargetItem[]>([])
  const [targetType, setTargetType] = useState<BridgeTargetType>('project')
  const [selectedTargetId, setSelectedTargetId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    async function loadTargets() {
      setIsLoading(true)
      setError(null)
      try {
        const list = await getBridgeTargetsAction()
        setTargets(list)
        setSelectedTargetId('')
      } catch (err: any) {
        console.error('Error loading portfolio bridge targets:', err)
        setError('Failed to load portfolio targets')
      } finally {
        setIsLoading(false)
      }
    }

    loadTargets()
  }, [isOpen])

  if (!isOpen) return null

  const filteredTargets = targets
    .filter((t) => t.type === targetType)
    .filter((t) => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return t.title.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q)
    })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTargetId) {
      setError('Please select a portfolio target')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await createPortfolioBridgeAction(workspaceId, evidence.id, {
        targetType,
        targetId: selectedTargetId,
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error creating bridge:', err)
      setError(err.message || 'Failed to create portfolio bridge')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-100">
                Bridge Evidence to Portfolio
              </h2>
              <p className="text-xs text-neutral-400">
                Create a snapshot bridge to a public project or case study
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* Educational Note */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-xs leading-relaxed">
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
            <div>
              <strong>Decoupled Snapshot Guarantee:</strong> This action stores a point-in-time snapshot of your approved claim in Waynex Vault. It maintains clean provenance without mutating or overwriting your public project or case study narrative fields.
            </div>
          </div>

          {/* Target Type Selector */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-2">
              Select Target Portfolio Entity
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTargetType('project')
                  setSelectedTargetId('')
                }}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition border ${
                  targetType === 'project'
                    ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:bg-neutral-800/60'
                }`}
              >
                <span>Public Project</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTargetType('case_study')
                  setSelectedTargetId('')
                }}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition border ${
                  targetType === 'case_study'
                    ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:bg-neutral-800/60'
                }`}
              >
                <span>Public Case Study</span>
              </button>
            </div>
          </div>

          {/* Target Selection List */}
          <div>
            <div className="relative mb-2">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${targetType === 'project' ? 'projects' : 'case studies'}...`}
                className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1.5 border border-neutral-800 rounded-lg p-2 bg-neutral-950">
              {isLoading ? (
                <div className="text-center py-4 text-xs text-neutral-500">
                  Loading targets...
                </div>
              ) : filteredTargets.length === 0 ? (
                <div className="text-center py-4 text-xs text-neutral-500">
                  No public {targetType === 'project' ? 'projects' : 'case studies'} found
                </div>
              ) : (
                filteredTargets.map((t) => {
                  const isSelected = selectedTargetId === t.id
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTargetId(t.id)}
                      className={`p-2.5 rounded-md cursor-pointer transition flex items-center justify-between gap-2 border ${
                        isSelected
                          ? 'bg-emerald-600/20 border-emerald-500/50'
                          : 'bg-neutral-900/60 border-neutral-800/80 hover:bg-neutral-800/50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-neutral-200 truncate">
                          {t.title}
                        </div>
                        <div className="text-[11px] text-neutral-500 font-mono truncate">
                          /{t.type === 'project' ? 'projects' : 'case-studies'}/{t.slug}
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Snapshot Preview Block */}
          <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Snapshot Preview to be Stored
            </div>
            <div className="text-xs">
              <span className="text-neutral-500">Title:</span>{' '}
              <span className="text-neutral-200 font-medium">{evidence.title}</span>
            </div>
            <div className="text-xs">
              <span className="text-neutral-500">Claim:</span>{' '}
              <span className="text-neutral-300">{evidence.public_claim}</span>
            </div>
            {evidence.result_statement && (
              <div className="text-xs">
                <span className="text-neutral-500">Result:</span>{' '}
                <span className="text-emerald-400">{evidence.result_statement}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedTargetId}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Bridging...' : 'Create Snapshot Bridge'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
