import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type ServiceRow = Database['public']['Tables']['services']['Row']

export default async function AdminServicesPage() {
  const supabase = await createClient()
  const { data: rawServices } = await (supabase as any).from('services').select('*').order('order_index')
  const services = (rawServices || []) as ServiceRow[]

  return (
    <div>
      <h1 className="text-2xl font-serif font-medium mb-8">Services</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Services are pre-seeded from the database migration. Edit directly in Supabase or use the table below.
      </p>
      <div className="surface overflow-hidden">
        <table className="admin-table">
          <thead><tr><th>Title</th><th>Audience</th><th>Status</th><th>Order</th></tr></thead>
          <tbody>
            {services.map(s => (
              <tr key={s.id}>
                <td className="font-medium">{s.title}</td>
                <td className="text-muted-foreground text-xs max-w-xs truncate">{s.audience}</td>
                <td><span className={`text-xs px-2 py-0.5 rounded-full ${s.published ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>{s.published ? "Published" : "Hidden"}</span></td>
                <td className="text-muted-foreground">{s.order_index}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-4">To edit services, go to your Supabase dashboard ? Table editor ? services.</p>
    </div>
  )
}
