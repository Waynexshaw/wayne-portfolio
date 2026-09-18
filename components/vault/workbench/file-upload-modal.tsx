'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { UploadCloud, Loader2, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  prepareProjectFileUpload,
  createProjectFileRecord,
} from '@/lib/vault/workbench-actions'
import {
  WORKBENCH_MAX_FILE_SIZE_BYTES,
  ALLOWED_EXTENSIONS,
  BLOCKED_EXTENSIONS,
} from '@/lib/vault/workbench/constants'

interface FileUploadModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  workspaceId: string
  folderId?: string | null
}

interface QueuedFile {
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

export function FileUploadModal({
  isOpen,
  onClose,
  projectId,
  workspaceId,
  folderId,
}: FileUploadModalProps) {
  const router = useRouter()
  const [queue, setQueue] = useState<QueuedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const newQueue: QueuedFile[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ext = file.name.split('.').pop()?.toLowerCase() || ''

      if ((BLOCKED_EXTENSIONS as readonly string[]).includes(ext)) {
        newQueue.push({
          file,
          status: 'error',
          error: `File .${ext} is blocked for security reasons`,
        })
      } else if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
        newQueue.push({
          file,
          status: 'error',
          error: `File .${ext} is not supported`,
        })
      } else if (file.size > WORKBENCH_MAX_FILE_SIZE_BYTES) {
        newQueue.push({
          file,
          status: 'error',
          error: 'File exceeds 25MB limit',
        })
      } else {
        newQueue.push({
          file,
          status: 'pending',
        })
      }
    }

    setQueue((prev) => [...prev, ...newQueue])
  }

  const startUpload = async () => {
    setIsUploading(true)
    const supabase = createClient()

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i]
      if (item.status !== 'pending') continue

      // Mark as uploading
      setQueue((prev) =>
        prev.map((q, idx) => (idx === i ? { ...q, status: 'uploading' } : q))
      )

      try {
        // 1. Prepare upload
        const prep = await prepareProjectFileUpload(projectId, workspaceId, {
          originalFilename: item.file.name,
          mimeType: item.file.type || 'application/octet-stream',
          sizeBytes: item.file.size,
        })

        // 2. Direct upload to Supabase private 'vault_files' bucket
        const { error: uploadError } = await supabase.storage
          .from('vault_files')
          .upload(prep.storagePath, item.file, {
            upsert: true,
          })

        if (uploadError) {
          throw new Error(uploadError.message || 'Storage upload failed')
        }

        // 3. Create metadata record
        const ext = item.file.name.split('.').pop()?.toLowerCase() || ''
        await createProjectFileRecord(projectId, workspaceId, {
          fileId: prep.fileId,
          folderId: folderId || null,
          displayName: item.file.name,
          originalFilename: item.file.name,
          storagePath: prep.storagePath,
          mimeType: item.file.type || 'application/octet-stream',
          sizeBytes: item.file.size,
          fileExtension: ext,
        })

        setQueue((prev) =>
          prev.map((q, idx) => (idx === i ? { ...q, status: 'success' } : q))
        )
      } catch (err: any) {
        setQueue((prev) =>
          prev.map((q, idx) =>
            idx === i
              ? { ...q, status: 'error', error: err.message || 'Upload failed' }
              : q
          )
        )
      }
    }

    setIsUploading(false)
    router.refresh()
  }

  const hasPending = queue.some((q) => q.status === 'pending')
  const allCompleted = queue.length > 0 && queue.every((q) => q.status === 'success' || q.status === 'error')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Upload Files</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              handleFileSelect(e.dataTransfer.files)
            }}
            className="border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-xl p-8 text-center cursor-pointer bg-muted/20"
          >
            <UploadCloud className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs font-medium text-foreground">
              Click to select or drag and drop files here
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              PDF, Office documents, spreadsheets, images, text, archives (up to 25MB each)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
          </div>

          {/* Queue List */}
          {queue.length > 0 && (
            <div className="border border-border rounded-lg max-h-48 overflow-y-auto p-2 space-y-1.5 bg-background">
              {queue.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 p-2 rounded-md bg-secondary/50 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate text-foreground">{item.file.name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                      ({(item.file.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5">
                    {item.status === 'pending' && (
                      <span className="text-[10px] font-mono text-muted-foreground">Ready</span>
                    )}
                    {item.status === 'uploading' && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    )}
                    {item.status === 'success' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    )}
                    {item.status === 'error' && (
                      <div className="flex items-center gap-1 text-destructive" title={item.error}>
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-[10px]">{item.error}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-[11px] text-muted-foreground font-mono">
              Files are private to this project
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isUploading}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
              >
                {allCompleted ? 'Close' : 'Cancel'}
              </button>

              {hasPending && (
                <button
                  type="button"
                  onClick={startUpload}
                  disabled={isUploading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isUploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isUploading ? 'Uploading...' : `Upload (${queue.filter((q) => q.status === 'pending').length})`}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
