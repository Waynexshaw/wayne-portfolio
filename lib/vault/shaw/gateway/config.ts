import { ShawProvider, ProviderConfig } from '../types'

/**
 * Server-Side Static Provider Configuration
 *
 * Invariants:
 * - Credentials are read ONLY from server-side environment variables.
 * - Model IDs are configurable via environment variables with safe defaults.
 * - No secrets are exposed to client code or serialized to browser bundles.
 */

export function getGeminiModel(): string {
  return process.env.SHAW_GEMINI_MODEL || 'gemini-1.5-flash'
}

export function getGroqModel(): string {
  return process.env.SHAW_GROQ_MODEL || 'llama-3.3-70b-versatile'
}

export function getProviderApiKey(provider: ShawProvider): string | null {
  switch (provider) {
    case 'gemini':
      return process.env.GEMINI_API_KEY || null
    case 'groq':
      return process.env.GROQ_API_KEY || null
    default:
      return null
  }
}

export function isProviderConfigured(provider: ShawProvider): boolean {
  const key = getProviderApiKey(provider)
  return Boolean(key && key.trim().length > 0)
}

export function getProviderRegistry(): Record<ShawProvider, ProviderConfig> {
  return {
    gemini: {
      id: 'gemini',
      name: 'Google Gemini',
      modelId: getGeminiModel(),
      connectionType: 'api_key',
      costMode: 'free',
      priority: 1,
      enabled: isProviderConfigured('gemini'),
      isPaid: false,
    },
    groq: {
      id: 'groq',
      name: 'Groq',
      modelId: getGroqModel(),
      connectionType: 'api_key',
      costMode: 'free',
      priority: 2,
      enabled: isProviderConfigured('groq'),
      isPaid: false,
    },
    openai: {
      id: 'openai',
      name: 'OpenAI',
      modelId: process.env.SHAW_OPENAI_MODEL || 'gpt-4o-mini',
      connectionType: 'api_key',
      costMode: 'paid',
      priority: 10,
      enabled: false, // Deferred post-Batch 1
      isPaid: true,
    },
    anthropic: {
      id: 'anthropic',
      name: 'Anthropic Claude',
      modelId: process.env.SHAW_ANTHROPIC_MODEL || 'claude-3-5-sonnet',
      connectionType: 'api_key',
      costMode: 'paid',
      priority: 11,
      enabled: false, // Deferred post-Batch 1
      isPaid: true,
    },
    open_router: {
      id: 'open_router',
      name: 'OpenRouter',
      modelId: process.env.SHAW_OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
      connectionType: 'hosted_open',
      costMode: 'free',
      priority: 5,
      enabled: false, // Architecture-ready
      isPaid: false,
    },
    local: {
      id: 'local',
      name: 'Local Model',
      modelId: process.env.SHAW_LOCAL_MODEL || 'local-default',
      connectionType: 'local',
      costMode: 'local',
      priority: 20,
      enabled: false, // Architecture-ready
      isPaid: false,
    },
  }
}

export function getAvailableProviders(): ProviderConfig[] {
  const registry = getProviderRegistry()
  // Return enabled providers sorted by priority ascending
  return Object.values(registry)
    .filter((p) => p.enabled)
    .sort((a, b) => a.priority - b.priority)
}

export function getProviderConfig(provider: ShawProvider): ProviderConfig {
  const registry = getProviderRegistry()
  return registry[provider]
}
