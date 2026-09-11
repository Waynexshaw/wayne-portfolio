'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import type { Database } from '@/lib/database.types'

type Service = Database['public']['Tables']['services']['Row']

interface ServicesSectionProps {
  services: Service[]
}

const defaultServices = [
  {
    id: 'default-1',
    title: 'Growth Strategy',
    description: 'Growth planning, acquisition, activation and retention strategy for Web3 products and communities.',
    audience: 'Web3 founders and teams that have a product but are struggling to grow it sustainably.',
    deliverables: ['Growth audit', 'Acquisition strategy', 'Retention framework', 'Community growth plan'],
    published: true,
    order_index: 1,
    created_at: '',
  },
  {
    id: 'default-2',
    title: 'Research & Strategy',
    description: 'Market research, protocol analysis, competitive intelligence and strategic recommendations.',
    audience: 'Projects that need a clear picture of their market before making decisions.',
    deliverables: ['Market research report', 'Protocol analysis', 'Competitive map', 'Strategic recommendations'],
    published: true,
    order_index: 2,
    created_at: '',
  },
  {
    id: 'default-3',
    title: 'Content & Distribution',
    description: 'Research-led content strategy and founder-led distribution for Web3 products.',
    audience: 'Founders and projects that want content that actually builds authority and creates distribution.',
    deliverables: ['Content strategy', 'Content calendar', 'Research-led articles', 'Distribution plan'],
    published: true,
    order_index: 3,
    created_at: '',
  },
  {
    id: 'default-4',
    title: 'Web3 / Product Strategy',
    description: 'Helping early-stage Web3 products understand positioning, users, product direction and go-to-market.',
    audience: 'Early-stage Web3 founders who need strategic clarity before scaling.',
    deliverables: ['Positioning workshop', 'User research synthesis', 'GTM strategy', 'Product strategy session'],
    published: true,
    order_index: 4,
    created_at: '',
  },
]

export function ServicesSection({ services }: ServicesSectionProps) {
  const displayServices = services.length > 0 ? services : defaultServices

  return (
    <section className="section-padding border-t border-border/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-xs uppercase tracking-widest text-violet-400 font-medium">
              Ways to Work Together
            </span>
            <h2 className="mt-2 font-serif text-4xl md:text-5xl font-medium tracking-tight">
              How I Can Help
            </h2>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border/30 border border-border/30 rounded-lg overflow-hidden">
          {displayServices.map((service, i) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="bg-card p-8 flex flex-col gap-6"
            >
              <div>
                <h3 className="font-medium text-lg text-foreground mb-2">
                  {service.title}
                </h3>
                {service.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {service.description}
                  </p>
                )}
              </div>

              {service.audience && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground/60 font-medium mb-2">
                    Good for
                  </p>
                  <p className="text-sm text-muted-foreground">{service.audience}</p>
                </div>
              )}

              {service.deliverables && service.deliverables.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground/60 font-medium mb-2">
                    May include
                  </p>
                  <ul className="space-y-1">
                    {service.deliverables.map((d) => (
                      <li key={d} className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="w-1 h-1 bg-violet-500 rounded-full shrink-0" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8 text-center"
        >
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-all duration-200 group"
          >
            Let&apos;s talk
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
