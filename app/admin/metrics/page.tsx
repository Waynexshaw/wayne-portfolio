import { createClient } from '@/lib/supabase/server'

export default async function AdminMetricsPage() {
  const supabase = await createClient()
  const { data: rawMetrics } = await (supabase as any)
    .from('metrics')
    .select('id, label, value, context, verified, project_id, projects!project_id(title)')
    .order('created_at', { ascending: false })

  const metrics = (rawMetrics || []) as Array<{
    id: string
    label: string
    value: string
    context: string | null
    verified: boolean
    project_id: string | null
    projects: { title: string } | null
  }>

  return (
    <div>
      <h1 className="text-2xl font-serif font-medium mb-4">Metrics</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Only verified metrics appear publicly. Attach metrics to specific projects or leave project_id empty for homepage display.
        Add and verify metrics in Supabase ? Table editor ? metrics.
      </p>
      {metrics.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-muted-foreground text-sm">No metrics yet. Add them in Supabase ? Table editor ? metrics.</p>
        </div>
      ) : (
        <div className="surface overflow-hidden">
          <table className="admin-table">
            <thead><tr><th>Label</th><th>Value</th><th>Project</th><th>Context</th><th>Verified</th></tr></thead>
            <tbody>
              {metrics.map((m) => (
                <tr key={m.id}>
                  <td className="font-medium">{m.label}</td>
                  <td className="text-violet-400 font-medium">{m.value}</td>
                  <td className="text-muted-foreground text-xs">{m.projects?.title || "Homepage"}</td>
                  <td className="text-muted-foreground text-xs max-w-xs truncate">{m.context || "—"}</td>
                  <td>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${m.verified ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                      {m.verified ? "Verified" : "Unverified"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
