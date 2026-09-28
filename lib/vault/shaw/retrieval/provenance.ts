/**
 * Waynex Vault — SHAW Batch 2B.1 Authoritative Provenance Foundation
 *
 * Implements server-managed, request-local source handle resolution,
 * authoritative route resolution, model provenance parsing, and
 * streaming isolation so that model-generated answers are verified
 * against real VaultRecord entities without exposing internal protocol
 * tags or allowing the model to invent database UUIDs.
 */

import { VaultContextEnvelope, VaultRecord, CollectionCompleteness, AnswerEpistemicPolicy } from './types'
import { ShawMessageCitation, AnswerBasis, ProvenanceStatus } from '../types'

export type RequestSourceMap = Map<string, VaultRecord>

/**
 * Creates a deterministic, request-local source map assigning handles S1, S2, ...
 * to each retrieved VaultRecord in the envelope.
 */
export function createRequestSourceMap(envelope: VaultContextEnvelope): RequestSourceMap {
  const map: RequestSourceMap = new Map()
  if (!envelope || !envelope.records) return map

  envelope.records.forEach((record, idx) => {
    const handle = `S${idx + 1}`
    map.set(handle, record)
  })

  return map
}

/**
 * Central server-side route resolver for provenance sources.
 * Resolves each WV entity type to its verified internal /vault route.
 * For operational tasks, prefers the parent project route when available.
 */
export function resolveProvenanceRoute(source: {
  entityType: string
  entityId: string
  relationship?: Record<string, any>
  title?: string
}): string {
  const type = (source.entityType || '').toLowerCase()

  switch (type) {
    case 'project':
    case 'workspace_project':
      return `/vault/projects/${source.entityId}`
    case 'contact':
    case 'workspace_contact':
      return `/vault/contacts/${source.entityId}`
    case 'company':
    case 'workspace_company':
      return `/vault/companies/${source.entityId}`
    case 'evidence':
    case 'workspace_evidence':
      return `/vault/evidence/${source.entityId}`
    case 'metric':
    case 'workspace_metric':
      return `/vault/metrics/${source.entityId}`
    case 'research':
    case 'research_record':
      return `/vault/research/${source.entityId}`
    case 'review':
    case 'workspace_review':
      return `/vault/reviews/${source.entityId}`
    case 'decision':
    case 'workspace_decision':
      return `/vault/operations/decisions/${source.entityId}`
    case 'meeting':
    case 'workspace_meeting':
      return `/vault/operations/meetings/${source.entityId}`
    case 'task':
    case 'workspace_task':
      if (source.relationship?.projectId) {
        return `/vault/projects/${source.relationship.projectId}`
      }
      if (source.title) {
        return `/vault/operations?view=tasks&search=${encodeURIComponent(source.title)}`
      }
      return `/vault/operations?view=tasks`
    default:
      return `/vault`
  }
}

export const PROVENANCE_TAG_REGEX = /(?:\[SOURCES:\s*([^|\]]+?)(?:\s*\|\s*BASIS:\s*([A-Za-z_]+))?\s*\]|<!--\s*SOURCES:\s*([^|>-]+?)(?:\s*\|\s*BASIS:\s*([A-Za-z_]+))?\s*-->)/i

export const INTERNAL_CONTEXT_IDENTIFIERS: ReadonlySet<string> = new Set([
  'reasoning_context',
  'retrieved_records',
  'limited_absences',
  'verified_absences',
  'temporal_facts',
  'descriptive_counts',
  'domain_outcomes',
  'vault_context',
  'retrieval_scope',
  'ambiguities',
  'empty_states',
  'records',
  'plan',
  'answer_contract',
  'epistemic_policy',
  'limited_empty',
  'confirmed_empty',
])

export function isInternalContextIdentifier(str: string): boolean {
  return INTERNAL_CONTEXT_IDENTIFIERS.has(str.toLowerCase())
}

/**
 * Validates and deterministically normalizes epistemic claims, unmodeled constructs,
 * and presentation formatting in model prose according to AnswerEpistemicPolicy.
 */
export function validateAndNormalizeEpistemicClaims(
  text: string,
  options?: { isTechnicalMode?: boolean; policy?: AnswerEpistemicPolicy }
): string {
  let res = text
  const isTech = Boolean(options?.isTechnicalMode)

  if (!isTech) {
    // 1. Strip bold markdown syntax (**text** -> text, and stray **)
    res = res.replace(/\*\*([^*]+?)\*\*/g, '$1')
    res = res.replace(/\*\*/g, '')

    // Convert asterisk bullet points to standard dash bullets
    res = res.replace(/^(\s*)\*\s+/gm, '$1- ')

    // 2. Strip bracketed machine explanations in prose & internal technical jargon
    res = res.replace(/\[(?:Limited absence|Verified absence|Note|no decisions|no reviews|no metrics)[^\]]*\]/gi, '')
    res = res.replace(/\[?LIMITED_EMPTY\]?/g, '')
    res = res.replace(/\[?CONFIRMED_EMPTY\]?/g, '')
    res = res.replace(/\[?epistemic class\]?/gi, '')
    res = res.replace(/\[?claim strength\]?/gi, '')
    res = res.replace(/\[?global absence authorized\]?/gi, '')

    // 3. Normalize summary scope collapse on bounded governance domains
    res = res.replace(
      /\bAll governance artifacts\s*\(([^)]+)\)\s*are absent\b/gi,
      'No governance artifacts ($1) were found in the records checked'
    )
    res = res.replace(
      /\bAll governance artifacts are absent\b/gi,
      'No governance artifacts were found in the records checked'
    )

    // 4. Normalize global metric absence to bounded observational gap
    res = res.replace(
      /\bThere are no metrics tracking\b/gi,
      'The records checked do not track'
    )
    res = res.replace(
      /\bThere are no metrics\b/gi,
      "I couldn't find any metrics in the records checked"
    )

    // 5. Normalize unmodeled concept assertions (subtasks, milestones, completion criteria)
    res = res.replace(
      /\bNo progress updates,\s*subtasks,\s*or completion criteria are documented\.?/gi,
      'The records checked do not show how much of the work has already been completed.'
    )
    res = res.replace(
      /\bNo completed tasks or milestones are recorded\b/gi,
      "None of the project's recorded tasks are completed"
    )
    res = res.replace(
      /\bno completed tasks or milestones\b/gi,
      'no completed tasks'
    )
    res = res.replace(
      /\bor milestones are recorded\b/gi,
      'are recorded'
    )
    res = res.replace(
      /\bNo subtasks are documented\.?/gi,
      'The records checked do not show subtask breakdowns.'
    )
    res = res.replace(
      /\bNo completion criteria are documented\.?/gi,
      'The records checked do not define specific completion criteria.'
    )

    // 6. Clean unevaluated meeting domain false claims if any
    res = res.replace(
      /[-•]?\s*Meetings\s*–?\s*the record shows zero meetings logged\.?\n?/gi,
      ''
    )
  }

  return res
}

/**
 * Canonical sanitization policy for client-visible and persisted assistant prose.
 * Strips trailing provenance protocol tags, inline current-turn source handles ([S1], [S2]...),
 * and known internal context/schema identifiers without damaging legitimate user-facing bracketed prose
 * or leaving broken punctuation or doubled spaces.
 * Also performs epistemic claim validation and normal-mode bold asterisk removal.
 */
export function sanitizeVisibleProse(
  text: string,
  sourceMapOrOptions?:
    | RequestSourceMap
    | {
        sourceMap?: RequestSourceMap
        isTechnicalMode?: boolean
        policy?: AnswerEpistemicPolicy
      },
  maybeOptions?: { isTechnicalMode?: boolean; policy?: AnswerEpistemicPolicy }
): string {
  if (!text) return ''

  let sourceMap: RequestSourceMap | undefined = undefined
  let isTechnicalMode = false
  let policy: AnswerEpistemicPolicy | undefined = undefined

  if (sourceMapOrOptions instanceof Map) {
    sourceMap = sourceMapOrOptions
    if (maybeOptions) {
      isTechnicalMode = Boolean(maybeOptions.isTechnicalMode)
      policy = maybeOptions.policy
    }
  } else if (sourceMapOrOptions && typeof sourceMapOrOptions === 'object') {
    sourceMap = sourceMapOrOptions.sourceMap
    isTechnicalMode = Boolean(sourceMapOrOptions.isTechnicalMode)
    policy = sourceMapOrOptions.policy
  }

  // 1. Strip trailing provenance tags
  let res = text.replace(PROVENANCE_TAG_REGEX, '')

  // 2. Rewrite internal tag references in narrative prose (e.g. "based on [reasoning_context]")
  res = res.replace(
    /\b(based\s+on|in|from)[ \t\u202F]+\[(reasoning_context|retrieved_records|limited_absences|verified_absences|temporal_facts|descriptive_counts|domain_outcomes|vault_context|retrieval_scope|ambiguities|empty_states|records|plan|answer_contract|epistemic_policy)\]/gi,
    '$1 the retrieved Vault context'
  )

  // 3. Remove internal context identifiers: [reasoning_context], etc.
  res = res.replace(/([ \t\u202F]*)\[([a-z_]+)\]([ \t\u202F]*)([.,!?;:]?)/gi, (match, leadingSpace, tag, trailingSpace, punct) => {
    if (isInternalContextIdentifier(tag)) {
      if (punct) return punct
      return (leadingSpace || trailingSpace) ? ' ' : ''
    }
    return match
  })

  // 4. Remove inline source handles: [S1], [S2], etc.
  res = res.replace(/([ \t\u202F]*)\[(S\d+)\]([ \t\u202F]*)([.,!?;:]?)/gi, (match, leadingSpace, handle, trailingSpace, punct) => {
    const upper = handle.toUpperCase()
    const isTarget = sourceMap ? sourceMap.has(upper) : true
    if (isTarget) {
      if (punct) return punct
      return (leadingSpace || trailingSpace) ? ' ' : ''
    }
    return match
  })

  // 5. Clean up spaces before punctuation on the same line and collapse horizontal whitespace
  res = res.replace(/[ \t]+([.,!?;:])/g, '$1')
  res = res.replace(/[ \t]{2,}/g, ' ')
  res = res.replace(/[ \t]+$/gm, '')

  // 6. Epistemic claim validation and presentation normalization
  res = validateAndNormalizeEpistemicClaims(res, { isTechnicalMode, policy })

  return res.trim()
}

export interface ParsedModelProvenance {
  cleanText: string
  handles: string[]
  basis?: AnswerBasis
  hasTag: boolean
  rawTag?: string
}

/**
 * Parses structured provenance tags (e.g. [SOURCES: S1, S2 | BASIS: DIRECT_FACT])
 * from model output and returns clean response prose.
 * Also performs resilient fallback recovery of valid inline handles matching RequestSourceMap.
 */
export function parseModelProvenance(
  text: string,
  sourceMapOrOptions?:
    | RequestSourceMap
    | {
        sourceMap?: RequestSourceMap
        isTechnicalMode?: boolean
        policy?: AnswerEpistemicPolicy
      },
  maybeOptions?: { isTechnicalMode?: boolean; policy?: AnswerEpistemicPolicy }
): ParsedModelProvenance {
  if (!text) {
    return { cleanText: '', handles: [], hasTag: false }
  }

  let sourceMap: RequestSourceMap | undefined = undefined
  let isTechnicalMode = false
  let policy: AnswerEpistemicPolicy | undefined = undefined

  if (sourceMapOrOptions instanceof Map) {
    sourceMap = sourceMapOrOptions
    if (maybeOptions) {
      isTechnicalMode = Boolean(maybeOptions.isTechnicalMode)
      policy = maybeOptions.policy
    }
  } else if (sourceMapOrOptions && typeof sourceMapOrOptions === 'object') {
    sourceMap = sourceMapOrOptions.sourceMap
    isTechnicalMode = Boolean(sourceMapOrOptions.isTechnicalMode)
    policy = sourceMapOrOptions.policy
  }

  const match = text.match(PROVENANCE_TAG_REGEX)
  let rawHandles = ''
  let rawBasis = ''
  let hasTag = false
  let rawTag: string | undefined = undefined

  if (match) {
    hasTag = true
    rawTag = match[0]
    rawHandles = (match[1] || match[3] || '').trim()
    rawBasis = (match[2] || match[4] || '').trim().toUpperCase()
  }

  let handles: string[] = []
  let basis: AnswerBasis | undefined = undefined

  if (hasTag) {
    handles = rawHandles
      .split(/[,\s]+/)
      .map((h) => h.trim().toUpperCase())
      .filter((h) => /^S\d+$/.test(h))

    const validBases: Set<AnswerBasis> = new Set([
      'DIRECT_FACT',
      'SYNTHESIS',
      'INFERENCE',
      'UNKNOWN',
      'CONFLICT',
    ])
    basis = validBases.has(rawBasis as AnswerBasis)
      ? (rawBasis as AnswerBasis)
      : undefined
  } else {
    // Resilient Provenance Recovery:
    // If no valid trailing tag exists, recover inline bracketed handles [S1], [S2]
    // matching handles in the current RequestSourceMap BEFORE sanitizing.
    const inlineMatches = text.matchAll(/\[(S\d+)\]/gi)
    const recovered: string[] = []
    const seen = new Set<string>()

    for (const m of inlineMatches) {
      const handle = m[1].toUpperCase()
      if (!seen.has(handle)) {
        seen.add(handle)
        if (!sourceMap || sourceMap.has(handle)) {
          recovered.push(handle)
        }
      }
    }

    if (recovered.length > 0) {
      handles = recovered
      hasTag = true
      basis = 'SYNTHESIS' // Default basis for synthesized multi-domain answers
    }
  }

  const cleanText = sanitizeVisibleProse(text, sourceMap, { isTechnicalMode, policy })

  return {
    cleanText,
    handles,
    basis,
    hasTag,
    rawTag,
  }
}

export interface AuthoritativeProvenanceResult {
  citations: ShawMessageCitation[]
  status: ProvenanceStatus
  validHandlesCount: number
  invalidHandlesCount: number
  invalidHandles: string[]
  basis?: AnswerBasis
}

/**
 * Resolves parsed model handles against the authoritative RequestSourceMap.
 * Discards unknown handles, deduplicates valid handles, and maps each valid
 * source strictly to real database attributes (never accepts model-generated UUIDs).
 */
export function resolveAuthoritativeProvenance(
  sourceMap: RequestSourceMap,
  parsed: ParsedModelProvenance,
  completeness?: CollectionCompleteness[]
): AuthoritativeProvenanceResult {
  if (!parsed.hasTag || parsed.handles.length === 0) {
    return {
      citations: [],
      status: 'UNAVAILABLE',
      validHandlesCount: 0,
      invalidHandlesCount: 0,
      invalidHandles: [],
      basis: parsed.basis,
    }
  }

  const validHandles: string[] = []
  const invalidHandles: string[] = []
  const seenValid = new Set<string>()

  for (const h of parsed.handles) {
    if (sourceMap.has(h)) {
      if (!seenValid.has(h)) {
        seenValid.add(h)
        validHandles.push(h)
      }
    } else {
      invalidHandles.push(h)
    }
  }

  const citations: ShawMessageCitation[] = []

  for (const h of validHandles) {
    const record = sourceMap.get(h)
    if (!record) continue

    const domainScope = completeness?.find((c) => c.domain === record.entityType)
    const routeUrl = resolveProvenanceRoute({
      entityType: record.entityType,
      entityId: record.entityId,
      relationship: record.relationship,
      title: record.title,
    })

    const fieldLocations = record.fields ? Object.keys(record.fields) : undefined

    citations.push({
      type: 'vault',
      title: record.title,
      url: routeUrl,
      entityType: record.entityType,
      entityId: record.entityId,
      reference: `vault://${record.entityType}/${record.entityId}`,
      sourceHandle: h,
      domain: record.entityType,
      epistemicClass: record.epistemicClass,
      routeUrl,
      fieldLocations,
      timestamps: record.timestamps,
      relationship: record.relationship,
      isMaterial: true,
      basis: parsed.basis,
      retrievalScope: domainScope
        ? {
            queryMode: domainScope.queryMode,
            resultScope: domainScope.resultScope,
            returnedCount: domainScope.returnedCount,
            totalCount: domainScope.totalCount,
            appliedLimit: domainScope.appliedLimit,
            hasMore: domainScope.hasMore,
          }
        : undefined,
    })
  }

  let status: ProvenanceStatus = 'UNAVAILABLE'
  if (citations.length > 0) {
    status = invalidHandles.length > 0 ? 'PARTIAL' : 'COMPLETE'
  }

  return {
    citations,
    status,
    validHandlesCount: validHandles.length,
    invalidHandlesCount: invalidHandles.length,
    invalidHandles,
    basis: parsed.basis,
  }
}

/**
 * Creates a stream filter that forwards natural prose tokens immediately to the client
 * while buffering potential trailing provenance protocol tags and concealing inline internal artifacts.
 */
export function createProvenanceStreamFilter(
  onTextChunk: (text: string) => void,
  sourceMap?: RequestSourceMap,
  options?: {
    isTechnicalMode?: boolean
    policy?: AnswerEpistemicPolicy
  }
) {
  let fullRawText = ''
  let emittedText = ''

  return {
    push(text: string) {
      fullRawText += text
      const currentClean = sanitizeVisibleProse(fullRawText, sourceMap, options)

      // Hold emission if fullRawText currently ends with an unclosed bracket, HTML comment tag, or bold asterisk
      let safeLength = currentClean.length
      const lastOpen = fullRawText.lastIndexOf('[')
      const lastClose = fullRawText.lastIndexOf(']')
      const lastOpenHtml = fullRawText.lastIndexOf('<!--')
      const lastCloseHtml = fullRawText.lastIndexOf('-->')

      const inBracket = lastOpen !== -1 && lastOpen > lastClose
      const inHtml = lastOpenHtml !== -1 && lastOpenHtml > lastCloseHtml
      const inStar =
        !options?.isTechnicalMode &&
        (fullRawText.endsWith('*') || (fullRawText.match(/\*/g)?.length || 0) % 2 === 1)

      if (inBracket || inHtml || inStar) {
        let unclosedIdx = -1
        if (inBracket) unclosedIdx = Math.max(unclosedIdx, lastOpen)
        if (inHtml) unclosedIdx = Math.max(unclosedIdx, lastOpenHtml)
        if (inStar) {
          const lastStar = fullRawText.lastIndexOf('*')
          unclosedIdx = Math.max(unclosedIdx, lastStar)
        }
        if (unclosedIdx !== -1) {
          const textBeforeTag = fullRawText.slice(0, unclosedIdx)
          const cleanBeforeTag = sanitizeVisibleProse(textBeforeTag, sourceMap, options)
          safeLength = Math.min(safeLength, cleanBeforeTag.length)
        }
      }

      if (safeLength > emittedText.length) {
        const delta = currentClean.slice(emittedText.length, safeLength)
        if (delta.length > 0) {
          onTextChunk(delta)
          emittedText += delta
        }
      }
    },
    flush(): ParsedModelProvenance {
      const finalClean = sanitizeVisibleProse(fullRawText, sourceMap, options)
      if (finalClean.length > emittedText.length) {
        const delta = finalClean.slice(emittedText.length)
        if (delta.length > 0) {
          onTextChunk(delta)
          emittedText += delta
        }
      }

      return parseModelProvenance(fullRawText, sourceMap, options)
    },
  }
}
