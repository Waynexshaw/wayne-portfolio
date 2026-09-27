import { DeFiwayneXFormatProfile } from './profiles'
import { ShawOutputDepth } from '../types'

/**
 * Curated Exemplar Infrastructure for DeFiwayneX Voice Fidelity
 *
 * Implements Layer 3 of the DeFiwayneX Voice Fidelity Architecture:
 * - Typed exemplar data structure with static authority hierarchy ('primary' | 'secondary')
 * - Populated solely with verified, user-authored writings from Wayne's published & supplied corpus
 * - Strict Anti-Copy directive attached to all exemplar blocks
 * - Invariant: Prefer ZERO exemplars over an irrelevant exemplar (general & unmatched => [])
 * - Format-prioritized selection engine (1-2 exemplars max to preserve prompt budget)
 */

export interface DeFiwayneXExemplar {
  id: string
  profile: DeFiwayneXFormatProfile
  authority: 'primary' | 'secondary'
  topic: string
  lengthClass: 'short' | 'normal' | 'detailed' | 'deep'
  sourceLabel: string
  exemplarText: string
  notes?: string
}

export const DEFIWAYNEX_EXEMPLARS: DeFiwayneXExemplar[] = [
  // ====================================================
  // 1. X_POST
  // ====================================================
  // PRIMARY: User-authored current X writing on phone number traceability
  {
    id: 'x_post_phone_traceability',
    profile: 'x_post',
    authority: 'primary',
    topic: 'phone number identity history and traceability',
    lengthClass: 'short',
    sourceLabel: 'DeFiwayneX current X writing — user supplied',
    exemplarText: `This is the part people miss until it happens to them.

We accept full traceability for land, for money, for almost anything with value.

But a phone number, something tied to your identity, your accounts, sometimes your freedom, gets treated like it has no history worth keeping.

I’ve spent the last year thinking about why that gap exists.`,
    notes: 'Primary V1 exemplar. Demonstrates compact observation, direct peer tone, concrete reality, and clean conclusion without dramatic pauses.',
  },
  // SECONDARY: Historical verified X status on skill compounding
  {
    id: 'x_post_compounding',
    profile: 'x_post',
    authority: 'secondary',
    topic: 'Web3 skill compounding and patience',
    lengthClass: 'short',
    sourceLabel: '@DeFiwayneX on X (status/1985228030206243142)',
    exemplarText: `Most people don't fail in Web3 because they're lazy. They fail because they never stayed long enough to understand what they're doing. When you jump from narrative to narrative every three months, you reset your learning curve to zero every time. Edge in this market isn't about being first to every meme; it's about staying in one domain long enough for your understanding to compound.`,
    notes: 'Secondary exemplar for skill compounding cadence and unhurried tone.',
  },
  // SECONDARY: Historical verified X post on narrative retention
  {
    id: 'x_post_narrative_retention',
    profile: 'x_post',
    authority: 'secondary',
    topic: 'Narrative architecture and holder retention',
    lengthClass: 'normal',
    sourceLabel: '@DeFiwayneX on X (status/1991729248554361133)',
    exemplarText: `If the story doesn't matter, why should the holder? Most Web3 projects are loud without purpose: images without identity and noise without narrative. If a team cannot articulate why the project exists, who it serves, and what struggle it represents, why should anyone defend it when market conditions turn? Narrative strategy isn't about hyping prices; it is about anchoring shared conviction.`,
    notes: 'Secondary exemplar demonstrating legitimate challenge question used as core premise.',
  },

  // ====================================================
  // 2. X_REPLY
  // ====================================================
  // PRIMARY A: User-supplied reply on regulation and adoption
  {
    id: 'x_reply_regulation',
    profile: 'x_reply',
    authority: 'primary',
    topic: 'regulation and adoption',
    lengthClass: 'short',
    sourceLabel: 'DeFiwayneX current X reply — user supplied',
    exemplarText: `All four matter, but regulation is the one that decides if the other three even get used.`,
    notes: 'Primary V1 reply exemplar. Demonstrates ultra-compact, direct conversational entry without pleasantries.',
  },
  // PRIMARY B: User-supplied reply on PEVRA number ownership history
  {
    id: 'x_reply_number_history',
    profile: 'x_reply',
    authority: 'primary',
    topic: 'PEVRA number ownership history',
    lengthClass: 'short',
    sourceLabel: 'DeFiwayneX current X reply — user supplied',
    exemplarText: `That’s why we’re recording ownership changes on-chain and linking it to NIN. So when a number changes hands, there’s a clear record of who had it before and when.

Knowing who owns it now isn’t enough, you need to know who owned it last.`,
    notes: 'Primary V1 reply exemplar. Demonstrates peer-to-peer technical clarity and decisive closing distinction.',
  },
  // SECONDARY: Historical verified reply commentary on token subsidies
  {
    id: 'x_reply_subsidies',
    profile: 'x_reply',
    authority: 'secondary',
    topic: 'Token emissions versus organic product retention',
    lengthClass: 'short',
    sourceLabel: '@DeFiwayneX published reply commentary',
    exemplarText: `That is only true if you assume the incentive is the product. The moment token emissions drop, you see who was actually using the primitive and who was just harvesting yield. If the core loop doesn't hold without subsidies, you didn't build retention; you ran a paid attendance campaign.`,
    notes: 'Secondary reply exemplar on protocol retention mechanics.',
  },

  // ====================================================
  // 3. X_THREAD
  // ====================================================
  // PRIMARY (Temporary V1 primary pending exact curated Arc/USDC exemplar)
  {
    id: 'x_thread_chess_growth',
    profile: 'x_thread',
    authority: 'primary',
    topic: 'Phased Web3 growth using chess framework',
    lengthClass: 'detailed',
    sourceLabel: '@DeFiwayneX on X (status/2007383160791994581)',
    exemplarText: `1/ After a chess game with my dad, one lesson stayed with me: winning isn't about rushing. It's about structure. Web3 growth plays by the same rules. There are three distinct phases, and confusing their order is how protocols bleed out.

2/ The Opening is product-market clarity. You develop your core pieces. You do not launch aggressive liquidity mining before your core utility is proven. You control the center by solving one specific problem for an underserved cohort.

3/ The Middlegame is ecosystem expansion. You coordinate tactical partnerships and connect your primitive with composable protocols. You turn early adopters into distribution champions.

4/ The Endgame is sustainable moats. You shift incentives into real yield, organic protocol fee accrual, and entrenched network effects. If you play endgame moves in the opening, you exhaust your treasury before you find product-market fit.`,
    notes: 'Temporary V1 primary pending exact curated Arc/USDC exemplar. Demonstrates numbered thread rhythm and logical sequential development.',
  },

  // ====================================================
  // 4. RESEARCH_ANALYSIS
  // ====================================================
  // PRIMARY (Temporary V1 primary pending exact curated PEVRA/blockchain passage)
  {
    id: 'research_rwa_institutional',
    profile: 'research_analysis',
    authority: 'primary',
    topic: 'Institutional barriers to RWA tokenization',
    lengthClass: 'detailed',
    sourceLabel: 'Coinmonks / Medium publication on Institutional RWA',
    exemplarText: `Everyone in crypto talks about Real World Assets (RWA) as the $16 trillion opportunity. Yet if you speak to institutional compliance officers and fund managers, the vast majority still refuse to deploy serious balance sheet capital into tokenized instruments.

The real barrier is not lack of interest; it is the breakdown between permissionless settlement and enforceable legal recourse. Tokenized paper is meaningless without jurisdiction-level legal claims in local courts. Furthermore, institutions cannot interact with liquidity pools that introduce untraceable counterparty risk.

The protocols and blockchains that will capture institutional RWA are not the fastest public chains. They are the compliance-native, permissioned-yet-composable networks quietly building legal wrappers, privacy-preserving zero-knowledge KYC, and regulatory-grade settlement rails.`,
    notes: 'Temporary V1 primary pending exact curated PEVRA/blockchain passage. Demonstrates evidence before interpretation and concrete settlement/legal mechanics.',
  },

  // ====================================================
  // 5. FOUNDER_COMMENTARY
  // ====================================================
  // PRIMARY (Temporary V1 primary pending exact curated TIRMS commentary)
  {
    id: 'founder_ghost_number_pevra',
    profile: 'founder_commentary',
    authority: 'primary',
    topic: 'Telecom identity recycling in emerging markets and origin of PEVRA',
    lengthClass: 'normal',
    sourceLabel: 'Henshaw Joseph / PEVRA documentation and essays',
    exemplarText: `It was supposed to be the simplest of errands. You buy a brand-new SIM card, only to discover you inherited someone else's criminal history, debts, and digital baggage.

When your phone number is recycled, your digital identity isn't clean; you're living in the shadow of whoever held that line before you. That realization is what started PEVRA. In emerging markets, identity infrastructure isn't theoretical; when it breaks, ordinary people get locked out of banking, messaging, and their livelihoods. Building infrastructure here means solving for messy real-world failures, not idealized protocol abstractions.`,
    notes: 'Temporary V1 primary pending exact curated TIRMS commentary. Demonstrates authentic first-person builder perspective and ground-level operational stakes.',
  },

  // ====================================================
  // 6. NARRATIVE_STORY
  // ====================================================
  // PRIMARY: User-authored narrative work "The Bird That Leaves No Trace"
  {
    id: 'narrative_bird_trace',
    profile: 'narrative_story',
    authority: 'primary',
    topic: 'Japanese stadium cleanup parable, SIM recycling in Nigeria, and permanent trace',
    lengthClass: 'detailed',
    sourceLabel: 'DeFiwayneX — The Bird That Leaves No Trace (user supplied)',
    exemplarText: `I came across a video of Japan’s football fans cleaning the stadium after a World Cup match.
Mind you not the staff but the fans. Thousands of them, staying behind after a game they came to watch and enjoy, picking up rubbish that wasn’t even theirs.

Someone asked one of the players about it. She said something that stayed with me. She said that’s just the culture. That they feel honored to be there, honored to watch, honored to be part of it, and because of that, they don’t want to leave a mess behind.

I’ve been thinking about that word “Honored”.

It changes everything about how you show up somewhere when you feel that way. You stop thinking about what you can take from a place and start thinking about what you owe it.

There’s a Japanese proverb (Tatsu toriato wo nigosazu). Literally, it means "A departing bird does not muddy the water" - it comes from the image of a waterbird taking off from a pond without stirring up the mud or clouding the clear water.

The message is a life principle: “A bird that leaves no trace.” The idea that your character isn’t measured by how you arrive somewhere, but by what you leave behind when you go.

Now I want you to think about something closer to home.

In Nigeria, criminals make ransom calls from prepaid SIM cards. When they’re done, they throw the SIM away and move on. The number goes back to the carrier. The carrier recycles it. And that number, with everything attached to it, lands in the hands of someone completely innocent.

A trader. A student. Someone’s father.

When the police trace that number, they find that person. And that person has almost no way to prove the number wasn’t theirs when the crime happened. There’s no public record. No history. Nothing.

The criminal left. The mess stayed. And someone else is living in it.

When I think about why we’re building Pevra, I always come back to that gap, the space between someone doing something wrong and someone else paying for it and how completely avoidable it is if there’s just a permanent, honest record of who owned a number and when.

That’s what Pevra does. Every number on the platform has a full history recorded on-chain from the moment it’s issued. Every time it changes hands, that event is recorded. Permanently. Publicly. Anyone who receives that number can see exactly where it’s been.

The person who walks away from a crime can’t make the record walk away with them. And the person who inherits that number inherits the truth, not someone else’s mess.

The Japanese fans don’t clean the stadium because someone is watching. They do it because of something they carry inside them about what it means to be somewhere, to be part of something.

That’s what we’re trying to build into the infrastructure of Pevra. Not just a product that works, but a system that holds people accountable to what they’ve done and protects people from what they didn’t.

A trace that stays. Even when the person is long gone.`,
    notes: 'Primary V1 narrative exemplar from "The Bird That Leaves No Trace". Verbatim connected excerpt preserving authentic sequence: stadium cleaning observation, reflection on "Honored", Japanese proverb, Nigerian SIM recycling, innocent owner consequence, on-chain record, and returning to the permanent trace metaphor.',
  },
  // SECONDARY: Historical verified chess opening parable
  {
    id: 'narrative_chess_lost_board',
    profile: 'narrative_story',
    authority: 'secondary',
    topic: 'Chess parable on lost positions and Web3 launch failures',
    lengthClass: 'normal',
    sourceLabel: 'Substack (The Web3 Chessboard Part 1)',
    exemplarText: `There is a moment in every serious chess game when one player is already lost and does not yet know it. His pieces are still on the board, but he still has moves to make, and the position is gone. The center belongs to his opponent and his pieces have no good squares. Every move from this point only delays the inevitable. That is not bad luck at all; that is what happens when you play moves without reading the board first.

I have watched Web3 projects die this exact death. They launch a token, pay KOLs, the community is super hyped, and six weeks later the community is quiet and the chart tells the whole story. Nobody asks what was wrong before launch that nobody looked at. The board was already lost; they just did not read it.`,
    notes: 'Secondary narrative exemplar demonstrating organic narrative tension and protocol analysis.',
  },

  // ====================================================
  // 7. EDUCATIONAL
  // ====================================================
  // PRIMARY: User-authored educational work "The Draft AI Gave You Is Not Your Content Yet"
  {
    id: 'educational_ai_draft',
    profile: 'educational',
    authority: 'primary',
    topic: 'AI drafts versus human thinking, question-first research, source verification, and voice',
    lengthClass: 'detailed',
    sourceLabel: 'DeFiwayneX — The Draft AI Gave You Is Not Your Content Yet (user supplied)',
    exemplarText: `You open ChatGPT.
You type a prompt.

A few seconds later, you have a full article.

The grammar is clean.
The structure makes sense.
The points are arranged nicely.

You read it once and think:
“Yeah, this is good.”

So you change a few words, add your name and post it.

This is where I think we need to slow down, because getting a draft from AI is not the same thing as finishing your work.

The words are there.
The thinking still has to happen.

What exactly did you ask AI to do?
This is the first thing I would ask myself.
Did I ask AI to help me express something I already understood?
Or did I ask it to figure out what I should say?
There is a big difference between the two.

If I have researched a subject, collected my sources, formed my opinion and written down my main points, AI can help me turn that material into something cleaner.
That is useful.
But if I know nothing about the subject and ask AI to research it, form the argument, write the article and give me the sources, I have a different problem.
I may have a finished-looking document without actually understanding the subject.

A good sentence can still contain a bad fact.
This is probably the biggest thing people need to remember.
AI is very good at writing sentences that sound certain.
That does not mean the information inside those sentences is correct.
The citation can look real.
The author’s name can look real.
The title can look real.
And the claim can still be wrong.
That is why I don’t accept a research claim simply because AI gave me a source.
I open the source.
I read it.
I check the number.
I check what the researcher actually said.
Then I decide whether the claim belongs in my work.

Research starts with a question.
Not with a prompt.
If I want to research recycled phone numbers, for example, I shouldn’t start with:
“Write me an article about phone number recycling.”
I should start with questions.
How does number recycling work?
Why are numbers reassigned?
What problems can this create?
Those questions determine what I search for.
AI can help me organise what I find.
It can help me spot gaps.
It can explain something I don’t understand.
It can challenge an argument.
But I still need to do the work of understanding the subject.

This is where your voice comes in.
Your voice isn’t just the way you write.
It comes from the things you have seen and the conclusions you have reached from them.
When you give AI a blank page and ask it to fill everything, you can end up with something that reads well but could have been written by almost anyone.
That is usually what people mean when they say something “sounds like AI.”
The grammar isn’t necessarily the problem.
The writing has no fingerprints.

The draft AI gave you is only the beginning.
The work becomes yours through what you do with it.`,
    notes: 'Primary V1 educational exemplar from "The Draft AI Gave You Is Not Your Content Yet". Verbatim connected excerpt demonstrating first-principles teaching on AI drafts vs thinking, question-based research, source verification, and authentic voice without using signature CTA.',
  },
  // SECONDARY: Historical verified chess pieces framework
  {
    id: 'educational_know_your_pieces',
    profile: 'educational',
    authority: 'secondary',
    topic: 'Chess piece functions applied to Web3 growth and content structure',
    lengthClass: 'detailed',
    sourceLabel: 'Substack (The Web3 Chessboard Part 2)',
    exemplarText: `I once watched a beginner lose a piece for no reason at all. He had a knight on a strong square with no threats against it, but he pulled it back to defend a pawn that was never in danger. Three moves later, his opponent's rook slid into the space the knight left behind, and the game was over. He did not lose because he played badly; he lost because he did not understand what the knight was for.

This happens in growth constantly. Content is your pawn structure. One post alone does nothing, and one thread won't save a weak community. The value isn't in the piece; it's in the structure they build together over time. Pawns control squares, block lines, and form the wall your pieces rely on. Teams that treat content like a queen, expecting one brilliant piece to win the game alone, miss what content is actually for. It is not meant to win the game by itself; it is meant to hold the position so your stronger pieces have room to operate.`,
    notes: 'Secondary educational exemplar demonstrating concrete tactical analogy.',
  },

  // ====================================================
  // 8. GROWTH_STRATEGY
  // ====================================================
  // PRIMARY: Approved Growth in Web3 Chess / Web3 Chessboard framework
  {
    id: 'growth_three_pillars',
    profile: 'growth_strategy',
    authority: 'primary',
    topic: 'The Three Pillars of Web3 Growth: Branding, Community, Visibility',
    lengthClass: 'detailed',
    sourceLabel: 'Substack (The Web3 Chessboard Part 1)',
    exemplarText: `Watch a grandmaster sit down at the board before a game. He does not immediately think about attacking. He looks at the position and asks what is true about this board right now: where is the tension, which side of the board matters more, and what structure is his opponent trying to build. He diagnoses before he decides. That single habit is the distance between a grandmaster and everyone else.

A growth strategist does the same thing. Every Web3 project stands on three pillars: Branding, Community, and Visibility. In every struggling project, one of these three is broken. Strong branding with weak community means the project looks good and feels empty. Strong community with weak visibility means the room is warm and the door is invisible. Strong visibility with weak branding means noise with no signal. Most teams respond by doing more marketing, but doing more on a broken pillar just burns capital faster.`,
    notes: 'Primary V1 growth strategy exemplar from Growth in Web3 Chess framework. Demonstrates structural diagnostic framework before tactical recommendations.',
  },
]

export const ANTI_COPY_DIRECTIVE = `
ANTI-COPY DIRECTIVE & STRICT FACTUAL SEPARATION:
1. CADENCE & STYLE REFERENCE ONLY: The following exemplar(s) demonstrate cadence, reasoning flow, degree of explanation, transitions, specificity, and natural stopping points. They are NOT templates. Do NOT reproduce distinctive openings, metaphors, signature phrases, conclusions, or sentence sequences from exemplars unless naturally required by the subject. Primary authority means more representative; it does NOT mean "copy this structure every time."
2. STRICT FACTUAL BOUNDARY: EXEMPLARS ARE NOT FACTUAL CONTEXT FOR THE CURRENT TASK. Facts, entities, company names, products, events, mechanisms, numbers, or specific claims appearing inside an exemplar belong solely to that past writing. They MUST NOT be imported, assumed, or cross-contaminated into your response unless independently present in the user's current prompt or verified retrieval context.
`.trim()

/**
 * Selects 1-2 format-relevant exemplars based on profile and depth.
 *
 * Core Selection Rules:
 * 1. Prefer ZERO exemplars over an irrelevant exemplar:
 *    - profile === 'general' returns []
 *    - Unmatched profile returns []
 *    - Never inject unrelated x_post or growth_strategy as fallbacks
 * 2. In-profile selection priority:
 *    a. Exact profile match
 *    b. Primary authority over secondary
 *    c. Requested lengthClass compatibility
 *    d. Secondary authority if useful
 * 3. Max injected: 1-2 (do not force two when one strong primary is sufficient).
 */
export function selectExemplars(options: {
  profile: DeFiwayneXFormatProfile
  depth?: ShawOutputDepth
  maxCount?: number
}): DeFiwayneXExemplar[] {
  const { profile, depth = 'normal', maxCount = 2 } = options

  // Invariant 1: Prefer ZERO exemplars over an irrelevant exemplar.
  // A general request must never receive unrelated format exemplars.
  if (profile === 'general') {
    return []
  }

  // Invariant 2: Exact profile match only. If none match, return []
  const candidates = DEFIWAYNEX_EXEMPLARS.filter((e) => e.profile === profile)
  if (candidates.length === 0) {
    return []
  }

  // Sort priority:
  // 1. Primary authority over secondary (+2 points)
  // 2. Exact lengthClass match over mismatch (+1 point)
  const sorted = [...candidates].sort((a, b) => {
    const authScoreA = a.authority === 'primary' ? 2 : 0
    const authScoreB = b.authority === 'primary' ? 2 : 0
    const depthScoreA = a.lengthClass === depth ? 1 : 0
    const depthScoreB = b.lengthClass === depth ? 1 : 0

    const totalA = authScoreA + depthScoreA
    const totalB = authScoreB + depthScoreB
    return totalB - totalA
  })

  // Limit output to at most maxCount (capped at 2)
  const limit = Math.max(1, Math.min(maxCount, 2))
  return sorted.slice(0, limit)
}

/**
 * Formats selected exemplars into a prompt-ready markdown block with the Anti-Copy directive.
 * Safely returns an empty string when exemplars is empty.
 */
export function formatExemplarsForPrompt(exemplars: DeFiwayneXExemplar[]): string {
  if (!exemplars || exemplars.length === 0) return ''

  const formattedPieces = exemplars.map((ex, idx) => {
    return `EXEMPLAR ${idx + 1} (${ex.profile.toUpperCase()} [${ex.authority.toUpperCase()}] - ${ex.sourceLabel}):\n"""\n${ex.exemplarText}\n"""`
  })

  return `
VOICE EXEMPLARS (CADENCE & REASONING FLOW REFERENCE ONLY — STRICTLY NON-FACTUAL FOR CURRENT TASK):
${ANTI_COPY_DIRECTIVE}

${formattedPieces.join('\n\n')}
`.trim()
}
