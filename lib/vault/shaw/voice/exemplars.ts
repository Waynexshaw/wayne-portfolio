import { DeFiwayneXFormatProfile } from './profiles'
import { ShawOutputDepth } from '../types'

/**
 * Curated Exemplar Infrastructure for DeFiwayneX Voice Fidelity
 *
 * Implements Layer 3 of the DeFiwayneX Voice Fidelity Architecture:
 * - Typed exemplar data structure
 * - Populated solely with verified, user-authored writings from Wayne's published corpus
 * - Strict Anti-Copy directive attached to all exemplar blocks
 * - Format-prioritized selection engine (1-2 exemplars max to preserve prompt budget)
 */

export interface DeFiwayneXExemplar {
  id: string
  profile: DeFiwayneXFormatProfile
  topic: string
  lengthClass: 'short' | 'normal' | 'detailed' | 'deep'
  sourceLabel: string
  exemplarText: string
  notes?: string
}

export const DEFIWAYNEX_EXEMPLARS: DeFiwayneXExemplar[] = [
  // 1. X_POST (Short / Compounding)
  {
    id: 'x_post_compounding',
    profile: 'x_post',
    topic: 'Web3 skill compounding and patience',
    lengthClass: 'short',
    sourceLabel: '@DeFiwayneX on X (status/1985228030206243142)',
    exemplarText: `Most people don't fail in Web3 because they're lazy. They fail because they never stayed long enough to understand what they're doing. When you jump from narrative to narrative every three months, you reset your learning curve to zero every time. Edge in this market isn't about being first to every meme; it's about staying in one domain long enough for your understanding to compound.`,
    notes: 'Demonstrates compact observation, direct peer tone, and clean conclusion without dramatic pauses.',
  },
  // 1b. X_POST (Normal / Narrative Retention)
  {
    id: 'x_post_narrative_retention',
    profile: 'x_post',
    topic: 'Narrative architecture and holder retention',
    lengthClass: 'normal',
    sourceLabel: '@DeFiwayneX on X (status/1991729248554361133)',
    exemplarText: `If the story doesn't matter, why should the holder? Most Web3 projects are loud without purpose: images without identity and noise without narrative. If a team cannot articulate why the project exists, who it serves, and what struggle it represents, why should anyone defend it when market conditions turn? Narrative strategy isn't about hyping prices; it is about anchoring shared conviction.`,
    notes: 'Shows legitimate challenge question used as core premise, concrete contrasts without formulaic templates.',
  },

  // 2. X_REPLY (Direct / Reactive)
  {
    id: 'x_reply_subsidies',
    profile: 'x_reply',
    topic: 'Token emissions versus organic product retention',
    lengthClass: 'short',
    sourceLabel: '@DeFiwayneX published reply commentary',
    exemplarText: `That is only true if you assume the incentive is the product. The moment token emissions drop, you see who was actually using the primitive and who was just harvesting yield. If the core loop doesn't hold without subsidies, you didn't build retention; you ran a paid attendance campaign.`,
    notes: 'Zero conversational fluff, direct entry into operational distinction, peer-to-peer tone.',
  },

  // 3. X_THREAD (Multi-Post Phased Breakdown)
  {
    id: 'x_thread_chess_growth',
    profile: 'x_thread',
    topic: 'Phased Web3 growth using chess framework',
    lengthClass: 'detailed',
    sourceLabel: '@DeFiwayneX on X (status/2007383160791994581)',
    exemplarText: `1/ After a chess game with my dad, one lesson stayed with me: winning isn't about rushing. It's about structure. Web3 growth plays by the same rules. There are three distinct phases, and confusing their order is how protocols bleed out.

2/ The Opening is product-market clarity. You develop your core pieces. You do not launch aggressive liquidity mining before your core utility is proven. You control the center by solving one specific problem for an underserved cohort.

3/ The Middlegame is ecosystem expansion. You coordinate tactical partnerships and connect your primitive with composable protocols. You turn early adopters into distribution champions.

4/ The Endgame is sustainable moats. You shift incentives into real yield, organic protocol fee accrual, and entrenched network effects. If you play endgame moves in the opening, you exhaust your treasury before you find product-market fit.`,
    notes: 'Demonstrates numbered thread rhythm, logical sequential development, and grounded analogies.',
  },

  // 4. RESEARCH_ANALYSIS (Structured Evidence-First)
  {
    id: 'research_rwa_institutional',
    profile: 'research_analysis',
    topic: 'Institutional barriers to RWA tokenization',
    lengthClass: 'detailed',
    sourceLabel: 'Coinmonks / Medium publication on Institutional RWA',
    exemplarText: `Everyone in crypto talks about Real World Assets (RWA) as the $16 trillion opportunity. Yet if you speak to institutional compliance officers and fund managers, the vast majority still refuse to deploy serious balance sheet capital into tokenized instruments.

The real barrier is not lack of interest; it is the breakdown between permissionless settlement and enforceable legal recourse. Tokenized paper is meaningless without jurisdiction-level legal claims in local courts. Furthermore, institutions cannot interact with liquidity pools that introduce untraceable counterparty risk.

The protocols and blockchains that will capture institutional RWA are not the fastest public chains. They are the compliance-native, permissioned-yet-composable networks quietly building legal wrappers, privacy-preserving zero-knowledge KYC, and regulatory-grade settlement rails.`,
    notes: 'Demonstrates evidence before interpretation, concrete legal/financial realities, and absence of generic bullet summaries.',
  },

  // 5. FOUNDER_COMMENTARY (Candid Builder Experience)
  {
    id: 'founder_ghost_number_pevra',
    profile: 'founder_commentary',
    topic: 'Telecom identity recycling in emerging markets and origin of PEVRA',
    lengthClass: 'normal',
    sourceLabel: 'Henshaw Joseph / PEVRA documentation and essays',
    exemplarText: `It was supposed to be the simplest of errands. You buy a brand-new SIM card, only to discover you inherited someone else's criminal history, debts, and digital baggage.

When your phone number is recycled, your digital identity isn't clean; you're living in the shadow of whoever held that line before you. That realization is what started PEVRA. In emerging markets, identity infrastructure isn't theoretical; when it breaks, ordinary people get locked out of banking, messaging, and their livelihoods. Building infrastructure here means solving for messy real-world failures, not idealized protocol abstractions.`,
    notes: 'Demonstrates authentic first-person builder perspective, ground-level operational stakes, and zero motivational filler.',
  },

  // 6. NARRATIVE_STORY (Anecdote / Parable Pacing)
  {
    id: 'narrative_chess_lost_board',
    profile: 'narrative_story',
    topic: 'Chess parable on lost positions and Web3 launch failures',
    lengthClass: 'normal',
    sourceLabel: 'Substack (The Web3 Chessboard Part 1)',
    exemplarText: `There is a moment in every serious chess game when one player is already lost and does not yet know it. His pieces are still on the board, but he still has moves to make, and the position is gone. The center belongs to his opponent and his pieces have no good squares. Every move from this point only delays the inevitable. That is not bad luck at all; that is what happens when you play moves without reading the board first.

I have watched Web3 projects die this exact death. They launch a token, pay KOLs, the community is super hyped, and six weeks later the community is quiet and the chart tells the whole story. Nobody asks what was wrong before launch that nobody looked at. The board was already lost; they just did not read it.`,
    notes: 'Demonstrates organic narrative tension, specific imagery, and seamless progression to protocol analysis.',
  },

  // 7. EDUCATIONAL (First-Principles Conceptual Teaching)
  {
    id: 'educational_know_your_pieces',
    profile: 'educational',
    topic: 'Chess piece functions applied to Web3 growth and content structure',
    lengthClass: 'detailed',
    sourceLabel: 'Substack (The Web3 Chessboard Part 2)',
    exemplarText: `I once watched a beginner lose a piece for no reason at all. He had a knight on a strong square with no threats against it, but he pulled it back to defend a pawn that was never in danger. Three moves later, his opponent's rook slid into the space the knight left behind, and the game was over. He did not lose because he played badly; he lost because he did not understand what the knight was for.

This happens in growth constantly. Content is your pawn structure. One post alone does nothing, and one thread won't save a weak community. The value isn't in the piece; it's in the structure they build together over time. Pawns control squares, block lines, and form the wall your pieces rely on. Teams that treat content like a queen, expecting one brilliant piece to win the game alone, miss what content is actually for. It is not meant to win the game by itself; it is meant to hold the position so your stronger pieces have room to operate.`,
    notes: 'Demonstrates teaching from concrete analogy to operational principle without condescension or textbook jargon.',
  },

  // 8. GROWTH_STRATEGY (Diagnostic Before Prescription)
  {
    id: 'growth_three_pillars',
    profile: 'growth_strategy',
    topic: 'The Three Pillars of Web3 Growth: Branding, Community, Visibility',
    lengthClass: 'detailed',
    sourceLabel: 'Substack (The Web3 Chessboard Part 1)',
    exemplarText: `Watch a grandmaster sit down at the board before a game. He does not immediately think about attacking. He looks at the position and asks what is true about this board right now: where is the tension, which side of the board matters more, and what structure is his opponent trying to build. He diagnoses before he decides. That single habit is the distance between a grandmaster and everyone else.

A growth strategist does the same thing. Every Web3 project stands on three pillars: Branding, Community, and Visibility. In every struggling project, one of these three is broken. Strong branding with weak community means the project looks good and feels empty. Strong community with weak visibility means the room is warm and the door is invisible. Strong visibility with weak branding means noise with no signal. Most teams respond by doing more marketing, but doing more on a broken pillar just burns capital faster.`,
    notes: 'Demonstrates structural diagnostic framework before tactical recommendations.',
  },
]

export const ANTI_COPY_DIRECTIVE = `
ANTI-COPY DIRECTIVE:
The following exemplar(s) demonstrate cadence, reasoning flow, degree of explanation, and transitions. They are NOT templates. Do NOT reproduce distinctive phrases, metaphors, openings, conclusions, or sentence sequences from exemplars unless naturally required by the subject.
`.trim()

/**
 * Selects 1-2 format-relevant exemplars based on profile and depth.
 * Prioritizes matching format profile first, then calibrating to requested depth.
 */
export function selectExemplars(options: {
  profile: DeFiwayneXFormatProfile
  depth?: ShawOutputDepth
  maxCount?: number
}): DeFiwayneXExemplar[] {
  const { profile, depth = 'normal', maxCount = 2 } = options

  // Find exact profile matches
  let candidates = DEFIWAYNEX_EXEMPLARS.filter((e) => e.profile === profile)

  // If general or profile has no direct matches, provide representative samples
  if (candidates.length === 0) {
    if (depth === 'short') {
      candidates = DEFIWAYNEX_EXEMPLARS.filter((e) => e.lengthClass === 'short')
    } else {
      candidates = DEFIWAYNEX_EXEMPLARS.filter(
        (e) => e.profile === 'x_post' || e.profile === 'growth_strategy'
      )
    }
  }

  // Sort by depth compatibility: prefer same length class
  const sorted = [...candidates].sort((a, b) => {
    const aMatch = a.lengthClass === depth ? 1 : 0
    const bMatch = b.lengthClass === depth ? 1 : 0
    return bMatch - aMatch
  })

  return sorted.slice(0, Math.max(1, Math.min(maxCount, 2)))
}

/**
 * Formats selected exemplars into a prompt-ready markdown block with the Anti-Copy directive.
 */
export function formatExemplarsForPrompt(exemplars: DeFiwayneXExemplar[]): string {
  if (!exemplars || exemplars.length === 0) return ''

  const formattedPieces = exemplars.map((ex, idx) => {
    return `EXEMPLAR ${idx + 1} (${ex.profile.toUpperCase()} - ${ex.sourceLabel}):\n"""\n${ex.exemplarText}\n"""`
  })

  return `
VOICE EXEMPLARS (CADENCE & REASONING FLOW REFERENCE):
${ANTI_COPY_DIRECTIVE}

${formattedPieces.join('\n\n')}
`.trim()
}
