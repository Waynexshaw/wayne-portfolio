import { ComplianceCheck, ComplianceResult } from '../types'

const BANNED_BUZZWORDS = [
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

const FORMULAIC_CONTRAST_PATTERNS = [
  /\bnot\s+[^,.]+,\s*it(?:'s|\s+is)\b/i,
  /\bthe\s+people\s+who\s+[^,.]+\s+aren't\s+the\s+ones\s+who\b/i,
  /\bit(?:'s|\s+is)\s+not\s+about\s+[^,.]+,\s*it(?:'s|\s+is)\s+about\b/i,
  /\bthe\s+question\s+is\s+no\s+longer\b/i,
]

const CLICHE_ENDINGS = [
  /the\s+future\s+isn't\s+waiting[.,]/i,
  /the\s+question\s+is\s+no\s+longer\s+whether/i,
  /and\s+maybe,\s+just\s+maybe/i,
  /only\s+time\s+will\s+tell[.,]/i,
  /it's\s+already\s+being\s+built[.,]/i,
]

export function scanVoiceCompliance(text: string): ComplianceResult {
  if (!text || text.trim().length === 0) {
    return { passed: true, checks: [] }
  }

  const checks: ComplianceCheck[] = []

  // 1. Em Dash Check
  const emDashMatches = text.match(/—|--/g)
  if (emDashMatches && emDashMatches.length > 0) {
    checks.push({
      name: 'em_dash',
      status: 'warning',
      description: `Found ${emDashMatches.length} em dash(es). Prefer plain declarative sentences with commas or periods.`,
      matches: emDashMatches,
    })
  } else {
    checks.push({
      name: 'em_dash',
      status: 'passed',
      description: 'Zero unnecessary em dashes.',
    })
  }

  // 2. Banned Corporate Buzzwords Check
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

  // 3. Formulaic Contrast Structure Check
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

  // 4. Cliché / Dramatic Ending Check
  // Check the last 300 characters of text
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

  // 5. Choppy Punctuation Check (excessive consecutive ultra-short sentences)
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
 * Deterministically sanitizes safe, obvious formatting issues
 * (e.g. replacing em dashes with commas or clean periods).
 */
export function sanitizeObviousViolations(text: string): string {
  if (!text) return text
  // Replace standalone em dash with a comma or hyphen
  return text.replace(/\s*—\s*/g, ', ').replace(/\s*--\s*/g, ', ')
}
