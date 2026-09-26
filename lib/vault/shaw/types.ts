export type ShawProvider =
  | 'gemini'
  | 'groq'
  | 'openai'
  | 'anthropic'
  | 'open_router'
  | 'local'

export type ShawCapability = 'ask' | 'create' | 'research' | 'analyze'

export type ShawRoutingMode = 'auto_free_first' | 'gemini' | 'groq' | 'manual'

export type ShawCostMode = 'free' | 'paid' | 'subscription' | 'local' | 'unknown'

export type ShawConnectionType =
  | 'api_key'
  | 'oauth'
  | 'subscription'
  | 'hosted_open'
  | 'local'

export interface ProviderConfig {
  id: ShawProvider
  name: string
  modelId: string
  connectionType: ShawConnectionType
  costMode: ShawCostMode
  priority: number
  enabled: boolean
  isPaid: boolean
}

export interface ShawConversation {
  id: string
  workspace_id: string
  identity_id?: string | null
  title: string
  routing_mode: ShawRoutingMode
  selected_model?: string | null
  capability: ShawCapability
  is_archived: boolean
  created_by?: string | null
  created_at: string
  updated_at: string
  // Optional client-side augmented data
  messages_count?: number
  latest_message_at?: string | null
}

export interface ShawMessageCitation {
  type: 'vault' | 'external' | 'user' | 'synthesis'
  title: string
  url?: string
  entityType?: string
  entityId?: string
  reference?: string
}

export interface ShawActionProposal {
  type: string
  title: string
  description?: string
  payload: Record<string, any>
}

export interface ShawMessage {
  id: string
  conversation_id: string
  workspace_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  model_provider?: string | null
  model_name?: string | null
  citations: ShawMessageCitation[]
  proposed_actions: ShawActionProposal[]
  tokens_in?: number | null
  tokens_out?: number | null
  latency_ms?: number | null
  created_at: string
}

export interface ShawAiRun {
  id: string
  workspace_id: string
  conversation_id?: string | null
  capability: ShawCapability | 'voice_compliance'
  provider: string
  model: string
  status: 'started' | 'streaming' | 'completed' | 'failed' | 'fallback'
  tokens_in?: number | null
  tokens_out?: number | null
  estimated_cost_usd: number
  latency_ms?: number | null
  error_message?: string | null
  metadata?: Record<string, any>
  created_at: string
}

export interface ShawUserPreferences {
  id: string
  user_id: string
  workspace_id: string
  routing_mode: ShawRoutingMode
  allow_paid_fallback: boolean
  default_voice_profile: string
  created_at: string
  updated_at: string
}

export interface ShawStreamChunk {
  type: 'text' | 'meta' | 'error' | 'done'
  text?: string
  provider?: string
  model?: string
  error?: string
  tokensIn?: number
  tokensOut?: number
  latencyMs?: number
}

export type CtaType = 'standard' | 'research' | 'strategy' | 'full'
export type CtaIntent = 'none' | CtaType

export interface ComplianceCheck {
  name: string
  status: 'passed' | 'warning' | 'violation'
  description: string
  matches?: string[]
}

export interface ComplianceResult {
  passed: boolean
  checks: ComplianceCheck[]
  sanitizedText?: string
}

export type ShawOutputDepth = 'short' | 'normal' | 'detailed' | 'deep'
export type ShawOutputFormat = 'x_post' | 'x_thread' | 'article' | 'linkedin' | 'report' | 'general'

export interface ShawGenerationIntent {
  capability: ShawCapability
  format: ShawOutputFormat
  depth: ShawOutputDepth
  ctaIntent: CtaIntent
}
