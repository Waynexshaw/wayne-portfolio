import { Metadata } from 'next'
import Link from 'next/link'
import { Download, ArrowRight, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatDateShort } from '@/lib/utils'
import type { Database } from '@/lib/database.types'

export const metadata: Metadata = {
  title: 'Resume',
  description: "Wayne's professional resume — Web3 growth strategist, researcher and founder.",
}

type ExperienceRow = Database['public']['Tables']['experience']['Row']

export default async function ResumePage() {
  const supabase = await createClient()
  const { data: rawExp } = await (supabase as any)
    .from('experience')
    .select('*')
    .order('order_index', { ascending: true })

  const experience = (rawExp || []) as ExperienceRow[]

  return (
    <div className="pt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-start justify-between mb-12 flex-wrap gap-6">
          <div>
            <h1 className="font-serif text-4xl font-medium">Henshaw Joseph</h1>
            <p className="text-muted-foreground mt-1">
              Web3 Growth Strategist, Researcher, Writer & Founder
            </p>
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              <a href="https://x.com/defiwaynex" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                @defiwaynex
              </a>
              <a href="https://www.linkedin.com/in/joseph-henshaw-72a170405" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                LinkedIn
              </a>
              <a href="https://defiwaynex.com" className="hover:text-foreground transition-colors">
                defiwaynex.com
              </a>
            </div>
          </div>
          <div className="flex gap-3">
            <a
              href="/resume.pdf"
              download
              className="inline-flex items-center gap-2 px-4 py-2 border border-border hover:border-foreground/50 text-sm text-foreground rounded-lg transition-colors"
            >
              <Download size={14} />
              Download PDF
            </a>
          </div>
        </div>

        <div className="divide-y divide-border/30 space-y-0">
          <section className="py-10 first:pt-0">
            <h2 className="font-medium text-xs uppercase tracking-widest text-violet-400 mb-4">
              Summary
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Web3 growth strategist and researcher with hands-on experience in community growth,
              DeFi analysis, content strategy and go-to-market strategy. Founder of PEVRA, a
              blockchain telecommunications platform. I research markets, develop strategy
              around what I find, and help products grow in ways that last.
            </p>
          </section>

          <section className="py-10">
            <h2 className="font-medium text-xs uppercase tracking-widest text-violet-400 mb-6">
              Experience
            </h2>
            {experience.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                [Add experience through the admin dashboard]
              </p>
            ) : (
              <div className="space-y-8">
                {experience.map((entry) => (
                  <div key={entry.id}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <h3 className="font-medium text-foreground">{entry.role}</h3>
                        <p className="text-sm text-muted-foreground">{entry.organization}</p>
                      </div>
                      <p className="text-sm text-muted-foreground shrink-0">
                        {formatDateShort(entry.start_date)} —{' '}
                        {entry.end_date ? formatDateShort(entry.end_date) : 'Present'}
                      </p>
                    </div>
                    {entry.description && (
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                        {entry.description}
                      </p>
                    )}
                    {entry.achievements && entry.achievements.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {entry.achievements.map((a: string, i: number) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 shrink-0" />
                            {a}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="py-10">
            <h2 className="font-medium text-xs uppercase tracking-widest text-violet-400 mb-6">
              Core Capabilities
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                'Web3 Growth Strategy',
                'DeFi Research & Analysis',
                'RWA Research',
                'Community Growth',
                'Go-to-Market Strategy',
                'Content Strategy',
                'Founder-led Marketing',
                'Product Strategy',
              ].map((cap) => (
                <div key={cap} className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-violet-500 rounded-full shrink-0" />
                  <span className="text-sm text-muted-foreground">{cap}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="py-10">
            <h2 className="font-medium text-xs uppercase tracking-widest text-violet-400 mb-4">
              Currently
            </h2>
            <div>
              <h3 className="font-medium text-foreground">Founder & Builder — PEVRA Network</h3>
              <p className="text-sm text-muted-foreground mt-1">2024 — Present</p>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Building a blockchain telecommunications platform that gives users a permanent,
                non-recyclable phone identity. Responsible for product, growth strategy,
                fundraising and ecosystem development.
              </p>
              <a
                href="https://pevranetwork.com.ng"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                <span>pevranetwork.com.ng</span>
                <ExternalLink size={10} />
              </a>
            </div>
          </section>
        </div>

        <div className="mt-8 pt-8 border-t border-border/30 flex gap-4 flex-wrap">
          <Link
            href="/work"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View my work <ArrowRight size={14} />
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"
          >
            Work with me <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  )
}
