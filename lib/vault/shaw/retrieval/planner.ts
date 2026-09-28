/**
 * Waynex Vault — Deterministic Retrieval Planner
 *
 * Conservatively evaluates whether a user prompt intends to query private
 * Waynex Vault records without invoking an expensive intermediate LLM call.
 * Produces an inspectable, typed RetrievalPlan.
 */

import {
  RetrievalPlan,
  RetrievalIntent,
  RetrievalDomain,
  TemporalExpression,
  ReasoningPlan,
  ReasoningIntent,
  ReasoningDomainRequest,
  ReasoningMode,
} from './types'
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
  // 6. Meeting with / Discussion with
  new RegExp(
    `\\b(?:meeting|discussion|call)\\s+with\\s+([A-Za-z0-9_\\-\\s/]{2,100}?)(?=[?!,.]|$|\\b(?:using|from|based|include|where|only|as|according|in|to|and)\\b)`,
    'i'
  ),
  // 7. Progress report on / progress on
  new RegExp(
    `\\b(?:progress\\s+(?:report\\s+)?(?:on|for|of))\\s+([A-Za-z0-9_\\-\\s/]{2,100}?)(?=[?!,.]|$|\\b(?:${INSTRUCTION_DELIMITERS})\\b)`,
    'i'
  ),
  // 8. Research say that could affect / affect / impact
  new RegExp(
    `\\b(?:could\\s+affect|affect|impact)\\s+([A-Za-z0-9_\\-\\s/]{2,100}?)(?=[?!,.]|$|\\b(?:${INSTRUCTION_DELIMITERS})\\b)`,
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

// ============================================================================
// Phase 2B.2A: Layered Deterministic Reasoning Intent Detectors
// Precedence Order:
// 1. PERIOD_ACCOMPLISHMENT (Specific accomplishment outranks general recap)
// 2. BLOCKER_ASSESSMENT (Blocker analysis outranks general focus/planning)
// 3. PLAN_VS_ACTUAL (Comparative variance outranks standard progress)
// 4. DECISION_GAP_ANALYSIS (Structural gap query outranks general decisions)
// 5. RESEARCH_IMPACT (Research implications outranks standard research)
// 6. MEETING_PREP (Action-oriented meeting prep outranks meeting catalog)
// 7. PROJECT_PROGRESS (Progress report on specific entity)
// 8. WEEKLY_FOCUS (Prioritization and focus planning)
// 9. CROSS_DOMAIN_RECAP (Broad operational recap across domains)
// ============================================================================

export function detectPeriodAccomplishment(trimmed: string): boolean {
  return /\b(?:what\s+did\s+i\s+(?:accomplish|achieve|get\s+done)|what\s+have\s+i\s+(?:accomplished|achieved)|key\s+accomplishments?|period\s+accomplishments?|my\s+accomplishments?)\b/i.test(trimmed)
}

export function detectBlockerAssessment(trimmed: string): boolean {
  return /\b(?:what(?:\s+is|'s)?\s+blocking|block(?:ers?|ed)|roadblocks?|stuck\s+tasks?|impediments?|what\s+is\s+stuck)\b/i.test(trimmed)
}

export function detectPlanVsActual(trimmed: string): boolean {
  return /\b(?:compare\s+what\s+i\s+planned|plan\s+vs\s+actual|planned\s+vs\s+(?:actual|completed|done)|compare\s+plans?\s+(?:with|to)|what\s+i\s+planned\s+with\s+what\s+i\s+completed)\b/i.test(trimmed)
}

export function detectDecisionGapAnalysis(trimmed: string): boolean {
  return /\b(?:activity\s+but\s+no\s+(?:recorded\s+)?decisions?|decision\s+gaps?|projects?\s+(?:with(?:out| no)|lacking)\s+(?:recorded\s+)?decisions?|no\s+decisions?\s+recorded\s+for\s+active\s+projects?)\b/i.test(trimmed)
}

export function detectResearchImpact(trimmed: string): boolean {
  return /\b(?:(?:what\s+does\s+)?(?:my\s+)?research\s+say\s+that\s+could\s+affect|research\s+impact\s+(?:on|for)|how\s+does\s+research\s+affect|implications?\s+of\s+(?:our\s+|the\s+)?research)\b/i.test(trimmed)
}

export function detectMeetingPrep(trimmed: string): boolean {
  return /\b(?:prepare\s+me\s+for\s+(?:my\s+)?meeting|prep\s+(?:me\s+)?for\s+(?:my\s+)?meeting|meeting\s+prep\b)/i.test(trimmed)
}

export function detectProjectProgress(trimmed: string, activeEntityName: string | null): boolean {
  return (
    /\b(?:progress\s+report|progress\s+(?:on|for|of)|how\s+is\s+.+\s+progressing)\b/i.test(trimmed) ||
    Boolean(activeEntityName && /\bprogress\b/i.test(trimmed))
  )
}

export function detectWeeklyFocus(trimmed: string): boolean {
  return /\b(?:what\s+should\s+i\s+focus\s+on|focus\s+(?:on\s+)?this\s+week|what\s+to\s+focus\s+on|priorit(?:y|ize|ies)\s+this\s+week|what\s+are\s+my\s+priorities)\b/i.test(trimmed)
}

export function detectCrossDomainRecap(trimmed: string): boolean {
  return /\b(?:what\s+happened(?:\s+last\s+week|\s+this\s+week|\s+recently)?|weekly\s+recap|cross[- ]domain\s+recap|recap\s+of\s+(?:the\s+)?week|operational\s+recap|catch\s+me\s+up\s+on\s+recent\s+activity)\b/i.test(trimmed)
}

/**
 * Deterministically constructs a ReasoningPlan if the prompt expresses a composite
 * multi-domain reasoning intent. Returns null if standard single-domain retrieval
 * or fallback planner should handle the request.
 */
export function planReasoning(input: PlannerInput): ReasoningPlan | null {
  const { prompt, history = [], anchorDate = new Date(), timezone } = input
  const trimmed = prompt.trim()

  const extractedEntity = extractEntityMention(trimmed)
  const contextEntity = resolveContextEntity(trimmed, history)
  const activeEntityName = extractedEntity || contextEntity?.name || null

  const temporalExp = extractTemporalExpression(trimmed)
  const timeframe = temporalExp ? resolveTemporalWindow(temporalExp, anchorDate, timezone) : undefined

  // 1. PERIOD_ACCOMPLISHMENT (Precedence 1: Outranks general recap)
  if (detectPeriodAccomplishment(trimmed)) {
    const domainRequests: ReasoningDomainRequest[] = [
      {
        domain: 'activity',
        importance: 'REQUIRED',
        queryMode: 'catalog',
        temporalFilter: temporalExp || 'last_week',
        limit: 10,
      },
      {
        domain: 'task',
        importance: 'REQUIRED',
        queryMode: activeEntityName ? 'targeted' : 'catalog',
        entityTarget: activeEntityName || undefined,
        statusFilter: 'completed',
        temporalFilter: temporalExp || 'last_week',
        limit: 20,
      },
      {
        domain: 'decision',
        importance: 'OPTIONAL',
        queryMode: activeEntityName ? 'targeted' : 'catalog',
        entityTarget: activeEntityName || undefined,
        temporalFilter: temporalExp || 'last_week',
        limit: 10,
      },
      {
        domain: 'review',
        importance: 'OPTIONAL',
        queryMode: 'catalog',
        limit: 5,
      },
    ]

    return {
      isReasoningPlan: true,
      primaryIntent: 'PERIOD_ACCOMPLISHMENT',
      reasoningMode: 'ACCOMPLISHMENT',
      entityTarget: activeEntityName ? { name: activeEntityName, domain: 'project' } : undefined,
      temporalWindow: timeframe,
      domainRequests,
      requiresPreparation: true,
      reason: 'Detected period accomplishment intent (outranks recap)',
    }
  }

  // 2. BLOCKER_ASSESSMENT (Precedence 2: Outranks weekly focus and progress)
  if (detectBlockerAssessment(trimmed)) {
    const domainRequests: ReasoningDomainRequest[] = [
      {
        domain: 'task',
        importance: 'REQUIRED',
        queryMode: activeEntityName ? 'targeted' : 'catalog',
        entityTarget: activeEntityName || undefined,
        statusFilter: 'open',
        limit: 25,
      },
      {
        domain: 'project',
        importance: 'REQUIRED',
        queryMode: activeEntityName ? 'targeted' : 'catalog',
        entityTarget: activeEntityName || undefined,
        limit: 10,
      },
      {
        domain: 'decision',
        importance: 'OPTIONAL',
        queryMode: activeEntityName ? 'targeted' : 'catalog',
        entityTarget: activeEntityName || undefined,
        limit: 5,
      },
      {
        domain: 'meeting',
        importance: 'OPTIONAL',
        queryMode: 'catalog',
        limit: 5,
      },
    ]

    return {
      isReasoningPlan: true,
      primaryIntent: 'BLOCKER_ASSESSMENT',
      reasoningMode: 'RISK_ASSESSMENT',
      entityTarget: activeEntityName ? { name: activeEntityName, domain: 'project' } : undefined,
      temporalWindow: timeframe,
      domainRequests,
      requiresPreparation: true,
      reason: 'Detected blocker and impediment assessment intent',
    }
  }

  // 3. PLAN_VS_ACTUAL (Precedence 3)
  if (detectPlanVsActual(trimmed)) {
    const domainRequests: ReasoningDomainRequest[] = [
      {
        domain: 'project',
        importance: 'REQUIRED',
        queryMode: activeEntityName ? 'targeted' : 'catalog',
        entityTarget: activeEntityName || undefined,
        limit: 10,
      },
      {
        domain: 'task',
        importance: 'REQUIRED',
        queryMode: activeEntityName ? 'targeted' : 'catalog',
        entityTarget: activeEntityName || undefined,
        limit: 25,
      },
      {
        domain: 'review',
        importance: 'OPTIONAL',
        queryMode: 'catalog',
        limit: 5,
      },
      {
        domain: 'metric',
        importance: 'OPTIONAL',
        queryMode: activeEntityName ? 'targeted' : 'catalog',
        entityTarget: activeEntityName || undefined,
        limit: 5,
      },
    ]

    return {
      isReasoningPlan: true,
      primaryIntent: 'PLAN_VS_ACTUAL',
      reasoningMode: 'VARIANCE',
      entityTarget: activeEntityName ? { name: activeEntityName, domain: 'project' } : undefined,
      temporalWindow: timeframe,
      domainRequests,
      requiresPreparation: true,
      reason: 'Detected planned vs actual variance comparison intent',
    }
  }

  // 4. DECISION_GAP_ANALYSIS (Precedence 4)
  if (detectDecisionGapAnalysis(trimmed)) {
    const domainRequests: ReasoningDomainRequest[] = [
      {
        domain: 'project',
        importance: 'REQUIRED',
        queryMode: 'catalog',
        limit: 20,
      },
      {
        domain: 'decision',
        importance: 'REQUIRED',
        queryMode: 'catalog',
        limit: 25,
      },
      {
        domain: 'activity',
        importance: 'REQUIRED',
        queryMode: 'catalog',
        limit: 10,
      },
      {
        domain: 'task',
        importance: 'OPTIONAL',
        queryMode: 'catalog',
        limit: 25,
      },
    ]

    return {
      isReasoningPlan: true,
      primaryIntent: 'DECISION_GAP_ANALYSIS',
      reasoningMode: 'GAP_ANALYSIS',
      entityTarget: activeEntityName ? { name: activeEntityName, domain: 'project' } : undefined,
      temporalWindow: timeframe,
      domainRequests,
      requiresPreparation: true,
      reason: 'Detected decision gap analysis across active projects',
    }
  }

  // 5. RESEARCH_IMPACT (Precedence 5)
  if (detectResearchImpact(trimmed)) {
    const domainRequests: ReasoningDomainRequest[] = [
      {
        domain: 'research',
        importance: 'REQUIRED',
        queryMode: activeEntityName ? 'targeted' : 'catalog',
        entityTarget: activeEntityName || undefined,
        limit: 5,
      },
      {
        domain: 'evidence',
        importance: 'REQUIRED',
        queryMode: 'catalog',
        limit: 10,
      },
      {
        domain: 'project',
        importance: activeEntityName ? 'REQUIRED' : 'OPTIONAL',
        queryMode: activeEntityName ? 'targeted' : 'catalog',
        entityTarget: activeEntityName || undefined,
        limit: 5,
      },
      {
        domain: 'decision',
        importance: 'OPTIONAL',
        queryMode: activeEntityName ? 'targeted' : 'catalog',
        entityTarget: activeEntityName || undefined,
        limit: 5,
      },
    ]

    return {
      isReasoningPlan: true,
      primaryIntent: 'RESEARCH_IMPACT',
      reasoningMode: 'IMPACT',
      entityTarget: activeEntityName ? { name: activeEntityName, domain: 'project' } : undefined,
      temporalWindow: timeframe,
      domainRequests,
      requiresPreparation: true,
      reason: 'Detected research impact and implications intent',
    }
  }

  // 6. MEETING_PREP (Precedence 6)
  if (detectMeetingPrep(trimmed)) {
    const domainRequests: ReasoningDomainRequest[] = [
      {
        domain: 'meeting',
        importance: 'REQUIRED',
        queryMode: activeEntityName ? 'targeted' : 'catalog',
        entityTarget: activeEntityName || undefined,
        limit: 5,
      },
      {
        domain: 'crm',
        importance: activeEntityName ? 'REQUIRED' : 'OPTIONAL',
        queryMode: activeEntityName ? 'targeted' : 'catalog',
        entityTarget: activeEntityName || undefined,
        limit: 5,
      },
      {
        domain: 'task',
        importance: 'OPTIONAL',
        queryMode: activeEntityName ? 'targeted' : 'catalog',
        entityTarget: activeEntityName || undefined,
        limit: 10,
      },
      {
        domain: 'decision',
        importance: 'OPTIONAL',
        queryMode: activeEntityName ? 'targeted' : 'catalog',
        entityTarget: activeEntityName || undefined,
        limit: 5,
      },
    ]

    return {
      isReasoningPlan: true,
      primaryIntent: 'MEETING_PREP',
      reasoningMode: 'PREPARATION',
      entityTarget: activeEntityName ? { name: activeEntityName, domain: 'crm' } : undefined,
      temporalWindow: timeframe,
      domainRequests,
      requiresPreparation: true,
      reason: 'Detected meeting preparation and alignment intent',
    }
  }

  // 7. PROJECT_PROGRESS (Precedence 7)
  if (detectProjectProgress(trimmed, activeEntityName)) {
    const domainRequests: ReasoningDomainRequest[] = [
      {
        domain: 'project',
        importance: 'REQUIRED',
        queryMode: activeEntityName ? 'targeted' : 'catalog',
        entityTarget: activeEntityName || undefined,
        limit: 5,
      },
      {
        domain: 'task',
        importance: 'REQUIRED',
        queryMode: activeEntityName ? 'targeted' : 'catalog',
        entityTarget: activeEntityName || undefined,
        limit: 25,
      },
      {
        domain: 'decision',
        importance: 'OPTIONAL',
        queryMode: activeEntityName ? 'targeted' : 'catalog',
        entityTarget: activeEntityName || undefined,
        limit: 10,
      },
      {
        domain: 'review',
        importance: 'OPTIONAL',
        queryMode: activeEntityName ? 'targeted' : 'catalog',
        entityTarget: activeEntityName || undefined,
        limit: 5,
      },
    ]

    return {
      isReasoningPlan: true,
      primaryIntent: 'PROJECT_PROGRESS',
      reasoningMode: 'PROGRESS',
      entityTarget: activeEntityName ? { name: activeEntityName, domain: 'project' } : undefined,
      temporalWindow: timeframe,
      domainRequests,
      requiresPreparation: true,
      reason: 'Detected project progress report intent',
    }
  }

  // 8. WEEKLY_FOCUS (Precedence 8)
  if (detectWeeklyFocus(trimmed)) {
    const domainRequests: ReasoningDomainRequest[] = [
      {
        domain: 'task',
        importance: 'REQUIRED',
        queryMode: activeEntityName ? 'targeted' : 'catalog',
        entityTarget: activeEntityName || undefined,
        statusFilter: 'open',
        limit: 25,
      },
      {
        domain: 'project',
        importance: 'REQUIRED',
        queryMode: activeEntityName ? 'targeted' : 'catalog',
        entityTarget: activeEntityName || undefined,
        limit: 10,
      },
      {
        domain: 'decision',
        importance: 'OPTIONAL',
        queryMode: activeEntityName ? 'targeted' : 'catalog',
        entityTarget: activeEntityName || undefined,
        limit: 5,
      },
      {
        domain: 'meeting',
        importance: 'OPTIONAL',
        queryMode: 'catalog',
        limit: 5,
      },
    ]

    return {
      isReasoningPlan: true,
      primaryIntent: 'WEEKLY_FOCUS',
      reasoningMode: 'PRIORITIZATION',
      entityTarget: activeEntityName ? { name: activeEntityName, domain: 'project' } : undefined,
      temporalWindow: timeframe,
      domainRequests,
      requiresPreparation: true,
      reason: 'Detected weekly focus and operational prioritization intent',
    }
  }

  // 9. CROSS_DOMAIN_RECAP (Precedence 9)
  if (detectCrossDomainRecap(trimmed)) {
    const domainRequests: ReasoningDomainRequest[] = [
      {
        domain: 'activity',
        importance: 'REQUIRED',
        queryMode: 'catalog',
        temporalFilter: temporalExp || 'last_week',
        limit: 10,
      },
      {
        domain: 'decision',
        importance: 'REQUIRED',
        queryMode: 'catalog',
        temporalFilter: temporalExp || 'last_week',
        limit: 10,
      },
      {
        domain: 'meeting',
        importance: 'OPTIONAL',
        queryMode: 'catalog',
        temporalFilter: temporalExp || 'last_week',
        limit: 5,
      },
      {
        domain: 'task',
        importance: 'OPTIONAL',
        queryMode: 'catalog',
        statusFilter: 'completed',
        temporalFilter: temporalExp || 'last_week',
        limit: 10,
      },
    ]

    return {
      isReasoningPlan: true,
      primaryIntent: 'CROSS_DOMAIN_RECAP',
      reasoningMode: 'RECAP',
      entityTarget: activeEntityName ? { name: activeEntityName, domain: 'project' } : undefined,
      temporalWindow: timeframe,
      domainRequests,
      requiresPreparation: true,
      reason: 'Detected cross-domain operational recap intent',
    }
  }

  // No composite multi-domain reasoning intent matched
  return null
}
