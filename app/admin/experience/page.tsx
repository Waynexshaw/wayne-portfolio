import { createClient } from '@/lib/supabase/server'
import { AdminExperienceClient } from '@/components/admin/experience-client'

export default async function AdminExperiencePage() {
  const supabase = await createClient()
  const { data: entries } = await supabase
    .from('experience')
    .select('*')
    .order('order_index', { ascending: true })

  return <AdminExperienceClient entries={entries || []} />
}
