'use client'

import Link from 'next/link'
import {
  Building2,
  Globe,
  ExternalLink,
  ArrowLeft,
  Plus,
  Edit,
  Archive,
  TrendingUp,
  Shield,
  Layers,
  Users
} from 'lucide-react'
import { useState } from 'react'
import { archiveCompany } from '@/lib/vault/actions'
import { useRouter } from 'next/navigation'

interface CompanyHeaderProps {
  company: any
  workspaceRelationship: any
  activeWorkspace: any
  contactsCount: number
  onOpenEditCompany: () => void
  onOpenEditRelationship: () => void
  onOpenAddContact: () => void
  onOpenCreateOpportunity: () => void
}

export function CompanyHeader({
  company,
  workspaceRelationship,
  activeWorkspace,
  contactsCount,
  onOpenEditCompany,
  onOpenEditRelationship,
  onOpenAddContact,
  onOpenCreateOpportunity,
}: CompanyHeaderProps) {
  const router = useRouter()
  const [archiving, setArchiving] = useState(false)

  const handleArchive = async () => {
    if (!window.confirm(`Are you sure you want to archive ${company.name}? Historical records will be preserved.`)) {
      return
    }
    setArchiving(true)
    try {
      await archiveCompany(company.id)
      router.push('/vault/companies')
    } catch (err: any) {
      alert(err.message || 'Failed to archive organization')
      setArchiving(false)
    }
  }

  // Get initials for avatar badge
  const initials = company.name
    ? company.name
        .split(' ')
        .map((n: string) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'CO'

  const tier = workspaceRelationship?.tier || 'tier_2'
  const status = workspaceRelationship?.status || 'prospect'

  const getTierLabel = (t: string) => {
    switch (t) {
      case 'tier_1': return 'Tier 1 (Strategic)'
      case 'tier_2': return 'Tier 2 (Active)'
      case 'tier_3': return 'Tier 3 (Network)'
      case 'archived': return 'Archived'
      default: return t.replace('_', ' ')
    }
  }

  return (
    <div className="space-y-4 pb-6 border-b border-border">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
        <Link 
          href="/vault/companies"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Companies Directory
        </Link>
        <span>/</span>
        <span className="text-foreground truncate">{company.name}</span>
      </div>

      {/* Main Company Header Card */}
      <div className="p-6 rounded-2xl bg-card border border-border space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          {/* Avatar & Core Identity */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center font-serif text-2xl font-bold text-primary shrink-0 shadow-inner">
              {initials}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-serif text-2xl font-medium text-foreground tracking-tight">
                  {company.name}
                </h1>

                {/* Tier Badge */}
                <span className={`text-[11px] font-mono uppercase px-2 py-0.5 rounded font-semibold border ${
                  tier === 'tier_1'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : tier === 'tier_2'
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : 'bg-secondary text-muted-foreground border-border'
                }`}>
                  {getTierLabel(tier)}
                </span>

                {/* Status Badge */}
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-secondary text-foreground/80 border border-border font-medium capitalize">
                  {status}
                </span>

                {/* Workspace Context Badge */}
                {activeWorkspace && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-secondary/80 text-muted-foreground border border-border">
                    <Shield className="w-3 h-3 text-primary" />
                    {activeWorkspace.name}
                  </span>
                )}
              </div>

              {/* Industry & Domain */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap pt-0.5">
                {company.industry && (
                  <span className="font-medium text-foreground/80">
                    {company.industry}
                  </span>
                )}
                {company.industry && company.domain && <span>•</span>}
                {company.domain && (
                  <span className="font-mono text-xs flex items-center gap-1">
                    <Globe className="w-3 h-3 text-muted-foreground" />
                    {company.domain}
                  </span>
                )}
                <span>•</span>
                <span className="font-mono text-xs flex items-center gap-1 text-muted-foreground">
                  <Users className="w-3 h-3" />
                  {contactsCount} {contactsCount === 1 ? 'Contact' : 'Contacts'}
                </span>
              </div>

              {/* Description */}
              {company.description && (
                <p className="text-xs text-muted-foreground max-w-2xl pt-1">
                  {company.description}
                </p>
              )}

              {/* External Links: Website, LinkedIn, X */}
              <div className="flex items-center gap-3 text-xs pt-2 flex-wrap">
                {company.website && (
                  <a
                    href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary/60 hover:bg-secondary text-foreground text-xs font-mono transition-colors border border-border"
                  >
                    <Globe className="w-3 h-3 text-primary" />
                    <span>Website</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </a>
                )}

                {company.linkedin_url && (
                  <a
                    href={company.linkedin_url.startsWith('http') ? company.linkedin_url : `https://${company.linkedin_url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary/60 hover:bg-secondary text-foreground text-xs font-mono transition-colors border border-border"
                  >
                    <span>LinkedIn</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </a>
                )}

                {company.x_handle && (
                  <a
                    href={`https://x.com/${company.x_handle.replace('@', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary/60 hover:bg-secondary text-foreground text-xs font-mono transition-colors border border-border"
                  >
                    <span>𝕏 {company.x_handle.startsWith('@') ? company.x_handle : `@${company.x_handle}`}</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 shrink-0">
            <button
              onClick={onOpenAddContact}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Contact
            </button>

            <button
              onClick={onOpenCreateOpportunity}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 border border-border transition-colors shadow-sm"
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              Create Opportunity
            </button>

            <button
              onClick={onOpenEditRelationship}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/80 text-foreground text-xs font-medium hover:bg-secondary border border-border transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-primary" />
              Edit Relationship
            </button>

            <button
              onClick={onOpenEditCompany}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/80 text-foreground text-xs font-medium hover:bg-secondary border border-border transition-colors"
            >
              <Edit className="w-3.5 h-3.5 text-muted-foreground" />
              Edit Company
            </button>

            <button
              onClick={handleArchive}
              disabled={archiving}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs font-medium transition-colors"
              title="Archive Company (Preserves history)"
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
