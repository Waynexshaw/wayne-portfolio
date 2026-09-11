'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, ExternalLink } from 'lucide-react'

export function PevraSection() {
  return (
    <section className="section-padding border-t border-border/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Label */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <span className="text-xs uppercase tracking-widest text-violet-400 font-medium">
            Currently Building
          </span>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Left: content */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h2 className="font-serif text-5xl md:text-6xl font-medium tracking-tight leading-none mb-6">
              PEVRA
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed mb-6">
              A blockchain telecommunications platform giving every user a
              permanent, non-recyclable phone identity.
            </p>

            <div className="space-y-4 text-muted-foreground leading-relaxed mb-10">
              <p>
                In Nigeria, phone numbers get recycled. When someone abandons a
                number, it goes back into circulation — history and all. People
                have been detained and arrested for crimes committed by whoever
                held their number before them.
              </p>
              <p>
                PEVRA solves this by separating identity from the number. Your
                identity — verified with your national ID — follows you across
                every number you ever hold. Using blockchain infrastructure and
                soulbound-token technology, your phone identity becomes
                permanent.
              </p>
              <p>
                I am not advising on this. I built it.
              </p>
            </div>

            {/* Key features */}
            <div className="grid grid-cols-3 gap-6 mb-10">
              {[
                { label: 'Call Shield', desc: 'Know who is calling before you answer' },
                { label: 'Pevra Wallet', desc: 'Built-in wallet, no seed phrase needed' },
                { label: 'eSIM & Data', desc: 'Activate a number in minutes' },
              ].map((feature) => (
                <div key={feature.label}>
                  <h4 className="text-sm font-medium text-foreground mb-1">{feature.label}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>

            <a
              href="https://pevranetwork.com.ng"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-all duration-200 hover:shadow-lg hover:shadow-violet-600/20 group"
            >
              Explore PEVRA
              <ExternalLink size={14} className="group-hover:scale-110 transition-transform" />
            </a>
          </motion.div>

          {/* Right: context panel */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="border border-border/50 rounded-lg p-8 bg-card"
          >
            <div className="space-y-8">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-3">
                  My Role
                </p>
                <p className="text-foreground font-medium">Founder &amp; Builder</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Product, strategy, growth and fundraising.
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-3">
                  The Problem
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Phone number recycling exposes millions of Nigerians to fraud,
                  wrongful accusation and identity loss. Carriers recycle
                  numbers with no transparency layer.
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-3">
                  The Solution
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Blockchain-backed permanent phone identity. Your verified
                  identity is tied to you, not to a number. Every number&apos;s
                  ownership history is on-chain and visible.
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-3">
                  Stage
                </p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" />
                  <p className="text-sm text-foreground">Early registrations open</p>
                </div>
              </div>

              <div className="pt-6 border-t border-border/30">
                <p className="text-xs text-muted-foreground italic">
                  &quot;Your Identity. Forever.&quot;
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
