import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import type { Database } from '@/lib/database.types'

export const metadata: Metadata = {
  title: 'Writing & Research',
  description: 'Essays, research, DeFi analysis, growth strategy and thinking from Wayne (@defiwaynex).',
}

type ArticleListItem = Pick<
  Database['public']['Tables']['articles']['Row'],
  'id' | 'title' | 'slug' | 'excerpt' | 'category' | 'published_at' | 'reading_time'
>

const writingCategories = ['All', 'DeFi', 'RWA', 'Growth', 'Strategy', 'Research', 'Web3', 'Founder', 'PEVRA']

export default async function WritingPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const supabase = await createClient()

  const baseQuery = (supabase as any)
    .from('articles')
    .select('id, title, slug, excerpt, category, published_at, reading_time')
    .eq('published', true)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })

  const { data } = category && category !== 'All'
    ? await baseQuery.ilike('category', `%${category}%`)
    : await baseQuery

  const articles = (data || []) as ArticleListItem[]

  return (
    <div className="pt-16">
      <section className="section-padding">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-16">
            <span className="text-xs uppercase tracking-widest text-violet-400 font-medium">
              Writing & Research
            </span>
            <h1 className="mt-4 font-serif text-5xl md:text-6xl font-medium tracking-tight">
              An archive of thinking.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              Research, essays, analysis and notes across DeFi, RWA, growth strategy,
              Web3 and building. Written to be useful, not to fill a content calendar.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-12">
            {writingCategories.map((cat) => (
              <Link
                key={cat}
                href={cat === 'All' ? '/writing' : `/writing?category=${cat}`}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  (cat === 'All' && !category) || category === cat
                    ? 'bg-violet-600 text-white'
                    : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
                }`}
              >
                {cat}
              </Link>
            ))}
          </div>

          {articles.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-16 text-center">
              <h3 className="font-medium text-foreground mb-2">No articles published yet</h3>
              <p className="text-sm text-muted-foreground">
                [Articles will appear here once published through the admin dashboard]
              </p>
            </div>
          ) : (
            <div className="space-y-px border border-border/50 rounded-lg overflow-hidden">
              {articles.map((article) => (
                <Link
                  key={article.id}
                  href={`/writing/${article.slug}`}
                  className="group flex flex-col md:flex-row md:items-center gap-4 p-6 md:p-8 bg-card hover:bg-muted/20 transition-colors duration-200 border-b border-border/30 last:border-0"
                >
                  <div className="shrink-0 w-32">
                    {article.published_at && (
                      <span className="text-xs text-muted-foreground">
                        {formatDate(article.published_at)}
                      </span>
                    )}
                  </div>
                  {article.category && (
                    <span className="text-xs uppercase tracking-widest text-violet-400 font-medium w-24 shrink-0">
                      {article.category}
                    </span>
                  )}
                  <div className="flex-1">
                    <h2 className="font-medium text-foreground group-hover:text-violet-400 transition-colors">
                      {article.title}
                    </h2>
                    {article.excerpt && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {article.excerpt}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {article.reading_time && (
                      <span className="text-xs text-muted-foreground">{article.reading_time} min</span>
                    )}
                    <ArrowRight
                      size={16}
                      className="text-muted-foreground group-hover:text-violet-400 group-hover:translate-x-1 transition-all"
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
