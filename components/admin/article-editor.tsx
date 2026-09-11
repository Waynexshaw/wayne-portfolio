'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { slugify, readingTime } from '@/lib/utils'
import { Save, Loader2, Trash2, Eye, EyeOff } from 'lucide-react'
import { TiptapEditor } from './tiptap-editor'
import type { Database } from '@/lib/database.types'

type ArticleInsert = Database['public']['Tables']['articles']['Insert']
type ArticleUpdate = Database['public']['Tables']['articles']['Update']

interface ArticleEditorProps {
  article?: Database['public']['Tables']['articles']['Row']
}

const categories = ['DeFi', 'RWA', 'Growth', 'Strategy', 'Research', 'Web3', 'Founder', 'PEVRA']

export function ArticleEditor({ article }: ArticleEditorProps) {
  const router = useRouter()
  const isNew = !article?.id
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [content, setContent] = useState(article?.content || '')
  const [form, setForm] = useState({
    title: article?.title || '',
    slug: article?.slug || '',
    excerpt: article?.excerpt || '',
    category: article?.category || '',
    tags: article?.tags?.join(', ') || '',
    cover_image: article?.cover_image || '',
    published: article?.published || false,
    published_at: article?.published_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    seo_title: article?.seo_title || '',
    seo_description: article?.seo_description || '',
  })

  const handleTitleChange = (title: string) => {
    setForm(f => ({ ...f, title, slug: isNew ? slugify(title) : f.slug }))
  }

  const handleSave = async () => {
    if (!form.title || !form.slug) return
    setSaving(true)
    const supabase = createClient()
    const rt = readingTime(content)
    const tagArray = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : []

    if (isNew) {
      const insertPayload: ArticleInsert = {
        title: form.title,
        slug: form.slug,
        excerpt: form.excerpt || null,
        content: content || null,
        category: form.category || null,
        tags: tagArray.length > 0 ? tagArray : null,
        cover_image: form.cover_image || null,
        published: form.published,
        published_at: form.published_at || null,
        reading_time: rt,
        seo_title: form.seo_title || null,
        seo_description: form.seo_description || null,
      }
      const { data: created, error } = await (supabase as any).from('articles').insert(insertPayload).select().single()
      if (!error && created) router.push(`/admin/writing/${created.id}`)
    } else {
      const updatePayload: ArticleUpdate = {
        title: form.title,
        slug: form.slug,
        excerpt: form.excerpt || null,
        content: content || null,
        category: form.category || null,
        tags: tagArray.length > 0 ? tagArray : null,
        cover_image: form.cover_image || null,
        published: form.published,
        published_at: form.published_at || null,
        reading_time: rt,
        seo_title: form.seo_title || null,
        seo_description: form.seo_description || null,
        updated_at: new Date().toISOString(),
      }
      await (supabase as any).from('articles').update(updatePayload).eq('id', article!.id)
      router.refresh()
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!article?.id) return
    if (!confirm('Delete this article?')) return
    setDeleting(true)
    const supabase = createClient()
    await (supabase as any).from('articles').delete().eq('id', article.id)
    router.push('/admin/writing')
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-serif font-medium">
          {isNew ? 'New Article' : 'Edit Article'}
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
        <div className="surface p-5 flex items-center gap-8 flex-wrap">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => setForm(f => ({ ...f, published: e.target.checked }))}
              className="w-4 h-4 accent-violet-600"
            />
            <span className="text-sm font-medium flex items-center gap-1">
              {form.published ? <Eye size={14} className="text-green-400" /> : <EyeOff size={14} className="text-muted-foreground" />}
              {form.published ? 'Published' : 'Draft'}
            </span>
          </label>
          <div className="flex items-center gap-3">
            <label className="text-sm text-muted-foreground">Publish date</label>
            <input
              type="date"
              value={form.published_at}
              onChange={(e) => setForm(f => ({ ...f, published_at: e.target.value }))}
              className="px-3 py-1.5 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground uppercase tracking-wider mb-1.5">Title *</label>
          <input
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Article title"
            className="w-full px-4 py-3 bg-background border border-border rounded-lg text-lg font-serif focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-medium text-foreground uppercase tracking-wider mb-1.5">Slug *</label>
            <input
              value={form.slug}
              onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))}
              placeholder="url-slug"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
            />
          </div>
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
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground uppercase tracking-wider mb-1.5">Excerpt</label>
          <textarea
            value={form.excerpt}
            onChange={(e) => setForm(f => ({ ...f, excerpt: e.target.value }))}
            rows={3}
            placeholder="Short description shown in listings and social previews..."
            className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground uppercase tracking-wider mb-1.5">Content</label>
          <TiptapEditor content={content} onChange={setContent} placeholder="Write your article here..." />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-medium text-foreground uppercase tracking-wider mb-1.5">Tags (comma-separated)</label>
            <input
              value={form.tags}
              onChange={(e) => setForm(f => ({ ...f, tags: e.target.value }))}
              placeholder="DeFi, Research, Growth"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground uppercase tracking-wider mb-1.5">Cover Image URL</label>
            <input
              value={form.cover_image}
              onChange={(e) => setForm(f => ({ ...f, cover_image: e.target.value }))}
              placeholder="https://..."
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
            />
          </div>
        </div>

        <div className="surface p-6 space-y-4">
          <h3 className="text-sm font-medium text-foreground">SEO</h3>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">SEO title (optional override)</label>
            <input
              value={form.seo_title}
              onChange={(e) => setForm(f => ({ ...f, seo_title: e.target.value }))}
              placeholder={form.title}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">SEO description (optional override)</label>
            <textarea
              value={form.seo_description}
              onChange={(e) => setForm(f => ({ ...f, seo_description: e.target.value }))}
              rows={2}
              placeholder={form.excerpt}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none transition-colors"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
