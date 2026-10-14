import { NextRequest } from 'next/server'
import { executeShawChatTurn } from '@/lib/vault/shaw/chat-service'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  return executeShawChatTurn(request)
}
