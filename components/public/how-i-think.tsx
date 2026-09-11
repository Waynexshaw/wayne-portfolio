'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const thoughts = [
  {
    idea: 'Growth is not the same as acquisition.',
    detail:
      'Most projects confuse the two. Getting people in the door is a tactic. Keeping them is a product and strategy problem. Conflating them is how you burn a community and call it growth.',
  },
  {
    idea: 'Research should shape decisions, not just produce documents.',
    detail:
      'A research report no one acts on is not research, it is documentation of missed opportunity. The point of understanding your market is to change what you do next.',
  },
  {
    idea: 'Web3 products need better experiences, not just better tokenomics.',
    detail:
      'Token design cannot substitute for product clarity. Users who do not understand what they are doing will leave when the incentives run out. The ones who stay understand the value.',
  },
  {
    idea: 'Content should create distribution, not just fill a calendar.',
    detail:
      'Publishing regularly is not a strategy. Publishing things that are genuinely useful, shareable or thought-provoking, that is how content becomes distribution.',
  },
  {
    idea: 'Building forces strategy to become practical.',
    detail:
      'You can hold a lot of theoretical positions until you are the one who has to execute. Founding PEVRA changed how I give advice because I now live inside the same constraints I used to analyze from the outside.',
  },
  {
    idea: 'Community is not the audience. It is the early user base.',
    detail:
      'Treating community as a marketing channel is backwards. The people in your community are telling you what your product needs to do. Listen before you broadcast.',
  },
]

export function HowIThink() {
  return (
    <section className="section-padding border-t border-border/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          {/* Header col */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-1"
          >
            <span className="text-xs uppercase tracking-widest text-violet-400 font-medium">
              Thinking
            </span>
            <h2 className="mt-2 font-serif text-4xl md:text-5xl font-medium tracking-tight leading-tight">
              How I Think
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              A few ideas I keep coming back to. These come from research,
              experience, and mistakes, not theory.
            </p>
            <Link
              href="/writing"
              className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              Read my writing
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          {/* Thoughts grid */}
          <div className="lg:col-span-2 space-y-0">
            {thoughts.map((thought, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.07 }}
                className="group border-t border-border/30 py-8 first:border-0"
              >
                <div className="flex gap-6">
                  <span className="text-xs text-muted-foreground/40 font-mono mt-1 shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="font-medium text-foreground text-lg leading-snug mb-3">
                      {thought.idea}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {thought.detail}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
