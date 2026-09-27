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
  /\b(?:my|our)\s+(?:projects?|tasks?|decisions?|contacts?|meetings?|research|metrics?|reviews?|evidence|follow[- ]?ups?|workbench|notes?|vault)\b/i,
  /\b(?:in|from)\s+(?:my\s+|the\s+)?vault\b/i,
  /\bvault\s+records?\b/i,
  /\bwhat\s+did\s+i\s+(?:work\s+on|decide|record|research|note|have|do)\b/i,
  /\bstatus\s+(?:report\s+)?(?:on|for|of)\b/i,
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
  } else if (!isGeneralQuestion && activeEntityName && /\b(?:status|update|progress|tasks?|decisions?|plan|summary|metrics?|reviews?|meetings?|evidence)\b/i.test(trimmed)) {
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
 * Extracts possible project/entity names mentioned in the prompt
 * E.g. "Give me a status report on PEVRA" -> "PEVRA"
 * E.g. "What did I decide about telecom identity?" -> "telecom identity"
 */
function extractEntityMention(prompt: string): string | null {
  // 1. Look for uppercase acronyms / project tokens like PEVRA, TIRMS, etc.
  const acronymMatches = prompt.match(/\b([A-Z]{3,10})\b/g)
  if (acronymMatches) {
    const commonWords = new Set([
      'WHAT', 'WHEN', 'WHERE', 'HOW', 'WHY', 'THE', 'AND', 'FOR', 'NOT',
      'SHOW', 'HAVE', 'FROM', 'THIS', 'THAT', 'WITH', 'ABOUT', 'WHICH',
      'CAN', 'WILL', 'JUST', 'SOME', 'MORE', 'GIVE',
    ])
    for (const token of acronymMatches) {
      if (!commonWords.has(token)) {
        return token
      }
    }
  }

  // 2. Look for explicit preposition phrases ("on Alpha", "about telecom identity")
  const matchOn = prompt.match(/\b(?:on|about|for|regarding|into)\s+([A-Za-z0-9_\-\s]{2,30}?)(?=[?!,.]|$|\b(?:and|with|in|to)\b)/i)
  if (matchOn && matchOn[1]) {
    let candidate = matchOn[1].trim()
    candidate = candidate.replace(/^(?:the|my|our|this|that|a|an)\s+/i, '')
    if (candidate.length >= 2 && !/^(?:all|some|any|recent|past|upcoming|these|those|it|this|that|them|him|her|something|anything|everything)$/i.test(candidate)) {
      return candidate
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
