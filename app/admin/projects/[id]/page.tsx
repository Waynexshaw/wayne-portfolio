import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProjectEditor } from '@/components/admin/project-editor'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminProjectEditPage({ params }: PageProps) {
  const { id } = await params

  if (id === 'new') {
    return <ProjectEditor />
  }

  const supabase = await createClient()
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (!project) notFound()

  return <ProjectEditor project={project} />
}
