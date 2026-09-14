'use client'

import Link from 'next/link'
import {
  X,
  User,
  Building2,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  Shield,
  CheckCircle2,
  MessageSquareShare,
  ArrowRight,
  Globe
} from 'lucide-react'

interface InteractionDetailModalProps {
  interaction: any | null
  onClose: () => void
}

export function InteractionDetailModal({
  interaction,
  onClose,
}: InteractionDetailModalProps) {
  if (!interaction) return null

  const isOutbound = interaction.direction === 'outbound'
  const isInbound = interaction.direction === 'inbound'
  const date = new Date(interaction.interaction_date)

  const initials = interaction.contact?.full_name
    ? interaction.contact.full_name
        .split(' ')
        .map((n: string) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?'

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-xl bg-card border border-border p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto text-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <MessageSquareShare className="w-4 h-4 text-primary" />
            <h2 className="font-serif text-lg font-medium text-foreground">
              Professional Touchpoint Record
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contact Context Banner */}
        <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-serif text-sm font-bold text-primary shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <Link
                href={`/vault/contacts/${interaction.contact?.id || interaction.contact_id}`}
                className="font-medium text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1 group"
              >
                <span className="truncate">{interaction.contact?.full_name || 'Contact'}</span>
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary shrink-0" />
              </Link>
              <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                {interaction.contact?.role_title && (
                  <span>{interaction.contact.role_title}</span>
                )}
                {interaction.contact?.role_title && interaction.contact?.company?.name && (
                  <span>·</span>
                )}
                {interaction.contact?.company?.name && (
                  <span className="flex items-center gap-1 text-foreground/80">
                    <Building2 className="w-3 h-3 text-muted-foreground" />
                    {interaction.contact.company.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Link
            href={`/vault/contacts/${interaction.contact?.id || interaction.contact_id}`}
            className="px-2.5 py-1.5 rounded-lg bg-secondary text-primary hover:bg-secondary/80 text-[11px] font-mono border border-border transition-colors shrink-0"
          >
            Open Profile →
          </Link>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-2.5 rounded-lg bg-secondary/30 border border-border/70 space-y-1">
            <span className="text-[10px] font-mono uppercase text-muted-foreground">Channel</span>
            <p className="text-xs font-medium text-foreground uppercase font-mono">
              {interaction.channel}
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-secondary/30 border border-border/70 space-y-1">
            <span className="text-[10px] font-mono uppercase text-muted-foreground">Direction</span>
            <div className="flex items-center gap-1">
              {isOutbound && <ArrowUpRight className="w-3 h-3 text-emerald-400" />}
              {isInbound && <ArrowDownLeft className="w-3 h-3 text-electric" />}
              {!isOutbound && !isInbound && <FileText className="w-3 h-3 text-muted-foreground" />}
              <p className="text-xs font-medium text-foreground capitalize">
                {interaction.direction.replace('_', ' ')}
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-secondary/30 border border-border/70 space-y-1">
            <span className="text-[10px] font-mono uppercase text-muted-foreground">Identity</span>
            <p className="text-xs font-medium text-foreground truncate">
              {interaction.identity ? `@${interaction.identity.name}` : 'Default'}
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-secondary/30 border border-border/70 space-y-1">
            <span className="text-[10px] font-mono uppercase text-muted-foreground">Status</span>
            <p className="text-xs font-medium text-primary capitalize">
              {interaction.status || 'Completed'}
            </p>
          </div>
        </div>

        {/* Exact Timestamp & Purpose */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              {date.toLocaleString(undefined, {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>

            {interaction.sentiment && (
              <span className="text-[11px] uppercase px-2 py-0.5 rounded bg-secondary text-foreground font-mono">
                Sentiment: {interaction.sentiment}
              </span>
            )}
          </div>

          {interaction.purpose && (
            <div className="p-2.5 rounded-lg bg-secondary/40 border border-border/70 text-xs">
              <span className="font-mono text-[10px] uppercase text-muted-foreground block mb-0.5">
                Purpose / Objective
              </span>
              <p className="text-foreground font-medium">{interaction.purpose}</p>
            </div>
          )}

          {interaction.subject && (
            <div className="p-2.5 rounded-lg bg-secondary/40 border border-border/70 text-xs">
              <span className="font-mono text-[10px] uppercase text-muted-foreground block mb-0.5">
                Subject
              </span>
              <p className="text-foreground font-medium">{interaction.subject}</p>
            </div>
          )}
        </div>

        {/* Message / Conversation Content */}
        <div className="space-y-1.5">
          <span className="font-mono text-[10px] uppercase text-muted-foreground">
            Summary / Discussion Content
          </span>
          <div className="p-3.5 rounded-xl bg-secondary/20 border border-border text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {interaction.content}
          </div>
        </div>

        {/* Response / Outcome */}
        {interaction.response && (
          <div className="space-y-1.5">
            <span className="font-mono text-[10px] uppercase text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Outcome / Counterparty Response
            </span>
            <div className="p-3.5 rounded-xl bg-card border border-border text-xs leading-relaxed text-foreground whitespace-pre-wrap">
              {interaction.response}
            </div>
          </div>
        )}

        {/* Next Action & Follow-up */}
        {interaction.next_action && (
          <div className="p-3 rounded-xl bg-card border border-border/80 text-xs flex items-start gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-mono text-[10px] uppercase text-amber-400 font-semibold block">
                Recorded Next Action:
              </span>
              <p className="text-foreground font-medium">{interaction.next_action}</p>
              {interaction.follow_up_at && (
                <p className="font-mono text-[11px] text-muted-foreground pt-0.5">
                  Target Date: {new Date(interaction.follow_up_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
          <span>Logged: {new Date(interaction.created_at).toLocaleDateString()}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors font-sans text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
