import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type ProjectRow = Database['public']['Tables']['projects']['Row']
type CaseStudyRow = Database['public']['Tables']['case_studies']['Row']

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('projects')
    .select('title, summary, image')
    .eq('slug', slug)
    .eq('published', true)
    .single()

  const project = data as Pick<ProjectRow, 'title' | 'summary' | 'image'> | null
  if (!project) return {}

  return {
    title: project.title,
    description: project.summary || undefined,
    openGraph: { title: project.title, description: project.summary || undefined },
  }
}

export default async function WorkSlugPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: projectData } = await (supabase as any)
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single()

  const project = projectData as ProjectRow | null
  if (!project) notFound()

  const { data: csData } = await (supabase as any)
    .from('case_studies')
    .select('*')
    .eq('project_id', project.id)
    .single()

  const cs = csData as CaseStudyRow | null

  const { data: relData } = await (supabase as any)
    .from('projects')
    .select('id, title, slug, category, summary')
    .eq('published', true)
    .neq('id', project.id)
    .limit(3)

  const related = (relData || []) as Array<Pick<ProjectRow, 'id' | 'title' | 'slug' | 'category' | 'summary'>>

  return (
    <div className="pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Link href="/work" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={14} />
          All work
        </Link>
      </div>

      <header className="section-padding pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            {project.category && (
              <span className="text-xs uppercase tracking-widest text-violet-400 font-medium">{project.category}</span>
            )}
            <h1 className="mt-4 font-serif text-4xl md:text-6xl font-medium tracking-tight">{project.title}</h1>
            {project.role && <p className="mt-3 text-lg text-muted-foreground">Role: {project.role}</p>}
            {project.summary && <p className="mt-6 text-xl text-muted-foreground leading-relaxed">{project.summary}</p>}
            {project.link && (
              <a href={project.link} target="_blank" rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors">
                View project <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
      </header>

      {project.image && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
          <div className="w-full aspect-video rounded-xl overflow-hidden bg-muted">
            <img src={project.image} alt={project.title} className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      <div className="section-padding">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-16">
            <div className="space-y-16">
              {(cs?.context || project.description) && (
                <NarrativeSection title="Context">
                  {cs?.context || project.description}
                </NarrativeSection>
              )}
              {(cs?.problem || project.problem) && (
                <NarrativeSection title="The Problem">
                  {cs?.problem || project.problem}
                </NarrativeSection>
              )}
              {(cs?.objective || project.objective) && (
                <NarrativeSection title="Objective">{cs?.objective || project.objective}</NarrativeSection>
              )}
              {cs?.research && (
                <NarrativeSection title="Research">{cs.research}</NarrativeSection>
              )}
              {(cs?.strategy || project.strategy) && (
                <NarrativeSection title="Strategy">
                  {cs?.strategy || project.strategy}
                </NarrativeSection>
              )}
              {(cs?.execution || project.execution) && (
                <NarrativeSection title="Execution">
                  {cs?.execution || project.execution}
                </NarrativeSection>
              )}
              {cs?.challenges && (
                <NarrativeSection title="Challenges">{cs.challenges}</NarrativeSection>
              )}
              {cs?.decisions && (
                <NarrativeSection title="Key Decisions">{cs.decisions}</NarrativeSection>
              )}
              {(cs?.results || project.results) && (
                <NarrativeSection title="Results">
                  {cs?.results || project.results}
                </NarrativeSection>
              )}
              {(cs?.lessons || project.lessons) && (
                <NarrativeSection title="Lessons">
                  {cs?.lessons || project.lessons}
                </NarrativeSection>
              )}
            </div>

            <aside>
              <div className="surface p-6 sticky top-24 space-y-6">
                {project.category && (
                  <div>
                    <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">Category</h3>
                    <p className="text-sm">{project.category}</p>
                  </div>
                )}
                {project.role && (
                  <div>
                    <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">Role</h3>
                    <p className="text-sm">{project.role}</p>
                  </div>
                )}
                {project.link && (
                  <div>
                    <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">Link</h3>
                    <a href={project.link} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-violet-400 hover:text-violet-300 transition-colors inline-flex items-center gap-1">
                      Visit project <ExternalLink size={10} />
                    </a>
                  </div>
                )}
                <div className="pt-4 border-t border-border/30">
                  <Link href="/contact"
                    className="block w-full text-center px-4 py-3 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-lg font-medium transition-colors">
                    Work with me
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="section-padding border-t border-border/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-serif text-2xl font-medium mb-8">More work</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.map((item) => (
                <Link key={item.id} href={`/work/${item.slug}`}
                  className="group surface p-6 hover:border-violet-600/40 transition-colors">
                  {item.category && (
                    <span className="text-xs uppercase tracking-widest text-violet-400 font-medium">{item.category}</span>
                  )}
                  <h3 className="mt-2 font-medium group-hover:text-violet-400 transition-colors">{item.title}</h3>
                  {item.summary && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{item.summary}</p>}
                  <div className="mt-4 flex items-center gap-1 text-xs text-violet-400">
                    Read case study <ArrowRight size={12} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function NarrativeSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-medium uppercase tracking-widest text-violet-400 mb-4">{title}</h2>
      <p className="text-muted-foreground leading-relaxed">{children}</p>
    </div>
  )
}