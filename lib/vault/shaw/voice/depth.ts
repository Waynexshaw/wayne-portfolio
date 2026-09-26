import { ShawCapability, ShawOutputDepth, ShawOutputFormat, ShawGenerationIntent } from '../types'
import { resolveCtaIntent } from './cta'

/**
 * Format and Depth Intent Resolution Engine for SHAW
 *
 * Core architectural principle:
 * FORMAT, DEPTH, VOICE, and CTA are completely separate dimensions:
 * - FORMAT controls WHAT SHAPE the output takes (e.g. X post, X thread, article, report, linkedin, general).
 * - DEPTH controls HOW FULLY the subject is developed (short, normal, detailed, deep).
 * - VOICE controls HOW the content sounds (peer-to-peer, direct, unhurried, concrete over abstract).
 * - CTA controls EXPLICIT SIGNATURE behavior (opt-in only).
 *
 * Precedence:
 * 1. Safety / system constraints
 * 2. Explicit current user instruction
 * 3. Requested format
 * 4. Requested depth
 * 5. Identity voice profile
 * 6. General stylistic defaults
 */

/**
 * Resolves the requested output format from the prompt.
 */
export function resolveFormatIntent(prompt: string): ShawOutputFormat {
  if (!prompt || typeof prompt !== 'string') return 'general'

  // 1. Thread patterns (check first before single post)
  if (
    /\b(?:x|twitter)\s+thread\b/i.test(prompt) ||
    /\bthread\s+of\s+(?:posts|tweets)\b/i.test(prompt) ||
    /\bmulti-?post\s+thread\b/i.test(prompt) ||
    /\b\d+[- ](?:part|post|tweet)\s+thread\b/i.test(prompt) ||
    /\b(?:write|create|draft|give\s+me)\s+(?:a\s+)?thread\b/i.test(prompt) ||
    /\bthread\s+(?:about|on|explaining|breaking\s+down)\b/i.test(prompt)
  ) {
    return 'x_thread'
  }

  // 2. Article / Essay / Long-form patterns
  if (
    /\barticle\b/i.test(prompt) ||
    /\bessay\b/i.test(prompt) ||
    /\bblog(?:\s+post)?\b/i.test(prompt) ||
    /\blong-?form\s+(?:post|piece|writeup)\b/i.test(prompt)
  ) {
    return 'article'
  }

  // 3. Single X / Twitter post patterns
  if (
    /\b(?:final\s+)?(?:x|twitter)\s+post\b/i.test(prompt) ||
    /\b(?:a\s+)?tweet\b/i.test(prompt) ||
    /\bpost\s+on\s+x\b/i.test(prompt) ||
    /\bx\s+update\b/i.test(prompt) ||
    /\bsingle\s+(?:x\s+post|tweet)\b/i.test(prompt)
  ) {
    return 'x_post'
  }

  // 4. LinkedIn post patterns
  if (
    /\blinkedin\s+post\b/i.test(prompt) ||
    /\blinkedin\s+update\b/i.test(prompt) ||
    /\bon\s+linkedin\b/i.test(prompt) ||
    /\bfor\s+linkedin\b/i.test(prompt)
  ) {
    return 'linkedin'
  }

  // 5. Report / Brief patterns
  if (
    /\b(?:research\s+)?report\b/i.test(prompt) ||
    /\bexecutive\s+brief\b/i.test(prompt) ||
    /\b(?:write|draft|prepare|give\s+me)\s+(?:a\s+)?brief\b/i.test(prompt) ||
    /\bbrief\s+on\b/i.test(prompt) ||
    /\bmemo\b/i.test(prompt)
  ) {
    return 'report'
  }

  return 'general'
}

/**
 * Contrast override patterns where a contrastive clause ("but keep ... short")
 * dictates the final artifact depth over earlier exploratory phrases.
 */
const CONTRAST_OVERRIDE_SHORT: RegExp[] = [
  /\b(?:but|however|although|yet)\s+(?:keep|make|ensure|the\s+final)\b[^\n.!?]*?\b(short|brief|concise)\b/i,
  /(?<!(?:don'?t|do\s+not|never)\s+)\b(?:keep|make)\s+(?:the\s+)?(?:final\s+)?(?:[a-z0-9_-]+\s+)?(short|brief|concise)\b/i,
  /\b(?:final\s+artifact|final\s+post|final\s+version|final\s+piece)\s+(?:is|must\s+be|should\s+be)?\s*(short|brief|concise)\b/i,
]

const CONTRAST_OVERRIDE_DEEP: RegExp[] = [
  /\b(?:but|however|although|yet)\s+(?:keep|make|ensure|the\s+final)\b[^\n.!?]*?\b(deep|comprehensive|extensive|in-?depth)\b/i,
  /(?<!(?:don'?t|do\s+not|never)\s+)\b(?:keep|make)\s+(?:the\s+)?(?:final\s+)?(?:[a-z0-9_-]+\s+)?(deep|comprehensive|extensive|in-?depth)\b/i,
]

const CONTRAST_OVERRIDE_DETAILED: RegExp[] = [
  /\b(?:but|however|although|yet)\s+(?:keep|make|ensure|the\s+final)\b[^\n.!?]*?\b(detailed|thorough)\b/i,
  /(?<!(?:don'?t|do\s+not|never)\s+)\b(?:keep|make)\s+(?:the\s+)?(?:final\s+)?(?:[a-z0-9_-]+\s+)?(detailed|thorough)\b/i,
]

/**
 * Patterns matching "short" where it is attached ONLY to an introductory element,
 * e.g. "Start with a short introduction, then give me a detailed breakdown"
 */
const INTRO_ONLY_SHORT_REGEX = /\b(?:start|begin)\s+with\s+(?:a\s+)?(?:short|brief|quick)\s+(?:intro|introduction|opening|overview|hook|summary)\b|\b(?:short|brief|quick)\s+(?:intro|introduction|opening|overview|hook)\b/gi

/**
 * Deep depth indicators
 */
const DEEP_PATTERNS: RegExp[] = [
  /\bdeep\s+dive\b/i,
  /\bdeep-dive\b/i,
  /\bcomprehensive\b/i,
  /\bextensive\b/i,
  /\blong-?form\b/i,
  /\bvery\s+detailed\b/i,
  /\bin-?depth\b/i,
  /\bdeep\s+(?:explanation|analysis|breakdown|article|look)\b/i,
  /\bexhaustively\b/i,
]

/**
 * Detailed depth indicators
 */
const DETAILED_PATTERNS: RegExp[] = [
  /\bwell\s+detailed\b/i,
  /\b(?:in|with)\s+detail\b/i,
  /\bgive\s+(?:enough\s+detail|me\s+enough\s+detail)\b/i,
  /\b(?:make|develop)\s+the\s+point\s+properly\b/i,
  /\bexplain\s+(?:it\s+)?properly\b/i,
  /\bdevelop\s+(?:the\s+point|this|the\s+argument|the\s+reasoning)\b/i,
  /\bthorough(?:ly)?\b/i,
  /\bdetailed\s+(?:x\s+post|article|breakdown|post|explanation|analysis|summary|overview|view|thread)\b/i,
  /\b(?:write|provide|give)\s+(?:me\s+)?(?:a\s+)?detailed\b/i,
  /\bexplain\s+(?:this\s+)?in\s+detail\b/i,
  /\bbreak\s+down\s+in\s+detail\b/i,
  /\bdetailed\b/i,
]

/**
 * Short depth indicators
 */
const SHORT_PATTERNS: RegExp[] = [
  /\bshort\s+(?:x\s+post|post|tweet|article|thread|answer|explanation|summary|update)\b/i,
  /\b(?:write|give\s+me|keep\s+it)\s+(?:a\s+)?(?:short|brief|concise)\b/i,
  /\bconcise\b/i,
  /\bbrief\b/i,
  /\bquick\s+(?:answer|explanation|summary|overview|post)\b/i,
  /\b(?:in\s+)?(?:a\s+)?few\s+lines\b/i,
  /\b(?:in\s+)?one\s+paragraph\b/i,
  /\b(?:in\s+)?(?:a\s+)?few\s+sentences\b/i,
  /\bshort\b/i,
]

/**
 * Resolves the requested output depth from the prompt.
 *
 * Categories:
 * - 'short': Efficient, compact, no unnecessary expansion.
 * - 'normal': Natural development, default when no explicit depth instruction given.
 * - 'detailed': Develop reasoning and mechanisms thoroughly, with concrete consequences and context.
 * - 'deep': Substantially explore multiple dimensions, root causes, implications, without padding.
 */
export function resolveDepthIntent(prompt: string): ShawOutputDepth {
  if (!prompt || typeof prompt !== 'string') return 'normal'

  // 1. Contrast overrides: explicit final artifact constraint wins
  // e.g. "Give me a detailed explanation, but keep the final X post short"
  for (const pattern of CONTRAST_OVERRIDE_SHORT) {
    if (pattern.test(prompt)) {
      return 'short'
    }
  }

  for (const pattern of CONTRAST_OVERRIDE_DEEP) {
    if (pattern.test(prompt)) {
      return 'deep'
    }
  }

  for (const pattern of CONTRAST_OVERRIDE_DETAILED) {
    if (pattern.test(prompt)) {
      return 'detailed'
    }
  }

  // 2. Check for DEEP signals
  const hasDeep = DEEP_PATTERNS.some((p) => p.test(prompt))
  if (hasDeep) {
    return 'deep'
  }

  // 3. Check for DETAILED signals
  const hasDetailed = DETAILED_PATTERNS.some((p) => p.test(prompt))
  if (hasDetailed) {
    return 'detailed'
  }

  // 4. Check for SHORT signals
  // If "short" is only attached to an intro element (e.g. "start with a short introduction, then...")
  // and prompt contains no other short signals, do NOT classify the entire output as short.
  let cleanedForShort = prompt.replace(INTRO_ONLY_SHORT_REGEX, '')
  // Also guard against "don't make it short" / "not short"
  cleanedForShort = cleanedForShort.replace(/\b(?:don'?t|do\s+not|never)\s+make\s+it\s+(?:short|brief)\b/gi, '')
  cleanedForShort = cleanedForShort.replace(/\bnot\s+(?:short|brief)\b/gi, '')

  const hasShort = SHORT_PATTERNS.some((p) => p.test(cleanedForShort))
  if (hasShort) {
    return 'short'
  }

  // 5. Default is 'normal'
  return 'normal'
}

/**
 * Resolves the full generation intent tuple: capability, format, depth, ctaIntent.
 */
export function resolveGenerationIntent(
  prompt: string,
  capability: ShawCapability = 'create'
): ShawGenerationIntent {
  return {
    capability,
    format: resolveFormatIntent(prompt),
    depth: resolveDepthIntent(prompt),
    ctaIntent: resolveCtaIntent(prompt),
  }
}

/**
 * Constructs system prompt directives that guide the model on output shape and depth.
 *
 * Implements the core principles:
 * - FORMAT and DEPTH are independent dimensions.
 * - Explicit user depth instructions outrank general voice guidance.
 * - No arbitrary rigid word counts.
 * - X posts do NOT default to 280 chars or 1 paragraph when detailed depth is requested.
 */
export function getDepthDirectives(
  format: ShawOutputFormat,
  depth: ShawOutputDepth,
  capability: ShawCapability = 'create'
): string {
  // If in Ask mode with default normal/general, minimal directives to keep prompt lean
  if (capability === 'ask' && format === 'general' && depth === 'normal') {
    return ''
  }

  let formatInstruction = ''
  switch (format) {
    case 'x_post':
      formatInstruction =
        'FORMAT: X POST (Single post). Deliver as a single, coherent post (not a thread). Modern X posts support long-form depth when detailed or deep is requested; do NOT artificially truncate into legacy 280-character limits unless explicitly instructed. Do NOT automatically split into multiple tweets. When short depth is requested, deliver as a genuinely compact social thought.'
      break
    case 'x_thread':
      formatInstruction =
        'FORMAT: X THREAD. Deliver as a numbered, connected sequence of posts (e.g. 1/, 2/). If the user specified a count, respect it; otherwise calibrate the number of posts to develop the requested depth naturally without forcing an arbitrary count.'
      break
    case 'article':
      formatInstruction =
        'FORMAT: ARTICLE. Deliver as a structured, long-form written piece with natural narrative progression. Preserve peer-to-peer spoken prose rather than textbook or corporate memo formatting. Avoid excessive bullet lists.'
      break
    case 'linkedin':
      formatInstruction =
        'FORMAT: LINKEDIN POST. Formatted cleanly for professional reading without generic corporate motivational language or engagement-bait.'
      break
    case 'report':
      formatInstruction =
        'FORMAT: REPORT / BRIEF. Clear, structured analysis grounded in concrete facts, observed mechanisms, and operational reality.'
      break
    case 'general':
    default:
      formatInstruction =
        'FORMAT: DIRECT PROSE. Shape the response directly to the user\'s inquiry in clean, natural prose.'
      break
  }

  let depthInstruction = ''
  switch (depth) {
    case 'short':
      depthInstruction =
        'DEPTH: SHORT (Compact development). Focus on one central idea with minimal supporting context. Deliver a compact development: one concrete observation, one supporting consequence, and a clean conclusion. Do NOT include an unnecessary second example, an extended backstory scenario, or repeated explanations. For a single X post, deliver a compact post that can be read quickly as one social thought—normally a single compact paragraph. End immediately once the core point is clear.'
      break
    case 'detailed':
      depthInstruction =
        'DEPTH: DETAILED. Develop the reasoning and explain the mechanism thoroughly. Include concrete consequences, real-world context, and operational reality. Do NOT stop after merely stating the conclusion or summarizing in a single paragraph. Give enough substance and detail to make the point properly.'
      break
    case 'deep':
      depthInstruction =
        'DEPTH: DEEP. Substantially explore the subject across multiple relevant dimensions. Unpack mechanisms, root causes, trade-offs, and practical implications with depth and precision. Do not pad with fluff or repetition; every sentence must carry weight.'
      break
    case 'normal':
    default:
      depthInstruction =
        'DEPTH: NORMAL. Develop the idea naturally and sufficiently to satisfy the prompt without artificial compression or unnecessary inflation.'
      break
  }

  return `
OUTPUT SHAPE & DEPTH DIRECTIVES (PRECEDENCE: CURRENT INSTRUCTION > FORMAT > DEPTH > VOICE DEFAULTS):
- ${formatInstruction}
- ${depthInstruction}
- PRINCIPLE: FORMAT and DEPTH are independent dimensions. Format defines the shape; depth defines how thoroughly the reasoning is developed. Explicit depth instructions outrank general voice brevity defaults.
- SHORT DEPTH SEMANTICS: "Short" means compact development—one focused idea, minimal supporting context, no unnecessary second example, no multi-paragraph inflation, ending immediately once the point is clear.
- DETAILED DEPTH SEMANTICS: "Detailed" means developed reasoning—unfold the mechanism, context, and consequences with substance.
- TOPIC SCOPE PRESERVATION: Preserve the user's subject scope. Broad prompts (e.g. "Web3 projects") must not be artificially narrowed to sub-domains (e.g. smart contracts, developers) unless specified. Technical prompts must retain their technical focus. Examples should support rather than redefine the user's subject.
- BREVITY RULE CLARIFICATION: "If the content has made its point, simply end it" means ending naturally once the requested idea has been developed to the requested depth. It does NOT mean ignoring "detailed", "deep", or "comprehensive" instructions and stopping after a single paragraph. For SHORT depth, end immediately once the core point is established; do not linger.
  `.trim()
}
