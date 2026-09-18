'use client'

import { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Award,
  Plus,
  Search,
  Filter,
  ShieldCheck,
  Clock,
  Archive,
  Globe,
  Briefcase,
  Layers,
  RotateCcw,
} from 'lucide-react'
import {
  WorkspaceEvidence,
  EvidenceStats,
  EvidenceType,
  ApprovalStatus,
} from '@/lib/vault/evidence/types'
import { EvidenceList } from './evidence-list'
import { EvidenceModal } from './evidence-modal'

interface EvidenceViewProps {
  workspaceId: string
  isAdmin?: boolean
  initialEvidence: WorkspaceEvidence[]
  stats: EvidenceStats
  projects: { id: string; title: string }[]
}

export function EvidenceView({
  workspaceId,
  isAdmin = false,
  initialEvidence,
  stats,
  projects,
}: EvidenceViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const urlProject = searchParams.get('projectId') || searchParams.get('project') || ''
  const urlStatus = searchParams.get('status') || 'all'

  const [activeTab, setActiveTab] = useState<'all' | 'approved' | 'draft' | 'archived'>(
    ['approved', 'draft', 'archived'].includes(urlStatus)
      ? (urlStatus as any)
      : 'all'
  )
  const [selectedProject, setSelectedProject] = useState<string>(urlProject)
  const [selectedType, setSelectedType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEvidence, setEditingEvidence] = useState<WorkspaceEvidence | null>(null)

  const filteredEvidence = useMemo(() => {
    return initialEvidence.filter((item) => {
      // Tab filter
      if (activeTab === 'archived') {
        if (!item.archived_at) return false
      } else {
        if (item.archived_at) return false
        if (activeTab === 'approved' && item.approval_status !== 'approved') return false
        if (activeTab === 'draft' && item.approval_status !== 'draft') return false
      }

      // Project filter
      if (selectedProject && item.project_id !== selectedProject) {
        return false
      }

      // Type filter
      if (selectedType !== 'all' && item.evidence_type !== selectedType) {
        return false
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const titleMatch = item.title.toLowerCase().includes(q)
        const claimMatch = item.public_claim.toLowerCase().includes(q)
        const resultMatch = item.result_statement?.toLowerCase().includes(q)
        const projectMatch = item.project?.title?.toLowerCase().includes(q)
        if (!titleMatch && !claimMatch && !resultMatch && !projectMatch) {
          return false
        }
      }

      return true
    })
  }, [initialEvidence, activeTab, selectedProject, selectedType, searchQuery])

  const handleRefresh = () => {
    router.refresh()
  }

  const handleOpenCreate = () => {
    setEditingEvidence(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item: WorkspaceEvidence) => {
    setEditingEvidence(item)
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-emerald-400" />
            <h1 className="text-2xl font-bold text-neutral-100">Evidence & Professional Claims</h1>
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            Curate approved professional achievements, results, and bridge to public portfolio assets.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Evidence Claim</span>
        </button>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl">
          <div className="text-xs text-neutral-400">Total Claims</div>
          <div className="text-xl font-bold text-neutral-100 mt-1">{stats.total}</div>
        </div>

        <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl">
          <div className="text-xs text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Approved
          </div>
          <div className="text-xl font-bold text-emerald-400 mt-1">{stats.approved}</div>
        </div>

        <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl">
          <div className="text-xs text-amber-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            In Draft
          </div>
          <div className="text-xl font-bold text-amber-400 mt-1">{stats.draft}</div>
        </div>

        <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl">
          <div className="text-xs text-blue-400 flex items-center gap-1">
            <Globe className="w-3.5 h-3.5" />
            Bridged
          </div>
          <div className="text-xl font-bold text-blue-400 mt-1">{stats.bridged}</div>
        </div>

        <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl col-span-2 sm:col-span-1">
          <div className="text-xs text-neutral-500 flex items-center gap-1">
            <Archive className="w-3.5 h-3.5" />
            Archived
          </div>
          <div className="text-xl font-bold text-neutral-400 mt-1">{stats.archived}</div>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900/40 p-3 rounded-xl border border-neutral-800">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {(
            [
              { id: 'all', label: 'Active Claims' },
              { id: 'approved', label: 'Approved' },
              { id: 'draft', label: 'Draft' },
              { id: 'archived', label: 'Archived' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
                activeTab === tab.id
                  ? 'bg-neutral-800 text-neutral-100 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Project select */}
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>

          {/* Type select */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Types</option>
            <option value="contribution">Contribution</option>
            <option value="result">Result</option>
            <option value="deliverable">Deliverable</option>
            <option value="decision">Decision</option>
          </select>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search claims..."
              className="pl-8 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 w-44"
            />
          </div>
        </div>
      </div>

      {/* Evidence List */}
      <EvidenceList
        workspaceId={workspaceId}
        evidence={filteredEvidence}
        onEdit={handleOpenEdit}
        onRefresh={handleRefresh}
      />

      {/* Modal */}
      <EvidenceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        workspaceId={workspaceId}
        initialData={editingEvidence}
        projects={projects}
        defaultProjectId={selectedProject || undefined}
        onSuccess={handleRefresh}
      />
    </div>
  )
}
