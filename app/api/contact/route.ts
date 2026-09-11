import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'

const contactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(200),
  company: z.string().max(200).optional(),
  reason: z.string().max(100).optional(),
  message: z.string().min(10).max(5000),
})

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const limit = rateLimitMap.get(ip)
  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (limit.count >= 3) return false
  limit.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in a minute.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const parsed = contactSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid form data', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()
    const { error } = await (supabase as any).from('messages').insert({
      name: parsed.data.name,
      email: parsed.data.email,
      company: parsed.data.company ?? null,
      reason: parsed.data.reason ?? null,
      message: parsed.data.message,
      status: 'unread',
    })

    if (error) {
      console.error('Failed to save message:', error)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error('Contact form error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
