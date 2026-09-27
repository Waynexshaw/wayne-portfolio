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
 */
export function parseModelProvenance(text: string): ParsedModelProvenance {
  if (!text) {
    return { cleanText: '', handles: [], hasTag: false }
  }

  const match = text.match(PROVENANCE_TAG_REGEX)
  if (!match) {
    return {
      cleanText: text.trim(),
      handles: [],
      hasTag: false,
    }
  }

  const rawHandles = (match[1] || match[3] || '').trim()
  const rawBasis = (match[2] || match[4] || '').trim().toUpperCase()

  const handles = rawHandles
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
  const basis: AnswerBasis | undefined = validBases.has(rawBasis as AnswerBasis)
    ? (rawBasis as AnswerBasis)
    : undefined

  const cleanText = text.replace(match[0], '').trim()

  return {
    cleanText,
    handles,
    basis,
    hasTag: true,
    rawTag: match[0],
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
 * while buffering potential trailing provenance protocol tags (e.g. [SOURCES: S1...])
 * so they are never emitted into visible client text.
 */
export function createProvenanceStreamFilter(onTextChunk: (text: string) => void) {
  let fullRawText = ''
  let pendingBuffer = ''
  const TRIGGER_PREFIX = '[SOURCES:'

  return {
    push(text: string) {
      fullRawText += text
      pendingBuffer += text

      // Check if pendingBuffer contains TRIGGER_PREFIX
      const idx = pendingBuffer.indexOf(TRIGGER_PREFIX)
      if (idx !== -1) {
        const before = pendingBuffer.slice(0, idx)
        if (before.length > 0) {
          onTextChunk(before)
        }
        pendingBuffer = pendingBuffer.slice(idx)
        return
      }

      // If buffer might end with a partial prefix (e.g. "[", "[S", "[SOUR")
      let longestPrefixMatch = 0
      for (let i = 1; i <= Math.min(pendingBuffer.length, TRIGGER_PREFIX.length - 1); i++) {
        const slice = pendingBuffer.slice(-i)
        if (TRIGGER_PREFIX.startsWith(slice)) {
          longestPrefixMatch = i
        }
      }

      if (longestPrefixMatch > 0) {
        const safe = pendingBuffer.slice(0, -longestPrefixMatch)
        if (safe.length > 0) {
          onTextChunk(safe)
        }
        pendingBuffer = pendingBuffer.slice(-longestPrefixMatch)
      } else {
        onTextChunk(pendingBuffer)
        pendingBuffer = ''
      }
    },
    flush(): ParsedModelProvenance {
      const parsed = parseModelProvenance(fullRawText)
      if (!parsed.hasTag && pendingBuffer.length > 0) {
        // False alarm bracket, flush pending buffer
        onTextChunk(pendingBuffer)
      }
      pendingBuffer = ''
      return parsed
    },
  }
}
