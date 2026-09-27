import { ComplianceCheck, ComplianceResult, CtaIntent } from '../types'
import { DEFIWAYNEX_SIGNATURE_REGEX } from './cta'

/**
 * Voice Compliance Engine (Voice Check V2)
 *
 * Implements deterministic compliance verification for the DeFiwayneX voice.
 * Strictly separates:
 * 1. HARD VIOLATIONS (controlled correction triggers):
 *    - em_dash (— or --)
 *    - unwanted_cta (signature CTA present when intent is 'none')
 *    - duplicate_cta (more than one signature CTA present)
 *    - formulaic_contrast (high-confidence template contrasts like "it's not X, it's Y")
 *
 * 2. SOFT CONTEXTUAL WARNINGS (reported honestly, NEVER trigger auto-correction or loops):
 *    - banned_buzzwords (contextual advisory; words like "leverage" have legitimate financial meanings)
 *    - cliche_endings (stylistic advisory)
 *    - choppy_punctuation (sentence rhythm advisory)
 */

export const BANNED_BUZZWORDS = [
  'leverage',
  'unlock',
  'elevate',
  'game-changing',
  'cutting-edge',
  'synergy',
  'seamlessly',
  'delve',
  'paradigm',
  'revolutionize',
  'transformative',
  'supercharge',
]

export const FORMULAIC_CONTRAST_PATTERNS = [
  /\bnot\s+[^,.]+,\s*it(?:'s|\s+is)\b/i,
  /\bthe\s+people\s+who\s+[^,.]+\s+aren't\s+the\s+ones\s+who\b/i,
  /\bit(?:'s|\s+is)\s+not\s+about\s+[^,.]+,\s*it(?:'s|\s+is)\s+about\b/i,
  /\bthe\s+question\s+is\s+no\s+longer\b/i,
]

export const CLICHE_ENDINGS = [
  /the\s+future\s+isn't\s+waiting[.,]/i,
  /the\s+question\s+is\s+no\s+longer\s+whether/i,
  /and\s+maybe,\s+just\s+maybe/i,
  /only\s+time\s+will\s+tell[.,]/i,
  /it's\s+already\s+being\s+built[.,]/i,
]

export interface ScanComplianceOptions {
  ctaIntent?: CtaIntent
}

/**
 * Evaluates whether a compliance check represents a hard generation violation / correction trigger.
 * Strictly triggers ONLY for: em_dash, unwanted_cta, duplicate_cta, formulaic_contrast.
 * Never triggers for buzzwords, clichés, or choppy punctuation.
 */
export function isHardCorrectionTrigger(check: ComplianceCheck): boolean {
  if (check.name === 'em_dash' && check.matches && check.matches.length > 0) return true
  if (check.name === 'unwanted_cta' && check.status === 'violation') return true
  if (check.name === 'duplicate_cta' && check.status === 'violation') return true
  if (check.name === 'formulaic_contrast' && check.status === 'violation') return true
  return false
}

export function isHardViolation(check: ComplianceCheck): boolean {
  return isHardCorrectionTrigger(check)
}

/**
 * Scans text for voice compliance against deterministic DeFiwayneX rules.
 */
export function scanVoiceCompliance(
  text: string,
  options?: ScanComplianceOptions
): ComplianceResult {
  if (!text || text.trim().length === 0) {
    return { passed: true, checks: [] }
  }

  const checks: ComplianceCheck[] = []
  const ctaIntent = options?.ctaIntent || 'none'

  // 1. HARD CORRECTION TRIGGER: Em Dash Check
  const emDashMatches = text.match(/—|--/g)
  if (emDashMatches && emDashMatches.length > 0) {
    checks.push({
      name: 'em_dash',
      status: 'warning',
      description: `Found ${emDashMatches.length} em dash(es). Express thoughts with natural commas or periods.`,
      matches: emDashMatches,
    })
  } else {
    checks.push({
      name: 'em_dash',
      status: 'passed',
      description: 'Zero unnecessary em dashes.',
    })
  }

  // 2. HARD: CTA Opt-In & Duplicate Signature Check
  const signatureMatches = text.match(new RegExp(DEFIWAYNEX_SIGNATURE_REGEX, 'gi')) || []
  if (ctaIntent === 'none' && signatureMatches.length > 0) {
    checks.push({
      name: 'unwanted_cta',
      status: 'violation',
      description: 'Detected author signature CTA when CTA was not requested or explicitly forbidden.',
      matches: signatureMatches,
    })
  } else if (signatureMatches.length > 1) {
    checks.push({
      name: 'duplicate_cta',
      status: 'violation',
      description: `Detected ${signatureMatches.length} signature CTAs in generated output. Only one signature is permitted.`,
      matches: signatureMatches,
    })
  } else {
    checks.push({
      name: 'cta_compliance',
      status: 'passed',
      description: 'CTA conforms strictly to user opt-in intent.',
    })
  }

  // 3. HARD: Formulaic Contrast Structure Check
  const matchedContrasts: string[] = []
  for (const pattern of FORMULAIC_CONTRAST_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      matchedContrasts.push(match[0])
    }
  }

  if (matchedContrasts.length > 0) {
    checks.push({
      name: 'formulaic_contrast',
      status: 'violation',
      description: `Uses formulaic contrast patterns ("it's not X, it's Y"). Express the thought directly without rhetorical templates.`,
      matches: matchedContrasts,
    })
  } else {
    checks.push({
      name: 'formulaic_contrast',
      status: 'passed',
      description: 'Zero formulaic contrast structures.',
    })
  }

  // 4. Stylistic: Corporate Buzzwords Check (Soft violation: reported in check, but NEVER a hard auto-correction trigger)
  const foundBuzzwords: string[] = []
  for (const word of BANNED_BUZZWORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi')
    if (regex.test(text)) {
      foundBuzzwords.push(word)
    }
  }

  if (foundBuzzwords.length > 0) {
    checks.push({
      name: 'banned_buzzwords',
      status: 'violation',
      description: `Contains corporate buzzword(s): ${foundBuzzwords.join(', ')}. Prefer concrete plain language.`,
      matches: foundBuzzwords,
    })
  } else {
    checks.push({
      name: 'banned_buzzwords',
      status: 'passed',
      description: 'Zero banned corporate buzzwords.',
    })
  }

  // 5. Stylistic: Cliché / Dramatic Ending Check (Soft violation: reported in check, but NEVER a hard auto-correction trigger)
  const lastChunk = text.slice(-300)
  const matchedEndings: string[] = []
  for (const pattern of CLICHE_ENDINGS) {
    const match = lastChunk.match(pattern)
    if (match) {
      matchedEndings.push(match[0])
    }
  }

  if (matchedEndings.length > 0) {
    checks.push({
      name: 'cliche_endings',
      status: 'violation',
      description: `Ends with generic AI motivational or dramatic filler. If the content has made its point, simply end it.`,
      matches: matchedEndings,
    })
  } else {
    checks.push({
      name: 'cliche_endings',
      status: 'passed',
      description: 'Clean, unmanufactured ending.',
    })
  }

  // 6. SOFT: Choppy Punctuation Check (Advisory warning only)
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  let consecutiveShort = 0
  let maxConsecutiveShort = 0

  for (const s of sentences) {
    const wordCount = s.split(/\s+/).length
    if (wordCount <= 3 && wordCount > 0) {
      consecutiveShort++
      if (consecutiveShort > maxConsecutiveShort) {
        maxConsecutiveShort = consecutiveShort
      }
    } else {
      consecutiveShort = 0
    }
  }

  if (maxConsecutiveShort >= 4) {
    checks.push({
      name: 'choppy_punctuation',
      status: 'warning',
      description: `Contains ${maxConsecutiveShort} consecutive ultra-short sentences. Ensure natural sentence flow without robotic stop-start rhythm.`,
    })
  } else {
    checks.push({
      name: 'choppy_punctuation',
      status: 'passed',
      description: 'Balanced sentence rhythm.',
    })
  }

  const hasViolations = checks.some((c) => c.status === 'violation')
  const passed = !hasViolations

  return {
    passed,
    checks,
  }
}

/**
 * Returns any hard violations found in the compliance result.
 */
export function getHardViolations(result: ComplianceResult): ComplianceCheck[] {
  return result.checks.filter(isHardViolation)
}

/**
 * Sanitizes obvious formatting issues for manual user correction in the UI modal.
 * Note: Never applied automatically without explicit user action or controlled correction.
 */
export function sanitizeObviousViolations(text: string): string {
  if (!text) return text
  return text.replace(/\s*—\s*/g, ', ').replace(/\s*--\s*/g, ', ')
}
