import { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { HeroSection } from '@/components/public/hero'
import { IntroSection } from '@/components/public/intro'
import { SelectedWork } from '@/components/public/selected-work'
import { HowIThink } from '@/components/public/how-i-think'
import { PevraSection } from '@/components/public/pevra-section'
import { WritingPreview } from '@/components/public/writing-preview'
import { ServicesSection } from '@/components/public/services-section'
import { FinalCta } from '@/components/public/final-cta'

export const metadata: Metadata = {
  title: 'Wayne — Web3 Growth Strategist, Researcher & Builder',
  description:
    'Henshaw Joseph (Wayne) is a Web3 growth strategist, researcher, writer and founder working at the intersection of Web3, products and emerging markets. Building PEVRA.',
}

export default async function HomePage() {
  const supabase = await createClient()

  // Fetch featured projects
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('published', true)
    .eq('featured', true)
    .order('created_at', { ascending: false })
    .limit(4)

  // Fetch recent articles
  const { data: articles } = await supabase
    .from('articles')
    .select('id, title, slug, excerpt, category, published_at, reading_time')
    .eq('published', true)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(3)

  // Fetch published services
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('published', true)
    .order('order_index', { ascending: true })

  // Fetch verified metrics (homepage only — unattached to specific project)
  const { data: metrics } = await supabase
    .from('metrics')
    .select('*')
    .eq('verified', true)
    .is('project_id', null)
    .limit(6)

  return (
    <>
      <HeroSection />
      <IntroSection />
      <SelectedWork projects={projects || []} />
      <HowIThink />
      <PevraSection />
      <WritingPreview articles={articles || []} />
      <ServicesSection services={services || []} />
      <FinalCta />
    </>
  )
}
