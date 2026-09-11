'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Upload, Loader2 } from 'lucide-react'
import type { Database } from '@/lib/database.types'

type MediaInsert = Database['public']['Tables']['media']['Insert']

export function MediaUploader() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    setError('')

    const supabase = createClient()
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filename, file)

      if (uploadError) { setError(`Failed to upload ${file.name}`); continue }

      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filename)
      const insertPayload: MediaInsert = {
        filename: file.name,
        url: publicUrl,
        type: file.type,
        size: file.size,
      }
      await (supabase as any).from('media').insert(insertPayload)
    }

    setUploading(false)
    router.refresh()
  }

  return (
    <div>
      <div
        className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-violet-600/50 transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleUpload(e.dataTransfer.files) }}
      >
        {uploading ? (
          <Loader2 size={24} className="text-violet-400 animate-spin mx-auto mb-3" />
        ) : (
          <Upload size={24} className="text-muted-foreground mx-auto mb-3" />
        )}
        <p className="text-sm text-muted-foreground">
          {uploading ? 'Uploading...' : 'Click or drag files to upload'}
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">Images, PDFs, and other files</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      <p className="text-xs text-muted-foreground mt-3">
        Files are stored in Supabase Storage. Make sure you have created a public &quot;media&quot; bucket in your Supabase project.
      </p>
    </div>
  )
}
