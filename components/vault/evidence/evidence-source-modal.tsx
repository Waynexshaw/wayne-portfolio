'use client'

import { useState, useEffect } from 'react'
import {
  X,
  Link2,
  Search,
  CheckCircle2,
  FileText,
  BarChart3,
  GitBranch,
  FileCode,
  FileCheck,
  Calendar,
} from 'lucide-react'
import {
  EvidenceSourceType,
  SourceCandidateItem,
} from '@/lib/vault/evidence/types'
import {
  getSourceCandidatesAction,
  attachEvidenceSourceAction,
} from '@/lib/vault/evidence-actions'

interface EvidenceSourceModalProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
  evidenceId: string
  projectId?: string | null
  onSuccess: () => void
}

export function EvidenceSourceModal({
  isOpen,
  onClose,
  workspaceId,
  evidenceId,
  projectId,
  onSuccess,
}: EvidenceSourceModalProps) {
  const [selectedType, setSelectedType] = useState<EvidenceSourceType>('review')
  const [candidates, setCandidates] = useState<SourceCandidateItem[]>([])
  const [selectedSourceId, setSelectedSourceId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [notes, setNotes] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    async function loadCandidates() {
      setIsLoading(true)
      setError(null)
      try {
        const list = await getSourceCandidatesAction(
          workspaceId,
          selectedType,
          projectId || undefined
        )
        setCandidates(list)
        setSelectedSourceId('')
      } catch (err: any) {
        console.error('Error fetching source candidates:', err)
        setError('Failed to load candidate sources')
      } finally {
        setIsLoading(false)
      }
    }

    loadCandidates()
  }, [isOpen, selectedType, workspaceId, projectId])

  if (!isOpen) return null

  const filteredCandidates = candidates.filter((c) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      c.title.toLowerCase().includes(q) ||
      (c.subtitle && c.subtitle.toLowerCase().includes(q))
    )
  })

  const handleAttach = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSourceId) {
      setError('Please select a source entity to attach')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await attachEvidenceSourceAction(workspaceId, evidenceId, {
        sourceType: selectedType,
        sourceId: selectedSourceId,
        notes: notes || undefined,
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error attaching source:', err)
      setError(err.message || 'Failed to attach source to evidence')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getTypeIcon = (type: EvidenceSourceType) => {
    switch (type) {
      case 'review':
        return <FileCheck className="w-4 h-4" />
      case 'metric_observation':
        return <BarChart3 className="w-4 h-4" />
      case 'decision':
        return <GitBranch className="w-4 h-4" />
      case 'document':
        return <FileText className="w-4 h-4" />
      case 'file':
        return <FileCode className="w-4 h-4" />
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-100">
                Attach Supporting Source
              </h2>
              <p className="text-xs text-neutral-400">
                Link a supporting Vault review, metric observation, decision, document, or file
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

        {/* Body */}
        <form onSubmit={handleAttach} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* Type Selector Buttons */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-2">
              Select Source Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(
                [
                  { type: 'review', label: 'Review' },
                  { type: 'metric_observation', label: 'Metric Obs' },
                  { type: 'decision', label: 'Decision' },
                  { type: 'document', label: 'Document' },
                  { type: 'file', label: 'Project File' },
                ] as const
              ).map((btn) => (
                <button
                  key={btn.type}
                  type="button"
                  onClick={() => setSelectedType(btn.type)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition border ${
                    selectedType === btn.type
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:bg-neutral-800/60'
                  }`}
                >
                  {getTypeIcon(btn.type)}
                  <span>{btn.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Candidate Search */}
          <div>
            <div className="relative mb-2">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search available ${selectedType.replace('_', ' ')}s...`}
                className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Candidate List */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 border border-neutral-800 rounded-lg p-2 bg-neutral-950">
              {isLoading ? (
                <div className="text-center py-6 text-xs text-neutral-500">
                  Loading candidates...
                </div>
              ) : filteredCandidates.length === 0 ? (
                <div className="text-center py-6 text-xs text-neutral-500">
                  No active {selectedType.replace('_', ' ')}s found
                </div>
              ) : (
                filteredCandidates.map((cand) => {
                  const isSelected = selectedSourceId === cand.id
                  return (
                    <div
                      key={cand.id}
                      onClick={() => setSelectedSourceId(cand.id)}
                      className={`p-2.5 rounded-md cursor-pointer transition flex items-start justify-between gap-2 border ${
                        isSelected
                          ? 'bg-blue-600/20 border-blue-500/50'
                          : 'bg-neutral-900/60 border-neutral-800/80 hover:bg-neutral-800/50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-neutral-200 truncate">
                          {cand.title}
                        </div>
                        {cand.subtitle && (
                          <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                            {cand.subtitle}
                          </div>
                        )}
                        {cand.date && (
                          <div className="text-[10px] text-neutral-500 flex items-center gap-1 mt-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(cand.date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Connection Notes */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Provenance Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g., Section 4 details the throughput improvements recorded during the review."
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition"
            />
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
              disabled={isSubmitting || !selectedSourceId}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Attaching...' : 'Attach Source'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
