'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils'
import { Save, Loader2, Trash2 } from 'lucide-react'
import type { Database } from '@/lib/database.types'

type ProjectInsert = Database['public']['Tables']['projects']['Insert']
type ProjectUpdate = Database['public']['Tables']['projects']['Update']

interface ProjectEditorProps {
  project?: Database['public']['Tables']['projects']['Row']
}

const categories = ['Growth', 'Research', 'Strategy', 'Content', 'Building', 'DeFi', 'RWA', 'Community']

export function ProjectEditor({ project }: ProjectEditorProps) {
  const router = useRouter()
  const isNew = !project?.id
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({
    title: project?.title || '',
    slug: project?.slug || '',
    category: project?.category || '',
    role: project?.role || '',
    summary: project?.summary || '',
    description: project?.description || '',
    problem: project?.problem || '',
    objective: project?.objective || '',
    strategy: project?.strategy || '',
    execution: project?.execution || '',
    results: project?.results || '',
    lessons: project?.lessons || '',
    image: project?.image || '',
    link: project?.link || '',
    featured: project?.featured || false,
    published: project?.published || false,
  })

  const handleTitleChange = (title: string) => {
    setForm(f => ({
      ...f,
      title,
      slug: isNew ? slugify(title) : f.slug,
    }))
  }

  const handleSave = async () => {
    if (!form.title || !form.slug) return
    setSaving(true)
    const supabase = createClient()

    const payload = {
      title: form.title,
      slug: form.slug,
      category: form.category || null,
      role: form.role || null,
      summary: form.summary || null,
      description: form.description || null,
      problem: form.problem || null,
      objective: form.objective || null,
      strategy: form.strategy || null,
      execution: form.execution || null,
      results: form.results || null,
      lessons: form.lessons || null,
      image: form.image || null,
      link: form.link || null,
      featured: form.featured,
      published: form.published,
    }

    if (isNew) {
      const insertPayload: ProjectInsert = payload
      const { data, error } = await (supabase as any).from('projects').insert(insertPayload).select().single()
      if (!error && data) router.push(`/admin/projects/${data.id}`)
    } else {
      const updatePayload: ProjectUpdate = { ...payload, updated_at: new Date().toISOString() }
      await (supabase as any).from('projects').update(updatePayload).eq('id', project!.id)
      router.refresh()
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!project?.id) return
    if (!confirm('Delete this project? This cannot be undone.')) return
    setDeleting(true)
    const supabase = createClient()
    await (supabase as any).from('projects').delete().eq('id', project.id)
    router.push('/admin/projects')
  }

  const Field = ({ label, name, multiline = false, rows = 4, placeholder = '' }: {
    label: string
    name: keyof typeof form
    multiline?: boolean
    rows?: number
    placeholder?: string
  }) => (
    <div>
      <label className="block text-xs font-medium text-foreground uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={String(form[name] || '')}
          onChange={(e) => setForm(f => ({ ...f, [name]: e.target.value }))}
          rows={rows}
          placeholder={placeholder}
          className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y transition-colors"
        />
      ) : (
        <input
          type="text"
          value={String(form[name] || '')}
          onChange={(e) => setForm(f => ({ ...f, [name]: e.target.value }))}
          placeholder={placeholder}
          className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
        />
      )}
    </div>
  )

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-serif font-medium">
          {isNew ? 'New Project' : 'Edit Project'}
        </h1>
        <div className="flex items-center gap-3">
          {!isNew && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 px-4 py-2 border border-destructive/50 hover:border-destructive text-destructive text-sm rounded-lg transition-colors"
            >
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Delete
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="surface p-5 flex items-center gap-8">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => setForm(f => ({ ...f, published: e.target.checked }))}
              className="w-4 h-4 accent-violet-600"
            />
            <span className="text-sm font-medium">Published</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm(f => ({ ...f, featured: e.target.checked }))}
              className="w-4 h-4 accent-violet-600"
            />
            <span className="text-sm font-medium">Featured on homepage</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-medium text-foreground uppercase tracking-wider mb-1.5">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Project title"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground uppercase tracking-wider mb-1.5">Slug *</label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))}
              placeholder="url-friendly-slug"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-medium text-foreground uppercase tracking-wider mb-1.5">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
            >
              <option value="">Select category</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Field label="Your Role" name="role" placeholder="e.g. Growth Strategist, Founder" />
        </div>

        <Field label="Summary (1-2 sentences)" name="summary" placeholder="Brief summary shown in listings" />
        <Field label="Description" name="description" multiline rows={4} placeholder="Full project description" />
        <Field label="The Problem" name="problem" multiline rows={4} placeholder="What problem existed?" />
        <Field label="Objective" name="objective" multiline rows={3} placeholder="What was the goal?" />
        <Field label="Strategy" name="strategy" multiline rows={4} placeholder="What approach was taken?" />
        <Field label="Execution" name="execution" multiline rows={4} placeholder="What was actually done?" />
        <Field label="Results" name="results" multiline rows={4} placeholder="What changed? What was the outcome?" />
        <Field label="Lessons" name="lessons" multiline rows={3} placeholder="What did you learn?" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field label="Cover Image URL" name="image" placeholder="https://..." />
          <Field label="Project URL" name="link" placeholder="https://..." />
        </div>
      </div>
    </div>
  )
}
