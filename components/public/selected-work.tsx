'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Database } from '@/lib/database.types'

type Project = Database['public']['Tables']['projects']['Row']

interface SelectedWorkProps {
  projects: Project[]
}

export function SelectedWork({ projects }: SelectedWorkProps) {
  if (projects.length === 0) {
    return (
      <section className="section-padding border-t border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-16">
            <div>
              <span className="text-xs uppercase tracking-widest text-violet-400 font-medium">Work</span>
              <h2 className="mt-2 font-serif text-4xl md:text-5xl font-medium tracking-tight">
                Selected Work
              </h2>
            </div>
          </div>
          <div className="border border-dashed border-border rounded-lg p-12 text-center">
            <p className="text-muted-foreground text-sm">
              [Projects will appear here once added through the admin dashboard]
            </p>
            <Link
              href="/admin/projects"
              className="mt-4 inline-flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300"
            >
              Add projects ?
            </Link>
          </div>
        </div>
      </section>
    )
  }

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
            <span className="text-xs uppercase tracking-widest text-violet-400 font-medium">Work</span>
            <h2 className="mt-2 font-serif text-4xl md:text-5xl font-medium tracking-tight">
              Selected Work
            </h2>
          </motion.div>
          <Link
            href="/work"
            className="hidden md:inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            All work
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="space-y-px border border-border/50 rounded-lg overflow-hidden">
          {projects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <Link
                href={`/work/${project.slug}`}
                className="group flex flex-col md:flex-row md:items-center gap-4 p-6 md:p-8 bg-card hover:bg-muted/30 transition-colors duration-200 border-b border-border/30 last:border-0"
              >
                {/* Number */}
                <span className="text-xs text-muted-foreground/50 font-mono w-6 shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>

                {/* Category */}
                <span className="text-xs uppercase tracking-widest text-muted-foreground font-medium w-36 shrink-0">
                  {project.category || 'Project'}
                </span>

                {/* Title & description */}
                <div className="flex-1">
                  <h3 className="font-medium text-foreground group-hover:text-violet-400 transition-colors mb-1">
                    {project.title}
                  </h3>
                  {project.summary && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.summary}
                    </p>
                  )}
                </div>

                {/* Role */}
                {project.role && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded shrink-0">
                    {project.role}
                  </span>
                )}

                {/* Arrow */}
                <ArrowRight
                  size={16}
                  className="text-muted-foreground group-hover:text-violet-400 group-hover:translate-x-1 transition-all shrink-0"
                />
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 md:hidden">
          <Link
            href="/work"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View all work <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  )
}
