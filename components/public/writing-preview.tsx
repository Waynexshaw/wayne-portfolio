'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Database } from '@/lib/database.types'

type ArticlePreview = Pick<
  Database['public']['Tables']['articles']['Row'],
  'id' | 'title' | 'slug' | 'excerpt' | 'category' | 'published_at' | 'reading_time'
>

interface WritingPreviewProps {
  articles: ArticlePreview[]
}

export function WritingPreview({ articles }: WritingPreviewProps) {
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
              Writing & Research
            </span>
            <h2 className="mt-2 font-serif text-4xl md:text-5xl font-medium tracking-tight">
              Latest Thinking
            </h2>
          </motion.div>
          <Link
            href="/writing"
            className="hidden md:inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            All writing
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {articles.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-12 text-center">
            <p className="text-muted-foreground text-sm">
              [Writing will appear here once articles are published]
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {articles.map((article, i) => (
              <motion.article
                key={article.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group"
              >
                <Link href={`/writing/${article.slug}`}>
                  <div className="border border-border/50 rounded-lg p-6 bg-card hover:border-border hover:bg-muted/20 transition-all duration-200 h-full flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                      {article.category && (
                        <span className="text-xs uppercase tracking-widest text-violet-400 font-medium">
                          {article.category}
                        </span>
                      )}
                      {article.reading_time && (
                        <span className="text-xs text-muted-foreground">
                          {article.reading_time} min read
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium text-foreground group-hover:text-violet-400 transition-colors leading-snug mb-3">
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 flex-1">
                        {article.excerpt}
                      </p>
                    )}
                    <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between">
                      {article.published_at && (
                        <span className="text-xs text-muted-foreground">
                          {formatDate(article.published_at)}
                        </span>
                      )}
                      <ArrowRight
                        size={14}
                        className="text-muted-foreground group-hover:text-violet-400 group-hover:translate-x-1 transition-all"
                      />
                    </div>
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>
        )}

        <div className="mt-6 md:hidden">
          <Link
            href="/writing"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View all writing <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  )
}
