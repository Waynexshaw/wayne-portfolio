import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { routeRequest, ShawRoutingError } from '@/lib/vault/shaw/gateway/router'
import { getSystemPromptForIdentity } from '@/lib/vault/shaw/voice/defiwaynex'
import { appendCtaIfRequested } from '@/lib/vault/shaw/voice/cta'
import { ShawCapability, ShawRoutingMode, ShawStreamChunk } from '@/lib/vault/shaw/types'
import { AdapterMessage } from '@/lib/vault/shaw/gateway/adapters/types'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      workspaceId,
      conversationId,
      message,
      capability = 'ask',
      routingMode = 'auto_free_first',
      selectedModel,
    } = body

    if (!workspaceId || !conversationId || !message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Missing required parameters (workspaceId, conversationId, message)' },
        { status: 400 }
      )
    }

    const trimmedMessage = message.trim()
    if (!trimmedMessage) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
    }

    // 1. Verify workspace membership
    const { data: membership } = await (supabase as any)
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden: workspace membership required' }, { status: 403 })
    }

    // 2. Verify conversation
    const { data: conversation } = await (supabase as any)
      .from('shaw_conversations')
      .select('*, identity:identities(*)')
      .eq('id', conversationId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // 3. Persist user message
    const { error: msgErr } = await (supabase as any).from('shaw_messages').insert({
      conversation_id: conversationId,
      workspace_id: workspaceId,
      role: 'user',
      content: trimmedMessage,
    })

    if (msgErr) {
      console.error('Error persisting user message:', msgErr)
    }

    // 4. Load recent conversation history (bounded to last 12 messages)
    const { data: recentMessages } = await (supabase as any)
      .from('shaw_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true })
      .limit(12)

    const history: AdapterMessage[] = (recentMessages || []).map((m: any) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }))

    // 5. Build system instructions
    const identity = conversation.identity || null
    const systemPrompt = getSystemPromptForIdentity(identity, capability as ShawCapability)

    // 6. Check user preferences for paid fallback
    const { data: prefs } = await (supabase as any)
      .from('shaw_user_preferences')
      .select('allow_paid_fallback')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle()

    const allowPaidFallback = Boolean(prefs?.allow_paid_fallback)

    // 7. Create initial audit run entry
    const { data: runRecord } = await (supabase as any)
      .from('shaw_ai_runs')
      .insert({
        workspace_id: workspaceId,
        conversation_id: conversationId,
        capability,
        provider: routingMode === 'auto_free_first' ? 'auto' : routingMode,
        model: selectedModel || 'default',
        status: 'started',
      })
      .select('id')
      .maybeSingle()

    const runId = runRecord?.id

    // 8. Route to intelligence provider
    let routeResult
    try {
      routeResult = await routeRequest({
        systemPrompt,
        messages: history,
        routingMode: routingMode as ShawRoutingMode,
        selectedModel: selectedModel || conversation.selected_model,
        allowPaidFallback,
      })
    } catch (routeErr: any) {
      if (runId) {
        await (supabase as any)
          .from('shaw_ai_runs')
          .update({
            status: 'failed',
            error_message: routeErr.message || 'Routing failed',
          })
          .eq('id', runId)
      }

      const status = routeErr instanceof ShawRoutingError ? 503 : 500
      return NextResponse.json({ error: routeErr.message || 'Routing failure' }, { status })
    }

    const { stream, provider, model, wasFallback, getUsage } = routeResult

    // 9. Update run with resolved provider & model
    if (runId) {
      await (supabase as any)
        .from('shaw_ai_runs')
        .update({
          provider,
          model,
          status: wasFallback ? 'fallback' : 'streaming',
        })
        .eq('id', runId)
    }

    // 10. Transform stream to SSE and accumulate response
    const reader = stream.getReader()
    const encoder = new TextEncoder()
    let fullResponseText = ''

    const outputStream = new ReadableStream({
      async pull(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              // Post-processing on stream completion
              const finalWithCta = appendCtaIfRequested(fullResponseText, trimmedMessage)

              // If CTA was appended, stream extra chunk
              if (finalWithCta.length > fullResponseText.length) {
                const ctaDiff = finalWithCta.slice(fullResponseText.length)
                const ctaChunk: ShawStreamChunk = { type: 'text', text: ctaDiff }
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(ctaChunk)}\n\n`))
                fullResponseText = finalWithCta
              }

              const usage = getUsage()

              // Save assistant message to database
              await (supabase as any).from('shaw_messages').insert({
                conversation_id: conversationId,
                workspace_id: workspaceId,
                role: 'assistant',
                content: fullResponseText,
                model_provider: provider,
                model_name: model,
                tokens_in: usage.tokensIn || null,
                tokens_out: usage.tokensOut || null,
                latency_ms: usage.latencyMs || null,
              })

              // Update run audit record
              if (runId) {
                await (supabase as any)
                  .from('shaw_ai_runs')
                  .update({
                    status: 'completed',
                    tokens_in: usage.tokensIn || null,
                    tokens_out: usage.tokensOut || null,
                    latency_ms: usage.latencyMs || null,
                  })
                  .eq('id', runId)
              }

              // Update conversation updated_at and title if initial
              const updates: Record<string, any> = {
                updated_at: new Date().toISOString(),
              }
              if (conversation.title === 'New Conversation') {
                const newTitle = trimmedMessage.slice(0, 48).trim()
                updates.title = newTitle.length > 0 ? newTitle : 'Conversation'
              }

              await (supabase as any)
                .from('shaw_conversations')
                .update(updates)
                .eq('id', conversationId)

              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
              controller.close()
              return
            }

            if (value.type === 'text' && value.text) {
              fullResponseText += value.text
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify(value)}\n\n`))
          }
        } catch (err: any) {
          if (runId) {
            await (supabase as any)
              .from('shaw_ai_runs')
              .update({
                status: 'failed',
                error_message: err.message,
              })
              .eq('id', runId)
          }

          const errChunk: ShawStreamChunk = {
            type: 'error',
            error: err.message || 'Stream processing error',
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errChunk)}\n\n`))
          controller.close()
        }
      },
      cancel() {
        reader.cancel()
      },
    })

    return new Response(outputStream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })
  } catch (error: any) {
    console.error('Unhandled error in SHAW chat route:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
