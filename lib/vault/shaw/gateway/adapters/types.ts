import { ShawProvider, ShawStreamChunk } from '../../types'

export interface AdapterMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AdapterCompletionParams {
  systemPrompt: string
  messages: AdapterMessage[]
  temperature?: number
  modelOverride?: string
}

export interface ProviderErrorDetails {
  provider: ShawProvider
  statusCode: number
  isRateLimit: boolean
  isQuotaExceeded: boolean
  message: string
}

export class ProviderError extends Error {
  provider: ShawProvider
  statusCode: number
  isRateLimit: boolean
  isQuotaExceeded: boolean

  constructor(details: ProviderErrorDetails) {
    super(`[${details.provider}] HTTP ${details.statusCode}: ${details.message}`)
    this.name = 'ProviderError'
    this.provider = details.provider
    this.statusCode = details.statusCode
    this.isRateLimit = details.isRateLimit
    this.isQuotaExceeded = details.isQuotaExceeded
  }
}

export interface ProviderStreamResult {
  stream: ReadableStream<ShawStreamChunk>
  getUsage: () => { tokensIn: number; tokensOut: number; latencyMs: number }
}

export interface ProviderAdapter {
  id: ShawProvider
  name: string
  isConfigured(): boolean
  streamCompletion(params: AdapterCompletionParams): Promise<ProviderStreamResult>
}
