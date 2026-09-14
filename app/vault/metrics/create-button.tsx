'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { MetricCreateModal } from '@/components/vault/metric/metric-create-modal'

interface MetricCreateButtonProps {
  workspaceId?: string
  workspaceName?: string
}

export function MetricCreateButton({
  workspaceId,
  workspaceName,
}: MetricCreateButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={!workspaceId}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus className="w-3.5 h-3.5" />
        New Metric
      </button>

      {workspaceId && (
        <MetricCreateModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          workspaceId={workspaceId}
        />
      )}
    </>
  )
}

export default MetricCreateButton
