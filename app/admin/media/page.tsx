import { createClient } from '@/lib/supabase/server'
import { MediaUploader } from '@/components/admin/media-uploader'
import type { Database } from '@/lib/database.types'

type MediaRow = Database['public']['Tables']['media']['Row']

export default async function AdminMediaPage() {
  const supabase = await createClient()
  const { data } = await (supabase as any).from('media').select('*').order('created_at', { ascending: false })
  const media = (data || []) as MediaRow[]

  return (
    <div>
      <h1 className="text-2xl font-serif font-medium mb-8">Media</h1>
      <MediaUploader />
      {media.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Library</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {media.map(item => (
              <div key={item.id} className="group surface overflow-hidden">
                <div className="aspect-square bg-muted flex items-center justify-center">
                  {item.type?.startsWith("image/") ? (
                    <img src={item.url} alt={item.alt_text || item.filename} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-muted-foreground">{item.type}</span>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs text-muted-foreground truncate">{item.filename}</p>
                  <button
                    onClick={() => navigator.clipboard.writeText(item.url)}
                    className="text-xs text-violet-400 hover:text-violet-300 transition-colors mt-1"
                  >
                    Copy URL
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
