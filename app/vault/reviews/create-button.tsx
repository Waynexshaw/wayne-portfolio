'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { ReviewCreateModal } from '@/components/vault/review/review-create-modal'

interface ReviewCreateButtonProps {
  workspaceId?: string
  workspaceName?: string
}

export function ReviewCreateButton({ workspaceId, workspaceName }: ReviewCreateButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        disabled={!workspaceId}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
      >
        <Plus className="w-3.5 h-3.5" />
        New Review
      </button>

      <ReviewCreateModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
      />
    </>
  )
}
