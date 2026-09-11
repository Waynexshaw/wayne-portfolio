import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, ExternalLink } from 'lucide-react'

export const metadata: Metadata = {
  title: 'About',
  description:
    'The professional journey of Henshaw Joseph (Wayne) — Web3 growth strategist, researcher, writer and founder of PEVRA.',
}

const beliefs = [
  'Understanding why users leave is more valuable than understanding why they came.',
  'Research that does not change a decision is decoration.',
  'The best growth strategies are mostly product decisions.',
  'Building something is the fastest way to test a strategic theory.',
  'Web3 needs better product thinking, not just better token design.',
  'Content that is not useful to the reader is noise.',
]

const pillars = [
  {
    name: 'Growth',
    description:
      'Acquisition, activation, retention and community strategy. Most Web3 projects focus too heavily on acquisition. I focus on the complete picture — what brings people in, what makes them stay, what builds real ecosystem depth.',
  },
  {
    name: 'Strategy & Research',
    description:
      'Market research, protocol analysis and competitive intelligence. Research is only useful if it changes what you do next. I conduct research to surface decisions, not just to document a market.',
  },
  {
    name: 'Content & Distribution',
    description:
      'Research-led content strategy and founder-led distribution. The best content in Web3 teaches something real. I build content systems that create genuine authority and sustainable distribution.',
  },
  {
    name: 'Building',
    description:
      'Applying strategy directly as a founder with PEVRA. Advising is valuable. Building forces you to find out what actually works under constraints. I do both — and building has made my strategy sharper.',
  },
]

const journey = [
  {
    period: 'Early career',
    stage: 'Content & Writing',
    description:
      'Started in content — understanding how ideas spread, how audiences form, and how words either build trust or erode it.',
  },
  {
    period: 'Into Web3',
    stage: 'DeFi & Research',
    description:
      'Discovered DeFi and spent significant time understanding how these protocols work, why they succeed, why they fail, and what users actually need.',
  },
  {
    period: 'Strategy',
    stage: 'Growth & Community',
    description:
      'Applied research to strategy — helping Web3 products understand their users, grow communities and develop go-to-market approaches grounded in real insight.',
  },
  {
    period: 'Now',
    stage: 'Founder & Builder',
    description:
      'Founded PEVRA. The transition from strategist and researcher to founder changed the nature of my work. I now apply everything I know inside a real product under real constraints.',
  },
]

export default function AboutPage() {
  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="section-padding">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="text-xs uppercase tracking-widest text-violet-400 font-medium">
              About
            </span>
            <h1 className="mt-4 font-serif text-5xl md:text-6xl lg:text-7xl font-medium tracking-tight leading-none">
              Henshaw Joseph
            </h1>
            <p className="mt-2 text-muted-foreground text-lg">
              Professionally known as Wayne. Online as @defiwaynex.
            </p>
            <p className="mt-8 text-xl md:text-2xl text-muted-foreground leading-relaxed">
              I research markets, develop strategy around what I find, and help
              Web3 products grow. I am also building PEVRA — which means I now
              live inside the same problems I used to analyze from the outside.
            </p>
          </div>
        </div>
      </section>

      {/* Journey */}
      <section className="section-padding border-t border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            <div>
              <span className="text-xs uppercase tracking-widest text-violet-400 font-medium">
                Journey
              </span>
              <h2 className="mt-2 font-serif text-4xl font-medium tracking-tight">
                How I got here
              </h2>
            </div>
            <div className="lg:col-span-2 space-y-0">
              {journey.map((step, i) => (
                <div
                  key={i}
                  className="border-t border-border/30 py-8 first:border-0 grid grid-cols-4 gap-6"
                >
                  <div>
                    <p className="text-xs text-muted-foreground/60 font-medium">{step.period}</p>
                    <p className="text-sm font-medium text-foreground mt-1">{step.stage}</p>
                  </div>
                  <div className="col-span-3">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="section-padding border-t border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <span className="text-xs uppercase tracking-widest text-violet-400 font-medium">
              What I work on
            </span>
            <h2 className="mt-2 font-serif text-4xl font-medium tracking-tight">
              Four pillars
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border/30 border border-border/30 rounded-lg overflow-hidden">
            {pillars.map((pillar) => (
              <div key={pillar.name} className="bg-card p-8">
                <h3 className="font-medium text-lg text-foreground mb-3">{pillar.name}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What I believe */}
      <section className="section-padding border-t border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            <div>
              <span className="text-xs uppercase tracking-widest text-violet-400 font-medium">
                Principles
              </span>
              <h2 className="mt-2 font-serif text-4xl font-medium tracking-tight">
                What I believe
              </h2>
            </div>
            <div className="lg:col-span-2">
              <ul className="space-y-6">
                {beliefs.map((belief, i) => (
                  <li key={i} className="flex items-start gap-4 border-t border-border/30 pt-6 first:border-0 first:pt-0">
                    <span className="text-xs text-violet-400/60 font-mono mt-1">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <p className="text-foreground leading-relaxed">{belief}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Currently */}
      <section className="section-padding border-t border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <span className="text-xs uppercase tracking-widest text-violet-400 font-medium">
                Currently
              </span>
              <h2 className="mt-2 font-serif text-4xl font-medium tracking-tight">
                What I am focused on
              </h2>
              <div className="mt-6 space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  The majority of my time right now goes into PEVRA — building
                  the product, growing early registrations, and working through
                  the infrastructure and strategic challenges of launching a
                  blockchain telecom platform.
                </p>
                <p>
                  Alongside that, I continue to write, research, and take on
                  selected advisory and strategic work for Web3 projects where
                  I think I can genuinely contribute.
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="https://pevranetwork.com.ng"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors group"
                >
                  Explore PEVRA
                  <ExternalLink size={14} />
                </a>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-6 py-3 border border-border hover:border-foreground/50 text-foreground rounded-lg font-medium transition-colors"
                >
                  Work with me
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
            <div className="border border-border/50 rounded-lg p-8 bg-card">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-6">
                Links
              </p>
              <ul className="space-y-4">
                {[
                  { label: 'PEVRA Network', href: 'https://pevranetwork.com.ng', external: true },
                  { label: 'X / Twitter', href: 'https://x.com/defiwaynex', external: true },
                  { label: 'Selected work', href: '/work', external: false },
                  { label: 'Writing & research', href: '/writing', external: false },
                  { label: 'Professional experience', href: '/experience', external: false },
                ].map((link) => (
                  <li key={link.href}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors group py-2 border-b border-border/20 last:border-0"
                      >
                        {link.label}
                        <ExternalLink size={12} className="shrink-0" />
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors group py-2 border-b border-border/20 last:border-0"
                      >
                        {link.label}
                        <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform shrink-0" />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
