import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, ExternalLink } from 'lucide-react'

export const metadata: Metadata = {
  title: 'About | Wayne — Web3 Growth Strategist, Researcher & Builder',
  description:
    'The story behind Wayne (@defiwaynex): moving from writing and DeFi research to growth strategy and founding PEVRA.',
}

const progression = [
  {
    step: '01',
    stage: 'Writing',
    label: 'Curiosity & First Principles',
    description:
      'Did not enter through a traditional tech background. Started curious about crypto and financial systems, researching protocols, breaking down projects, and writing to understand.',
  },
  {
    step: '02',
    stage: 'Research',
    label: 'Formal Training & Analysis',
    description:
      'Formal DeFi research training and completed a program at Profunda Academy with an internship. Shifted from asking "what does a project do?" to "why do people use it, why do they stay, and what creates real utility?"',
  },
  {
    step: '03',
    stage: 'Strategy',
    label: 'User Behavior & Retention',
    description:
      'Realized growth is not merely user acquisition. It is retention, community building, positioning, partnerships, and user psychology. Developed strategy through hands-on problem solving rather than textbook theory.',
  },
  {
    step: '04',
    stage: 'Building',
    label: 'Founding PEVRA & Execution',
    description:
      'Founded PEVRA to solve phone number recycling in emerging markets. Living inside the constraints of tokenomics, GTM, compliance, partnerships, and building a real venture changed how I understand strategy forever.',
  },
]

const pillars = [
  {
    name: 'Web3 Research',
    description:
      'First-principles protocol analysis, market intelligence, tokenomics teardowns, and analytical research reports that guide real decisions.',
  },
  {
    name: 'Growth Strategy',
    description:
      'Holistic go-to-market planning, user activation, sustainable retention frameworks, and community growth designed for long-term survival.',
  },
  {
    name: 'Content & Narrative',
    description:
      'Research-led storytelling, distribution architecture, and educational writing that builds authentic conviction and market authority.',
  },
  {
    name: 'Venture Building',
    description:
      'Hands-on product development, compliance navigation, and operational execution as the founder of PEVRA.',
  },
]

export default function AboutPage() {
  return (
    <div className="pt-16">
      {/* Editorial Hero Header */}
      <section className="section-padding pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="text-xs uppercase tracking-widest text-violet-400 font-medium">
              About Wayne
            </span>
            <h1 className="mt-4 font-serif text-5xl md:text-6xl lg:text-7xl font-medium tracking-tight leading-tight">
              Writing, then research, then strategy, and eventually building.
            </h1>
            <p className="mt-6 text-xl text-muted-foreground leading-relaxed">
              My journey into Web3 was not a straight line. Each stage grew out of the one before it.
            </p>
          </div>
        </div>
      </section>

      {/* Main Narrative Narrative Section */}
      <section className="section-padding border-t border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
            <div className="lg:col-span-4">
              <div className="sticky top-24 space-y-6">
                <span className="text-xs uppercase tracking-widest text-violet-400 font-medium">
                  The Background
                </span>
                <h2 className="font-serif text-3xl font-medium text-foreground">
                  The person behind the work.
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Known professionally as <strong>Wayne</strong> (Henshaw Joseph), online as <strong>@defiwaynex</strong>.
                </p>
                <div className="pt-4 border-t border-border/30">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs text-foreground font-medium">Building PEVRA & advising select teams</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-8 text-lg text-muted-foreground leading-relaxed">
              <p className="text-foreground text-xl md:text-2xl font-serif leading-relaxed">
                I didn’t get into Web3 through a traditional tech background.
              </p>

              <p>
                I started on the writing and research side. I was curious about crypto and wanted to understand how this new financial system actually worked, so I started learning about DeFi, researching protocols, breaking down projects, and writing about what I was learning.
              </p>

              <p>
                The more I researched, the more my questions changed. I became less interested in simply understanding what a project did and more interested in <strong className="text-foreground font-medium">why people used it, why they left, how communities grew, and what actually made a product useful.</strong>
              </p>

              <p>
                That was the beginning of the shift from Web3 content writing into DeFi research, analysis, and strategy.
              </p>

              <div className="p-6 md:p-8 rounded-xl bg-card border border-border/50 my-6">
                <p className="text-foreground font-medium mb-2">Formative Training & Grounding</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  I took formal training in DeFi research and later completed a program at <strong>Profunda Academy</strong>, where I also had the opportunity to take on a free internship. Those experiences helped me move beyond simply consuming information. They taught me how to research properly, structure my thinking, and communicate ideas more clearly.
                </p>
              </div>

              <p>
                One of the biggest shifts in my thinking came when I realized that <span className="text-foreground font-medium">growth isn’t simply about getting more people into a project.</span> It’s about understanding why they come in, what makes them stay, and what turns users into an active community.
              </p>

              <p>
                That changed the way I approached Web3 projects. I started thinking more deeply about acquisition, retention, community building, positioning, partnerships, and user behaviour. My work as a strategist developed through actually working through these problems rather than simply learning growth theory.
              </p>

              <div className="border-l-2 border-violet-500 pl-6 my-8 py-2">
                <p className="text-2xl font-serif text-foreground italic leading-snug">
                  &ldquo;Building has changed the way I understand strategy. You learn differently when you&apos;re responsible for the decisions yourself.&rdquo;
                </p>
              </div>

              <p>
                Then I started building. As the founder of <strong className="text-foreground font-medium">PEVRA</strong>, I’ve had to think about product design, tokenomics, developer partnerships, go-to-market, licensing, compliance, community, waitlist growth, and the realities of taking a Web3 idea from a concept toward an actual business.
              </p>

              <p>
                Today, I work at the intersection of <strong className="text-violet-400 font-medium">Web3 research, growth strategy, content, and building</strong>.
              </p>

              <p>
                I still love writing and research, but I’m increasingly interested in what happens after the research: understanding the problem, making better decisions, building useful products, and figuring out how people move from discovering a project to becoming long-term users.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Progression Timeline / The Stages */}
      <section className="section-padding border-t border-border/30 bg-card/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16 max-w-2xl">
            <span className="text-xs uppercase tracking-widest text-violet-400 font-medium">
              Evolution
            </span>
            <h2 className="mt-2 font-serif text-4xl md:text-5xl font-medium tracking-tight">
              The Four Stages
            </h2>
            <p className="mt-4 text-muted-foreground">
              How writing deepened into research, sharpened into strategy, and culminated in building.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {progression.map((item) => (
              <div
                key={item.step}
                className="surface p-6 flex flex-col justify-between hover:border-violet-600/40 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs text-muted-foreground/60">{item.step}</span>
                    <span className="text-xs uppercase tracking-widest text-violet-400 font-medium">{item.stage}</span>
                  </div>
                  <h3 className="text-foreground font-medium text-base mb-2">{item.label}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pillars of Work */}
      <section className="section-padding border-t border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 max-w-2xl">
            <span className="text-xs uppercase tracking-widest text-violet-400 font-medium">
              What I Work On
            </span>
            <h2 className="mt-2 font-serif text-4xl font-medium tracking-tight">
              Four Core Pillars
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border/30 border border-border/30 rounded-lg overflow-hidden">
            {pillars.map((pillar) => (
              <div key={pillar.name} className="bg-card p-8 flex flex-col justify-between">
                <div>
                  <h3 className="font-medium text-lg text-foreground mb-3">{pillar.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Currently Focused On & Contact Trigger */}
      <section className="section-padding border-t border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <span className="text-xs uppercase tracking-widest text-violet-400 font-medium">
                Currently Focused On
              </span>
              <h2 className="mt-2 font-serif text-4xl font-medium tracking-tight">
                Building & Advising
              </h2>
              <div className="mt-6 space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  The majority of my energy is focused on <strong>PEVRA</strong>, architecting a permanent, sovereign telecom identity layer for Nigeria and emerging markets, and scaling the early waitlist.
                </p>
                <p>
                  Alongside PEVRA, I work with selected early and growth-stage Web3 protocols on positioning, GTM, retention architecture, and protocol intelligence.
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="https://pevranetwork.com.ng"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors"
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

            <div className="border border-border/50 rounded-xl p-8 bg-card">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-6">
                Direct Channels
              </p>
              <ul className="space-y-4">
                {[
                  { label: 'PEVRA Network (Building)', href: 'https://pevranetwork.com.ng', external: true },
                  { label: 'X / Twitter (@defiwaynex)', href: 'https://x.com/defiwaynex', external: true },
                  { label: 'Substack Publication', href: 'https://defiwaynex.substack.com', external: true },
                  { label: 'Case studies & Work', href: '/work', external: false },
                  { label: 'Writing & Research archive', href: '/writing', external: false },
                  { label: 'Professional timeline', href: '/experience', external: false },
                ].map((link) => (
                  <li key={link.href}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors py-2 border-b border-border/20 last:border-0"
                      >
                        {link.label}
                        <ExternalLink size={12} />
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors py-2 border-b border-border/20 last:border-0 group"
                      >
                        {link.label}
                        <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
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