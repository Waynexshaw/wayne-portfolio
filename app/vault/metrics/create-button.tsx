'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { MetricCreateModal } from '@/components/vault/metric/metric-create-modal'

interface MetricCreateButtonProps {
  workspaceId?: string
  workspaceName?: string
  projects?: { id: string; title: string }[]
}

export function MetricCreateButton({
  workspaceId,
  workspaceName,
  projects,
}: MetricCreateButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={!workspaceId}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>New Metric</span>
      </button>

      {workspaceId && (
        <MetricCreateModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          workspaceId={workspaceId}
          projects={projects}
        />
      )}
    </>
  )
}

export default MetricCreateButton
