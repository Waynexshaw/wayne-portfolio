'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

export function IntroSection() {
  return (
    <section className="section-padding border-t border-border/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          {/* Label */}
          <div>
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-xs uppercase tracking-widest text-violet-400 font-medium"
            >
              Who I am
            </motion.span>
          </div>

          {/* Content */}
          <div className="lg:-mt-1">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <p className="text-2xl md:text-3xl font-serif leading-relaxed text-foreground mb-8">
                I research how things work, build strategy around what I find,
                and help Web3 products and teams turn that thinking into real
                growth.
              </p>

              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  My work sits at a specific intersection: understanding why
                  users come, why they stay, why they leave, and what a
                  product can actually do about it. That understanding comes
                  from research — not assumptions.
                </p>
                <p>
                  I have worked across DeFi, RWA, infrastructure, community
                  growth and content strategy. Currently, I am applying that
                  thinking directly as the founder of PEVRA — a blockchain
                  telecommunications platform solving phone number recycling
                  in Nigeria.
                </p>
              </div>

              <div className="mt-8 flex items-center gap-6">
                <Link
                  href="/about"
                  className="inline-flex items-center gap-2 text-sm text-foreground hover:text-violet-400 transition-colors group font-medium"
                >
                  Read more about me
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <span className="text-border">|</span>
                <Link
                  href="/work"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  See my work
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Four pillars */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-20 pt-16 border-t border-border/30"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              {
                title: 'Growth',
                desc: 'Acquisition, activation, retention and community strategy for Web3 products.',
              },
              {
                title: 'Research',
                desc: 'Market analysis, protocol research and strategic intelligence that shapes decisions.',
              },
              {
                title: 'Content',
                desc: 'Research-led content that builds authority, creates distribution and educates.',
              },
              {
                title: 'Building',
                desc: 'Applying strategy directly to products and ventures rather than only advising.',
              },
            ].map((pillar, i) => (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 * i }}
              >
                <h3 className="font-medium text-foreground mb-2">{pillar.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{pillar.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
