import {
  ProviderAdapter,
  AdapterCompletionParams,
  ProviderStreamResult,
  ProviderError,
} from './types'
import { getProviderApiKey, getGeminiModel, isProviderConfigured } from '../config'
import { ShawStreamChunk, ShawCompletionReason } from '../../types'

export function normalizeGeminiFinishReason(raw: string | null | undefined): ShawCompletionReason {
  if (!raw) return 'interrupted'
  switch (raw) {
    case 'STOP':
      return 'stop'
    case 'MAX_TOKENS':
      return 'length'
    case 'SAFETY':
      return 'safety'
    case 'RECITATION':
      return 'recitation'
    case 'BLOCKLIST':
    case 'PROHIBITED_CONTENT':
    case 'SPII':
      return 'content_filter'
    default:
      return 'other'
  }
}

export class GeminiAdapter implements ProviderAdapter {
  id = 'gemini' as const
  name = 'Google Gemini'

  isConfigured(): boolean {
    return isProviderConfigured('gemini')
  }

  async streamCompletion(params: AdapterCompletionParams): Promise<ProviderStreamResult> {
    const apiKey = getProviderApiKey('gemini')
    if (!apiKey) {
      throw new ProviderError({
        provider: 'gemini',
        statusCode: 401,
        isRateLimit: false,
        isQuotaExceeded: false,
        message: 'GEMINI_API_KEY is not configured in server environment',
      })
    }

    const model = params.modelOverride || getGeminiModel()
    const startTime = Date.now()
    let tokensIn = 0
    let tokensOut = 0
    let rawFinishReason: string | null = null

    // Map conversation messages to Gemini contents format
    // Gemini roles: 'user' or 'model'
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = []

    for (const msg of params.messages) {
      if (msg.role === 'system') continue // Handled via systemInstruction
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })
    }

    // Ensure at least one user content item
    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: 'Hello' }] })
    }

    const requestBody: Record<string, any> = {
      contents,
      generationConfig: {
        temperature: params.temperature ?? 0.7,
      },
    }

    if (params.systemPrompt) {
      requestBody.systemInstruction = {
        parts: [{ text: params.systemPrompt }],
      }
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:streamGenerateContent?alt=sse&key=${apiKey}`

    const connectTimeoutMs = params.connectTimeoutMs ?? 8000
    const inactivityTimeoutMs = params.inactivityTimeoutMs ?? 10000
    const internalAbort = new AbortController()

    let connectTimer: NodeJS.Timeout | null = setTimeout(() => {
      internalAbort.abort(new Error('Connection timeout connecting to Gemini (8s)'))
    }, connectTimeoutMs)

    const onParentAbort = () => {
      internalAbort.abort(params.signal?.reason || new Error('Aborted by parent signal'))
    }
    if (params.signal) {
      params.signal.addEventListener('abort', onParentAbort, { once: true })
    }

    let response: Response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
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
        provider: 'gemini',
        statusCode: isTimeout ? 504 : 500,
        isRateLimit: false,
        isQuotaExceeded: false,
        message: isTimeout
          ? 'Connection timeout connecting to Gemini (8s)'
          : err.message || 'Network failure connecting to Gemini',
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
      let isQuota = false
      try {
        const errorJson = await response.json()
        errorMsg = errorJson?.error?.message || errorMsg
        const statusStr = errorJson?.error?.status || ''
        if (statusStr === 'RESOURCE_EXHAUSTED' || errorMsg.toLowerCase().includes('quota')) {
          isQuota = true
        }
      } catch {}

      throw new ProviderError({
        provider: 'gemini',
        statusCode: response.status,
        isRateLimit: response.status === 429 || isQuota,
        isQuotaExceeded: isQuota || response.status === 429,
        message: errorMsg,
      })
    }

    if (!response.body) {
      if (params.signal) {
        params.signal.removeEventListener('abort', onParentAbort)
      }
      throw new ProviderError({
        provider: 'gemini',
        statusCode: 500,
        isRateLimit: false,
        isQuotaExceeded: false,
        message: 'Empty response body from Gemini streaming endpoint',
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
              const finishReason = normalizeGeminiFinishReason(rawFinishReason)
              controller.enqueue({
                type: 'meta',
                provider: 'gemini',
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
                  error: `Gemini generation ended abnormally: ${rawFinishReason || 'upstream_eof'} (reason: ${finishReason})`,
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

                // Check usageMetadata
                if (parsed.usageMetadata) {
                  if (typeof parsed.usageMetadata.promptTokenCount === 'number') {
                    tokensIn = parsed.usageMetadata.promptTokenCount
                  }
                  if (typeof parsed.usageMetadata.candidatesTokenCount === 'number') {
                    tokensOut = parsed.usageMetadata.candidatesTokenCount
                  }
                }

                // Check candidates
                const candidate = parsed.candidates?.[0]
                if (candidate?.finishReason) {
                  rawFinishReason = candidate.finishReason
                }

                if (candidate?.content?.parts) {
                  for (const part of candidate.content.parts) {
                    if (part.text) {
                      controller.enqueue({
                        type: 'text',
                        text: part.text,
                        provider: 'gemini',
                        model,
                      })
                    }
                  }
                }
              } catch {
                // Ignore parse errors on partial chunks
              }
            }
          }
        } catch (err: any) {
          controller.enqueue({
            type: 'error',
            error: err.message || 'Stream read error from Gemini',
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
        finishReason: normalizeGeminiFinishReason(rawFinishReason),
        rawFinishReason,
      }),
    }
  }
}
