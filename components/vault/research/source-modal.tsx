'use client'

import { useState, useTransition, useEffect } from 'react'
import { X, Loader2, BookOpen, Link2, Calendar, User, Building2, FileText } from 'lucide-react'
import {
  createResearchSource,
  updateResearchSource,
  ResearchSourceType,
} from '@/lib/vault/actions'

interface SourceModalProps {
  researchRecordId: string
  workspaceId: string
  source?: any
  isOpen: boolean
  onClose: () => void
  onSuccess?: (source: any) => void
}

export const SOURCE_TYPES: { value: ResearchSourceType; label: string }[] = [
  { value: 'article', label: 'Article' },
  { value: 'research_report', label: 'Research Report' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'whitepaper', label: 'Whitepaper' },
  { value: 'official_website', label: 'Official Website' },
  { value: 'social_post', label: 'Social Post' },
  { value: 'interview', label: 'Interview' },
  { value: 'dataset', label: 'Dataset' },
  { value: 'academic_paper', label: 'Academic Paper' },
  { value: 'regulatory_document', label: 'Regulatory Document' },
  { value: 'video', label: 'Video' },
  { value: 'other', label: 'Other' },
]

export function SourceModal({
  researchRecordId,
  workspaceId,
  source,
  isOpen,
  onClose,
  onSuccess,
}: SourceModalProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isEdit = !!source
  const getTodayString = () => new Date().toISOString().split('T')[0]

  const [title, setTitle] = useState('')
  const [sourceType, setSourceType] = useState<ResearchSourceType>('article')
  const [url, setUrl] = useState('')
  const [publisher, setPublisher] = useState('')
  const [author, setAuthor] = useState('')
  const [publishedAt, setPublishedAt] = useState('')
  const [accessedAt, setAccessedAt] = useState(getTodayString())
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (source) {
      setTitle(source.title || '')
      setSourceType(source.source_type || 'article')
      setUrl(source.url || '')
      setPublisher(source.publisher || '')
      setAuthor(source.author || '')
      setPublishedAt(source.published_at ? source.published_at.split('T')[0] : '')
      setAccessedAt(source.accessed_at ? source.accessed_at.split('T')[0] : getTodayString())
      setNotes(source.notes || '')
    } else {
      setTitle('')
      setSourceType('article')
      setUrl('')
      setPublisher('')
      setAuthor('')
      setPublishedAt('')
      setAccessedAt(getTodayString())
      setNotes('')
    }
    setError(null)
  }, [source, isOpen])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        let result: any
        if (isEdit) {
          result = await updateResearchSource(source.id, {
            workspaceId,
            title: title.trim(),
            sourceType,
            url: url.trim() || undefined,
            publisher: publisher.trim() || undefined,
            author: author.trim() || undefined,
            publishedAt: publishedAt || undefined,
            accessedAt: accessedAt || undefined,
            notes: notes.trim() || undefined,
          })
        } else {
          result = await createResearchSource({
            workspaceId,
            researchRecordId,
            title: title.trim(),
            sourceType,
            url: url.trim() || undefined,
            publisher: publisher.trim() || undefined,
            author: author.trim() || undefined,
            publishedAt: publishedAt || undefined,
            accessedAt: accessedAt || undefined,
            notes: notes.trim() || undefined,
          })
        }
        if (onSuccess) onSuccess(result)
        onClose()
      } catch (err: any) {
        setError(err.message || 'Failed to save source')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto">
      <div
        className="relative w-full max-w-xl bg-card border border-border rounded-xl shadow-xl p-6 my-8 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-medium text-foreground">
                {isEdit ? 'Edit Research Source' : 'Add Research Source'}
              </h2>
              <p className="text-xs text-muted-foreground">
                Document the origin, publication details, and access log for traceability.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/20 font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
              Source Title <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Uniswap v4 Technical Whitepaper, Bloomberg Market Survey"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-secondary/50 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
                Source Type
              </label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as ResearchSourceType)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-secondary/50 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
              >
                {SOURCE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                <Link2 className="w-3 h-3" />
                <span>URL (Optional)</span>
              </label>
              <input
                type="url"
                placeholder="https://example.com/report.pdf"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-secondary/50 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                <span>Publisher / Organization</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Paradigm, Federal Reserve, CoinDesk"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-secondary/50 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>Author(s)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Dan Robinson, Vitalik Buterin"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-secondary/50 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Published Date</span>
              </label>
              <input
                type="date"
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-secondary/50 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Accessed Date</span>
              </label>
              <input
                type="date"
                value={accessedAt}
                onChange={(e) => setAccessedAt(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-secondary/50 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span>Notes & Context</span>
            </label>
            <textarea
              rows={3}
              placeholder="Observations on credibility, methodology, scope, or background..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-secondary/50 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isEdit ? 'Save Changes' : 'Add Source'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
