'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

export function FinalCta() {
  return (
    <section className="section-padding border-t border-border/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-xs uppercase tracking-widest text-violet-400 font-medium">
              Start a conversation
            </span>
            <h2 className="mt-4 font-serif text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight leading-tight">
              Have something worth discussing?
            </h2>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-xl">
              If you are building something in Web3, thinking through a growth
              problem, or want to understand how I approach a specific challenge,
              I am open to a conversation.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium text-lg transition-all duration-200 hover:shadow-lg hover:shadow-violet-600/20 group"
              >
                Start a conversation
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="https://x.com/defiwaynex"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 border border-border hover:border-foreground/50 text-foreground rounded-lg font-medium text-lg transition-colors duration-200"
              >
                Follow on X
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
