import { getVaultContext, getInteractions, getContacts } from '@/lib/vault/actions'
import { MessageSquareShare, ArrowUpRight, ArrowDownLeft, Clock, Calendar } from 'lucide-react'
import { InteractionCreateButton } from './create-button'

export const dynamic = 'force-dynamic'

export default async function VaultInteractionsPage() {
  const context = await getVaultContext()
  const activeWorkspace = context?.activeWorkspace
  const interactions = await getInteractions(activeWorkspace?.id).catch(() => [])
  const contacts = await getContacts(activeWorkspace?.id).catch(() => [])

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl font-medium text-foreground">
              Interactions & Touchpoints
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
              {interactions.length} Total
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Complete conversational memory across X, Telegram, LinkedIn, email, and meetings.
          </p>
        </div>

        <InteractionCreateButton 
          workspaceId={activeWorkspace?.id} 
          contacts={contacts}
          identities={context?.identities || []}
        />
      </div>

      <div className="space-y-4">
        {interactions.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm bg-card border border-border rounded-xl">
            <MessageSquareShare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No interactions logged yet. Record your touchpoints to maintain relationship context.</p>
          </div>
        ) : (
          interactions.map((interaction: any) => (
            <div 
              key={interaction.id} 
              className="p-5 rounded-xl bg-card border border-border space-y-3 hover:border-primary/40 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-primary">
                    {interaction.direction === 'outbound' ? (
                      <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <ArrowDownLeft className="w-4 h-4 text-electric" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground">
                      {interaction.contact?.full_name || 'Contact'}
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono">
                      Via <strong className="uppercase text-foreground">{interaction.channel}</strong> · {interaction.direction}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(interaction.interaction_date).toLocaleString()}</span>
                </div>
              </div>

              {interaction.purpose && (
                <div className="text-xs text-foreground font-medium bg-secondary/40 px-3 py-1.5 rounded-lg border border-border/60">
                  Purpose: {interaction.purpose}
                </div>
              )}

              <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {interaction.content}
              </p>

              {interaction.response && (
                <div className="p-3 rounded-lg bg-secondary/60 border border-border/80 text-xs text-muted-foreground space-y-1">
                  <strong className="text-emerald-400 text-[10px] uppercase font-mono tracking-wider block">Their Response:</strong>
                  <p>{interaction.response}</p>
                </div>
              )}

              {interaction.next_action && (
                <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Next: <strong className="text-foreground">{interaction.next_action}</strong>
                  </span>
                  {interaction.follow_up_at && (
                    <span className="text-amber-400 font-mono text-[11px] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Follow-up: {new Date(interaction.follow_up_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}