'use client'

import { useState, useEffect } from 'react'
import { Download, Loader2, X, File, AlertTriangle } from 'lucide-react'
import { getProjectFileDownloadUrl } from '@/lib/vault/workbench-actions'
import { ProjectFile } from '@/lib/vault/workbench/types'

interface FilePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  workspaceId: string
  fileId: string | null
}

export function FilePreviewModal({
  isOpen,
  onClose,
  projectId,
  workspaceId,
  fileId,
}: FilePreviewModalProps) {
  const [file, setFile] = useState<ProjectFile | null>(null)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && fileId) {
      setLoading(true)
      setError(null)
      setTextContent(null)

      getProjectFileDownloadUrl(fileId, projectId, workspaceId)
        .then(async (res) => {
          setFile(res.file)
          setSignedUrl(res.signedUrl)

          // If plain text format, fetch text content for inline preview
          const ext = res.file.file_extension.toLowerCase()
          if (['txt', 'md', 'csv', 'json'].includes(ext)) {
            try {
              const resp = await fetch(res.signedUrl)
              if (resp.ok) {
                const txt = await resp.text()
                setTextContent(txt)
              }
            } catch {
              // Ignore text fetch error; user can still download
            }
          }
          setLoading(false)
        })
        .catch((err) => {
          setError(err.message || 'Failed to generate download URL')
          setLoading(false)
        })
    }
  }, [isOpen, fileId, projectId, workspaceId])

  if (!isOpen || !fileId) return null

  const ext = file?.file_extension.toLowerCase() || ''
  const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)
  const isPDF = ext === 'pdf'
  const isText = ['txt', 'md', 'csv', 'json'].includes(ext)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0 pr-4">
            <File className="w-5 h-5 text-primary shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate">
                {file?.display_name || 'Loading File...'}
              </h3>
              {file && (
                <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground mt-0.5">
                  <span className="uppercase">{file.file_extension}</span>
                  <span>•</span>
                  <span>{(file.size_bytes / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {signedUrl && (
              <a
                href={signedUrl}
                download={file?.original_filename || 'download'}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[300px] bg-muted/20">
          {loading && (
            <div className="text-center text-xs text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
              Loading preview...
            </div>
          )}

          {error && (
            <div className="text-center p-6 space-y-2">
              <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          {!loading && !error && signedUrl && (
            <>
              {isImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={signedUrl}
                  alt={file?.display_name || 'Preview'}
                  className="max-h-[70vh] max-w-full rounded-lg object-contain border border-border bg-background shadow-sm"
                />
              )}

              {isPDF && (
                <iframe
                  src={signedUrl}
                  title={file?.display_name || 'PDF Preview'}
                  className="w-full h-[70vh] rounded-lg border border-border bg-white shadow-sm"
                />
              )}

              {isText && textContent !== null && (
                <div className="w-full h-[70vh] overflow-auto rounded-lg border border-border bg-background p-4 text-xs font-mono text-foreground whitespace-pre">
                  {textContent}
                </div>
              )}

              {!isImage && !isPDF && (!isText || textContent === null) && (
                <div className="text-center p-8 space-y-4 max-w-sm">
                  <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto border border-border">
                    <File className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-foreground">
                      No inline preview available
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {ext.toUpperCase()} files can be downloaded directly to your device.
                    </p>
                  </div>
                  <a
                    href={signedUrl}
                    download={file?.original_filename || 'download'}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    Download File
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
