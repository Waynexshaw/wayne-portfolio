'use client'

import Link from 'next/link'
import { 
  Building2, 
  MapPin, 
  Mail, 
  Phone, 
  Shield, 
  ArrowLeft, 
  Plus, 
  Edit, 
  Archive, 
  CheckSquare, 
  TrendingUp, 
  MessageSquareShare,
  Calendar,
  Layers
} from 'lucide-react'
import { useState } from 'react'
import { archiveContact } from '@/lib/vault/actions'
import { useRouter } from 'next/navigation'

interface ContactHeaderProps {
  contact: any
  workspaceRelationship: any
  activeWorkspace: any
  identities: any[]
  onOpenLogInteraction: () => void
  onOpenCreateFollowUp: () => void
  onOpenCreateOpportunity: () => void
  onOpenEditRelationship: () => void
  onOpenEditContact: () => void
}

export function ContactHeader({
  contact,
  workspaceRelationship,
  activeWorkspace,
  identities,
  onOpenLogInteraction,
  onOpenCreateFollowUp,
  onOpenCreateOpportunity,
  onOpenEditRelationship,
  onOpenEditContact,
}: ContactHeaderProps) {
  const router = useRouter()
  const [archiving, setArchiving] = useState(false)

  const score = workspaceRelationship?.relationship_score || 5
  const getScoreLabel = (val: number) => {
    if (val <= 3) return 'Cold'
    if (val <= 6) return 'Familiar'
    if (val <= 8) return 'Strong'
    return 'Close'
  }

  const scoreLabel = getScoreLabel(score)

  // Operating Identity: prefer identity attached to workspace_contact, or workspace primary identity
  const operatingIdentity = workspaceRelationship?.identity || activeWorkspace?.primary_identity

  const handleArchive = async () => {
    if (!window.confirm(`Are you sure you want to archive ${contact.full_name}? Historical records will be preserved.`)) {
      return
    }
    setArchiving(true)
    try {
      await archiveContact(contact.id)
      router.push('/vault/contacts')
    } catch (err: any) {
      alert(err.message || 'Failed to archive contact')
      setArchiving(false)
    }
  }

  // Get initials for avatar
  const initials = contact.full_name
    ? contact.full_name
        .split(' ')
        .map((n: string) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?'

  return (
    <div className="space-y-4 pb-6 border-b border-border">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
        <Link 
          href="/vault/contacts"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Contacts Directory
        </Link>
        <span>/</span>
        <span className="text-foreground truncate">{contact.full_name}</span>
      </div>

      {/* Main Profile Header Card */}
      <div className="p-6 rounded-2xl bg-card border border-border space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          {/* Avatar & Core Identity */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center font-serif text-2xl font-bold text-primary shrink-0 shadow-inner">
              {contact.avatar_url ? (
                <img 
                  src={contact.avatar_url} 
                  alt={contact.full_name} 
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                initials
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-serif text-2xl font-medium text-foreground tracking-tight">
                  {contact.full_name}
                </h1>

                {workspaceRelationship?.relationship_stage && (
                  <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-semibold">
                    {workspaceRelationship.relationship_stage.replace('_', ' ')}
                  </span>
                )}

                {workspaceRelationship?.priority && (
                  <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-medium ${
                    workspaceRelationship.priority === 'urgent'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : workspaceRelationship.priority === 'high'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-secondary text-muted-foreground'
                  }`}>
                    {workspaceRelationship.priority} Priority
                  </span>
                )}
              </div>

              {contact.role_title && (
                <p className="text-sm text-foreground/90 font-medium">
                  {contact.role_title}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                {contact.company && (
                  <div className="flex items-center gap-1.5 text-foreground/80 font-medium">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    <span>{contact.company.name}</span>
                  </div>
                )}

                {contact.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{contact.location}</span>
                  </div>
                )}

                {contact.email && (
                  <a 
                    href={`mailto:${contact.email}`}
                    className="flex items-center gap-1 hover:text-primary transition-colors font-mono"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>{contact.email}</span>
                  </a>
                )}

                {contact.phone && (
                  <a 
                    href={`tel:${contact.phone}`}
                    className="flex items-center gap-1 hover:text-primary transition-colors font-mono"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{contact.phone}</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Relationship Metrics Pill */}
          <div className="flex flex-wrap md:flex-col items-start md:items-end gap-3 shrink-0">
            <div className="p-3 rounded-xl bg-secondary/40 border border-border/80 text-left md:text-right space-y-1 min-w-[160px]">
              <div className="text-[10px] font-mono uppercase text-muted-foreground">
                Relationship Score
              </div>
              <div className="flex items-baseline md:justify-end gap-1.5">
                <span className="font-serif text-lg font-bold text-foreground">
                  {scoreLabel}
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  · {score}/10
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden mt-1">
                <div 
                  className={`h-full rounded-full ${
                    score >= 7 ? 'bg-emerald-400' : score >= 4 ? 'bg-primary' : 'bg-muted-foreground'
                  }`}
                  style={{ width: `${(score / 10) * 100}%` }}
                />
              </div>
            </div>

            {/* Operating Identity Context */}
            {operatingIdentity && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/30 border border-border/80 text-xs">
                <Shield className="w-3.5 h-3.5 text-primary" />
                <span className="text-muted-foreground text-[10px] font-mono uppercase">Operating as</span>
                <span className="font-medium text-foreground">{operatingIdentity.name}</span>
                {operatingIdentity.handle && (
                  <span className="text-[10px] font-mono text-muted-foreground">
                    @{operatingIdentity.handle}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenLogInteraction}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              <MessageSquareShare className="w-3.5 h-3.5" />
              Log Interaction
            </button>
            <button
              onClick={onOpenCreateFollowUp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/80 hover:bg-secondary text-secondary-foreground border border-border font-medium transition-colors"
            >
              <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
              Create Follow-up
            </button>
            <button
              onClick={onOpenCreateOpportunity}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/80 hover:bg-secondary text-secondary-foreground border border-border font-medium transition-colors"
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              Create Opportunity
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenEditRelationship}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors border border-border/60"
            >
              <Layers className="w-3.5 h-3.5 text-primary" />
              Edit Relationship
            </button>
            <button
              onClick={onOpenEditContact}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors border border-border/60"
            >
              <Edit className="w-3.5 h-3.5" />
              Edit Profile
            </button>
            <button
              onClick={handleArchive}
              disabled={archiving}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors border border-rose-500/20"
            >
              <Archive className="w-3.5 h-3.5" />
              {archiving ? 'Archiving...' : 'Archive'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
