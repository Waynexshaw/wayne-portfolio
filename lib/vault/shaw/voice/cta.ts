import { CtaType } from '../types'

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
 * Detects whether the user explicitly requested a signature CTA in their prompt.
 * Invariant: Never returns a CTA unless explicitly instructed by the user.
 */
export function detectExplicitCtaRequest(prompt: string): CtaType | null {
  if (!prompt) return null
  const lower = prompt.toLowerCase()

  if (lower.includes('full cta')) {
    return 'full'
  }

  if (lower.includes('research cta')) {
    return 'research'
  }

  if (lower.includes('strategy cta')) {
    return 'strategy'
  }

  if (
    lower.includes('add my cta') ||
    lower.includes('add the cta') ||
    lower.includes('include my cta') ||
    lower.includes('include the cta') ||
    lower.includes('use my cta') ||
    lower.includes('use the cta') ||
    lower.includes('with cta') ||
    lower.includes('add cta')
  ) {
    return 'standard'
  }

  return null
}

/**
 * Safely appends the CTA to generated text only if the user explicitly requested it.
 */
export function appendCtaIfRequested(generatedText: string, userPrompt: string): string {
  const ctaType = detectExplicitCtaRequest(userPrompt)
  if (!ctaType) {
    return generatedText
  }

  const cta = getSignatureCta(ctaType)
  // Avoid duplicate appending if the model already placed it
  if (generatedText.includes('My name is Defiwaynex')) {
    return generatedText
  }

  return `${generatedText.trim()}\n\n${cta}`
}
