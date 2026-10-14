import {
  ProviderAdapter,
  AdapterCompletionParams,
  ProviderStreamResult,
  ProviderError,
} from './types'
import { getProviderApiKey, getGroqModel, isProviderConfigured } from '../config'
import { ShawStreamChunk, ShawCompletionReason } from '../../types'

export function normalizeGroqFinishReason(raw: string | null | undefined): ShawCompletionReason {
  if (!raw) return 'interrupted'
  switch (raw) {
    case 'stop':
      return 'stop'
    case 'length':
      return 'length'
    case 'content_filter':
      return 'content_filter'
    default:
      return 'other'
  }
}

export class GroqAdapter implements ProviderAdapter {
  id = 'groq' as const
  name = 'Groq'

  isConfigured(): boolean {
    return isProviderConfigured('groq')
  }

  async streamCompletion(params: AdapterCompletionParams): Promise<ProviderStreamResult> {
    const apiKey = getProviderApiKey('groq')
    if (!apiKey) {
      throw new ProviderError({
        provider: 'groq',
        statusCode: 401,
        isRateLimit: false,
        isQuotaExceeded: false,
        message: 'GROQ_API_KEY is not configured in server environment',
      })
    }

    const model = params.modelOverride || getGroqModel()
    const startTime = Date.now()
    let tokensIn = 0
    let tokensOut = 0
    let rawFinishReason: string | null = null

    const formattedMessages: Array<{ role: string; content: string }> = []

    if (params.systemPrompt) {
      formattedMessages.push({
        role: 'system',
        content: params.systemPrompt,
      })
    }

    for (const msg of params.messages) {
      formattedMessages.push({
        role: msg.role,
        content: msg.content,
      })
    }

    const requestBody = {
      model,
      messages: formattedMessages,
      temperature: params.temperature ?? 0.7,
      stream: true,
    }

    const connectTimeoutMs = params.connectTimeoutMs ?? 8000
    const inactivityTimeoutMs = params.inactivityTimeoutMs ?? 10000
    const internalAbort = new AbortController()

    let connectTimer: NodeJS.Timeout | null = setTimeout(() => {
      internalAbort.abort(new Error('Connection timeout connecting to Groq (8s)'))
    }, connectTimeoutMs)

    const onParentAbort = () => {
      internalAbort.abort(params.signal?.reason || new Error('Aborted by parent signal'))
    }
    if (params.signal) {
      params.signal.addEventListener('abort', onParentAbort, { once: true })
    }

    let response: Response
    try {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: internalAbort.signal,
      })
    } catch (err: any) {
      const isTimeout =
        (internalAbort.signal.aborted && !params.signal?.aborted) ||
        err?.message?.includes('Connection timeout')
      throw new ProviderError({
        provider: 'groq',
        statusCode: isTimeout ? 504 : 500,
        isRateLimit: false,
        isQuotaExceeded: false,
        message: isTimeout
          ? 'Connection timeout connecting to Groq (8s)'
          : err.message || 'Network failure connecting to Groq',
      })
    } finally {
      if (connectTimer) {
        clearTimeout(connectTimer)
        connectTimer = null
      }
    }

    if (!response.ok) {
      if (params.signal) {
        params.signal.removeEventListener('abort', onParentAbort)
      }
      let errorMsg = response.statusText
      let isRateLimit = response.status === 429
      try {
        const errorJson = await response.json()
        errorMsg = errorJson?.error?.message || errorMsg
        if (errorMsg.toLowerCase().includes('rate limit') || errorMsg.toLowerCase().includes('quota')) {
          isRateLimit = true
        }
      } catch {}

      throw new ProviderError({
        provider: 'groq',
        statusCode: response.status,
        isRateLimit,
        isQuotaExceeded: isRateLimit,
        message: errorMsg,
      })
    }

    if (!response.body) {
      if (params.signal) {
        params.signal.removeEventListener('abort', onParentAbort)
      }
      throw new ProviderError({
        provider: 'groq',
        statusCode: 500,
        isRateLimit: false,
        isQuotaExceeded: false,
        message: 'Empty response body from Groq streaming endpoint',
      })
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    const stream = new ReadableStream<ShawStreamChunk>({
      async pull(controller) {
        try {
          while (true) {
            // Inactivity-bounded read
            let readTimer: NodeJS.Timeout | null = null
            let readResult: ReadableStreamReadResult<Uint8Array>

            try {
              const timeoutPromise = new Promise<never>((_, reject) => {
                readTimer = setTimeout(() => {
                  reader.cancel('Inactivity timeout').catch(() => {})
                  reject(new Error(`Provider read inactivity timeout (${inactivityTimeoutMs}ms)`))
                }, inactivityTimeoutMs)
              })

              readResult = await Promise.race([reader.read(), timeoutPromise])
            } finally {
              if (readTimer) clearTimeout(readTimer)
            }

            const { done, value } = readResult
            if (done) {
              const latencyMs = Date.now() - startTime
              const finishReason = normalizeGroqFinishReason(rawFinishReason)
              controller.enqueue({
                type: 'meta',
                provider: 'groq',
                model,
                tokensIn,
                tokensOut,
                latencyMs,
                finishReason,
                rawFinishReason: rawFinishReason || undefined,
              })

              if (finishReason === 'stop') {
                controller.enqueue({
                  type: 'done',
                  finishReason: 'stop',
                  rawFinishReason: rawFinishReason || undefined,
                })
              } else {
                controller.enqueue({
                  type: 'error',
                  error: `Groq generation ended abnormally: ${rawFinishReason || 'upstream_eof'} (reason: ${finishReason})`,
                  finishReason,
                  rawFinishReason: rawFinishReason || undefined,
                })
              }
              controller.close()
              return
            }

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed.startsWith('data:')) continue
              const jsonStr = trimmed.slice(5).trim()
              if (!jsonStr || jsonStr === '[DONE]') continue

              try {
                const parsed = JSON.parse(jsonStr)

                // Check x_groq usage if provided
                if (parsed.x_groq?.usage) {
                  tokensIn = parsed.x_groq.usage.prompt_tokens || tokensIn
                  tokensOut = parsed.x_groq.usage.completion_tokens || tokensOut
                } else if (parsed.usage) {
                  tokensIn = parsed.usage.prompt_tokens || tokensIn
                  tokensOut = parsed.usage.completion_tokens || tokensOut
                }

                const choice = parsed.choices?.[0]
                if (choice?.finish_reason) {
                  rawFinishReason = choice.finish_reason
                }

                const deltaText = choice?.delta?.content
                if (deltaText) {
                  controller.enqueue({
                    type: 'text',
                    text: deltaText,
                    provider: 'groq',
                    model,
                  })
                }
              } catch {
                // Ignore parse errors on partial chunks
              }
            }
          }
        } catch (err: any) {
          controller.enqueue({
            type: 'error',
            error: err.message || 'Stream read error from Groq',
            finishReason: 'interrupted',
            rawFinishReason: 'stream_exception',
          })
          controller.close()
        } finally {
          if (params.signal) {
            params.signal.removeEventListener('abort', onParentAbort)
          }
        }
      },
      cancel(reason) {
        if (params.signal) {
          params.signal.removeEventListener('abort', onParentAbort)
        }
        reader.cancel(reason).catch(() => {})
      },
    })

    return {
      stream,
      getUsage: () => ({
        tokensIn,
        tokensOut,
        latencyMs: Date.now() - startTime,
        finishReason: normalizeGroqFinishReason(rawFinishReason),
        rawFinishReason,
      }),
    }
  }
}
