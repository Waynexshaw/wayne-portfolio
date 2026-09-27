import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { routeRequest, ShawRoutingError } from '@/lib/vault/shaw/gateway/router'
import { getSystemPromptForIdentity } from '@/lib/vault/shaw/voice/defiwaynex'
import { appendCtaIfRequested, resolveCtaIntent } from '@/lib/vault/shaw/voice/cta'
import { resolveFormatIntent, resolveDepthIntent } from '@/lib/vault/shaw/voice/depth'
import { resolveFormatProfile } from '@/lib/vault/shaw/voice/profiles'
import { scanVoiceCompliance, getHardViolations } from '@/lib/vault/shaw/voice/compliance'
import { ShawCapability, ShawRoutingMode, ShawStreamChunk, ShawCompletionReason } from '@/lib/vault/shaw/types'
import { AdapterMessage } from '@/lib/vault/shaw/gateway/adapters/types'
import {
  planRetrieval,
  executeVaultRetrieval,
  serializeVaultContextForPrompt,
  extractCitationsFromEnvelope,
  VaultContextEnvelope,
} from '@/lib/vault/shaw/retrieval'

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
      existingUserMessageId,
      timezone: bodyTimezone,
    } = body

    const userTimezone =
      (typeof bodyTimezone === 'string' && bodyTimezone.trim()) ||
      request.headers.get('x-timezone') ||
      request.headers.get('x-user-timezone') ||
      undefined

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

    // 3. User Message Turn Handling (New Turn vs. Validated Retry)
    let userMessageId: string | null = null
    const isRetry = Boolean(existingUserMessageId)

    if (existingUserMessageId) {
      if (typeof existingUserMessageId !== 'string') {
        return NextResponse.json({ error: 'Invalid retry message parameter' }, { status: 400 })
      }

      // Authorization & Scope Validation:
      // Verify message exists, belongs to the current workspace, active conversation, and has role='user'
      const { data: existingMsg, error: existErr } = await (supabase as any)
        .from('shaw_messages')
        .select('id, conversation_id, workspace_id, role, content, created_at')
        .eq('id', existingUserMessageId)
        .eq('workspace_id', workspaceId)
        .eq('conversation_id', conversationId)
        .eq('role', 'user')
        .maybeSingle()

      if (existErr || !existingMsg) {
        return NextResponse.json(
          { error: 'Invalid retry message: target message not found or unauthorized' },
          { status: 400 }
        )
      }

      // Retry Target Integrity:
      // Content must match the logical user turn prompt
      if (existingMsg.content !== trimmedMessage) {
        return NextResponse.json(
          { error: 'Invalid retry message: content does not match existing turn' },
          { status: 400 }
        )
      }

      // Verify that no assistant message was already successfully inserted after this user turn
      const { data: subsequentAssistantMsgs, error: subErr } = await (supabase as any)
        .from('shaw_messages')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('workspace_id', workspaceId)
        .eq('role', 'assistant')
        .gt('created_at', existingMsg.created_at)
        .limit(1)

      if (subErr || (subsequentAssistantMsgs && subsequentAssistantMsgs.length > 0)) {
        return NextResponse.json(
          { error: 'Invalid retry message: turn has already received an assistant response' },
          { status: 400 }
        )
      }

      // Logical user turn preserved without duplicate insertion
      userMessageId = existingMsg.id
    } else {
      // New user turn: persist user message
      const { data: insertedMsg, error: msgErr } = await (supabase as any)
        .from('shaw_messages')
        .insert({
          conversation_id: conversationId,
          workspace_id: workspaceId,
          role: 'user',
          content: trimmedMessage,
        })
        .select('id')
        .maybeSingle()

      if (msgErr) {
        console.error('Error persisting user message:', msgErr)
      }
      userMessageId = insertedMsg?.id || null
    }

    // 4. Load recent conversation history (bounded to last 12 messages ending with the latest user turn)
    const { data: recentMessages } = await (supabase as any)
      .from('shaw_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(12)

    const history: AdapterMessage[] = (recentMessages || [])
      .reverse()
      .map((m: any) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      }))

    // Guarantee provider payload ordering: the history must culminate in the current user turn
    if (
      history.length === 0 ||
      history[history.length - 1].role !== 'user' ||
      history[history.length - 1].content !== trimmedMessage
    ) {
      history.push({
        role: 'user',
        content: trimmedMessage,
      })
    }

    // 5. Build system instructions
    const identity = conversation.identity || null
    const format = resolveFormatIntent(trimmedMessage)
    const profile = resolveFormatProfile(trimmedMessage)
    const depth = resolveDepthIntent(trimmedMessage)
    const ctaIntent = resolveCtaIntent(trimmedMessage)

    // Batch 2A: Deterministic Retrieval Planner & Execution
    const retrievalPlan = planRetrieval({
      prompt: trimmedMessage,
      capability: capability as ShawCapability,
      history,
      timezone: userTimezone,
    })

    let vaultEnvelope: VaultContextEnvelope | null = null
    let vaultContextPrompt: string | undefined = undefined
    let retrievalLatencyMs = 0

    if (retrievalPlan.shouldRetrieve) {
      const retrievalStart = Date.now()
      try {
        vaultEnvelope = await executeVaultRetrieval(supabase, workspaceId, retrievalPlan)
      } catch (retrievalErr) {
        console.error('Vault retrieval failed, continuing with unaugmented prompt:', retrievalErr)
      }
      retrievalLatencyMs = Date.now() - retrievalStart
      if (vaultEnvelope) {
        vaultContextPrompt = serializeVaultContextForPrompt(vaultEnvelope)
      }
    }

    const systemPrompt = getSystemPromptForIdentity(identity, capability as ShawCapability, {
      format,
      profile,
      depth,
      prompt: trimmedMessage,
      vaultContext: vaultContextPrompt,
    })

    // 6. Check user preferences for paid fallback
    const { data: prefs } = await (supabase as any)
      .from('shaw_user_preferences')
      .select('allow_paid_fallback')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle()

    const allowPaidFallback = Boolean(prefs?.allow_paid_fallback)

    // 7. Create initial audit run entry with non-sensitive generation intent
    const { data: runRecord } = await (supabase as any)
      .from('shaw_ai_runs')
      .insert({
        workspace_id: workspaceId,
        conversation_id: conversationId,
        capability,
        provider: routingMode === 'auto_free_first' ? 'auto' : routingMode,
        model: selectedModel || 'default',
        status: 'started',
        metadata: {
          format,
          profile,
          depth,
          cta_intent: ctaIntent,
          user_message_id: userMessageId,
          retrieval: retrievalPlan.shouldRetrieve
            ? {
                should_retrieve: true,
                domains: Array.from(new Set(retrievalPlan.intents.map((i) => i.domain))),
                record_count: vaultEnvelope?.records.length ?? 0,
                ambiguity_count: vaultEnvelope?.ambiguities.length ?? 0,
                truncated: vaultEnvelope?.truncated ?? false,
                retrieval_latency_ms: retrievalLatencyMs,
              }
            : {
                should_retrieve: false,
                reason: retrievalPlan.reason,
              },
          ...(isRetry && userMessageId
            ? { is_retry: true, retry_of_message_id: userMessageId }
            : {}),
        },
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

      const status =
        typeof routeErr.statusCode === 'number'
          ? routeErr.statusCode
          : routeErr instanceof ShawRoutingError
          ? 503
          : 500

      return NextResponse.json(
        {
          error: routeErr.message || 'Routing failure',
          provider: routeErr.provider || (routingMode === 'auto_free_first' ? 'auto' : routingMode),
          statusCode: status,
          userMessageId,
        },
        { status }
      )
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
    let isCompleted = false
    let streamError: { message: string; finishReason?: ShawCompletionReason; rawFinishReason?: string } | null = null
    let receivedAdapterDone = false
    let adapterFinishReason: ShawCompletionReason | null = null
    let adapterRawFinishReason: string | null = null

    const outputStream = new ReadableStream({
      async pull(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              break
            }

            if (value.type === 'text' && value.text) {
              fullResponseText += value.text
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(value)}\n\n`))
            } else if (value.type === 'meta') {
              if (value.finishReason) adapterFinishReason = value.finishReason
              if (value.rawFinishReason) adapterRawFinishReason = value.rawFinishReason
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(value)}\n\n`))
            } else if (value.type === 'done') {
              receivedAdapterDone = true
              if (value.finishReason) adapterFinishReason = value.finishReason
              if (value.rawFinishReason) adapterRawFinishReason = value.rawFinishReason
            } else if (value.type === 'error') {
              streamError = {
                message: value.error || 'Provider stream error',
                finishReason: value.finishReason,
                rawFinishReason: value.rawFinishReason,
              }
              if (value.finishReason) adapterFinishReason = value.finishReason
              if (value.rawFinishReason) adapterRawFinishReason = value.rawFinishReason
              break
            }
          }

          if (isCompleted) return
          isCompleted = true

          const usage = getUsage()
          const effectiveFinishReason: ShawCompletionReason =
            adapterFinishReason || usage.finishReason || (receivedAdapterDone ? 'stop' : 'interrupted')
          const effectiveRawFinishReason = adapterRawFinishReason || usage.rawFinishReason || null

          const isConfirmedNormal =
            !streamError && receivedAdapterDone && effectiveFinishReason === 'stop'

          if (isConfirmedNormal) {
            // Post-processing on stream completion
            const finalWithCta = appendCtaIfRequested(fullResponseText, trimmedMessage)

            // If CTA was appended, stream extra chunk
            if (finalWithCta.length > fullResponseText.length) {
              const ctaDiff = finalWithCta.slice(fullResponseText.length)
              const ctaChunk: ShawStreamChunk = { type: 'text', text: ctaDiff }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(ctaChunk)}\n\n`))
              fullResponseText = finalWithCta
            }

            // Only persist assistant message if non-empty response was generated
            if (fullResponseText.trim().length > 0) {
              const citations =
                vaultEnvelope && vaultEnvelope.records.length > 0
                  ? extractCitationsFromEnvelope(vaultEnvelope)
                  : []

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
                citations,
              })
            }

            // Scan voice compliance for observability and audit logging (no blind regex rewriting)
            const compliance = scanVoiceCompliance(fullResponseText, { ctaIntent })
            const hardViolations = getHardViolations(compliance)

            // Update run audit record to completed
            if (runId) {
              await (supabase as any)
                .from('shaw_ai_runs')
                .update({
                  status: 'completed',
                  tokens_in: usage.tokensIn || null,
                  tokens_out: usage.tokensOut || null,
                  latency_ms: usage.latencyMs || null,
                  metadata: {
                    format,
                    profile,
                    depth,
                    cta_intent: ctaIntent,
                    compliance_passed: compliance.passed,
                    hard_violations: hardViolations.map((v) => v.name),
                    user_message_id: userMessageId,
                    finish_reason: 'stop',
                    raw_finish_reason: effectiveRawFinishReason || 'stop',
                    retrieval: retrievalPlan.shouldRetrieve
                      ? {
                          should_retrieve: true,
                          domains: Array.from(new Set(retrievalPlan.intents.map((i) => i.domain))),
                          record_count: vaultEnvelope?.records.length ?? 0,
                          ambiguity_count: vaultEnvelope?.ambiguities.length ?? 0,
                          truncated: vaultEnvelope?.truncated ?? false,
                          retrieval_latency_ms: retrievalLatencyMs,
                        }
                      : {
                          should_retrieve: false,
                          reason: retrievalPlan.reason,
                        },
                    ...(isRetry && userMessageId
                      ? { is_retry: true, retry_of_message_id: userMessageId }
                      : {}),
                  },
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

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'done', finishReason: 'stop' })}\n\n`)
            )
            controller.close()
            return
          } else {
            // Abnormal, interrupted, or truncated completion:
            // DO NOT insert assistant turn into shaw_messages!
            // This ensures retry eligibility is preserved (lastAssistant remains null).
            const errorMessage =
              streamError?.message ||
              (effectiveFinishReason === 'length'
                ? 'Response exceeded maximum token length before completion'
                : effectiveFinishReason === 'content_filter' ||
                  effectiveFinishReason === 'safety' ||
                  effectiveFinishReason === 'recitation'
                ? `Response generation was stopped by provider ${effectiveFinishReason} filter`
                : 'Response generation was interrupted before completion')

            if (runId) {
              await (supabase as any)
                .from('shaw_ai_runs')
                .update({
                  status: 'failed',
                  error_message: errorMessage,
                  tokens_in: usage.tokensIn || null,
                  tokens_out: usage.tokensOut || null,
                  latency_ms: usage.latencyMs || null,
                  metadata: {
                    format,
                    profile,
                    depth,
                    cta_intent: ctaIntent,
                    interrupted: true,
                    finish_reason: effectiveFinishReason,
                    raw_finish_reason: effectiveRawFinishReason,
                    partial_text: fullResponseText,
                    user_message_id: userMessageId,
                    retrieval: retrievalPlan.shouldRetrieve
                      ? {
                          should_retrieve: true,
                          domains: Array.from(new Set(retrievalPlan.intents.map((i) => i.domain))),
                          record_count: vaultEnvelope?.records.length ?? 0,
                          ambiguity_count: vaultEnvelope?.ambiguities.length ?? 0,
                          truncated: vaultEnvelope?.truncated ?? false,
                          retrieval_latency_ms: retrievalLatencyMs,
                        }
                      : {
                          should_retrieve: false,
                          reason: retrievalPlan.reason,
                        },
                    ...(isRetry && userMessageId
                      ? { is_retry: true, retry_of_message_id: userMessageId }
                      : {}),
                  },
                })
                .eq('id', runId)
            }

            const errChunk: ShawStreamChunk = {
              type: 'error',
              error: errorMessage,
              finishReason: effectiveFinishReason,
              rawFinishReason: effectiveRawFinishReason || undefined,
              userMessageId,
              provider,
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errChunk)}\n\n`))
            controller.close()
            return
          }
        } catch (err: any) {
          if (!isCompleted && runId) {
            isCompleted = true
            const usage = getUsage ? getUsage() : { tokensIn: 0, tokensOut: 0, latencyMs: 0 }
            await (supabase as any)
              .from('shaw_ai_runs')
              .update({
                status: 'failed',
                error_message: err.message || 'Stream processing error',
                tokens_in: usage.tokensIn || null,
                tokens_out: usage.tokensOut || null,
                latency_ms: usage.latencyMs || null,
                metadata: {
                  format,
                  profile,
                  depth,
                  cta_intent: ctaIntent,
                  interrupted: true,
                  finish_reason: 'error',
                  raw_finish_reason: 'server_exception',
                  partial_text: fullResponseText,
                  user_message_id: userMessageId,
                  ...(isRetry && userMessageId
                    ? { is_retry: true, retry_of_message_id: userMessageId }
                    : {}),
                },
              })
              .eq('id', runId)
          }

          const errChunk: ShawStreamChunk = {
            type: 'error',
            error: err.message || 'Stream processing error',
            finishReason: 'error',
            rawFinishReason: 'server_exception',
            userMessageId,
            provider,
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errChunk)}\n\n`))
          controller.close()
        }
      },
      async cancel(reason) {
        try {
          await reader.cancel(reason)
        } catch {}

        if (!isCompleted && runId) {
          isCompleted = true
          try {
            const usage = getUsage ? getUsage() : { tokensIn: 0, tokensOut: 0, latencyMs: 0 }
            await (supabase as any)
              .from('shaw_ai_runs')
              .update({
                status: 'failed',
                error_message: 'Client disconnected or stream cancelled by user',
                tokens_in: usage.tokensIn || null,
                tokens_out: usage.tokensOut || null,
                latency_ms: usage.latencyMs || null,
                metadata: {
                  format,
                  profile,
                  depth,
                  cta_intent: ctaIntent,
                  interrupted: true,
                  finish_reason: 'interrupted',
                  raw_finish_reason: 'client_abort',
                  partial_text: fullResponseText,
                  user_message_id: userMessageId,
                  ...(isRetry && userMessageId
                    ? { is_retry: true, retry_of_message_id: userMessageId }
                    : {}),
                },
              })
              .eq('id', runId)
          } catch (dbErr) {
            console.error('Error updating run status on cancel:', dbErr)
          }
        }
      },
    })

    const headers: Record<string, string> = {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    }
    if (userMessageId) {
      headers['x-shaw-user-message-id'] = userMessageId
    }

    return new Response(outputStream, { headers })
  } catch (error: any) {
    console.error('Unhandled error in SHAW chat route:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
