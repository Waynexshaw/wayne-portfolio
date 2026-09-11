import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://defiwaynex.com'
  const supabase = await createClient()

  const { data: projects } = await (supabase as any)
    .from('projects')
    .select('slug, updated_at')
    .eq('published', true)

  const { data: articles } = await (supabase as any)
    .from('articles')
    .select('slug, updated_at')
    .eq('published', true)
    .lte('published_at', new Date().toISOString())

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: 'monthly', priority: 1 },
    { url: `${baseUrl}/about`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/work`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/writing`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/experience`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/contact`, changeFrequency: 'yearly', priority: 0.8 },
    { url: `${baseUrl}/resume`, changeFrequency: 'monthly', priority: 0.6 },
  ]

  const projectPages: MetadataRoute.Sitemap = ((projects || []) as Array<{ slug: string; updated_at: string }>).map((p) => ({
    url: `${baseUrl}/work/${p.slug}`,
    changeFrequency: 'monthly',
    priority: 0.8,
    lastModified: new Date(p.updated_at),
  }))

  const articlePages: MetadataRoute.Sitemap = ((articles || []) as Array<{ slug: string; updated_at: string }>).map((a) => ({
    url: `${baseUrl}/writing/${a.slug}`,
    changeFrequency: 'monthly',
    priority: 0.7,
    lastModified: new Date(a.updated_at),
  }))

  return [...staticPages, ...projectPages, ...articlePages]
}
