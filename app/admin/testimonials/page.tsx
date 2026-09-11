import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type TestimonialRow = Database['public']['Tables']['testimonials']['Row']

export default async function AdminTestimonialsPage() {
  const supabase = await createClient()
  const { data: rawT } = await (supabase as any).from('testimonials').select('*').order('created_at', { ascending: false })
  const testimonials = (rawT || []) as TestimonialRow[]

  return (
    <div>
      <h1 className="text-2xl font-serif font-medium mb-4">Testimonials</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Testimonials only appear publicly when marked as published. Add real testimonials only.
        Use your Supabase dashboard to add entries until a full UI is built.
      </p>
      {testimonials.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-muted-foreground text-sm">No testimonials yet. Add them in Supabase ? Table editor ? testimonials.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {testimonials.map(t => (
            <div key={t.id} className="surface p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-sm text-muted-foreground">{t.role}{t.organization ? `, ${t.organization}` : ""}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${t.published ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
                  {t.published ? "Published" : "Hidden"}
                </span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground italic">&quot;{t.quote}&quot;</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
