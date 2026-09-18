'use client'

import Link from 'next/link'
import {
  Users,
  Plus,
  ArrowRight,
  Shield,
  Calendar,
  Clock,
  Sparkles,
  ExternalLink
} from 'lucide-react'
import { VaultPriorityBadge } from '@/components/vault/vault-badge'

interface CompanyContactsProps {
  contacts: any[]
  onOpenAddContact: () => void
}

export function CompanyContacts({
  contacts,
  onOpenAddContact,
}: CompanyContactsProps) {
  const getScoreLabel = (val: number) => {
    if (val <= 3) return 'Cold'
    if (val <= 6) return 'Familiar'
    if (val <= 8) return 'Strong'
    return 'Close'
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-serif text-lg font-medium text-foreground">
            People & Contacts
          </h3>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
            {contacts.length}
          </span>
        </div>

        <button
          onClick={onOpenAddContact}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/80 hover:bg-secondary text-secondary-foreground border border-border text-xs font-medium transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5 text-muted-foreground" />
          Add Contact
        </button>
      </div>

      {contacts.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-xs space-y-2">
          <Users className="w-8 h-8 mx-auto opacity-30" />
          <p className="font-medium text-foreground text-sm">No contacts connected yet.</p>
          <p className="max-w-md mx-auto">
            Contacts associated with this organization in this workspace will appear here. Add executive contacts, founders, or leads.
          </p>
          <div className="pt-2">
            <button
              onClick={onOpenAddContact}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add First Contact
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((contact: any) => {
            const wsRel = contact.workspace_contacts?.[0]
            const score = wsRel?.relationship_score || 5
            const scoreLabel = getScoreLabel(score)

            const initials = contact.full_name
              ? contact.full_name
                  .split(' ')
                  .map((n: string) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()
              : '?'

            return (
              <div
                key={contact.id}
                className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3 hover:border-primary/40 transition-colors flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  {/* Avatar & Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center font-serif text-xs font-bold text-primary shrink-0">
                        {initials}
                      </div>
                      <div>
                        <Link
                          href={`/vault/contacts/${contact.id}`}
                          className="font-medium text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1 group"
                        >
                          <span className="truncate">{contact.full_name}</span>
                          <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary shrink-0" />
                        </Link>
                        {contact.role_title && (
                          <p className="text-xs text-muted-foreground truncate">
                            {contact.role_title}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Priority Badge */}
                    {wsRel?.priority && (
                      <VaultPriorityBadge priority={wsRel.priority} />
                    )}
                  </div>

                  {/* Stage & Relationship Score */}
                  <div className="flex items-center justify-between text-[11px] font-mono pt-1">
                    <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 uppercase font-semibold">
                      {wsRel?.relationship_stage?.replace('_', ' ') || 'Lead'}
                    </span>

                    <span className="text-muted-foreground">
                      Score: <strong className="text-foreground">{score}/10</strong> ({scoreLabel})
                    </span>
                  </div>

                  {/* Operating Identity Context */}
                  {wsRel?.identity?.name && (
                    <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                      <Shield className="w-3 h-3 text-muted-foreground" />
                      <span>Handled via: {wsRel.identity.name}</span>
                    </div>
                  )}

                  {/* Follow-up / Last touchpoint callout */}
                  {wsRel?.next_follow_up_at && (
                    <div className="p-1.5 rounded bg-card border border-border/80 text-[11px] font-mono flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-3 h-3 shrink-0" />
                      <span>Next: {new Date(wsRel.next_follow_up_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Footer action link */}
                <div className="pt-2 border-t border-border/70 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-muted-foreground truncate">
                    {contact.email || contact.location || 'Linked in workspace'}
                  </span>
                  <Link
                    href={`/vault/contacts/${contact.id}`}
                    className="text-xs font-mono text-primary hover:underline flex items-center gap-1 shrink-0 ml-2"
                  >
                    View Record →
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
