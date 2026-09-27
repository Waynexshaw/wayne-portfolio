/**
 * Waynex Vault — Deterministic Retrieval Planner
 *
 * Conservatively evaluates whether a user prompt intends to query private
 * Waynex Vault records without invoking an expensive intermediate LLM call.
 * Produces an inspectable, typed RetrievalPlan.
 */

import { RetrievalPlan, RetrievalIntent, RetrievalDomain, TemporalExpression } from './types'
import { extractTemporalExpression, resolveTemporalWindow } from './temporal'
import { AdapterMessage } from '../gateway/adapters/types'

const EXPLICIT_VAULT_PATTERNS = [
  /\b(?:my|our)\s+(?:projects?|tasks?|decisions?|contacts?|meetings?|research|metrics?|reviews?|evidence|follow[- ]?ups?|workbench|notes?|vault|records?)\b/i,
  /\b(?:in|from|according\s+to|what\s+does)\s+(?:my\s+|the\s+)?vault\b/i,
  /\b(?:vault|recorded|stored|retrieved)\s+records?\b/i,
  /\brecorded\s+(?:information|data)\b/i,
  /\bthe\s+records\b/i,
  /\bwhat\s+did\s+i\s+(?:work\s+on|decide|record|research|note|have|do)\b/i,
  /\bstatus\s+(?:report\s+)?(?:on|for|of)\b/i,
  /\b(?:overview|details)\s+(?:on|for|of)\b/i,
  /\btell\s+me\s+about\b/i,
  /\bwhich\s+(?:contacts?|tasks?|projects?|decisions?|follow[- ]?ups?)\b/i,
  /\boverdue\s+(?:tasks?|follow[- ]?ups?)\b/i,
  /\bshow\s+me\s+(?:the\s+)?(?:evidence|research|decisions?|tasks?|notes?|reviews?|metrics?|meetings?)\b/i,
  /\b(?:recent|past|upcoming|latest)\s+(?:interactions?|meetings?|calls?|decisions?|tasks?|metrics?|reviews?)\b/i,
  /\bunfinished\s+tasks?\b/i,
  /\bpending\s+(?:tasks?|follow[- ]?ups?|approvals?)\b/i,
  /\b(?:what|which)\s+(?:meetings?|calls?|interactions?)\b/i,
]

const GENERAL_KNOWLEDGE_EXCLUSION = [
  /\bwhat\s+do\s+you\s+think\s+about\b/i,
  /\bexplain\s+(?:the\s+)?(?:difference|concept|mechanism|math|formula|history)\b/i,
  /\bwrite\s+(?:an?\s+)?(?:x\s+post|tweet|thread|essay|article)\s+about\b/i,
  /\bhow\s+does\s+(?:a|an|the)\s+[a-z0-9_\-]+\s+work\b/i,
]

export interface PlannerInput {
  prompt: string
  capability?: string
  history?: AdapterMessage[]
  anchorDate?: Date
  timezone?: string
}

export function planRetrieval(input: PlannerInput): RetrievalPlan {
  const { prompt, history = [], anchorDate = new Date(), timezone } = input
  const trimmed = prompt.trim()

  // 1. Check for explicit Vault intent vs general question
  const hasExplicitVaultAnchor = EXPLICIT_VAULT_PATTERNS.some((pattern) => pattern.test(trimmed))
  
  // Check if it's clearly a general conceptual question
  const isGeneralQuestion = GENERAL_KNOWLEDGE_EXCLUSION.some((pattern) => pattern.test(trimmed))
  
  // Extract entity references from current prompt
  const extractedEntity = extractEntityMention(trimmed)
  
  // Check conversation history for active entity if current prompt has a deictic reference ("this project", "that contact", "the project")
  const contextEntity = resolveContextEntity(trimmed, history)

  const activeEntityName = extractedEntity || contextEntity?.name

  // Decision rule:
  // Must retrieve if:
  // 1) Explicit vault pattern matched
  // 2) Or prompt asks about a recognized entity with operational terms ("status of PEVRA", "tasks for PEVRA")
  // 3) Or prompt asks "What did I work on..."
  // Must NOT retrieve if purely a general knowledge question without vault anchors.
  let shouldRetrieve = false
  if (hasExplicitVaultAnchor) {
    shouldRetrieve = true
  } else if (!isGeneralQuestion && activeEntityName && /\b(?:status|update|progress|tasks?|decisions?|plan|summary|metrics?|reviews?|meetings?|evidence|overview|details|tell\s+me\s+about|focus|prioritize|happening)\b/i.test(trimmed)) {
    shouldRetrieve = true
  }

  if (!shouldRetrieve) {
    return {
      shouldRetrieve: false,
      intents: [],
      resolvedEntityHints: [],
      detailLevel: 'summary',
      ambiguityPolicy: 'clarify_if_ambiguous',
      reason: 'No explicit Vault intent or entity reference detected.',
    }
  }

  // 2. Resolve Temporal Window
  const temporalExp = extractTemporalExpression(trimmed)
  const timeframe = temporalExp ? resolveTemporalWindow(temporalExp, anchorDate, timezone) : undefined

  // 3. Resolve Domain Intents
  const intents: RetrievalIntent[] = []
  const pLower = trimmed.toLowerCase()

  // Multi-domain "status report" or "project overview"
  if (/\b(?:status\s+report|status\s+of|overview\s+of|update\s+on)\b/i.test(trimmed) && activeEntityName) {
    intents.push({ domain: 'project', entityQuery: activeEntityName, detailLevel: 'detailed' })
    intents.push({ domain: 'task', entityQuery: activeEntityName, statusFilter: 'open' })
    intents.push({ domain: 'decision', entityQuery: activeEntityName })
    intents.push({ domain: 'research', entityQuery: activeEntityName })
  } else {
    // Specific domain detection
    if (/\b(?:project|projects)\b/i.test(pLower) || (activeEntityName && !intents.some(i => i.domain === 'project'))) {
      if (/\b(?:project|projects)\b/i.test(pLower) || activeEntityName) {
        intents.push({
          domain: 'project',
          entityQuery: activeEntityName || undefined,
          detailLevel: 'summary',
        })
      }
    }

    if (/\b(?:tasks?|todo|todos|action\s+items?|unfinished\s+tasks?|overdue)\b/i.test(pLower)) {
      intents.push({
        domain: 'task',
        entityQuery: activeEntityName || undefined,
        statusFilter: /\bcompleted\b/i.test(pLower) ? 'completed' : 'open',
      })
    }

    if (/\b(?:decisions?|decided|decide)\b/i.test(pLower)) {
      intents.push({
        domain: 'decision',
        entityQuery: activeEntityName || undefined,
      })
    }

    if (/\b(?:contacts?|companies|company|interactions?|follow[- ]?ups?|reach\s*out)\b/i.test(pLower)) {
      intents.push({
        domain: 'crm',
        entityQuery: activeEntityName || undefined,
        detailLevel: 'summary',
      })
    }

    if (/\b(?:research|findings?|sources?|claims?)\b/i.test(pLower)) {
      intents.push({
        domain: 'research',
        entityQuery: activeEntityName || undefined,
      })
    }

    if (/\b(?:meetings?|calls?|agenda)\b/i.test(pLower)) {
      intents.push({
        domain: 'meeting',
        entityQuery: activeEntityName || undefined,
        timeframe: temporalExp || undefined,
      })
    }

    if (/\b(?:metrics?|kpi|targets?|observations?)\b/i.test(pLower)) {
      intents.push({
        domain: 'metric',
        entityQuery: activeEntityName || undefined,
      })
    }

    if (/\b(?:reviews?|retro|retrospectives?|lessons)\b/i.test(pLower)) {
      intents.push({
        domain: 'review',
        entityQuery: activeEntityName || undefined,
      })
    }

    if (/\b(?:evidence|portfolio\s+bridge|proof)\b/i.test(pLower)) {
      intents.push({
        domain: 'evidence',
        entityQuery: activeEntityName || undefined,
      })
    }

    if (/\b(?:what\s+did\s+i\s+work\s+on|my\s+activity|weekly\s+summary|summary\s+of\s+my\s+work)\b/i.test(pLower)) {
      intents.push({
        domain: 'activity',
        timeframe: temporalExp || 'last_7_days',
      })
    }
  }

  // Fallback: If shouldRetrieve is true but no specific domain was matched, default to project or activity
  if (intents.length === 0) {
    if (activeEntityName) {
      intents.push({ domain: 'project', entityQuery: activeEntityName })
    } else {
      intents.push({ domain: 'activity', timeframe: temporalExp || 'last_7_days' })
    }
  }

  const resolvedEntityHints = activeEntityName
    ? [{ domain: (contextEntity?.domain || 'project') as RetrievalDomain, name: activeEntityName }]
    : []

  return {
    shouldRetrieve: true,
    intents,
    resolvedEntityHints,
    timeframe,
    detailLevel: 'summary',
    ambiguityPolicy: 'clarify_if_ambiguous',
    reason: `Vault retrieval triggered for domains: ${intents.map((i) => i.domain).join(', ')}`,
  }
}

/**
 * Generic structural schema nouns that cannot, by themselves, constitute a valid entityQuery.
 * Prevents schema terminology in prompts (e.g. "for the project", "of the task")
 * from being mistakenly extracted as the target entity name.
 */
const GENERIC_SCHEMA_NOUNS = new Set([
  'project', 'projects',
  'task', 'tasks',
  'decision', 'decisions',
  'contact', 'contacts',
  'company', 'companies',
  'meeting', 'meetings',
  'metric', 'metrics',
  'review', 'reviews',
  'evidence',
  'research',
  'vault',
  'record', 'records',
  'status',
  'update', 'updates',
  'overview',
  'summary', 'summaries',
  'detail', 'details',
  'note', 'notes',
  'workbench',
  'activity', 'activities',
  'document', 'documents',
  'file', 'files',
  'spreadsheet', 'spreadsheets',
  'item', 'items',
])

/**
 * Context and source qualifiers that specify the origin or framing of a question
 * (e.g. "my Vault records", "recorded information", "the project") and must never
 * be mistakenly extracted as the target operational entity.
 */
const CONTEXT_QUALIFIER_PHRASES = new Set([
  'vault',
  'the vault',
  'my vault',
  'our vault',
  'vault record',
  'vault records',
  'my vault record',
  'my vault records',
  'the vault record',
  'the vault records',
  'record',
  'records',
  'my record',
  'my records',
  'the record',
  'the records',
  'recorded information',
  'recorded data',
  'recorded record',
  'recorded records',
  'stored information',
  'stored data',
  'stored record',
  'stored records',
  'retrieved record',
  'retrieved records',
  'retrieved information',
  'retrieved data',
  'available record',
  'available records',
  'available information',
  'available data',
  'workspace record',
  'workspace records',
  'internal record',
  'internal records',
  'project record',
  'project records',
  'the project',
  'the task',
  'the decision',
  'the contact',
  'the company',
  'the meeting',
  'the research',
  'the evidence',
  'the review',
  'the metric',
  'information',
  'data',
])

const COMMON_ACRONYM_WORDS = new Set([
  'WHAT', 'WHEN', 'WHERE', 'HOW', 'WHY', 'THE', 'AND', 'FOR', 'NOT',
  'SHOW', 'HAVE', 'FROM', 'THIS', 'THAT', 'WITH', 'ABOUT', 'WHICH',
  'CAN', 'WILL', 'JUST', 'SOME', 'MORE', 'GIVE',
])

/**
 * Validates, trims, and normalizes candidate entity strings.
 * Discards leading articles, trailing punctuation, pronouns, schema terms, and context qualifiers.
 */
function cleanAndValidateCandidate(raw: string): string | null {
  if (!raw) return null
  let candidate = raw.trim()

  // Strip leading articles and possessives
  candidate = candidate.replace(/^(?:the|my|our|this|that|a|an)\s+/i, '').trim()

  // Strip trailing punctuation
  candidate = candidate.replace(/[?!,.]*$/, '').trim()

  // Strip trailing conversational or temporal qualifiers
  candidate = candidate.replace(/\s+(?:right\s+now|currently|now|today|yesterday|at\s+the\s+moment|and\s+why)$/i, '').trim()

  if (candidate.length < 2) return null

  const lower = candidate.toLowerCase()

  // Reject generic pronouns and quantifier words
  if (/^(?:all|some|any|recent|past|upcoming|these|those|it|this|that|them|him|her|something|anything|everything)$/i.test(candidate)) {
    return null
  }

  // Reject generic structural schema nouns
  if (GENERIC_SCHEMA_NOUNS.has(lower)) {
    return null
  }

  // Reject context and source qualifiers
  if (CONTEXT_QUALIFIER_PHRASES.has(lower) || CONTEXT_QUALIFIER_PHRASES.has(raw.trim().toLowerCase())) {
    return null
  }

  return candidate
}

// Recognized instructional boundaries that safely terminate entity spans in user prompts
const INSTRUCTION_DELIMITERS = 'using|from|based|include|including|where|only|as|according|with|in|to|and|right\\s+now|currently'

const OPERATIONAL_TARGET_PATTERNS = [
  // 1. Status / Overview / Update / Details / Tell me about
  new RegExp(
    `\\b(?:status\\s+(?:report\\s+)?(?:on|for|of)|overview\\s+of|update\\s+(?:on|for)|details\\s+(?:on|for|of|about)|tell\\s+me\\s+about)\\s+([A-Za-z0-9_\\-\\s/]{2,100}?)(?=[?!,.]|$|\\b(?:${INSTRUCTION_DELIMITERS})\\b)`,
    'i'
  ),
  // 2. Focus on / Focus first for / Focus for
  new RegExp(
    `\\b(?:focus(?:\\s+on)?(?:\\s+first)?\\s+(?:for|on))\\s+([A-Za-z0-9_\\-\\s/]{2,100}?)(?=[?!,.]|$|\\b(?:${INSTRUCTION_DELIMITERS})\\b)`,
    'i'
  ),
  // 3. Prioritize / Prioritize for
  new RegExp(
    `\\b(?:prioritize(?:\\s+first)?(?:\\s+for)?)\\s+([A-Za-z0-9_\\-\\s/]{2,100}?)(?=[?!,.]|$|\\b(?:${INSTRUCTION_DELIMITERS})\\b)`,
    'i'
  ),
  // 4. What is / what's happening with
  new RegExp(
    `\\b(?:what(?:\\s+is|'s)?\\s+happening\\s+with)\\s+([A-Za-z0-9_\\-\\s/]{2,100}?)(?=[?!,.]|$|\\b(?:${INSTRUCTION_DELIMITERS})\\b)`,
    'i'
  ),
  // 5. What does [Vault] say about
  new RegExp(
    `\\b(?:what\\s+does\\s+(?:(?:my|the)\\s+)?vault\\s+say\\s+about)\\s+([A-Za-z0-9_\\-\\s/]{2,100}?)(?=[?!,.]|$|\\b(?:${INSTRUCTION_DELIMITERS})\\b)`,
    'i'
  ),
]

const GENERIC_PREPOSITION_REGEX = new RegExp(
  `\\b(?:on|about|for|regarding|into)\\s+([A-Za-z0-9_\\-\\s/]{2,100}?)(?=[?!,.]|$|\\b(?:${INSTRUCTION_DELIMITERS})\\b)`,
  'gi'
)

/**
 * Extracts possible project/entity names mentioned in the prompt.
 *
 * Deterministic precedence:
 * 1. Explicit operational target patterns ("status report on <entity>", "focus ... for <entity>", "tell me about <entity>")
 * 2. Strong uppercase acronym patterns (e.g. PEVRA, TIRMS)
 * 3. Generic preposition extraction ("on Alpha", "about telecom identity") with context qualifier rejection
 *
 * In all cases, candidate spans terminate at instructional boundaries, generic schema nouns
 * (e.g. "project", "task"), and context qualifiers (e.g. "my Vault records") are rejected.
 */
function extractEntityMention(prompt: string): string | null {
  // 1. Direct Operational Entity Patterns (highest precedence)
  for (const pattern of OPERATIONAL_TARGET_PATTERNS) {
    const opMatch = prompt.match(pattern)
    if (opMatch && opMatch[1]) {
      const candidate = cleanAndValidateCandidate(opMatch[1])
      if (candidate) return candidate
    }
  }

  // 2. Explicit Uppercase Acronyms (e.g. PEVRA, TIRMS)
  const acronymMatches = prompt.match(/\b([A-Z]{3,10})\b/g)
  if (acronymMatches) {
    for (const token of acronymMatches) {
      if (!COMMON_ACRONYM_WORDS.has(token) && !GENERIC_SCHEMA_NOUNS.has(token.toLowerCase())) {
        return token
      }
    }
  }

  // 3. Generic Preposition Extraction (with semantic boundary and context qualifier rejection)
  for (const match of prompt.matchAll(GENERIC_PREPOSITION_REGEX)) {
    if (match[1]) {
      const candidate = cleanAndValidateCandidate(match[1])
      if (candidate) return candidate
    }
  }

  return null
}

/**
 * Resolves deictic references ("this project", "the project") from conversation history
 */
function resolveContextEntity(
  prompt: string,
  history: AdapterMessage[]
): { domain: RetrievalDomain; name: string } | null {
  const hasDeictic =
    /\b(?:this|that|the)\s+(project|contact|company|research)\b/i.test(prompt) ||
    /\b(?:about|on|for)\s+(?:it|this|that)\b/i.test(prompt)
  if (!hasDeictic || history.length === 0) return null

  // Scan recent history in reverse
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i]
    const extracted = extractEntityMention(msg.content)
    if (extracted) {
      const domain: RetrievalDomain = /\bcontact\b/i.test(prompt)
        ? 'crm'
        : /\bresearch\b/i.test(prompt)
        ? 'research'
        : 'project'
      return { domain, name: extracted }
    }
  }

  return null
}
