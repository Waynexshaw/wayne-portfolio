'use client'

import { useState } from 'react'
import { 
  Building2, 
  Globe, 
  ExternalLink, 
  Share2, 
  Calendar, 
  Clock, 
  FileText, 
  Check, 
  Edit3,
  Layers,
  Sparkles
} from 'lucide-react'
import { updateWorkspaceRelationship } from '@/lib/vault/actions'

interface ContactRelationshipCardProps {
  contact: any
  workspaceRelationship: any
  activeWorkspace: any
  onOpenEditRelationship: () => void
}

export function ContactRelationshipCard({
  contact,
  workspaceRelationship,
  activeWorkspace,
  onOpenEditRelationship,
}: ContactRelationshipCardProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notes, setNotes] = useState(workspaceRelationship?.notes || '')
  const [savingNotes, setSavingNotes] = useState(false)

  const company = contact.company
  const socialProfiles = contact.social_profiles || []

  const score = workspaceRelationship?.relationship_score || 5
  const getScoreDescription = (val: number) => {
    if (val <= 3) return 'Cold relationship · Infrequent or introductory contact'
    if (val <= 6) return 'Familiar · Periodic dialogue and mutual awareness'
    if (val <= 8) return 'Strong · High trust, active alignment, and shared history'
    return 'Close professional relationship · Core partner or inner circle'
  }

  const handleSaveNotes = async () => {
    if (!activeWorkspace?.id) return
    setSavingNotes(true)
    try {
      await updateWorkspaceRelationship(activeWorkspace.id, contact.id, {
        notes,
      })
      setIsEditingNotes(false)
    } catch (err: any) {
      alert(err.message || 'Failed to update notes')
    } finally {
      setSavingNotes(false)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {/* 1. Relationship Intelligence */}
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
              <span className="text-[10px] font-mono uppercase text-muted-foreground">Type</span>
              <p className="text-xs font-medium text-foreground capitalize">
                {workspaceRelationship?.relationship_type?.replace('_', ' ') || 'Professional'}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-secondary/30 border border-border/70 space-y-1">
              <span className="text-[10px] font-mono uppercase text-muted-foreground">Stage</span>
              <p className="text-xs font-medium text-primary capitalize">
                {workspaceRelationship?.relationship_stage?.replace('_', ' ') || 'Lead'}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-secondary/30 border border-border/70 space-y-1">
              <span className="text-[10px] font-mono uppercase text-muted-foreground">Score</span>
              <p className="text-xs font-medium text-foreground font-mono">
                {score} / 10
              </p>
            </div>

            <div className="p-3 rounded-lg bg-secondary/30 border border-border/70 space-y-1">
              <span className="text-[10px] font-mono uppercase text-muted-foreground">Priority</span>
              <p className="text-xs font-medium text-foreground capitalize">
                {workspaceRelationship?.priority || 'Medium'}
              </p>
            </div>
          </div>

          {/* Qualitative Score Bar */}
          <div className="p-3 rounded-lg bg-secondary/20 border border-border/60 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="font-mono text-[10px] uppercase">Relationship Strength</span>
              <span className="font-mono text-[11px] text-foreground font-semibold">Scale: {score}/10</span>
            </div>
            <p className="text-[11px] text-muted-foreground italic">
              {getScoreDescription(score)}
            </p>
          </div>

          {/* Last Contacted & Next Follow-up Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-secondary/20 border border-border/60 flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <span className="text-[10px] text-muted-foreground uppercase block">Last Contacted</span>
                <span className="text-foreground">
                  {workspaceRelationship?.last_contacted_at 
                    ? new Date(workspaceRelationship.last_contacted_at).toLocaleDateString() 
                    : 'No touchpoints recorded'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-secondary/20 border border-border/60 flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-[10px] text-muted-foreground uppercase block">Next Follow-up</span>
                <span className={workspaceRelationship?.next_follow_up_at ? 'text-amber-400 font-semibold' : 'text-foreground'}>
                  {workspaceRelationship?.next_follow_up_at 
                    ? new Date(workspaceRelationship.next_follow_up_at).toLocaleDateString() 
                    : 'None scheduled'}
                </span>
              </div>
            </div>
          </div>

          {/* Workspace-Specific Notes */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-muted-foreground flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Workspace Notes & Strategic Context
              </span>
              {!isEditingNotes && (
                <button
                  onClick={() => setIsEditingNotes(true)}
                  className="text-xs text-primary hover:underline"
                >
                  Edit Notes
                </button>
              )}
            </div>

            {isEditingNotes ? (
              <div className="space-y-2">
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record strategic context, personal details, common interests, or relationship background..."
                  className="w-full p-2.5 rounded-lg bg-secondary/40 border border-border text-foreground text-xs focus:outline-none focus:border-primary"
                />
                <div className="flex items-center justify-end gap-2 text-xs">
                  <button
                    onClick={() => setIsEditingNotes(false)}
                    className="px-2.5 py-1 rounded text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="px-3 py-1 rounded bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                  >
                    {savingNotes ? 'Saving...' : 'Save Notes'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground bg-secondary/20 p-3 rounded-lg border border-border/50 min-h-[48px] whitespace-pre-wrap">
                {workspaceRelationship?.notes || 'No private notes added for this contact in this workspace.'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 2. Company & Social Profiles Column */}
      <div className="space-y-5">
        {/* Company Card */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-border text-muted-foreground text-xs font-mono uppercase">
            <Building2 className="w-4 h-4 text-primary" />
            Company & Entity
          </div>

          {company ? (
            <div className="space-y-2.5 text-xs">
              <div>
                <h4 className="font-serif text-sm font-semibold text-foreground">
                  {company.name}
                </h4>
                {company.industry && (
                  <p className="text-[11px] font-mono text-muted-foreground capitalize">
                    {company.industry}
                  </p>
                )}
              </div>

              {company.description && (
                <p className="text-muted-foreground line-clamp-2 text-[11px]">
                  {company.description}
                </p>
              )}

              <div className="pt-2 border-t border-border/60 space-y-1 font-mono text-[11px]">
                {company.website && (
                  <a 
                    href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>{company.website.replace(/^https?:\/\//, '')}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}

                {company.x_handle && (
                  <a
                    href={`https://x.com/${company.x_handle.replace('@', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <span>𝕏 @{company.x_handle.replace('@', '')}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}

                {company.linkedin_url && (
                  <a
                    href={company.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <span>in LinkedIn Profile</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-2">
              No company attached to this contact.
            </p>
          )}
        </div>

        {/* Social Profiles */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-border text-muted-foreground text-xs font-mono uppercase">
            <Share2 className="w-4 h-4 text-emerald-400" />
            Social & Communication Handles
          </div>

          {socialProfiles.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              No additional social handles registered.
            </p>
          ) : (
            <div className="space-y-2">
              {socialProfiles.map((p: any) => {
                const targetUrl = p.profile_url || (
                  p.platform === 'x' 
                    ? `https://x.com/${p.handle.replace('@', '')}` 
                    : p.platform === 'telegram' 
                      ? `https://t.me/${p.handle.replace('@', '')}` 
                      : p.platform === 'github' 
                        ? `https://github.com/${p.handle}` 
                        : null
                )

                return (
                  <div 
                    key={p.id}
                    className="p-2 rounded-lg bg-secondary/30 border border-border/70 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                        {p.platform}
                      </span>
                      <span className="font-mono text-foreground">{p.handle}</span>
                    </div>

                    {targetUrl && (
                      <a
                        href={targetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:text-primary/80"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
