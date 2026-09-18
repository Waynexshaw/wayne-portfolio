'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  MessageSquareShare,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Clock,
  User,
  Building2,
  FileText,
  CheckCircle2,
  ExternalLink,
  Shield
} from 'lucide-react'
import { InteractionDetailModal } from './interaction-detail-modal'
import { InteractionCreateButton } from './interaction-create-button'

interface InteractionListProps {
  interactions: any[]
  hasActiveFilters: boolean
  workspaceId?: string
  workspaceName?: string
  contacts?: any[]
  identities?: any[]
  defaultIdentityId?: string
}

export function InteractionList({
  interactions,
  hasActiveFilters,
  workspaceId,
  workspaceName,
  contacts = [],
  identities = [],
  defaultIdentityId,
}: InteractionListProps) {
  const [selectedInteraction, setSelectedInteraction] = useState<any | null>(null)

  return (
    <>
      <div className="space-y-4">
        {interactions.length === 0 ? (
          hasActiveFilters ? (
            <div className="py-16 text-center text-muted-foreground text-xs bg-card border border-border rounded-xl px-4 space-y-2">
              <MessageSquareShare className="w-8 h-8 mx-auto opacity-30" />
              <p className="font-medium text-foreground text-sm">No interactions found</p>
              <p className="max-w-md mx-auto">
                No interactions match your current search or filter criteria. Try searching a different keyword or resetting filters.
              </p>
              <div className="pt-2">
                <Link
                  href="/vault/interactions"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
                >
                  Clear filters
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-muted-foreground text-xs bg-card border border-border rounded-xl px-4 space-y-2">
              <MessageSquareShare className="w-8 h-8 mx-auto opacity-30" />
              <p className="font-medium text-foreground text-sm">No interactions logged yet</p>
              <p className="max-w-md mx-auto">
                Start recording conversations, emails, calls, and direct messages to build your historical relationship intelligence.
              </p>
              <div className="pt-2">
                <InteractionCreateButton
                  workspaceId={workspaceId}
                  workspaceName={workspaceName}
                  contacts={contacts}
                  identities={identities}
                  defaultIdentityId={defaultIdentityId}
                />
              </div>
            </div>
          )
        ) : (
          interactions.map((interaction: any) => {
            const date = new Date(interaction.interaction_date)
            const isOutbound = interaction.direction === 'outbound'
            const isInbound = interaction.direction === 'inbound'

            return (
              <div
                key={interaction.id}
                className="p-5 rounded-xl bg-card border border-border space-y-3 hover:border-primary/40 transition-colors cursor-pointer group"
                onClick={() => setSelectedInteraction(interaction)}
              >
                {/* Header Row: Contact, Company, Channel, Direction, Date */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 text-primary">
                      {isOutbound && <ArrowUpRight className="w-4 h-4 text-primary" />}
                      {isInbound && <ArrowDownLeft className="w-4 h-4 text-muted-foreground" />}
                      {!isOutbound && !isInbound && <FileText className="w-4 h-4 text-muted-foreground" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/vault/contacts/${interaction.contact?.id || interaction.contact_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium text-sm text-foreground hover:text-primary transition-colors truncate"
                        >
                          {interaction.contact?.full_name || 'Contact'}
                        </Link>

                        {interaction.contact?.company?.name && (
                          <Link
                            href={`/vault/companies/${interaction.contact.company.id || interaction.contact.company_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                          >
                            <Building2 className="w-3 h-3 text-muted-foreground" />
                            {interaction.contact.company.name}
                          </Link>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono pt-0.5">
                        <span className="uppercase text-foreground font-medium">
                          {interaction.channel}
                        </span>
                        <span>·</span>
                        <span className="capitalize">
                          {interaction.direction.replace('_', ' ')}
                        </span>
                        {interaction.identity && (
                          <>
                            <span>·</span>
                            <span className="text-muted-foreground">
                              via @{interaction.identity.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {date.toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Purpose / Objective if present */}
                {interaction.purpose && (
                  <div className="text-xs text-foreground font-medium bg-secondary/40 px-3 py-1.5 rounded-lg border border-border/60 flex items-center gap-1.5">
                    <span className="text-muted-foreground font-mono uppercase text-[10px]">Purpose:</span>
                    <span className="truncate">{interaction.purpose}</span>
                  </div>
                )}

                {/* Discussion content */}
                <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed line-clamp-3">
                  {interaction.content}
                </p>

                {/* Response Callout */}
                {interaction.response && (
                  <div className="p-2.5 rounded-lg bg-secondary/50 border border-border/80 text-xs text-muted-foreground space-y-0.5">
                    <span className="text-muted-foreground text-[10px] uppercase font-mono tracking-wider block font-semibold">
                      Their Response:
                    </span>
                    <p className="line-clamp-2 text-foreground/90">{interaction.response}</p>
                  </div>
                )}

                {/* Footer: Next Action, Sentiment, Record Link */}
                <div className="pt-2 border-t border-border/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3 text-xs">
                    {interaction.next_action ? (
                      <span className="text-muted-foreground text-[11px] truncate max-w-sm">
                        Next: <strong className="text-foreground">{interaction.next_action}</strong>
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">
                        Touchpoint recorded
                      </span>
                    )}

                    {interaction.sentiment && (
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border/60">
                        {interaction.sentiment}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedInteraction(interaction)
                    }}
                    className="text-xs font-mono text-primary group-hover:underline flex items-center gap-1"
                  >
                    View Record →
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Detail Modal */}
      <InteractionDetailModal
        interaction={selectedInteraction}
        onClose={() => setSelectedInteraction(null)}
      />
    </>
  )
}
