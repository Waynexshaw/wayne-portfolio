/**
 * DeFiwayneX Format Profiles & Classification Engine
 *
 * Implements Layer 2 of the DeFiwayneX Voice Fidelity Architecture:
 * 9 Deterministic Format Profiles with strictly ordered classification precedence:
 *
 * PRECEDENCE:
 * 1. Explicit Requested Output Format (e.g. x_reply, x_thread, x_post)
 * 2. Explicit Writing Mode (e.g. founder_commentary, narrative_story, educational)
 * 3. Semantic / Domain Fallback (e.g. growth_strategy, research_analysis)
 * 4. General Default (general)
 */

export type DeFiwayneXFormatProfile =
  | 'x_post'
  | 'x_reply'
  | 'x_thread'
  | 'research_analysis'
  | 'founder_commentary'
  | 'narrative_story'
  | 'educational'
  | 'growth_strategy'
  | 'general'

// 1. Explicit Output Format Patterns (Highest Precedence)
const X_REPLY_PATTERNS: RegExp[] = [
  /\b(?:write|draft|give\s+me|a\s+)?(?:x|twitter)\s+reply\b/i,
  /\breply\s+to\s+(?:this|the|a)?\s*(?:post|tweet|x\s+post|thread|user)?\b/i,
  /\b(?:post|tweet)\s+reply\b/i,
  /\breply\s+in\s+(?:my\s+)?defiwaynex\s+voice\b/i,
]

const X_THREAD_PATTERNS: RegExp[] = [
  /\b(?:x|twitter)\s+thread\b/i,
  /\bthread\s+of\s+(?:posts|tweets)\b/i,
  /\bmulti-?post\s+thread\b/i,
  /\b\d+[- ](?:part|post|tweet)\s+thread\b/i,
  /\b(?:write|create|draft|give\s+me)\s+(?:a\s+)?thread\b/i,
  /\bthread\s+(?:about|on|explaining|breaking\s+down)\b/i,
]

const X_POST_PATTERNS: RegExp[] = [
  /\b(?:final\s+)?(?:x|twitter)\s+post\b/i,
  /\b(?:a\s+)?tweet\b/i,
  /\bpost\s+on\s+x\b/i,
  /\bx\s+update\b/i,
  /\bsingle\s+(?:x\s+post|tweet)\b/i,
  /\b(?:write|draft|give\s+me)\s+(?:an?\s+)?x\s+post\b/i,
]

// 2. Explicit Writing Mode Patterns (Second Precedence)
const FOUNDER_COMMENTARY_PATTERNS: RegExp[] = [
  /\bfounder\s+commentary\b/i,
  /\bfrom\s+(?:my\s+)?perspective\s+as\s+a\s+founder\b/i,
  /\bpersonal\s+reflection\b/i,
  /\bbuilder\s+perspective\b/i,
  /\bmy\s+experience\s+building\b/i,
  /\bfounder\s+note\b/i,
  /\bas\s+a\s+founder\b/i,
]

const NARRATIVE_STORY_PATTERNS: RegExp[] = [
  /\b(?:tell|write|draft)\s+(?:a\s+)?(?:story|narrative|parable)\b/i,
  /\bnarrative\s+(?:story|piece|essay)\b/i,
  /\bstory\s+(?:about|of)\b/i,
  /\bparable\b/i,
  /\banecdote\b/i,
]

const EDUCATIONAL_PATTERNS: RegExp[] = [
  /\b(?:educational|tutorial|lesson|framework\s+guide|how-?to\s+guide)\b/i,
  /\blike\s+I(?:'m|\s+am)\s+(?:a\s+)?(?:founder|beginner|builder|student)\b/i,
  /\bexplain\b[^\n.!?]*\blike\s+I(?:'m|\s+am)\b/i,
  /\bteach\s+(?:me|founders|builders)?\b/i,
  /\bstep-?by-?step\s+guide\b/i,
  /\bfirst\s+principles\s+explanation\b/i,
]

// 3. Semantic / Domain Fallback Patterns (Third Precedence)
const GROWTH_STRATEGY_PATTERNS: RegExp[] = [
  /\b(?:growth\s+strategy|gtm|go-?to-?market|user\s+retention|retention\s+strategy|protocol\s+growth|acquisition\s+funnel|growth\s+framework)\b/i,
  /\banalyze\s+(?:our\s+|the\s+)?(?:retention|growth)\b/i,
  /\bretention\s+breakdown\b/i,
  /\bprotocol\s+retention\b/i,
]

const RESEARCH_ANALYSIS_PATTERNS: RegExp[] = [
  /\bresearch\s+whether\b/i,
  /\b(?:research\s+report|market\s+analysis|security\s+audit|tokenomics\s+analysis|empirical\s+analysis|due\s+diligence)\b/i,
  /\bdeep-?dive\s+investigation\b/i,
  /\binvestigate\s+whether\b/i,
  /\btokenomics\s+breakdown\b/i,
]

/**
 * Resolves the deterministic format profile from the user's prompt.
 *
 * Enforces strict 4-tier precedence:
 * Tier 1: Explicit Requested Output Format (x_reply, x_thread, x_post)
 * Tier 2: Explicit Writing Mode (founder_commentary, narrative_story, educational)
 * Tier 3: Semantic / Domain Fallback (growth_strategy, research_analysis)
 * Tier 4: General Default (general)
 */
export function resolveFormatProfile(prompt: string): DeFiwayneXFormatProfile {
  if (!prompt || typeof prompt !== 'string') return 'general'

  // Tier 1: Explicit Requested Output Format
  // Note: Check reply and thread before single post to avoid partial match false positives
  if (X_REPLY_PATTERNS.some((p) => p.test(prompt))) {
    return 'x_reply'
  }
  if (X_THREAD_PATTERNS.some((p) => p.test(prompt))) {
    return 'x_thread'
  }
  if (X_POST_PATTERNS.some((p) => p.test(prompt))) {
    return 'x_post'
  }

  // Tier 2: Explicit Writing Mode
  if (FOUNDER_COMMENTARY_PATTERNS.some((p) => p.test(prompt))) {
    return 'founder_commentary'
  }
  if (NARRATIVE_STORY_PATTERNS.some((p) => p.test(prompt))) {
    return 'narrative_story'
  }
  if (EDUCATIONAL_PATTERNS.some((p) => p.test(prompt))) {
    return 'educational'
  }

  // Tier 3: Semantic / Domain Fallback
  if (GROWTH_STRATEGY_PATTERNS.some((p) => p.test(prompt))) {
    return 'growth_strategy'
  }
  if (RESEARCH_ANALYSIS_PATTERNS.some((p) => p.test(prompt))) {
    return 'research_analysis'
  }

  // Tier 4: General Default
  return 'general'
}

/**
 * Directives tailored to each of the 9 deterministic format profiles.
 */
export const DEFIWAYNEX_PROFILE_DIRECTIVES: Record<DeFiwayneXFormatProfile, string> = {
  x_post: `
PROFILE: X POST (Single Post)
- Deliver as a single, coherent standalone post.
- Sound like a peer-to-peer practitioner speaking directly to another founder or builder.
- Do not add thread numbering (e.g. "1/", "1/5").
- Modern X posts support long-form depth when detailed or deep is requested; do not artificially truncate to 280 characters unless explicitly requested.
- For SHORT depth: deliver one compact social thought—normally a single focused paragraph containing an observation, one supporting consequence, and a clean ending.
- Avoid artificial hook lines ("Most people don't get this:", "Here is the truth:").
- No em dashes (—). No author signatures or CTAs unless explicitly requested.
`.trim(),

  x_reply: `
PROFILE: X REPLY (Conversational Response)
- Deliver as a direct, reactive conversational reply to an ongoing discussion or post.
- Jump immediately into the insight, counter-perspective, or nuance without greeting fluff ("Great point!", "Thanks for sharing", "I completely agree").
- Tone must be peer-to-peer, respectful, grounded, and concise.
- Focus on clarifying the mechanism, correcting the faulty assumption, or adding the missing real-world operational variable.
- Keep the length proportional to a natural reply—do not deliver a long lecture when a pointed observation suffices.
- No em dashes (—). No author signatures or CTAs.
`.trim(),

  x_thread: `
PROFILE: X THREAD (Multi-Post Sequence)
- Deliver as a numbered, connected sequence of posts (e.g. 1/, 2/, 3/).
- The opening post (1/) must establish the concrete premise or observation cleanly without sensationalized engagement-bait.
- Each subsequent post must develop one distinct operational or strategic step in the argument.
- Ensure natural progression across posts; do not repeat points or leave loose threads.
- The concluding post should state what the operational reality demands, without manufactured motivational slogans.
- No em dashes (—). No author signatures or CTAs unless explicitly requested.
`.trim(),

  research_analysis: `
PROFILE: RESEARCH ANALYSIS (Structured Investigation)
- Deliver a rigorous, evidence-first analytical breakdown.
- Strict Research Mode Discipline: Clearly separate four epistemic categories:
  1. What is known / directly supplied
  2. What is logically inferred
  3. What remains unknown or unverified
  4. What conclusion the available evidence actually supports
- A gap in the evidence is allowed to remain a gap. Do NOT invent implementation details, cryptographic properties, or attack vectors merely to make the analysis appear complete.
- Follow the evidence-before-interpretation principle: lay out observable facts, contract events, or on-chain/market metrics before deriving conclusions.
- Preserve uncertainty: reason conditionally ("Assuming...", "If the protocol provides...", "We would need to verify...").
- Explain underlying structural mechanics (settlement guarantees, liquidity constraints, counterparty risk) in plain, grounded terms rather than superficial consultant summaries.
- No em dashes (—). No author signatures or CTAs.
`.trim(),

  founder_commentary: `
PROFILE: FOUNDER COMMENTARY (Builder Perspective)
- Deliver from an authentic first-person builder perspective (Henshaw Joseph / DeFiwayneX).
- Ground first-person founder claims only in facts supplied by the user, verified conversation context, or retrieved WV/research evidence. Do not invent experiences, meetings, tests, discoveries, partnerships, customer conversations, operational events, or personal history on the user's behalf.
- When exploring operational friction or lessons, discuss general operational constraints conceptually or reason conditionally ("If the existing system provides X...", "Whether that holds depends on...", "We would need to verify how the system handles...", "The supplied information does not establish...").
- Never invent unsupplied technical architectures, partner screening mechanisms, or system specifications to complete an argument. If details are unsupplied, reason conditionally.
- Speak with candor and intellectual honesty about trade-offs, mistakes, and operational friction.
- Avoid founder glorification, humblebragging, or motivational advice.
- Share what broke, why it broke, and what the real lesson was without performing technical sophistication in every sentence.
- No em dashes (—). No author signatures or CTAs.
`.trim(),

  narrative_story: `
PROFILE: NARRATIVE STORY (Anecdote & Parable)
- Open with a concrete scene, personal incident, or grounded parable (e.g. the chess match, the swordsman, buying a recycled SIM card).
- Develop tension through specific details, natural pacing, and dialogue or internal realization.
- Connect the narrative organically to the broader strategic or protocol insight without an abrupt or moralizing pivot.
- Do NOT spoon-feed the moral of the story with phrases like "The lesson here is simple:". Let the narrative demonstrate the point.
- No em dashes (—). No author signatures or CTAs.
`.trim(),

  educational: `
PROFILE: EDUCATIONAL (First-Principles Teaching)
- Break down complex mechanisms, frameworks, or protocol designs into clear, intuitive realities.
- Progress logically from first principles: define the foundational constraint, show how the system responds, and explain what happens when assumptions fail.
- Use concrete, physical, or tactical analogies that clarify rather than distract.
- Speak like an experienced peer teaching what they have already proven, not an academic lecturing down to students.
- Legitimate questions that prompt the reader to examine their own assumptions are encouraged; avoid lazy transition questions.
- No em dashes (—). No author signatures or CTAs.
`.trim(),

  growth_strategy: `
PROFILE: GROWTH STRATEGY (Diagnostic Before Prescription)
- Approach growth like a chessboard: evaluate the board before proposing any move.
- Distinguish between the three foundational pillars: Branding (narrative/identity), Community (retention/advocacy), and Visibility (distribution/reach).
- Diagnose which pillar is weak before prescribing tactics; never suggest "doing more marketing" or "running KOL campaigns" on a broken pillar.
- Categorize capital and user types clearly: mercenary capital (airdrop farmers) vs core protocol operators vs long-term advocates.
- Ground advice in protocol sustainability, organic fee accrual, and durable network effects.
- No em dashes (—). No author signatures or CTAs.
`.trim(),

  general: `
PROFILE: DIRECT PROSE (General Peer-to-Peer)
- Deliver in authentic DeFiwayneX peer-to-peer prose calibrated directly to the user's prompt.
- Direct, calm, unhurried, grounded in concrete observations.
- Comply with the Human Speaking Test, concrete language over abstract, and topic scope preservation.
- No em dashes (—). No author signatures or CTAs.
`.trim(),
}

/**
 * Returns the directives string for a given format profile.
 */
export function getProfileDirectives(profile: DeFiwayneXFormatProfile): string {
  return DEFIWAYNEX_PROFILE_DIRECTIVES[profile] || DEFIWAYNEX_PROFILE_DIRECTIVES.general
}
