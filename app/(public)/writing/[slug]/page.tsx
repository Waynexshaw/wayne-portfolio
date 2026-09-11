import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, Twitter } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: article } = await (supabase as any)
    .from('articles')
    .select('title, excerpt, seo_title, seo_description, cover_image, published_at')
    .eq('slug', slug)
    .eq('published', true)
    .single()

  if (!article) return { title: 'Article not found' }

  return {
    title: article.seo_title || article.title,
    description: article.seo_description || article.excerpt || undefined,
    openGraph: {
      title: article.seo_title || article.title,
      description: article.seo_description || article.excerpt || undefined,
      type: 'article',
      publishedTime: article.published_at || undefined,
      images: article.cover_image ? [article.cover_image] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.seo_title || article.title,
      description: article.seo_description || article.excerpt || undefined,
      images: article.cover_image ? [article.cover_image] : [],
    },
  }
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: article } = await (supabase as any)
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .lte('published_at', new Date().toISOString())
    .single()

  if (!article) notFound()

  // Fetch related articles
  const { data: related } = await (supabase as any)
    .from('articles')
    .select('id, title, slug, category, reading_time, published_at')
    .eq('published', true)
    .eq('category', article.category || '')
    .neq('id', article.id)
    .limit(3)

  return (
    <div className="pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/writing"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12"
        >
          <ArrowLeft size={14} />
          All writing
        </Link>
      </div>

      <article className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-16">
          {/* Main content */}
          <div className="lg:col-span-3">
            {/* Header */}
            <header className="mb-12">
              <div className="flex items-center gap-4 mb-6">
                {article.category && (
                  <span className="text-xs uppercase tracking-widest text-violet-400 font-medium">
                    {article.category}
                  </span>
                )}
                {article.reading_time && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock size={12} />
                    {article.reading_time} min read
                  </span>
                )}
              </div>

              <h1 className="font-serif text-4xl md:text-5xl font-medium tracking-tight leading-tight mb-6">
                {article.title}
              </h1>

              {article.excerpt && (
                <p className="text-xl text-muted-foreground leading-relaxed mb-6">
                  {article.excerpt}
                </p>
              )}

              <div className="flex items-center gap-6 pt-6 border-t border-border/30">
                <div>
                  <p className="text-sm font-medium">Wayne</p>
                  <p className="text-xs text-muted-foreground">
                    {article.published_at ? formatDate(article.published_at) : ''}
                  </p>
                </div>
                <a
                  href={`https://x.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(`https://defiwaynex.com/writing/${article.slug}`)}&via=defiwaynex`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Twitter size={12} />
                  Share
                </a>
              </div>
            </header>

            {/* Content */}
            {article.content && (
              <div
                className="prose prose-invert max-w-none prose-headings:font-serif prose-headings:font-medium prose-a:text-violet-400 prose-a:no-underline hover:prose-a:underline prose-blockquote:border-violet-600 prose-code:text-violet-300"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-24 space-y-8">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">
                  Written by
                </p>
                <p className="text-sm font-medium">Wayne</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Web3 growth strategist, researcher and founder.
                </p>
                <a
                  href="https://x.com/defiwaynex"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  <Twitter size={10} />
                  @defiwaynex
                </a>
              </div>

              {related && related.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">
                    Related
                  </p>
                  <ul className="space-y-4">
                    {related.map((r) => (
                      <li key={r.id}>
                        <Link
                          href={`/writing/${r.slug}`}
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors leading-snug block"
                        >
                          {r.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-6 border-t border-border/30">
                <Link
                  href="/contact"
                  className="block text-center px-4 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Work with me
                </Link>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>
  )
}

