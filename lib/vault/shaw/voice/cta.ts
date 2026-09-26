import { CtaType, CtaIntent } from '../types'

export const CTA_FLEX_CLAUSES = {
  research: 'researcher who reads what others skim',
  strategy: 'strategist who sees the pattern before the strike',
  full: 'researcher who reads what others skim and strategist who sees the pattern before the strike',
}

export function getSignatureCta(type: CtaType = 'standard'): string {
  switch (type) {
    case 'research':
      return `My name is Defiwaynex, ronin writer, ${CTA_FLEX_CLAUSES.research}, teacher of what I’ve already proven. Discipline over noise, precision over hype. And I’ll keep writing, whether my name is on it or not.`
    case 'strategy':
      return `My name is Defiwaynex, ronin writer, ${CTA_FLEX_CLAUSES.strategy}, teacher of what I’ve already proven. Discipline over noise, precision over hype. And I’ll keep writing, whether my name is on it or not.`
    case 'full':
      return `My name is Defiwaynex, ronin writer, ${CTA_FLEX_CLAUSES.full}, teacher of what I’ve already proven. Discipline over noise, precision over hype. And I’ll keep writing, whether my name is on it or not.`
    case 'standard':
    default:
      return `My name is Defiwaynex, ronin writer, teacher of what I’ve already proven. Discipline over noise, precision over hype. And I’ll keep writing, whether my name is on it or not.`
  }
}

/**
 * Deterministic negative CTA patterns.
 * If ANY of these match in the user prompt, the intent is strictly 'none'.
 * Negative instructions always take precedence over positive matching.
 */
const NEGATIVE_CTA_PATTERNS: RegExp[] = [
  // "do not add my cta", "don't include the cta", "never append cta", "don't put cta"
  /\b(do\s+not|don'?t|never)\s+(add|include|use|append|put|need|want)\s+(my\s+|the\s+|a\s+)?(cta|signature|sign-?off)\b/i,
  // "actually do not add it", "don't add it", "do not include it"
  /\b(do\s+not|don'?t|never)\s+(add|include|use|append|put)\s+it\b/i,
  // "no cta", "with no cta"
  /\bno\s+cta\b/i,
  // "without my cta", "without the cta", "without cta"
  /\bwithout\s+(my\s+|the\s+|a\s+|any\s+)?(cta|signature|sign-?off)\b/i,
  // "skip my cta", "omit cta", "exclude the cta", "leave out my cta"
  /\b(skip|omit|exclude|leave\s+out|drop|remove)\s+(my\s+|the\s+|a\s+)?(cta|signature|sign-?off)\b/i,
  // "cta is not needed", "cta not wanted"
  /\bcta\b[^\n.!?]*\b(not\s+needed|not\s+wanted|is\s+unnecessary|disabled|unwanted)\b/i,
]

/**
 * Resolves the deterministic CTA intent from the user's prompt.
 *
 * Invariant: CTA is OPT-IN ONLY.
 * Default is strictly 'none'.
 * Negative instructions immediately resolve to 'none'.
 */
export function resolveCtaIntent(prompt: string): CtaIntent {
  if (!prompt || typeof prompt !== 'string') return 'none'

  // 1. Negative CTA instruction always wins and immediately resolves to 'none'
  for (const pattern of NEGATIVE_CTA_PATTERNS) {
    if (pattern.test(prompt)) {
      return 'none'
    }
  }

  // 2. Explicit positive request matching
  // Full CTA request
  if (/\b(full\s+cta|use\s+(my\s+|the\s+)?full\s+cta|add\s+(my\s+|the\s+)?full\s+cta)\b/i.test(prompt)) {
    return 'full'
  }

  // Research CTA request
  if (/\b(research\s+cta|add\s+(my\s+|the\s+)?research\s+cta|use\s+(my\s+|the\s+)?research\s+cta|include\s+(my\s+|the\s+)?research\s+cta)\b/i.test(prompt)) {
    return 'research'
  }

  // Strategy CTA request
  if (/\b(strategy\s+cta|add\s+(my\s+|the\s+)?strategy\s+cta|use\s+(my\s+|the\s+)?strategy\s+cta|include\s+(my\s+|the\s+)?strategy\s+cta)\b/i.test(prompt)) {
    return 'strategy'
  }

  // Standard/generic CTA request
  if (
    /\b(add|include|use|append)\s+(my\s+|the\s+|a\s+)?cta\b/i.test(prompt) ||
    /\b(end|finish)\s+(this|it)?\s*with\s+(my\s+|the\s+|a\s+)?cta\b/i.test(prompt) ||
    /\bwith\s+(my\s+|the\s+)?cta\b/i.test(prompt)
  ) {
    return 'standard'
  }

  // 3. Default: none
  return 'none'
}

/**
 * Backward-compatible wrapper for detecting explicit CTA requests.
 * Returns CtaType if an explicit opt-in request is detected, or null if none/negative.
 */
export function detectExplicitCtaRequest(prompt: string): CtaType | null {
  const intent = resolveCtaIntent(prompt)
  return intent === 'none' ? null : intent
}

/**
 * Canonical signature regex to detect and strip any auto-generated or hallucinated
 * DeFiwaynex signature from generated text when not requested.
 */
export const DEFIWAYNEX_SIGNATURE_REGEX = /\n*\s*My name is Defiwaynex, ronin writer[\s\S]*?(whether my name is on it or not\.?|$)/i

/**
 * Deterministically processes CTA insertion or removal for generated text.
 * - If intent is 'none': Strips any signature if present.
 * - If intent is explicit ('standard' | 'research' | 'strategy' | 'full'): Ensures the requested CTA is appended.
 */
export function processCtaForGeneratedText(generatedText: string, userPrompt: string): string {
  if (!generatedText) return generatedText
  const intent = resolveCtaIntent(userPrompt)

  if (intent === 'none') {
    // Strip any auto-generated or hallucinated signature CTA
    return generatedText.replace(DEFIWAYNEX_SIGNATURE_REGEX, '').trimEnd()
  }

  // Clean any existing signature first to guarantee idempotent canonical formatting
  const cleaned = generatedText.replace(DEFIWAYNEX_SIGNATURE_REGEX, '').trimEnd()
  const cta = getSignatureCta(intent)
  return `${cleaned}\n\n${cta}`
}

/**
 * Safely appends the CTA to generated text only if the user explicitly requested it.
 * Strips any signature if the user did not opt in.
 */
export function appendCtaIfRequested(generatedText: string, userPrompt: string): string {
  return processCtaForGeneratedText(generatedText, userPrompt)
}
