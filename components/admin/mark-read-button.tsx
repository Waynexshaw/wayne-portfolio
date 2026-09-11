'use client'

import { useRouter } from 'next/navigation'

export function MarkReadButton({ messageId }: { messageId: string }) {
  const router = useRouter()

  const handleMarkRead = async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await (supabase as any).from('messages').update({ status: 'read' }).eq('id', messageId)
    router.refresh()
  }

  return (
    <button
      onClick={handleMarkRead}
      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      Mark read
    </button>
  )
}
