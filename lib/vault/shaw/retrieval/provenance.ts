/**
 * Waynex Vault — SHAW Batch 2B.1 Authoritative Provenance Foundation
 *
 * Implements server-managed, request-local source handle resolution,
 * authoritative route resolution, model provenance parsing, and
 * streaming isolation so that model-generated answers are verified
 * against real VaultRecord entities without exposing internal protocol
 * tags or allowing the model to invent database UUIDs.
 */

import { VaultContextEnvelope, VaultRecord, CollectionCompleteness, AnswerEpistemicPolicy, AnswerContract } from './types'
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

export const PROVENANCE_TAG_REGEX = /(?:\[SOURCES:\s*([^|\]]+?)(?:\s*\|\s*BASIS:\s*([A-Za-z_]+))?\s*\]|<!--\s*SOURCES:\s*([^|>-]+?)(?:\s*\|\s*BASIS:\s*([A-Za-z_]+))?\s*-->)/gi

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

    // 5. Replace technical retrieval jargon with Simple English
    res = res.replace(
      /\b(?:within|in)\s+the\s+retrieved\s+(?:[a-z_]+\s+)?scope\b/gi,
      'in the records checked'
    )
    res = res.replace(
      /\bretrieved\s+scope\b/gi,
      'records checked'
    )
    res = res.replace(
      /\bretrieved\s+query\s+scope\b/gi,
      'records checked'
    )
    res = res.replace(
      /\bepistemic\s+policy\b/gi,
      'records checked'
    )
    res = res.replace(
      /\breasoning\s+context\b/gi,
      'Vault records'
    )

    // 6. Normalize unmodeled concept assertions (milestones, subtasks, checkpoints, sprints, etc.)
    // Vault records model projects and tasks, but not milestones, subtasks, checkpoints, etc.
    // SHAW must never present unsupported absence claims as Vault facts.
    // Ground compound task/milestone claims strictly in recorded task facts:
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
      /\bNo progress updates,\s*subtasks,\s*or completion criteria are documented\.?/gi,
      'The records checked do not show how much of the work has already been completed.'
    )

    // Omit unmodeled absence claims rather than inventing new absence claims:
    res = res.replace(
      /[-•]?\s*\b(?:Milestones|Checkpoints|Subtasks|Sprints|Phases)(?:\s*(?:,|and|or)\s*(?:milestones|checkpoints|subtasks|sprints|phases))*\s+(?:were|are)\s+(?:undocumented|not documented)\b\.?\n?/gi,
      ''
    )
    res = res.replace(
      /[-•]?\s*\bNo\s+(?:intermediate\s+)?(?:milestones|checkpoints|subtasks|sprints|phases)(?:\s*(?:,|and|or)\s*(?:milestones|checkpoints|subtasks|sprints|phases))*\s+(?:are|have been|were)\s+(?:documented|recorded|set|defined|found|tracked)\b\.?\n?/gi,
      ''
    )
    res = res.replace(
      /[-•]?\s*\bNo completion criteria are documented\.?\n?/gi,
      ''
    )
    res = res.replace(
      /\b(?:milestones|checkpoints|subtasks|sprints|phases)(?:\s*(?:,|and|or)\s*(?:milestones|checkpoints|subtasks|sprints|phases))*\s+(?:were|are)\s+(?:undocumented|not documented)\b\.?/gi,
      ''
    )
    res = res.replace(
      /\bNo\s+(?:intermediate\s+)?(?:milestones|checkpoints|subtasks|sprints|phases)(?:\s*(?:,|and|or)\s*(?:milestones|checkpoints|subtasks|sprints|phases))*\s+(?:are|have been|were)\s+(?:documented|recorded|set|defined|found|tracked)\b\.?/gi,
      ''
    )

    // Clean any empty bullet points or extra whitespace from omissions
    res = res.replace(/^[ \t]*[-•]\s*$/gm, '')
    res = res.replace(/\.\s*\./g, '.')
    res = res.replace(/[ \t]{2,}/g, ' ')

    // 7. Clean unevaluated meeting domain false claims if any
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

  // Use non-global match to retrieve capture groups reliably
  const tagRegex = /(?:\[SOURCES:\s*([^|\]]+?)(?:\s*\|\s*BASIS:\s*([A-Za-z_]+))?\s*\]|<!--\s*SOURCES:\s*([^|>-]+?)(?:\s*\|\s*BASIS:\s*([A-Za-z_]+))?\s*-->)/i
  const match = text.match(tagRegex)
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

      // Hold emission if fullRawText currently ends with an unclosed bracket, HTML comment tag, bold asterisk,
      // or trailing protocol prefix
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

      // Trailing protocol prefix check (e.g. text ends with "[SOURCES:" or partial bracket tag)
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
      } else {
        // Even if bracket is closed, verify if currentClean still contains any unstripped protocol fragment
        // If an inline tag just closed, sanitizeVisibleProse has already stripped it cleanly
        safeLength = currentClean.length
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

export interface PublicationEvidenceValidationContext {
  policy?: AnswerEpistemicPolicy
  contract?: AnswerContract
  sourceMap?: RequestSourceMap
  records?: VaultRecord[]
  isTechnicalMode?: boolean
}

export type PublicationViolationType =
  | 'UNMODELED_ABSENCE_CLAIM'
  | 'CONTRADICTED_FACT'
  | 'UNAUTHORIZED_GLOBAL_ABSENCE'
  | 'UNEVALUATED_DOMAIN_CLAIM'
  | 'PROTOCOL_LEAK'
  | 'INVENTED_PERCENTAGE_OR_SCORE'
  | 'UNSUPPORTED_PROGRESS_CLAIM'

export interface PublicationViolation {
  type: PublicationViolationType
  detail: string
  severity: 'FATAL' | 'REPAIRED'
}

export interface ControlledPublicationResult {
  isApproved: boolean
  publishedText: string
  rejectionReasons: string[]
  violations: PublicationViolation[]
}

/**
 * Validates candidate response against typed AnswerEpistemicPolicy and AnswerContract
 * before client-visible publication.
 *
 * Deterministically checkable:
 * 1. Protocol concealment: Internal tags ([SOURCES:], [reasoning_context]) must never leak into visible text.
 * 2. Unmodeled absence claims: Vault models projects and tasks, but not milestones, subtasks,
 *    checkpoints, sprints, or phases. Asserting they are missing/undocumented as Vault facts is invalid.
 *    (Distinguishes factual assertions from suggestions in recommendations sections or quoted user text).
 * 3. Contradicted task facts: If completed task count is 0, claiming completed tasks exist is invalid.
 * 4. Evidence-supported metrics: Numbers and percentages are validated against retrieved record fields/corpus;
 *    invented completion percentages (e.g. 60% complete when unrecorded) or project scores are rejected.
 * 5. Bounded domain global claims: If a domain was bounded, claiming global absence without qualification is invalid.
 * 6. Unevaluated domain claims: If a domain was not evaluated, asserting absence or counts is invalid.
 * 7. Unsupported qualitative progress claims: If completed task count is 0 with no supporting progress metrics,
 *    asserting that an objective is "halfway complete", "nearly ready for launch", or has "made steady progress"
 *    is rejected as an unsupported factual claim.
 *
 * Non-deterministic & Architectural Limitation:
 * Open-ended subjective prose nuance, stylistic narrative phrasing, and general real-world commentary
 * that do not mention tracked Vault entities cannot be proven mathematically by regex/heuristic checks alone.
 * The system enforces conservative publication withholding whenever an unsupported factual progress claim
 * or policy contradiction is detected.
 *
 * Conservative Policy:
 * If any fatal contradiction, unauthorized global claim, invented percentage, or unmodeled absence assertion is detected,
 * the response is NOT approved (isApproved = false) and must be withheld completely from publication.
 * We do not silently invent replacement facts.
 */
export function validatePublicationEvidence(
  candidateText: string,
  context: PublicationEvidenceValidationContext
): ControlledPublicationResult {
  const violations: PublicationViolation[] = []
  const rejectionReasons: string[] = []

  // Clean and normalize prose
  const cleanedText = sanitizeVisibleProse(candidateText, context.sourceMap, {
    isTechnicalMode: context.isTechnicalMode,
    policy: context.policy,
  })

  // 1. Protocol leak check
  if (PROVENANCE_TAG_REGEX.test(cleanedText) || /\[SOURCES:[^\]]*\]/i.test(cleanedText)) {
    violations.push({
      type: 'PROTOCOL_LEAK',
      detail: 'Internal provenance protocol tag leaked into visible prose',
      severity: 'FATAL',
    })
    rejectionReasons.push('Internal provenance protocol tag leaked into visible text')
  }

  for (const id of INTERNAL_CONTEXT_IDENTIFIERS) {
    if (new RegExp(`\\[${id}\\]`, 'i').test(cleanedText)) {
      violations.push({
        type: 'PROTOCOL_LEAK',
        detail: `Internal identifier [${id}] leaked into visible text`,
        severity: 'FATAL',
      })
      rejectionReasons.push(`Internal identifier [${id}] leaked into visible text`)
    }
  }

  // Structured evidence extraction from retrieved records
  const allRecords: VaultRecord[] = [
    ...(context.records || []),
    ...(context.sourceMap ? Array.from(context.sourceMap.values()) : []),
  ]

  interface StructuredEvidenceRecord {
    entityType: string
    entityId: string
    title: string
    subjects: string[]
    fieldMeaning: string
    numericValue?: number
    unit?: string
    isTarget: boolean
    isHistorical: boolean
    period?: string
    timestamp?: string
    status?: string
    rawRecord: VaultRecord
  }

  const structuredEvidence: StructuredEvidenceRecord[] = []

  for (const rec of allRecords) {
    const subjects = [rec.title]
    if (rec.relationship?.projectTitle) subjects.push(rec.relationship.projectTitle)
    if (rec.relationship?.companyName) subjects.push(rec.relationship.companyName)
    if (rec.relationship?.contactName) subjects.push(rec.relationship.contactName)

    const baseEvidence = {
      entityType: rec.entityType,
      entityId: rec.entityId,
      title: rec.title,
      subjects,
      rawRecord: rec,
      status: rec.fields?.status || rec.fields?.project_status,
    }

    if (rec.entityType === 'project') {
      if (typeof rec.fields?.budget === 'number' || typeof rec.fields?.budget === 'string') {
        const num = parseFloat(String(rec.fields.budget).replace(/[^0-9.]/g, ''))
        if (!isNaN(num)) {
          structuredEvidence.push({
            ...baseEvidence,
            fieldMeaning: 'budget',
            numericValue: num,
            isTarget: false,
            isHistorical: false,
          })
        }
      }
      if (typeof rec.fields?.health_score === 'number' || typeof rec.fields?.health_score === 'string') {
        const num = parseFloat(String(rec.fields.health_score).replace(/[^0-9.]/g, ''))
        if (!isNaN(num)) {
          structuredEvidence.push({
            ...baseEvidence,
            fieldMeaning: 'health_score',
            numericValue: num,
            isTarget: false,
            isHistorical: false,
          })
        }
      }
      if (
        rec.fields?.completion !== undefined ||
        rec.fields?.progress !== undefined ||
        rec.fields?.completion_percentage !== undefined
      ) {
        const rawVal =
          rec.fields?.completion ?? rec.fields?.progress ?? rec.fields?.completion_percentage
        const num = parseFloat(String(rawVal).replace(/[^0-9.]/g, ''))
        if (!isNaN(num)) {
          structuredEvidence.push({
            ...baseEvidence,
            fieldMeaning: 'completion',
            numericValue: num,
            unit: '%',
            isTarget: false,
            isHistorical: false,
          })
        }
      }
    } else if (rec.entityType === 'metric') {
      const metricName = (rec.fields?.metric_name || rec.title).toLowerCase()
      const isHistorical = Boolean(
        rec.fields?.is_historical ||
        (rec.fields?.period && /^(?:19|20)\d\d-Q[1-4]$/i.test(rec.fields.period)) ||
        (rec.timestamps?.period_end &&
          new Date(rec.timestamps.period_end).getFullYear() < new Date().getFullYear())
      )

      const isProgressMetric = /(?:progress|completion|complete)\b/i.test(
        metricName + ' ' + (rec.fields?.description || '')
      )

      if (rec.fields?.value !== undefined || rec.fields?.current_value !== undefined) {
        const valStr = String(rec.fields?.value ?? rec.fields?.current_value)
        const num = parseFloat(valStr.replace(/[^0-9.]/g, ''))
        if (!isNaN(num)) {
          structuredEvidence.push({
            ...baseEvidence,
            fieldMeaning: isProgressMetric ? 'progress' : metricName,
            numericValue: num,
            unit: rec.fields?.unit || (valStr.includes('%') ? '%' : undefined),
            isTarget: false,
            isHistorical,
            period: rec.fields?.period,
          })
        }
      }

      if (Array.isArray(rec.fields?.activeTargets)) {
        for (const t of rec.fields.activeTargets) {
          const tVal = t.target_value ?? t.value
          const num = parseFloat(String(tVal).replace(/[^0-9.]/g, ''))
          if (!isNaN(num)) {
            structuredEvidence.push({
              ...baseEvidence,
              fieldMeaning: `${metricName}:target`,
              numericValue: num,
              unit: t.unit || (String(tVal).includes('%') ? '%' : undefined),
              isTarget: true,
              isHistorical: false,
              period: t.period,
            })
          }
        }
      }

      if (Array.isArray(rec.fields?.recentObservations)) {
        for (const obs of rec.fields.recentObservations) {
          const num = parseFloat(String(obs.value).replace(/[^0-9.]/g, ''))
          if (!isNaN(num)) {
            const isObsProgress =
              isProgressMetric ||
              /(?:progress|completion|complete)\b/i.test(String(obs.notes || ''))
            structuredEvidence.push({
              ...baseEvidence,
              fieldMeaning: isObsProgress ? 'progress' : `${metricName}:observation`,
              numericValue: num,
              unit: obs.unit || (String(obs.value).includes('%') ? '%' : undefined),
              isTarget: false,
              isHistorical: false,
              timestamp: obs.observed_at,
            })
          }
        }
      }
    } else if (rec.entityType === 'meeting') {
      structuredEvidence.push({
        ...baseEvidence,
        fieldMeaning: 'meeting_outcome',
        isTarget: false,
        isHistorical: false,
      })
    } else if (rec.entityType === 'research') {
      structuredEvidence.push({
        ...baseEvidence,
        fieldMeaning: 'research_analysis',
        isTarget: false,
        isHistorical: false,
      })
    } else if (rec.entityType === 'task') {
      structuredEvidence.push({
        ...baseEvidence,
        fieldMeaning: 'task_status',
        isTarget: false,
        isHistorical: false,
      })
    }
  }

  // Segment candidate text: Distinguish factual sections from recommendations, quotes, and user questions
  const lines = candidateText.split('\n')
  const factualLines: string[] = []
  let inRecommendations = false

  for (const line of lines) {
    const trimmedLine = line.trim()
    if (
      /^(?:#+\s*|\*{1,2}\s*)?(?:recommendations?|suggested\s+(?:actions?|next\s+steps?)|suggestions?|next\s+steps?):?/i.test(
        trimmedLine
      )
    ) {
      inRecommendations = true
    } else if (
      /^(?:#+\s*|\*{1,2}\s*)?(?:what\s+is\s+recorded|confirmed\s+facts?|what\s+is\s+missing|gaps?|status|priorities):?/i.test(
        trimmedLine
      )
    ) {
      inRecommendations = false
    }

    if (!inRecommendations) {
      factualLines.push(line)
    }
  }

  const factualCandidateText = factualLines.join('\n').replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''")
  const unquotedFactualText = factualCandidateText
  const sentences = unquotedFactualText
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean)

  // 2. Unmodeled construct factual absence claims (checked on factual unquoted sections of candidate text)
  const unmodeledAbsencePattern =
    /\b(?:milestone|subtask|checkpoint|sprint|phase)s?\s+(?:are|were|have been)\s+(?:undocumented|missing|not recorded|not documented|absent)\b/i
  const negativeUnmodeledPattern =
    /\bno\s+(?:intermediate\s+)?(?:milestone|subtask|checkpoint|sprint|phase)s?\s+(?:are|were|have been)\s+(?:documented|recorded|set|defined|tracked)\b/i

  if (
    unmodeledAbsencePattern.test(factualCandidateText) ||
    negativeUnmodeledPattern.test(factualCandidateText)
  ) {
    violations.push({
      type: 'UNMODELED_ABSENCE_CLAIM',
      detail: 'Unmodeled construct (milestone/subtask/checkpoint) presented as an absent Vault record',
      severity: 'FATAL',
    })
    rejectionReasons.push('Unmodeled construct asserted as an absent Vault fact')
  }

  // 3. Sentence-level Structured Evidence & Progress Validation
  for (const sentence of sentences) {
    // 3a. Completion / Progress Percentage Check (Structured Evidence)
    const percentagePattern = /\b(\d{1,3})%\s*(?:complete|completed|done|progress)\b/gi
    let pMatch: RegExpExecArray | null
    while ((pMatch = percentagePattern.exec(sentence)) !== null) {
      const claimedPercent = parseFloat(pMatch[1])
      const matchingEv = structuredEvidence.filter(
        (ev) =>
          (ev.fieldMeaning === 'completion' || ev.fieldMeaning === 'progress') &&
          !ev.isTarget &&
          ev.numericValue === claimedPercent
      )

      if (matchingEv.length === 0) {
        violations.push({
          type: 'INVENTED_PERCENTAGE_OR_SCORE',
          detail: `Completion percentage "${pMatch[0]}" is not supported by any recorded project completion or progress field`,
          severity: 'FATAL',
        })
        rejectionReasons.push(
          `Invented completion percentage "${pMatch[0]}" not supported by Vault records`
        )
        break
      }

      // Verify subject alignment (Project A completion must not authorize Project B claim)
      const hasSubjectMatch = matchingEv.some((ev) => {
        const mentionedEntities = allRecords
          .map((r) => r.title)
          .filter(
            (title) =>
              title.length > 2 &&
              new RegExp(`\\b${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(sentence)
          )
        if (mentionedEntities.length > 0) {
          return mentionedEntities.some((mentioned) =>
            ev.subjects.some((subj) => subj.toLowerCase().includes(mentioned.toLowerCase()))
          )
        }
        return true
      })

      if (!hasSubjectMatch) {
        violations.push({
          type: 'INVENTED_PERCENTAGE_OR_SCORE',
          detail: `Completion percentage "${pMatch[0]}" belongs to a different project than the subject of the sentence`,
          severity: 'FATAL',
        })
        rejectionReasons.push(
          `Completion percentage "${pMatch[0]}" does not match the project in the sentence`
        )
        break
      }
    }

    // 3b. Target value claimed as achieved result
    const achievedTargetPattern =
      /\b(?:achieved|reached|attained|delivered)\s+(?:a\s+)?(\d{1,3})%?\b|\b(\d{1,3})%\s*(?:progress\s+)?(?:achieved|reached|attained|delivered)\b/i
    const aMatch = sentence.match(achievedTargetPattern)
    if (aMatch) {
      const claimedVal = parseFloat(aMatch[1] || aMatch[2])
      const targetOnly =
        structuredEvidence.some((ev) => ev.isTarget && ev.numericValue === claimedVal) &&
        !structuredEvidence.some((ev) => !ev.isTarget && ev.numericValue === claimedVal)
      if (targetOnly) {
        violations.push({
          type: 'UNSUPPORTED_PROGRESS_CLAIM',
          detail: `Target value "${claimedVal}%" was presented as an achieved result`,
          severity: 'FATAL',
        })
        rejectionReasons.push(`Target value "${claimedVal}%" cannot be presented as an achieved result`)
      }
    }

    // 3c. Historical metric value claimed as current
    const currentClaimPattern = /\b(?:current|currently|active|today|now)\b/i
    if (currentClaimPattern.test(sentence)) {
      const numMatches = sentence.match(/\b\d+(?:,\d+)?(?:\.\d+)?%?\b/g)
      if (numMatches) {
        for (const rawNum of numMatches) {
          const cleanNum = parseFloat(rawNum.replace(/,/g, ''))
          if (!isNaN(cleanNum) && cleanNum > 10) {
            const allEvForNum = structuredEvidence.filter((ev) => ev.numericValue === cleanNum)
            const isHistoricalOnly = allEvForNum.length > 0 && allEvForNum.every((ev) => ev.isHistorical)
            if (isHistoricalOnly) {
              violations.push({
                type: 'CONTRADICTED_FACT',
                detail: `Historical metric value "${rawNum}" presented as a current active count`,
                severity: 'FATAL',
              })
              rejectionReasons.push(
                `Historical metric value "${rawNum}" cannot be presented as current`
              )
              break
            }
          }
        }
      }
    }

    // 3d. Project score check
    const scorePattern = /\b(?:health\s*score|completion\s*score)\s*(?:of|is|:)?\s*(\d+)/gi
    let sMatch: RegExpExecArray | null
    while ((sMatch = scorePattern.exec(sentence)) !== null) {
      const claimedScore = parseFloat(sMatch[1])
      const isSupported = structuredEvidence.some(
        (ev) => ev.fieldMeaning === 'health_score' && ev.numericValue === claimedScore
      )
      if (!isSupported) {
        violations.push({
          type: 'INVENTED_PERCENTAGE_OR_SCORE',
          detail: `Invented project score "${sMatch[0]}" not supported by retrieved Vault evidence`,
          severity: 'FATAL',
        })
        rejectionReasons.push(`Invented score "${sMatch[0]}" not supported by Vault records`)
        break
      }
    }

    // 3e. Task-specific completion claims
    const taskCompletionPattern =
      /\b(?:completed\s+[1-9]\d*\s+tasks?|[1-9]\d*\s+tasks?\s+(?:are|were|have been)\s+completed|all\s+tasks\s+(?:are|have been)\s+completed|tasks?\s+(?:are|were|is)\s+(?:halfway|partially|nearly|almost)\s+(?:complete|completed|done|finished))\b/i
    if (taskCompletionPattern.test(sentence)) {
      if (context.policy?.directFactualCounts.completedRecordedTaskCount === 0) {
        violations.push({
          type: 'CONTRADICTED_FACT',
          detail:
            'Response claims tasks are completed or partially completed, but 0 completed tasks are recorded',
          severity: 'FATAL',
        })
        rejectionReasons.push(
          'Response asserts tasks are completed when Vault records show 0 completed tasks'
        )
      }
    }

    // 3f. Qualitative Progress Claims (Domain-grounded vs Unanchored)
    const generalProgressPattern =
      /\b(?:halfway|partially|nearly|almost)\s+(?:complete|completed|done|finished|ready\s+for\s+launch)\b|\b(?:made\s+steady\s+progress|significant\s+progress\s+has\s+been\s+made|progress\s+is\s+steady)\b/i
    if (generalProgressPattern.test(sentence)) {
      // Check if grounded in explicit domain evidence
      const isMeetingEvidenced =
        /meeting|partnership|agreement/i.test(sentence) &&
        allRecords.some(
          (r) =>
            r.entityType === 'meeting' &&
            /(?:partnership|agreement|finalized|completed|signed|finished)/i.test(
              r.title + ' ' + JSON.stringify(r.fields)
            )
        )

      const isMetricEvidenced =
        /metric|growth|retention|members|onboarding/i.test(sentence) &&
        allRecords.some(
          (r) =>
            r.entityType === 'metric' &&
            /(?:growth|members|onboarding|retention|increase|gain)/i.test(
              r.title + ' ' + (r.fields?.metric_name || '')
            )
        )

      const isResearchEvidenced =
        /research|study|analysis/i.test(sentence) &&
        allRecords.some(
          (r) =>
            r.entityType === 'research' &&
            (r.fields?.status === 'completed' ||
              /(?:completed|finished|finalized|findings)/i.test(
                r.title + ' ' + (r.fields?.summary || '')
              ))
        )

      if (!isMeetingEvidenced && !isMetricEvidenced && !isResearchEvidenced) {
        // Must be supported by completed tasks or explicit project completion
        const completedTasks = context.policy?.directFactualCounts.completedRecordedTaskCount || 0
        const hasProjectCompletion = structuredEvidence.some(
          (ev) => ev.fieldMeaning === 'completion' && (ev.numericValue || 0) > 0
        )

        if (completedTasks === 0 && !hasProjectCompletion) {
          violations.push({
            type: 'UNSUPPORTED_PROGRESS_CLAIM',
            detail:
              'Response makes qualitative progress claims unsupported by recorded task facts or domain evidence',
            severity: 'FATAL',
          })
          rejectionReasons.push('Response asserts qualitative progress not supported by Vault records')
        }
      }
    }
  }

  // 4. Policy-grounded evidence checks
  if (context.policy) {

    // Global absence claims on bounded domains
    for (const [domain, perm] of Object.entries(context.policy.domainPermissions)) {
      if (perm.allowedNegativeClaimType === 'BOUNDED_ONLY') {
        const globalClaimPattern = new RegExp(
          `\\b(?:No\\s+${domain}s?\\s+exist(?:\\s+in\\s+the\\s+Vault)?|The\\s+project\\s+has\\s+no\\s+${domain}s?|All\\s+${domain}s?\\s+are\\s+absent)\\b`,
          'i'
        )
        if (globalClaimPattern.test(unquotedFactualText)) {
          violations.push({
            type: 'UNAUTHORIZED_GLOBAL_ABSENCE',
            detail: `Global absence claim for bounded domain '${domain}' without query bounds qualification`,
            severity: 'FATAL',
          })
          rejectionReasons.push(`Unauthorized global absence claim for bounded domain '${domain}'`)
        }
      } else if (perm.allowedNegativeClaimType === 'NONE' && !perm.evaluated) {
        const unevaluatedClaimPattern = new RegExp(
          `\\b(?:zero\\s+${domain}s?\\s+logged|no\\s+${domain}s?\\s+(?:exist|found|logged|recorded))\\b`,
          'i'
        )
        if (unevaluatedClaimPattern.test(unquotedFactualText)) {
          violations.push({
            type: 'UNEVALUATED_DOMAIN_CLAIM',
            detail: `Absence or count claim for unevaluated domain '${domain}'`,
            severity: 'FATAL',
          })
          rejectionReasons.push(`Absence or count claim for unevaluated domain '${domain}'`)
        }
      }
    }
  }

  const isApproved = violations.every((v) => v.severity !== 'FATAL')

  return {
    isApproved,
    publishedText: isApproved ? cleanedText : '',
    rejectionReasons,
    violations,
  }
}

