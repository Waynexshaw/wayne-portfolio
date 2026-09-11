import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

export const metadata: Metadata = {
  title: 'Work',
  description: "Selected projects and case studies from Wayne's work across Web3 growth, research, strategy and building.",
}

type ProjectRow = Database['public']['Tables']['projects']['Row']

const categories = ['All', 'Growth', 'Research', 'Strategy', 'Content', 'Building', 'DeFi', 'RWA']

export default async function WorkPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('projects')
    .select('*')
    .eq('published', true)
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false })

  if (category && category !== 'All') {
    query = query.ilike('category', `%${category}%`)
  }

  const { data: rawProjects } = await query
  const projects = (rawProjects || []) as ProjectRow[]

  return (
    <div className="pt-16">
      <section className="section-padding">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-16">
            <span className="text-xs uppercase tracking-widest text-violet-400 font-medium">
              Work
            </span>
            <h1 className="mt-4 font-serif text-5xl md:text-6xl font-medium tracking-tight">
              Selected Work
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              Projects, campaigns and strategic work across growth, research,
              content and building. Each entry includes what the problem was,
              what I did, and what changed because of it.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-12">
            {categories.map((cat) => (
              <Link
                key={cat}
                href={cat === 'All' ? '/work' : `/work?category=${cat}`}
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

          {projects.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-16 text-center">
              <h3 className="font-medium text-foreground mb-2">No projects yet</h3>
              <p className="text-sm text-muted-foreground">
                [Projects will appear here once added through the admin dashboard]
              </p>
            </div>
          ) : (
            <div className="space-y-px border border-border/50 rounded-lg overflow-hidden">
              {projects.map((project, i) => (
                <Link
                  key={project.id}
                  href={`/work/${project.slug}`}
                  className="group flex flex-col md:flex-row md:items-start gap-6 p-8 bg-card hover:bg-muted/20 transition-colors duration-200 border-b border-border/30 last:border-0"
                >
                  <div className="shrink-0 md:w-48">
                    {project.category && (
                      <span className="text-xs uppercase tracking-widest text-violet-400 font-medium">
                        {project.category}
                      </span>
                    )}
                    {project.role && (
                      <p className="text-xs text-muted-foreground mt-1">{project.role}</p>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <h2 className="font-medium text-xl text-foreground group-hover:text-violet-400 transition-colors">
                        {project.title}
                        {project.featured && (
                          <span className="ml-3 text-xs bg-violet-600/20 text-violet-400 px-2 py-0.5 rounded-full font-normal">
                            Featured
                          </span>
                        )}
                      </h2>
                      <ArrowRight
                        size={16}
                        className="shrink-0 text-muted-foreground group-hover:text-violet-400 group-hover:translate-x-1 transition-all mt-1"
                      />
                    </div>
                    {project.summary && (
                      <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                        {project.summary}
                      </p>
                    )}
                    {project.problem && (
                      <p className="mt-3 text-sm text-muted-foreground/70 italic">
                        Problem: {project.problem.slice(0, 120)}{project.problem.length > 120 ? '...' : ''}
                      </p>
                    )}
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
