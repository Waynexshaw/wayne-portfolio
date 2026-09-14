'use client'

import { useState } from 'react'
import {
  Layers,
  Edit3,
  Calendar,
  Clock,
  Shield,
  FileText,
  Check,
  Building2,
  Sparkles
} from 'lucide-react'
import { updateWorkspaceCompany } from '@/lib/vault/actions'

interface CompanyRelationshipCardProps {
  company: any
  workspaceRelationship: any
  activeWorkspace: any
  onOpenEditRelationship: () => void
}

export function CompanyRelationshipCard({
  company,
  workspaceRelationship,
  activeWorkspace,
  onOpenEditRelationship,
}: CompanyRelationshipCardProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notes, setNotes] = useState(workspaceRelationship?.notes || '')
  const [savingNotes, setSavingNotes] = useState(false)

  const tier = workspaceRelationship?.tier || 'tier_2'
  const status = workspaceRelationship?.status || 'prospect'

  const getTierDescription = (t: string) => {
    switch (t) {
      case 'tier_1':
        return 'Strategic Priority · Core institutional alignment, critical pipeline importance, and highest tier focus.'
      case 'tier_2':
        return 'Active Target · Meaningful ecosystem counterparty, active discussions or prospective collaboration.'
      case 'tier_3':
        return 'General Network · Broader industry participant, monitor for emerging strategic opportunities.'
      case 'archived':
        return 'Archived · Preserved in historical records without active workspace operational tracking.'
      default:
        return 'General Workspace Counterparty'
    }
  }

  const handleSaveNotes = async () => {
    if (!activeWorkspace?.id) return
    setSavingNotes(true)
    try {
      await updateWorkspaceCompany(activeWorkspace.id, company.id, {
        notes,
      })
      setIsEditingNotes(false)
    } catch (err: any) {
      alert(err.message || 'Failed to update relationship notes')
    } finally {
      setSavingNotes(false)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {/* 1. Relationship Intelligence & Workspace Context */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4 md:col-span-2 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <h3 className="font-serif text-base font-medium text-foreground">
                Workspace Relationship Context
              </h3>
            </div>
            <button
              onClick={onOpenEditRelationship}
              className="text-xs font-mono text-primary hover:underline flex items-center gap-1"
            >
              <Edit3 className="w-3 h-3" />
              Modify Context
            </button>
          </div>

          {/* Grid of Key Attributes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-secondary/30 border border-border/70 space-y-1">
              <span className="text-[10px] font-mono uppercase text-muted-foreground">Tier</span>
              <p className="text-xs font-medium text-foreground capitalize">
                {tier.replace('_', ' ')}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-secondary/30 border border-border/70 space-y-1">
              <span className="text-[10px] font-mono uppercase text-muted-foreground">Status</span>
              <p className="text-xs font-medium text-primary capitalize">
                {status}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-secondary/30 border border-border/70 space-y-1">
              <span className="text-[10px] font-mono uppercase text-muted-foreground">Workspace</span>
              <p className="text-xs font-medium text-foreground truncate">
                {activeWorkspace?.name || 'Active'}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-secondary/30 border border-border/70 space-y-1">
              <span className="text-[10px] font-mono uppercase text-muted-foreground">Linked Since</span>
              <p className="text-xs font-medium text-foreground font-mono">
                {workspaceRelationship?.created_at
                  ? new Date(workspaceRelationship.created_at).toLocaleDateString()
                  : 'N/A'}
              </p>
            </div>
          </div>

          {/* Qualitative Tier Context */}
          <div className="p-3 rounded-lg bg-secondary/20 border border-border/60 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="font-mono text-[10px] uppercase">Strategic Alignment</span>
              <span className="font-mono text-[11px] text-foreground font-semibold uppercase">
                {tier.replace('_', ' ')}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground italic">
              {getTierDescription(tier)}
            </p>
          </div>

          {/* Audit Timestamps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-secondary/20 border border-border/60 flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <span className="text-[10px] text-muted-foreground uppercase block">Created In Workspace</span>
                <span className="text-foreground">
                  {workspaceRelationship?.created_at 
                    ? new Date(workspaceRelationship.created_at).toLocaleDateString() 
                    : 'Recorded previously'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-secondary/20 border border-border/60 flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <span className="text-[10px] text-muted-foreground uppercase block">Last Updated</span>
                <span className="text-foreground">
                  {workspaceRelationship?.updated_at 
                    ? new Date(workspaceRelationship.updated_at).toLocaleDateString() 
                    : 'Never modified'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Workspace Relationship Notes */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <h3 className="font-serif text-base font-medium text-foreground">
                Relationship Notes
              </h3>
            </div>
            {!isEditingNotes ? (
              <button
                onClick={() => setIsEditingNotes(true)}
                className="text-xs font-mono text-primary hover:underline flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" />
                Edit Notes
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditingNotes(false)}
                  className="text-xs font-mono text-muted-foreground hover:underline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="text-xs font-mono text-primary hover:underline flex items-center gap-0.5"
                >
                  <Check className="w-3 h-3" />
                  {savingNotes ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {isEditingNotes ? (
            <div className="space-y-2">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                placeholder="Add strategic context, mandate history, key executive contacts, or notes for this organization..."
                className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground text-xs focus:outline-none focus:border-primary"
              />
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="w-full py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                {savingNotes ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-secondary/30 border border-border/70 text-xs min-h-[120px]">
              {notes ? (
                <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {notes}
                </p>
              ) : (
                <p className="text-muted-foreground italic">
                  No relationship notes recorded for this organization in this workspace. Click &ldquo;Edit Notes&rdquo; to add intelligence.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="pt-2 text-[11px] font-mono text-muted-foreground flex items-center justify-between border-t border-border/60">
          <span>Scope: {activeWorkspace?.name || 'Active Workspace'}</span>
          <span>Private to Workspace</span>
        </div>
      </div>
    </div>
  )
}
