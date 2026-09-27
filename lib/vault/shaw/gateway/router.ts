import { GeminiAdapter } from './adapters/gemini'
import { GroqAdapter } from './adapters/groq'
import { AdapterMessage, ProviderStreamResult, ProviderError } from './adapters/types'
import { ShawProvider, ShawRoutingMode, ShawStreamChunk, ShawCompletionReason } from '../types'
import { getGeminiModel, getGroqModel } from './config'

export interface RouteRequestParams {
  systemPrompt: string
  messages: AdapterMessage[]
  routingMode: ShawRoutingMode
  selectedModel?: string | null
  temperature?: number
  allowPaidFallback?: boolean
}

export interface RouteRequestResult {
  stream: ReadableStream<ShawStreamChunk>
  provider: ShawProvider
  model: string
  wasFallback: boolean
  getUsage: () => {
    tokensIn: number
    tokensOut: number
    latencyMs: number
    finishReason?: ShawCompletionReason
    rawFinishReason?: string | null
  }
}

export class ShawRoutingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ShawRoutingError'
  }
}

export async function routeRequest(params: RouteRequestParams): Promise<RouteRequestResult> {
  const geminiAdapter = new GeminiAdapter()
  const groqAdapter = new GroqAdapter()

  const {
    systemPrompt,
    messages,
    routingMode,
    selectedModel,
    temperature,
    allowPaidFallback = false,
  } = params

  // 1. Explicit Manual Selection: Gemini
  if (routingMode === 'gemini') {
    if (!geminiAdapter.isConfigured()) {
      throw new ShawRoutingError('Google Gemini is selected but GEMINI_API_KEY is not configured on the server.')
    }
    const model = selectedModel || getGeminiModel()
    const result = await geminiAdapter.streamCompletion({
      systemPrompt,
      messages,
      temperature,
      modelOverride: model,
    })
    return {
      stream: result.stream,
      provider: 'gemini',
      model,
      wasFallback: false,
      getUsage: result.getUsage,
    }
  }

  // 2. Explicit Manual Selection: Groq
  if (routingMode === 'groq') {
    if (!groqAdapter.isConfigured()) {
      throw new ShawRoutingError('Groq is selected but GROQ_API_KEY is not configured on the server.')
    }
    const model = selectedModel || getGroqModel()
    const result = await groqAdapter.streamCompletion({
      systemPrompt,
      messages,
      temperature,
      modelOverride: model,
    })
    return {
      stream: result.stream,
      provider: 'groq',
      model,
      wasFallback: false,
      getUsage: result.getUsage,
    }
  }

  // 3. AUTO — FREE FIRST (Default)
  let geminiError: any = null
  let geminiAttempted = false

  if (geminiAdapter.isConfigured()) {
    geminiAttempted = true
    try {
      const model = selectedModel || getGeminiModel()
      const result = await geminiAdapter.streamCompletion({
        systemPrompt,
        messages,
        temperature,
        modelOverride: model,
      })
      return {
        stream: result.stream,
        provider: 'gemini',
        model,
        wasFallback: false,
        getUsage: result.getUsage,
      }
    } catch (err: any) {
      geminiError = err
      // If error is rate limit or service error, proceed to fallback
    }
  }

  // Secondary Free Fallback: Groq
  if (groqAdapter.isConfigured()) {
    try {
      const model = selectedModel || getGroqModel()
      const result = await groqAdapter.streamCompletion({
        systemPrompt,
        messages,
        temperature,
        modelOverride: model,
      })
      return {
        stream: result.stream,
        provider: 'groq',
        model,
        wasFallback: geminiAttempted,
        getUsage: result.getUsage,
      }
    } catch (groqErr: any) {
      // Both free providers failed
    }
  }

  // 4. All free providers exhausted / unavailable
  if (!allowPaidFallback) {
    throw new ShawRoutingError('Free AI capacity is currently unavailable. Paid fallback is disabled.')
  }

  throw new ShawRoutingError('Free AI capacity is currently unavailable. No paid provider is currently configured.')
}
