import { Metadata } from 'next'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatDateShort } from '@/lib/utils'
import type { Database } from '@/lib/database.types'

export const metadata: Metadata = {
  title: 'Experience',
  description: "Wayne's professional experience across Web3 growth, research, strategy and founding.",
}

type ExperienceRow = Database['public']['Tables']['experience']['Row']

export default async function ExperiencePage() {
  const supabase = await createClient()
  const { data: entries } = await (supabase as any)
    .from('experience')
    .select('*')
    .order('order_index', { ascending: true })

  const experienceList = (entries || []) as ExperienceRow[]

  return (
    <div className="pt-16">
      <section className="section-padding">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-16">
            <span className="text-xs uppercase tracking-widest text-violet-400 font-medium">
              Experience
            </span>
            <h1 className="mt-4 font-serif text-5xl md:text-6xl font-medium tracking-tight">
              Professional Record
            </h1>
            <p className="mt-4 text-xl text-foreground/90 font-serif">
              A timeline of meaningful work.
            </p>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed">
              This is not a complete list of every role I&apos;ve ever held. It is a record of the projects, roles and experiences that shaped how I think, how I work, and the professional I am today.
            </p>
          </div>

          {experienceList.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-16 text-center">
              <p className="text-muted-foreground text-sm">
                [Experience will appear here once added through the admin dashboard]
              </p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-0 md:left-[200px] top-0 bottom-0 w-px bg-border/50" />
              <div className="space-y-0">
                {experienceList.map((entry, i) => (
                  <div
                    key={entry.id}
                    className="relative grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 pb-12 last:pb-0"
                  >
                    <div className="absolute left-[-5px] md:left-[196px] top-2 w-2.5 h-2.5 bg-violet-600 rounded-full border-2 border-background" />
                    <div className="md:text-right pr-8">
                      <p className="text-sm text-muted-foreground">
                        {formatDateShort(entry.start_date)}
                        {' — '}
                        {entry.end_date ? formatDateShort(entry.end_date) : 'Present'}
                      </p>
                    </div>
                    <div className="pl-8 md:pl-12">
                      <div className="flex items-start gap-3 flex-wrap">
                        <h2 className="font-medium text-foreground text-lg">{entry.role}</h2>
                        {!entry.end_date && (
                          <span className="text-xs bg-violet-600/20 text-violet-400 px-2 py-0.5 rounded-full mt-0.5">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-muted-foreground">{entry.organization}</p>
                        {entry.link && (
                          <a
                            href={entry.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                      {entry.description && (
                        <p className="mt-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                          {entry.description}
                        </p>
                      )}
                      {entry.achievements && entry.achievements.length > 0 && (
                        <ul className="mt-4 space-y-2">
                          {entry.achievements.map((achievement: string, j: number) => (
                            <li
                              key={j}
                              className="flex items-start gap-2 text-sm text-muted-foreground"
                            >
                              <span className="w-1 h-1 bg-violet-500 rounded-full mt-2 shrink-0" />
                              {achievement}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-20 pt-12 border-t border-border/30">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="font-serif text-2xl font-medium">Need a full resume?</h2>
                <p className="text-muted-foreground mt-1">
                  View or download the concise professional record.
                </p>
              </div>
              <Link
                href="/resume"
                className="inline-flex items-center gap-2 px-6 py-3 border border-border hover:border-foreground/50 text-foreground rounded-lg font-medium transition-colors"
              >
                View resume
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
