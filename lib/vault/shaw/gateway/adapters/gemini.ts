import {
  ProviderAdapter,
  AdapterCompletionParams,
  ProviderStreamResult,
  ProviderError,
} from './types'
import { getProviderApiKey, getGeminiModel, isProviderConfigured } from '../config'
import { ShawStreamChunk } from '../../types'

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

    let response: Response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })
    } catch (err: any) {
      throw new ProviderError({
        provider: 'gemini',
        statusCode: 500,
        isRateLimit: false,
        isQuotaExceeded: false,
        message: err.message || 'Network failure connecting to Gemini',
      })
    }

    if (!response.ok) {
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
            const { done, value } = await reader.read()
            if (done) {
              const latencyMs = Date.now() - startTime
              controller.enqueue({
                type: 'meta',
                provider: 'gemini',
                model,
                tokensIn,
                tokensOut,
                latencyMs,
              })
              controller.enqueue({ type: 'done' })
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
          })
          controller.close()
        }
      },
      cancel() {
        reader.cancel()
      },
    })

    return {
      stream,
      getUsage: () => ({
        tokensIn,
        tokensOut,
        latencyMs: Date.now() - startTime,
      }),
    }
  }
}
