import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ArticleEditor } from '@/components/admin/article-editor'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminWritingEditPage({ params }: PageProps) {
  const { id } = await params

  if (id === 'new') {
    return <ArticleEditor />
  }

  const supabase = await createClient()
  const { data: article } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .single()

  if (!article) notFound()

  return <ArticleEditor article={article} />
}
