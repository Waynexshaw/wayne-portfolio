'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, UnderlineIcon, Link2, List, ListOrdered, Quote, Code, Heading2, Heading3, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TiptapEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
}

export function TiptapEditor({ content, onChange, placeholder = 'Start writing...' }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  if (!editor) return null

  const ToolbarButton = ({
    onClick,
    active,
    children,
    title,
  }: {
    onClick: () => void
    active?: boolean
    children: React.ReactNode
    title: string
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'p-2 rounded transition-colors',
        active
          ? 'bg-violet-600/20 text-violet-400'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      )}
    >
      {children}
    </button>
  )

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border bg-muted/30">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        >
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        >
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title="Underline"
        >
          <UnderlineIcon size={15} />
        </ToolbarButton>
        <div className="w-px h-5 bg-border mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <Heading3 size={15} />
        </ToolbarButton>
        <div className="w-px h-5 bg-border mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet list"
        >
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Ordered list"
        >
          <ListOrdered size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Quote"
        >
          <Quote size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          title="Code"
        >
          <Code size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          active={false}
          title="Divider"
        >
          <Minus size={15} />
        </ToolbarButton>
        <div className="w-px h-5 bg-border mx-1" />
        <ToolbarButton
          onClick={() => {
            const url = window.prompt('URL')
            if (url) editor.chain().focus().setLink({ href: url }).run()
          }}
          active={editor.isActive('link')}
          title="Link"
        >
          <Link2 size={15} />
        </ToolbarButton>
      </div>

      {/* Content */}
      <EditorContent
        editor={editor}
        className="prose prose-invert prose-sm max-w-none p-4 min-h-[300px] focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[300px] [&_.ProseMirror_p.is-empty:before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-empty:before]:text-muted-foreground [&_.ProseMirror_p.is-empty:before]:pointer-events-none"
      />
    </div>
  )
}
