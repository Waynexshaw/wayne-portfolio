import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Plus, Pencil, Eye, EyeOff, Star } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Database } from '@/lib/database.types'

type ProjectRow = Database['public']['Tables']['projects']['Row']

export default async function AdminProjectsPage() {
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('projects')
    .select('id, title, slug, category, role, published, featured, created_at')
    .order('created_at', { ascending: false })

  const projects = (data || []) as Pick<ProjectRow,
    'id' | 'title' | 'slug' | 'category' | 'role' | 'published' | 'featured' | 'created_at'
  >[]

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-serif font-medium">Projects</h1>
        <Link
          href="/admin/projects/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-lg font-medium transition-colors"
        >
          <Plus size={14} />
          New project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-muted-foreground text-sm mb-4">No projects yet.</p>
          <Link href="/admin/projects/new" className="text-sm text-violet-400 hover:text-violet-300">
            Add your first project ?
          </Link>
        </div>
      ) : (
        <div className="surface overflow-hidden">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{project.title}</span>
                      {project.featured && (
                        <Star size={12} className="text-violet-400" fill="currentColor" />
                      )}
                    </div>
                  </td>
                  <td className="text-muted-foreground">{project.category || '—'}</td>
                  <td className="text-muted-foreground">{project.role || '—'}</td>
                  <td>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                      project.published
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {project.published ? <Eye size={10} /> : <EyeOff size={10} />}
                      {project.published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="text-muted-foreground text-xs">{formatDate(project.created_at)}</td>
                  <td>
                    <Link
                      href={`/admin/projects/${project.id}`}
                      className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      <Pencil size={12} />
                      Edit
                    </Link>
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
