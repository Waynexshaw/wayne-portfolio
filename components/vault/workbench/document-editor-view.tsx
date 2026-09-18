'use client'

import { useState, useEffect, useRef, useTransition, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import LinkExtension from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import {
  ArrowLeft,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Link2,
  Undo,
  Redo,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Archive,
  RotateCcw,
  FileText,
} from 'lucide-react'
import { ProjectDocument } from '@/lib/vault/workbench/types'
import {
  updateProjectDocument,
  archiveProjectDocument,
  restoreProjectDocument,
} from '@/lib/vault/workbench-actions'
import { extractPlainTextFromTipTap } from '@/lib/vault/workbench/document-utils'
import { cn } from '@/lib/utils'

interface DocumentEditorViewProps {
  document: ProjectDocument
  projectId: string
  workspaceId: string
  projectName: string
}

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'

export function DocumentEditorView({
  document,
  projectId,
  workspaceId,
  projectName,
}: DocumentEditorViewProps) {
  const router = useRouter()
  const [title, setTitle] = useState(document.title)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [wordCount, setWordCount] = useState(0)
  const [isPending, startTransition] = useTransition()

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const latestContentRef = useRef<any>(document.content)
  const latestTitleRef = useRef<string>(title)

  latestTitleRef.current = title

  const isArchived = !!document.archived_at

  // Autosave execution
  const executeAutosave = useCallback(async () => {
    setSaveStatus('saving')
    try {
      await updateProjectDocument(document.id, projectId, workspaceId, {
        title: latestTitleRef.current,
        content: latestContentRef.current,
      })
      setSaveStatus('saved')
      setErrorMessage(null)
      // Clear sessionStorage backup on clean save
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(`wv_doc_draft_${document.id}`)
      }
    } catch (err: any) {
      setSaveStatus('error')
      setErrorMessage(err.message || 'Failed to save document')
    }
  }, [document.id, projectId, workspaceId])

  // TipTap Editor setup
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
      Placeholder.configure({
        placeholder: 'Start writing your document...',
      }),
    ],
    content: document.content || { type: 'doc', content: [] },
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON()
      latestContentRef.current = json
      setSaveStatus('unsaved')

      // Update word count
      const text = extractPlainTextFromTipTap(json)
      const words = text.trim() ? text.trim().split(/\s+/).length : 0
      setWordCount(words)

      // Save draft backup to sessionStorage for offline recovery
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(`wv_doc_draft_${document.id}`, JSON.stringify(json))
        } catch {}
      }

      // Debounce autosave
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      saveTimeoutRef.current = setTimeout(() => {
        executeAutosave()
      }, 1500)
    },
  })

  // Title change blur/Enter triggers immediate save
  const handleTitleBlur = () => {
    const trimmed = title.trim() || 'Untitled Document'
    setTitle(trimmed)
    executeAutosave()
  }

  // Archive / Restore
  const handleToggleArchive = () => {
    startTransition(async () => {
      if (isArchived) {
        await restoreProjectDocument(document.id, projectId, workspaceId)
      } else {
        await archiveProjectDocument(document.id, projectId, workspaceId)
        router.push(`/vault/projects/${projectId}/workbench`)
        return
      }
      router.refresh()
    })
  }

  // Browser unload navigation guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'unsaved' || saveStatus === 'saving') {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [saveStatus])

  if (!editor) return null

  const ToolbarButton = ({
    onClick,
    active,
    children,
    title: btnTitle,
    disabled = false,
  }: {
    onClick: () => void
    active?: boolean
    children: React.ReactNode
    title: string
    disabled?: boolean
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={btnTitle}
      className={cn(
        'p-1.5 rounded transition-colors text-xs disabled:opacity-30 disabled:pointer-events-none',
        active
          ? 'bg-primary/20 text-primary font-medium'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
      )}
    >
      {children}
    </button>
  )

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-5xl mx-auto space-y-4 pb-6">
      {/* 1. Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground min-w-0">
          <Link
            href={`/vault/projects/${projectId}/workbench`}
            className="flex items-center gap-1 hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Workbench</span>
          </Link>
          <span>/</span>
          <span className="text-foreground truncate max-w-xs">{projectName}</span>
        </div>

        {/* Status Indicators & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Word count */}
          <span className="text-[11px] font-mono text-muted-foreground px-2 py-0.5 rounded bg-secondary/50">
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </span>

          {/* Autosave Status Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border border-border bg-secondary/60">
            {saveStatus === 'saved' && (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span className="text-muted-foreground">Saved</span>
              </>
            )}
            {saveStatus === 'saving' && (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                <span className="text-primary font-medium">Saving...</span>
              </>
            )}
            {saveStatus === 'unsaved' && (
              <>
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-muted-foreground">Unsaved</span>
              </>
            )}
            {saveStatus === 'error' && (
              <button
                onClick={executeAutosave}
                className="flex items-center gap-1 text-destructive hover:underline"
                title={errorMessage || 'Retry Save'}
              >
                <AlertCircle className="w-3 h-3" />
                <span>Save failed (retry)</span>
              </button>
            )}
          </div>

          {/* Archive / Restore */}
          <button
            onClick={handleToggleArchive}
            disabled={isPending}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            {isArchived ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 text-emerald-500" />
                <span>Restore</span>
              </>
            ) : (
              <>
                <Archive className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Archive</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Editable Title */}
      <div className="flex items-center gap-2 shrink-0">
        <FileText className="w-5 h-5 text-primary shrink-0" />
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            setSaveStatus('unsaved')
          }}
          onBlur={handleTitleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur()
            }
          }}
          placeholder="Untitled Document"
          className="font-serif text-3xl font-medium text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none w-full transition-colors py-0.5"
        />
      </div>

      {/* 3. Fixed Formatting Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-1.5 rounded-lg border border-border bg-muted/40 shrink-0 select-none">
        {/* Undo / Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (Ctrl+Z)"
        >
          <Undo size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (Ctrl+Y)"
        >
          <Redo size={14} />
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <Heading1 size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <Heading3 size={14} />
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Inline Formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold (Ctrl+B)"
        >
          <Bold size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic (Ctrl+I)"
        >
          <Italic size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon size={14} />
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered size={14} />
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Quote & Code */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Quote"
        >
          <Quote size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          title="Inline Code"
        >
          <Code size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Divider"
        >
          <Minus size={14} />
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Link */}
        <ToolbarButton
          onClick={() => {
            const url = window.prompt('Enter URL')
            if (url) {
              editor.chain().focus().setLink({ href: url }).run()
            } else if (url === '') {
              editor.chain().focus().unsetLink().run()
            }
          }}
          active={editor.isActive('link')}
          title="Add Link"
        >
          <Link2 size={14} />
        </ToolbarButton>
      </div>

      {/* 4. Prose Editor Surface */}
      <div className="flex-1 min-h-[400px] overflow-y-auto bg-card border border-border rounded-xl p-8 shadow-sm">
        <EditorContent
          editor={editor}
          className="prose prose-invert prose-neutral max-w-none focus:outline-none min-h-[350px] [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[350px] [&_.ProseMirror_p.is-empty:before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-empty:before]:text-muted-foreground [&_.ProseMirror_p.is-empty:before]:pointer-events-none"
        />
      </div>
    </div>
  )
}
