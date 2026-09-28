/**
 * Waynex Vault — SHAW Batch 2B.1 Authoritative Provenance Foundation
 *
 * Implements server-managed, request-local source handle resolution,
 * authoritative route resolution, model provenance parsing, and
 * streaming isolation so that model-generated answers are verified
 * against real VaultRecord entities without exposing internal protocol
 * tags or allowing the model to invent database UUIDs.
 */

import { VaultContextEnvelope, VaultRecord, CollectionCompleteness } from './types'
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
])

export function isInternalContextIdentifier(str: string): boolean {
  return INTERNAL_CONTEXT_IDENTIFIERS.has(str.toLowerCase())
}

/**
 * Canonical sanitization policy for client-visible and persisted assistant prose.
 * Strips trailing provenance protocol tags, inline current-turn source handles ([S1], [S2]...),
 * and known internal context/schema identifiers without damaging legitimate user-facing bracketed prose
 * or leaving broken punctuation or doubled spaces.
 */
export function sanitizeVisibleProse(text: string, sourceMap?: RequestSourceMap): string {
  if (!text) return ''

  // 1. Strip trailing provenance tags
  let res = text.replace(PROVENANCE_TAG_REGEX, '')

  // 2. Rewrite internal tag references in narrative prose (e.g. "based on [reasoning_context]")
  res = res.replace(
    /\b(based\s+on|in|from)[ \t\u202F]+\[(reasoning_context|retrieved_records|limited_absences|verified_absences|temporal_facts|descriptive_counts|domain_outcomes|vault_context|retrieval_scope|ambiguities|empty_states|records|plan)\]/gi,
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
  sourceMap?: RequestSourceMap
): ParsedModelProvenance {
  if (!text) {
    return { cleanText: '', handles: [], hasTag: false }
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

  const cleanText = sanitizeVisibleProse(text, sourceMap)

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
  sourceMap?: RequestSourceMap
) {
  let fullRawText = ''
  let emittedText = ''

  return {
    push(text: string) {
      fullRawText += text
      const currentClean = sanitizeVisibleProse(fullRawText, sourceMap)

      // Hold emission if fullRawText currently ends with an unclosed bracket or HTML comment tag
      let safeLength = currentClean.length
      const lastOpen = fullRawText.lastIndexOf('[')
      const lastClose = fullRawText.lastIndexOf(']')
      const lastOpenHtml = fullRawText.lastIndexOf('<!--')
      const lastCloseHtml = fullRawText.lastIndexOf('-->')

      const inBracket = lastOpen !== -1 && lastOpen > lastClose
      const inHtml = lastOpenHtml !== -1 && lastOpenHtml > lastCloseHtml

      if (inBracket || inHtml) {
        const unclosedIdx = inBracket ? lastOpen : lastOpenHtml
        const textBeforeTag = fullRawText.slice(0, unclosedIdx)
        const cleanBeforeTag = sanitizeVisibleProse(textBeforeTag, sourceMap)
        safeLength = Math.min(safeLength, cleanBeforeTag.length)
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
      const finalClean = sanitizeVisibleProse(fullRawText, sourceMap)
      if (finalClean.length > emittedText.length) {
        const delta = finalClean.slice(emittedText.length)
        if (delta.length > 0) {
          onTextChunk(delta)
          emittedText += delta
        }
      }

      return parseModelProvenance(fullRawText, sourceMap)
    },
  }
}
