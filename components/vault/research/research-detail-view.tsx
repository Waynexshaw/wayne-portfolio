'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  HelpCircle, 
  Target, 
  FileText, 
  CheckCircle2, 
  ArrowRightCircle, 
  Clock, 
  Calendar, 
  Archive, 
  Edit3, 
  Loader2,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  BookOpen,
  Quote,
  Sparkles,
  Link2
} from 'lucide-react'
import { updateResearchRecord, archiveResearchRecord, ResearchStatus } from '@/lib/vault/actions'
import { VaultStatusBadge, VaultPriorityBadge } from '@/components/vault/vault-badge'
import { ResearchEditModal } from './research-edit-modal'
import { ResearchSourcesSection } from './research-sources-section'
import { ResearchEvidenceSection } from './research-evidence-section'
import { ResearchConnectionsSection } from './research-connections-section'
import { SourceModal } from './source-modal'
import { EvidenceModal } from './evidence-modal'

interface ResearchDetailViewProps {
  record: any
  workspaceId: string
  workspaceName?: string
  initialSources?: any[]
  initialEvidence?: any[]
  initialConnections?: any[]
}

export function ResearchDetailView({
  record,
  workspaceId,
  workspaceName,
  initialSources = [],
  initialEvidence = [],
  initialConnections = [],
}: ResearchDetailViewProps) {
  const router = useRouter()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)

  const [selectedSourceForEvidence, setSelectedSourceForEvidence] = useState<string | null>(null)
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false)
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false)

  const evidenceCountBySourceId: Record<string, number> = {}
  for (const item of initialEvidence) {
    if (!item.archived_at) {
      evidenceCountBySourceId[item.source_id] = (evidenceCountBySourceId[item.source_id] || 0) + 1
    }
  }

  const handleStatusChange = (newStatus: ResearchStatus) => {
    setError(null)
    startTransition(async () => {
      try {
        await updateResearchRecord(record.id, {
          workspaceId,
          status: newStatus,
        })
      } catch (err: any) {
        setError(err.message || 'Failed to update status')
      }
    })
  }

  const handleArchive = () => {
    setError(null)
    startTransition(async () => {
      try {
        await archiveResearchRecord(record.id, workspaceId)
        setShowArchiveConfirm(false)
      } catch (err: any) {
        setError(err.message || 'Failed to archive record')
      }
    })
  }

  const handleRestore = () => {
    setError(null)
    startTransition(async () => {
      try {
        await updateResearchRecord(record.id, {
          workspaceId,
          status: 'planning',
        })
      } catch (err: any) {
        setError(err.message || 'Failed to restore record')
      }
    })
  }

  const createdDate = new Date(record.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const updatedDate = new Date(record.updated_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  const completedDate = record.completed_at
    ? new Date(record.completed_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  const isArchived = record.status === 'archived'
  const isCompleted = record.status === 'completed'

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* 1. Back Navigation & Workspace Context */}
      <div className="flex items-center justify-between">
        <Link
          href="/vault/research"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none rounded"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Research Directory</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-secondary text-secondary-foreground border border-border">
            Workspace: {workspaceName || 'Active'}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/20 font-mono">
          {error}
        </div>
      )}

      {/* 2. HEADER */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2 flex-1">
            {/* Operational Metadata Row */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/50">
                {record.research_type}
              </span>
              <VaultStatusBadge status={record.status} showDot className="text-xs px-2.5 py-0.5" />
              {record.priority && (
                <VaultPriorityBadge priority={record.priority} className="text-xs px-2 py-0.5" />
              )}
            </div>

            {/* Primary Entity Title */}
            <h1 className="font-serif text-2xl md:text-3xl font-medium text-foreground tracking-tight">
              {record.title}
            </h1>
          </div>

          {/* Primary & Contextual Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsEditOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-card hover:bg-secondary text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
            >
              <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Edit Research</span>
            </button>

            {isArchived ? (
              <button
                disabled={isPending}
                onClick={handleRestore}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-secondary text-foreground hover:bg-secondary/80 transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore</span>
              </button>
            ) : (
              <button
                onClick={() => setShowArchiveConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/10 transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                title="Archive Research"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Archive</span>
              </button>
            )}
          </div>
        </div>

        {/* Operational Status Transitions & Dates */}
        <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Restrained Lifecycle Transition Controls */}
          <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
            <span className="font-mono text-[11px]">Transition:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {record.status !== 'active' && !isArchived && (
                <button
                  disabled={isPending}
                  onClick={() => handleStatusChange('active')}
                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-secondary text-foreground hover:bg-secondary/80 border border-border transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                >
                  Mark Active
                </button>
              )}
              {record.status !== 'completed' && !isArchived && (
                <button
                  disabled={isPending}
                  onClick={() => handleStatusChange('completed')}
                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-secondary text-foreground hover:bg-secondary/80 border border-border transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                >
                  Complete Research
                </button>
              )}
              {isCompleted && (
                <button
                  disabled={isPending}
                  onClick={() => handleStatusChange('active')}
                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-secondary text-foreground hover:bg-secondary/80 border border-border transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                >
                  Reopen Research
                </button>
              )}
              {record.status !== 'paused' && record.status !== 'completed' && !isArchived && (
                <button
                  disabled={isPending}
                  onClick={() => handleStatusChange('paused')}
                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-muted/60 text-muted-foreground hover:text-foreground border border-border/60 transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                >
                  Pause
                </button>
              )}
              {record.status !== 'planning' && record.status !== 'completed' && !isArchived && (
                <button
                  disabled={isPending}
                  onClick={() => handleStatusChange('planning')}
                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-muted/60 text-muted-foreground hover:text-foreground border border-border/60 transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                >
                  Move to Planning
                </button>
              )}
            </div>
          </div>

          {/* Primary Date Context */}
          <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-muted-foreground/70" /> Updated {updatedDate}
            </span>
            {completedDate && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <CheckCircle2 className="w-3 h-3 text-muted-foreground" /> Completed {completedDate}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Archive Confirmation Banner */}
      {showArchiveConfirm && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Archive this research record? It will be moved to the historical archive and excluded from active views.</span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setShowArchiveConfirm(false)}
              className="px-2.5 py-1 rounded text-xs border border-border text-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={isPending}
              onClick={handleArchive}
              className="px-2.5 py-1 rounded text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50 font-medium"
            >
              {isPending ? 'Archiving...' : 'Confirm Archive'}
            </button>
          </div>
        </div>
      )}

      {/* 3. CORE INQUIRY */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div className="border-b border-border/60 pb-3">
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
            Core Inquiry
          </span>
        </div>

        {/* Central Research Question */}
        <div className="space-y-1.5 max-w-4xl">
          <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/80" />
            <span>Research Question</span>
          </div>
          {record.research_question ? (
            <p className="font-serif text-xl md:text-2xl text-foreground font-normal leading-relaxed">
              &ldquo;{record.research_question}&rdquo;
            </p>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No specific research question formulated yet. Click &ldquo;Edit Research&rdquo; to formulate the central inquiry.
            </p>
          )}
        </div>

        {/* Strategic Objective */}
        {record.objective && (
          <div className="space-y-1.5 max-w-3xl pt-2 border-t border-border/40">
            <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
              <Target className="w-3.5 h-3.5 text-muted-foreground/80" />
              <span>Strategic Objective</span>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {record.objective}
            </p>
          </div>
        )}

        {/* Background / Summary */}
        {record.summary && (
          <div className="space-y-1.5 max-w-3xl pt-2 border-t border-border/40">
            <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5 text-muted-foreground/80" />
              <span>Background & Context</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {record.summary}
            </p>
          </div>
        )}
      </div>

      {/* 4. EVIDENCE BASE (Sources + Evidence) */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 pt-2">
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
            Evidence Base
          </span>
          <div className="h-px bg-border flex-1" />
        </div>

        {/* Subsection A: Sources Library (Bibliographic Ledger) */}
        <ResearchSourcesSection
          researchRecordId={record.id}
          workspaceId={workspaceId}
          sources={initialSources}
          evidenceCountBySourceId={evidenceCountBySourceId}
          onAddEvidenceForSource={(srcId) => {
            setSelectedSourceForEvidence(srcId)
            setIsEvidenceModalOpen(true)
          }}
        />

        {/* Subsection B: Evidence Catalog */}
        <ResearchEvidenceSection
          researchRecordId={record.id}
          workspaceId={workspaceId}
          evidence={initialEvidence}
          sources={initialSources}
          selectedSourceId={selectedSourceForEvidence}
          onOpenAddSource={() => setIsSourceModalOpen(true)}
        />
      </div>

      {/* 5. SYNTHESIS (Findings + Conclusion + Next Action) */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 pt-2">
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
            Synthesis
          </span>
          <div className="h-px bg-border flex-1" />
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
          {/* Findings & Analysis */}
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-xs uppercase tracking-wider">
              <span className="font-semibold text-foreground">Findings & Analysis</span>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {record.findings || 'No findings recorded yet. Log observations, data points, or discoveries as the inquiry proceeds.'}
            </p>
          </div>

          {/* Conclusion */}
          <div className="space-y-2 max-w-3xl pt-4 border-t border-border/60">
            <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-xs uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground/80" />
              <span className="font-semibold text-foreground">Conclusion</span>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {record.conclusion || 'No conclusion formulated yet.'}
            </p>
          </div>

          {/* Resulting Next Action (Placed AFTER Findings and Conclusion) */}
          <div className="space-y-2 max-w-3xl pt-4 border-t border-border/60">
            <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-xs uppercase tracking-wider">
              <ArrowRightCircle className="w-3.5 h-3.5 text-muted-foreground/80" />
              <span className="font-semibold text-foreground">Resulting Next Action</span>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {record.next_action || 'No resulting next action defined yet.'}
            </p>
          </div>
        </div>
      </div>

      {/* 6. CONTEXT (Operational Entity Connections) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pt-2">
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
            Operational Context
          </span>
          <div className="h-px bg-border flex-1" />
        </div>

        <ResearchConnectionsSection
          researchRecordId={record.id}
          workspaceId={workspaceId}
          connections={initialConnections}
        />
      </div>

      {/* 7. Quiet Historical Footer Metadata */}
      <div className="pt-4 border-t border-border/40 flex items-center justify-between text-[11px] font-mono text-muted-foreground/70">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" /> Record created on {createdDate}
        </span>
        <span>ID: {record.id.slice(0, 8)}</span>
      </div>

      {/* Modals */}
      <ResearchEditModal
        record={record}
        workspaceId={workspaceId}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
      />

      <SourceModal
        researchRecordId={record.id}
        workspaceId={workspaceId}
        isOpen={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
      />

      <EvidenceModal
        researchRecordId={record.id}
        workspaceId={workspaceId}
        sources={initialSources}
        defaultSourceId={selectedSourceForEvidence || undefined}
        isOpen={isEvidenceModalOpen}
        onClose={() => {
          setIsEvidenceModalOpen(false)
          setSelectedSourceForEvidence(null)
        }}
        onOpenAddSource={() => setIsSourceModalOpen(true)}
      />
    </div>
  )
}
