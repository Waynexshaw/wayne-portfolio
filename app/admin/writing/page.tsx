import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Plus, Pencil, Eye, EyeOff } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Database } from '@/lib/database.types'

type ArticleRow = Pick<
  Database['public']['Tables']['articles']['Row'],
  'id' | 'title' | 'slug' | 'category' | 'published' | 'published_at' | 'reading_time'
>

export default async function AdminWritingPage() {
  const supabase = await createClient()
  const { data: rawArticles } = await (supabase as any)
    .from('articles')
    .select('id, title, slug, category, published, published_at, reading_time')
    .order('created_at', { ascending: false })

  const articles = (rawArticles || []) as ArticleRow[]

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-serif font-medium">Writing</h1>
        <Link
          href="/admin/writing/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-lg font-medium transition-colors"
        >
          <Plus size={14} />
          New article
        </Link>
      </div>

      {articles.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-muted-foreground text-sm mb-4">No articles yet.</p>
          <Link href="/admin/writing/new" className="text-sm text-violet-400 hover:text-violet-300">
            Write your first article ?
          </Link>
        </div>
      ) : (
        <div className="surface overflow-hidden">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Status</th>
                <th>Published</th>
                <th>Read time</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr key={article.id}>
                  <td className="font-medium text-foreground">{article.title}</td>
                  <td className="text-muted-foreground">{article.category || '—'}</td>
                  <td>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                      article.published ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'
                    }`}>
                      {article.published ? <Eye size={10} /> : <EyeOff size={10} />}
                      {article.published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="text-muted-foreground text-xs">
                    {article.published_at ? formatDate(article.published_at) : '—'}
                  </td>
                  <td className="text-muted-foreground text-xs">
                    {article.reading_time ? `${article.reading_time} min` : '—'}
                  </td>
                  <td>
                    <Link
                      href={`/admin/writing/${article.id}`}
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
