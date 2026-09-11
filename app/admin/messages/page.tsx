import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import { MarkReadButton } from '@/components/admin/mark-read-button'
import type { Database } from '@/lib/database.types'

type MessageRow = Database['public']['Tables']['messages']['Row']

export default async function AdminMessagesPage() {
  const supabase = await createClient()
  const { data: rawMessages } = await (supabase as any)
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })

  const messages = (rawMessages || []) as MessageRow[]

  return (
    <div>
      <h1 className="text-2xl font-serif font-medium mb-8">Messages</h1>

      {messages.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-muted-foreground text-sm">No messages yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`surface p-6 ${msg.status === 'unread' ? 'border-violet-600/40' : ''}`}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-foreground">{msg.name}</h3>
                    {msg.status === 'unread' && (
                      <span className="text-xs bg-violet-600/20 text-violet-400 px-2 py-0.5 rounded-full">
                        New
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <a href={`mailto:${msg.email}`} className="hover:text-foreground transition-colors">
                      {msg.email}
                    </a>
                    {msg.company && <> · {msg.company}</>}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">{formatDate(msg.created_at)}</span>
                  {msg.reason && (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                      {msg.reason}
                    </span>
                  )}
                  {msg.status === 'unread' && (
                    <MarkReadButton messageId={msg.id} />
                  )}
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {msg.message}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
